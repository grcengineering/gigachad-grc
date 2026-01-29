import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  UploadPolicyDto,
  UpdatePolicyDto,
  UpdatePolicyStatusDto,
  PolicyFilterDto,
} from './dto/policy.dto';
import { generateId, STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
import { PolicyStatus } from '@prisma/client';

@Injectable()
export class PoliciesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  async findAll(organizationId: string, filters: PolicyFilterDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
      AND: [],
    };

    if (filters.search) {
      // Split search into keywords for more flexible matching
      const keywords = filters.search.trim().split(/\s+/).filter(k => k.length > 0);
      
      // Build OR conditions for each keyword across multiple fields
      const keywordConditions = keywords.map(keyword => ({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          { category: { contains: keyword, mode: 'insensitive' } },
          { filename: { contains: keyword, mode: 'insensitive' } },
          { tags: { has: keyword } },
          { tags: { hasSome: [keyword, keyword.toLowerCase(), keyword.toUpperCase()] } },
        ],
      }));
      
      // Match if ANY keyword matches (OR between keywords)
      if (keywordConditions.length > 0) {
        where.AND.push({
          OR: keywordConditions.flatMap(kc => kc.OR),
        });
      }
    }

    if (filters.status?.length) {
      where.AND.push({ status: { in: filters.status } });
    }

    if (filters.category?.length) {
      where.AND.push({ category: { in: filters.category } });
    }

    const [policies, total] = await Promise.all([
      this.prisma.policy.findMany({
        where: where.AND.length > 0 ? where : { organizationId, deletedAt: null },
        include: {
          owner: { select: { id: true, displayName: true, email: true } },
          _count: { select: { controlLinks: true, versions: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.policy.count({
        where: where.AND.length > 0 ? where : { organizationId, deletedAt: null },
      }),
    ]);

    return {
      data: policies.map((p) => ({
        ...p,
        controlCount: p._count.controlLinks,
        versionCount: p._count.versions,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const policy = await this.prisma.policy.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        controlLinks: {
          include: {
            control: { select: { id: true, controlId: true, title: true } },
          },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    return policy;
  }

  async getStats(organizationId: string) {
    const total = await this.prisma.policy.count({ where: { organizationId, deletedAt: null } });
    const draft = await this.prisma.policy.count({ where: { organizationId, status: PolicyStatus.draft, deletedAt: null } });
    const inReview = await this.prisma.policy.count({ where: { organizationId, status: PolicyStatus.in_review, deletedAt: null } });
    const approved = await this.prisma.policy.count({ where: { organizationId, status: PolicyStatus.approved, deletedAt: null } });
    const published = await this.prisma.policy.count({ where: { organizationId, status: PolicyStatus.published, deletedAt: null } });
    const retired = await this.prisma.policy.count({ where: { organizationId, status: PolicyStatus.retired, deletedAt: null } });

    const overdueReview = await this.prisma.policy.count({
      where: {
        organizationId,
        nextReviewDue: { lt: new Date() },
        status: { notIn: [PolicyStatus.retired, PolicyStatus.draft] },
        deletedAt: null,
      },
    });

    return { total, draft, inReview, approved, published, retired, overdueReview };
  }

  async upload(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadPolicyDto,
    userEmail?: string,
    userName?: string,
  ) {
    const policyId = generateId();
    const versionNumber = dto.version || '1.0';
    const storagePath = `policies/${organizationId}/${policyId}/${versionNumber}/${file.originalname}`;

    // Upload file to storage
    await this.storage.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
    });

    // Create policy record
    const policy = await this.prisma.policy.create({
      data: {
        id: policyId,
        organizationId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        status: PolicyStatus.draft,
        version: versionNumber,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
        ownerId: dto.ownerId || userId,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        nextReviewDue: dto.nextReviewDate ? new Date(dto.nextReviewDate) : null,
        tags: dto.tags || [],
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Create initial version record
    await this.prisma.policyVersion.create({
      data: {
        id: generateId(),
        policyId: policy.id,
        version: versionNumber,
        filename: file.originalname,
        storagePath,
        size: file.size,
        createdBy: userId,
        changeNotes: 'Initial version',
      },
    });

    // Get user info for audit trail
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { displayName: true, email: true },
    });

    // Create initial status history entry
    await this.prisma.policyStatusHistory.create({
      data: {
        id: generateId(),
        policyId: policy.id,
        fromStatus: null,
        toStatus: 'draft',
        changedById: userId,
        changedByName: user?.displayName || 'Unknown User',
        notes: 'Policy created',
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail: userEmail || user?.email,
      userName: userName || user?.displayName,
      action: 'uploaded',
      entityType: 'policy',
      entityId: policy.id,
      entityName: policy.title,
      description: `Uploaded policy "${policy.title}" (${file.originalname})`,
      metadata: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: dto.category,
        version: versionNumber,
      },
    });

    // Link to controls if specified
    if (dto.controlIds?.length) {
      await this.linkToControls(policy.id, organizationId, userId, dto.controlIds, userEmail, userName);
    }

    return policy;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdatePolicyDto,
    userEmail?: string,
    userName?: string,
  ) {
    const before = await this.findOne(id, organizationId);

    const updated = await this.prisma.policy.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        ownerId: dto.ownerId,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        nextReviewDue: dto.nextReviewDate ? new Date(dto.nextReviewDate) : undefined,
        tags: dto.tags,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'policy',
      entityId: updated.id,
      entityName: updated.title,
      description: `Updated policy "${updated.title}"`,
      changes: { before, after: updated },
    });

    return updated;
  }

  async uploadNewVersion(
    id: string,
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    versionNumber: string,
    changeNotes?: string,
    userEmail?: string,
    userName?: string,
  ) {
    const policy = await this.findOne(id, organizationId);
    const oldVersion = policy.version;
    const storagePath = `policies/${organizationId}/${id}/${versionNumber}/${file.originalname}`;

    // Upload new version
    await this.storage.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
    });

    // Create version record
    await this.prisma.policyVersion.create({
      data: {
        id: generateId(),
        policyId: id,
        version: versionNumber,
        filename: file.originalname,
        storagePath,
        size: file.size,
        createdBy: userId,
        changeNotes,
      },
    });

    // Update policy with new version info
    const updated = await this.prisma.policy.update({
      where: { id },
      data: {
        version: versionNumber,
        filename: file.originalname,
        storagePath,
        size: file.size,
        mimeType: file.mimetype,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'version_created',
      entityType: 'policy',
      entityId: updated.id,
      entityName: updated.title,
      description: `Created new version ${versionNumber} of policy "${updated.title}" (was ${oldVersion})`,
      metadata: {
        oldVersion,
        newVersion: versionNumber,
        filename: file.originalname,
        changeNotes,
      },
    });

    return updated;
  }

  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdatePolicyStatusDto,
    userEmail?: string,
    userName?: string,
  ) {
    const policy = await this.findOne(id, organizationId);
    const fromStatus = policy.status;

    // Get user info for audit trail
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { displayName: true, email: true },
    });

    const updateData: any = {
      status: dto.status,
      updatedBy: userId,
    };

    if (dto.status === PolicyStatus.approved) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
    }

    // Update policy status
    const updatedPolicy = await this.prisma.policy.update({
      where: { id },
      data: updateData,
    });

    // Create status history entry
    await this.prisma.policyStatusHistory.create({
      data: {
        id: generateId(),
        policyId: id,
        fromStatus,
        toStatus: dto.status,
        changedById: userId,
        changedByName: user?.displayName || userName || 'Unknown User',
        notes: dto.notes,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail: userEmail || user?.email,
      userName: userName || user?.displayName,
      action: 'status_changed',
      entityType: 'policy',
      entityId: updatedPolicy.id,
      entityName: updatedPolicy.title,
      description: `Changed policy "${updatedPolicy.title}" status from ${fromStatus} to ${dto.status}`,
      changes: { before: { status: fromStatus }, after: { status: dto.status } },
      metadata: { notes: dto.notes },
    });

    return updatedPolicy;
  }

  async delete(
    id: string,
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string,
  ) {
    const policy = await this.findOne(id, organizationId);

    // Delete from storage
    await this.storage.delete(policy.storagePath);

    // Delete all versions from storage
    if (policy.versions) {
      for (const version of policy.versions) {
        await this.storage.delete(version.storagePath);
      }
    }

    // Soft delete from database
    await this.prisma.policy.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || 'system',
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'policy',
      entityId: policy.id,
      entityName: policy.title,
      description: `Deleted policy "${policy.title}" (${policy.filename})`,
      changes: { before: policy },
    });

    return { success: true };
  }

  async getDownloadUrl(id: string, organizationId: string) {
    const policy = await this.findOne(id, organizationId);
    const url = await this.storage.getSignedUrl(policy.storagePath, 3600);
    return { url, filename: policy.filename };
  }

  async streamFile(id: string, organizationId: string) {
    const policy = await this.findOne(id, organizationId);
    
    // Check if file exists before attempting to stream
    const fileExists = await this.storage.exists(policy.storagePath);
    if (!fileExists) {
      throw new NotFoundException(`Policy file not found. The file may not have been uploaded yet.`);
    }
    
    const stream = await this.storage.download(policy.storagePath);
    return { stream, mimetype: policy.mimeType, filename: policy.filename };
  }

  async linkToControls(
    policyId: string,
    organizationId: string,
    userId: string,
    controlIds: string[],
    userEmail?: string,
    userName?: string,
  ) {
    const policy = await this.findOne(policyId, organizationId);

    // Get control info for audit log
    const controls = await this.prisma.control.findMany({
      where: { id: { in: controlIds }, deletedAt: null },
      select: { id: true, controlId: true, title: true },
    });

    const links = controlIds.map((controlId) => ({
      policyId,
      controlId,
      linkedBy: userId,
    }));

    await this.prisma.policyControlLink.createMany({
      data: links,
      skipDuplicates: true,
    });

    // Audit log
    const linkedControlNames = controls.map(c => `${c.controlId}: ${c.title}`).join(', ');
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'linked',
      entityType: 'policy',
      entityId: policyId,
      entityName: policy.title,
      description: `Linked policy "${policy.title}" to controls: ${linkedControlNames}`,
      metadata: {
        linkedControlIds: controlIds,
        linkedControlCount: controlIds.length,
      },
    });

    return this.findOne(policyId, organizationId);
  }

  async unlinkFromControl(
    policyId: string,
    controlId: string,
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string,
  ) {
    const policy = await this.findOne(policyId, organizationId);

    // Get control info for audit log
    const control = await this.prisma.control.findUnique({
      where: { id: controlId },
      select: { controlId: true, title: true },
    });

    await this.prisma.policyControlLink.deleteMany({
      where: { policyId, controlId },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'unlinked',
      entityType: 'policy',
      entityId: policyId,
      entityName: policy.title,
      description: `Unlinked policy "${policy.title}" from control "${control?.controlId}: ${control?.title}"`,
      metadata: {
        unlinkedControlId: controlId,
      },
    });

    return this.findOne(policyId, organizationId);
  }
}

