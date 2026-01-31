import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkpaperStatus } from '@prisma/client';

export interface CreateWorkpaperDto {
  auditId: string;
  title: string;
  workpaperType?: string;
  content?: string;
  relatedControls?: string[];
  relatedFindings?: string[];
}

export interface UpdateWorkpaperDto {
  title?: string;
  content?: string;
  relatedControls?: string[];
  relatedFindings?: string[];
}

@Injectable()
export class WorkpapersService {
  private readonly logger = new Logger(WorkpapersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateWorkpaperDto, userId: string) {
    // Verify audit exists
    const audit = await this.prisma.audit.findFirst({
      where: { id: dto.auditId, organizationId },
    });
    if (!audit) throw new NotFoundException(`Audit ${dto.auditId} not found`);

    // Generate workpaper number
    const count = await this.prisma.auditWorkpaper.count({ where: { auditId: dto.auditId } });
    const workpaperNumber = `WP-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.auditWorkpaper.create({
      data: {
        auditId: dto.auditId,
        organizationId,
        workpaperNumber,
        title: dto.title,
        workpaperType: dto.workpaperType || 'general',
        content: dto.content,
        preparedBy: userId,
        preparedAt: new Date(),
        relatedControls: dto.relatedControls || [],
        relatedFindings: dto.relatedFindings || [],
      },
    });
  }

  async findAll(organizationId: string, auditId?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (auditId) where.auditId = auditId;

    return this.prisma.auditWorkpaper.findMany({
      where,
      include: {
        preparedByUser: { select: { id: true, displayName: true, email: true } },
        reviewedByUser: { select: { id: true, displayName: true, email: true } },
        approvedByUser: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ auditId: 'asc' }, { workpaperNumber: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const workpaper = await this.prisma.auditWorkpaper.findFirst({
      where: { id, organizationId },
      include: {
        audit: { select: { id: true, name: true, auditId: true } },
        preparedByUser: { select: { id: true, displayName: true, email: true } },
        reviewedByUser: { select: { id: true, displayName: true, email: true } },
        approvedByUser: { select: { id: true, displayName: true, email: true } },
        history: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!workpaper) throw new NotFoundException(`Workpaper ${id} not found`);
    return workpaper;
  }

  async update(id: string, organizationId: string, dto: UpdateWorkpaperDto, userId: string) {
    const workpaper = await this.findOne(id, organizationId);

    // Only allow updates in draft or rejected status
    if (!['draft', 'rejected'].includes(workpaper.status)) {
      throw new BadRequestException('Cannot update workpaper in current status');
    }

    // Save history
    await this.prisma.workpaperHistory.create({
      data: {
        workpaperId: id,
        version: workpaper.version,
        content: workpaper.content,
        changedBy: userId,
        changeSummary: 'Content updated',
      },
    });

    return this.prisma.auditWorkpaper.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        relatedControls: dto.relatedControls,
        relatedFindings: dto.relatedFindings,
        version: { increment: 1 },
      },
    });
  }

  async submitForReview(id: string, organizationId: string, _userId: string) {
    const workpaper = await this.findOne(id, organizationId);
    if (workpaper.status !== 'draft' && workpaper.status !== 'rejected') {
      throw new BadRequestException('Workpaper must be in draft or rejected status');
    }

    return this.prisma.auditWorkpaper.update({
      where: { id },
      data: { status: WorkpaperStatus.pending_review },
    });
  }

  async review(id: string, organizationId: string, approved: boolean, notes: string, userId: string) {
    const workpaper = await this.findOne(id, organizationId);
    if (workpaper.status !== 'pending_review') {
      throw new BadRequestException('Workpaper must be pending review');
    }

    return this.prisma.auditWorkpaper.update({
      where: { id },
      data: {
        status: approved ? WorkpaperStatus.reviewed : WorkpaperStatus.rejected,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });
  }

  async approve(id: string, organizationId: string, notes: string, userId: string) {
    const workpaper = await this.findOne(id, organizationId);
    if (workpaper.status !== 'reviewed') {
      throw new BadRequestException('Workpaper must be reviewed before approval');
    }

    return this.prisma.auditWorkpaper.update({
      where: { id },
      data: {
        status: WorkpaperStatus.approved,
        approvedBy: userId,
        approvedAt: new Date(),
        approvalNotes: notes,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const workpaper = await this.findOne(id, organizationId);
    if (workpaper.status === 'approved') {
      throw new BadRequestException('Cannot delete approved workpaper');
    }

    return this.prisma.auditWorkpaper.delete({ where: { id } });
  }
}

