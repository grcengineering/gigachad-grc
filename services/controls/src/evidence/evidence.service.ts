import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
import {
  STORAGE_PROVIDER,
  StorageProvider,
  generateId,
  sanitizeFilename,
} from '@gigachad-grc/shared';
import { EvidenceStatus, Prisma } from '@prisma/client';
import {
  UploadEvidenceDto,
  UpdateEvidenceDto,
  EvidenceFilterDto,
  LinkEvidenceDto,
  ReviewEvidenceDto,
} from './dto/evidence.dto';
import {
  parsePaginationParams,
  createPaginatedResponse,
  getPrismaSkipTake,
} from '@gigachad-grc/shared';

@Injectable()
export class EvidenceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider
  ) {}

  async findAll(organizationId: string, filters: EvidenceFilterDto) {
    const pagination = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy || 'createdAt',
      sortOrder: filters.sortOrder || 'desc',
    });

    const where: Prisma.EvidenceWhereInput = {
      organizationId,
      deletedAt: null,
      ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
      ...(filters.type?.length && { type: { in: filters.type } }),
      ...(filters.source?.length && { source: { in: filters.source } }),
      ...(filters.status?.length && { status: { in: filters.status } }),
      ...(filters.category && { category: filters.category }),
      ...(filters.tags?.length && { tags: { hasSome: filters.tags } }),
      ...(filters.folderId && { folderId: filters.folderId }),
      ...(filters.controlId && { controlLinks: { some: { controlId: filters.controlId } } }),
      ...(filters.expired && { isExpired: true }),
      ...(filters.expiringSoon && {
        validUntil: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gt: new Date(),
        },
        isExpired: false,
      }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } },
          { filename: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [evidence, total] = await Promise.all([
      this.prisma.evidence.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true, path: true } },
          controlLinks: {
            include: {
              control: { select: { id: true, controlId: true, title: true } },
            },
          },
        },
        ...getPrismaSkipTake(pagination),
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      this.prisma.evidence.count({ where }),
    ]);

    return createPaginatedResponse(evidence, total, pagination);
  }

  async findOne(id: string, organizationId: string) {
    const evidence = await this.prisma.evidence.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        folder: { select: { id: true, name: true, path: true } },
        controlLinks: {
          include: {
            control: { select: { id: true, controlId: true, title: true } },
            implementation: { select: { id: true, status: true } },
          },
        },
      },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence with ID ${id} not found`);
    }

    return evidence;
  }

  async upload(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadEvidenceDto,
    userEmail?: string,
    userName?: string
  ) {
    const evidenceId = generateId();
    // SECURITY: Sanitize filename to prevent path traversal attacks
    const safeFilename = sanitizeFilename(file.originalname);
    const storagePath = `evidence/${organizationId}/${evidenceId}/${safeFilename}`;

    // Upload to storage
    await this.storage.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
    });

    // Create evidence record
    const evidence = await this.prisma.evidence.create({
      data: {
        id: evidenceId,
        organizationId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        source: 'manual',
        status: EvidenceStatus.pending_review,
        filename: safeFilename,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
        collectedAt: new Date(),
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isExpired: false,
        tags: dto.tags || [],
        category: dto.category,
        folderId: dto.folderId,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Link to controls if specified
    if (dto.controlIds?.length) {
      await this.linkToControls(evidence.id, organizationId, userId, {
        controlIds: dto.controlIds,
      });
    }

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'uploaded',
      entityType: 'evidence',
      entityId: evidence.id,
      entityName: evidence.title,
      description: `Uploaded evidence "${evidence.title}" (${evidence.filename})`,
      metadata: {
        filename: evidence.filename,
        mimeType: evidence.mimeType,
        size: evidence.size,
        linkedControls: dto.controlIds?.length || 0,
      },
    });

    return evidence;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateEvidenceDto,
    userEmail?: string,
    userName?: string
  ) {
    const before = await this.findOne(id, organizationId);

    // SECURITY: Explicit field mapping to prevent mass assignment vulnerabilities
    const updated = await this.prisma.evidence.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        category: dto.category,
        tags: dto.tags || undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
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
      entityType: 'evidence',
      entityId: updated.id,
      entityName: updated.title,
      description: `Updated evidence "${updated.title}"`,
      changes: { before, after: updated },
    });

    return updated;
  }

  async delete(
    id: string,
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string
  ) {
    const evidence = await this.findOne(id, organizationId);

    // Delete from storage
    await this.storage.delete(evidence.storagePath);

    // Soft delete from database
    await this.prisma.evidence.update({
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
      entityType: 'evidence',
      entityId: evidence.id,
      entityName: evidence.title,
      description: `Deleted evidence "${evidence.title}" (${evidence.filename})`,
      changes: { before: evidence },
    });

    return { success: true };
  }

  async getDownloadUrl(id: string, organizationId: string) {
    const evidence = await this.findOne(id, organizationId);
    const url = await this.storage.getSignedUrl(evidence.storagePath, 3600);
    return { url, filename: evidence.filename };
  }

  async getPreviewUrl(id: string, organizationId: string) {
    const evidence = await this.findOne(id, organizationId);
    const url = await this.storage.getSignedUrl(evidence.storagePath, 3600);
    return {
      url,
      filename: evidence.filename,
      mimeType: evidence.mimeType,
    };
  }

  async getFileStream(id: string, organizationId: string) {
    const evidence = await this.findOne(id, organizationId);
    const stream = await this.storage.download(evidence.storagePath);
    return {
      stream,
      filename: evidence.filename,
      mimeType: evidence.mimeType,
    };
  }

  async review(
    id: string,
    organizationId: string,
    userId: string,
    dto: ReviewEvidenceDto,
    userEmail?: string,
    userName?: string
  ) {
    const before = await this.findOne(id, organizationId);

    const updated = await this.prisma.evidence.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: dto.notes,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'reviewed',
      entityType: 'evidence',
      entityId: updated.id,
      entityName: updated.title,
      description: `Reviewed evidence "${updated.title}" - status changed to ${dto.status}`,
      changes: {
        before: { status: before.status },
        after: { status: updated.status, reviewNotes: dto.notes },
      },
    });

    // Notify the person who uploaded the evidence
    if (updated.createdBy && updated.createdBy !== userId) {
      await this.notificationsService.create({
        organizationId,
        userId: updated.createdBy,
        type: NotificationType.EVIDENCE_REVIEWED,
        title: `Evidence ${dto.status === EvidenceStatus.approved ? 'Approved' : dto.status === EvidenceStatus.rejected ? 'Rejected' : 'Reviewed'}`,
        message: `Your evidence "${updated.title}" has been ${dto.status}${dto.notes ? `: ${dto.notes}` : ''}`,
        entityType: 'evidence',
        entityId: updated.id,
        severity:
          dto.status === EvidenceStatus.approved
            ? NotificationSeverity.SUCCESS
            : dto.status === EvidenceStatus.rejected
              ? NotificationSeverity.ERROR
              : NotificationSeverity.INFO,
        metadata: {
          evidenceTitle: updated.title,
          reviewStatus: dto.status,
          reviewNotes: dto.notes,
          reviewerName: userName,
        },
      });
    }

    return updated;
  }

  async linkToControls(
    id: string,
    organizationId: string,
    userId: string,
    dto: LinkEvidenceDto,
    userEmail?: string,
    userName?: string
  ) {
    const evidence = await this.findOne(id, organizationId);

    // Get implementations for the controls
    const implementations = await this.prisma.controlImplementation.findMany({
      where: {
        controlId: { in: dto.controlIds },
        organizationId,
      },
      include: {
        control: { select: { controlId: true, title: true } },
      },
    });

    // Create links
    const links = implementations.map((impl) => ({
      evidenceId: id,
      controlId: impl.controlId,
      implementationId: impl.id,
      linkedBy: userId,
      notes: dto.notes,
    }));

    await this.prisma.evidenceControlLink.createMany({
      data: links,
      skipDuplicates: true,
    });

    // Audit log
    const linkedControlNames = implementations
      .map((i) => `${i.control.controlId}: ${i.control.title}`)
      .join(', ');
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'linked',
      entityType: 'evidence',
      entityId: evidence.id,
      entityName: evidence.title,
      description: `Linked evidence "${evidence.title}" to controls: ${linkedControlNames}`,
      metadata: {
        linkedControlIds: dto.controlIds,
        linkedControlCount: dto.controlIds.length,
      },
    });

    return this.findOne(id, organizationId);
  }

  async unlinkFromControl(
    id: string,
    controlId: string,
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string
  ) {
    const evidence = await this.findOne(id, organizationId);

    // Get control info for audit log
    const control = await this.prisma.control.findUnique({
      where: { id: controlId },
      select: { controlId: true, title: true },
    });

    await this.prisma.evidenceControlLink.deleteMany({
      where: {
        evidenceId: id,
        controlId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'unlinked',
      entityType: 'evidence',
      entityId: evidence.id,
      entityName: evidence.title,
      description: `Unlinked evidence "${evidence.title}" from control "${control?.controlId}: ${control?.title}"`,
      metadata: {
        unlinkedControlId: controlId,
      },
    });

    return { success: true };
  }

  async getStats(organizationId: string) {
    const [total, byType, bySource, byStatus, expiringSoon, expired] = await Promise.all([
      this.prisma.evidence.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.evidence.groupBy({
        by: ['type'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.evidence.groupBy({
        by: ['source'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.evidence.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.evidence.count({
        where: {
          organizationId,
          isExpired: false,
          deletedAt: null,
          validUntil: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gt: new Date(),
          },
        },
      }),
      this.prisma.evidence.count({
        where: { organizationId, isExpired: true, deletedAt: null },
      }),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map((b) => [b.type, b._count])),
      bySource: Object.fromEntries(bySource.map((b) => [b.source, b._count])),
      byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count])),
      expiringSoon,
      expired,
    };
  }

  // Folders
  async getFolders(organizationId: string, parentId?: string) {
    return this.prisma.evidenceFolder.findMany({
      where: {
        organizationId,
        parentId: parentId || null,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createFolder(organizationId: string, userId: string, name: string, parentId?: string) {
    let path = `/${name}`;

    if (parentId) {
      const parent = await this.prisma.evidenceFolder.findFirst({
        where: { id: parentId, organizationId },
      });
      if (parent) {
        path = `${parent.path}/${name}`;
      }
    }

    return this.prisma.evidenceFolder.create({
      data: {
        organizationId,
        name,
        parentId,
        path,
        createdBy: userId,
      },
    });
  }

  // Check for expiring evidence and update status
  async updateExpirationStatus() {
    const now = new Date();

    // Mark expired evidence
    await this.prisma.evidence.updateMany({
      where: {
        validUntil: { lte: now },
        isExpired: false,
      },
      data: {
        isExpired: true,
        status: EvidenceStatus.expired,
      },
    });

    return { success: true };
  }
}
