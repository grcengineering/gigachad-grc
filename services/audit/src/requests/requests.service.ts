import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditRequestDto } from './dto/create-request.dto';
import { UpdateAuditRequestDto } from './dto/update-request.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async create(createRequestDto: CreateAuditRequestDto, createdBy: string) {
    const { auditId, assigneeId, ...rest } = createRequestDto;

    // Generate request number if not provided
    const requestCount = await this.prisma.auditRequest.count({
      where: { auditId },
    });
    const requestNumber =
      createRequestDto.requestNumber || `REQ-${String(requestCount + 1).padStart(3, '0')}`;

    const data: Prisma.AuditRequestUncheckedCreateInput = {
      ...rest,
      auditId,
      organizationId: createRequestDto.organizationId!,
      assignedTo: createRequestDto.assignedTo || assigneeId,
      requestNumber,
      dueDate: createRequestDto.dueDate ? new Date(createRequestDto.dueDate) : undefined,
      createdBy,
    };

    return this.prisma.auditRequest.create({
      data,
      include: {
        evidence: true,
        comments: true,
      },
    });
  }

  async findAll(
    organizationId: string,
    filters?: {
      auditId?: string;
      status?: string;
      assignedTo?: string;
      category?: string;
    }
  ) {
    const where: Record<string, unknown> = { organizationId, deletedAt: null };

    if (filters?.auditId) {
      where.auditId = filters.auditId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }
    if (filters?.category) {
      where.category = filters.category;
    }

    return this.prisma.auditRequest.findMany({
      where,
      include: {
        audit: {
          select: {
            id: true,
            auditId: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            evidence: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.auditRequest.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        audit: true,
        evidence: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, organizationId: string, updateRequestDto: UpdateAuditRequestDto) {
    // SECURITY: First verify the request belongs to this organization (IDOR prevention)
    const request = await this.prisma.auditRequest.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    const updates: Record<string, unknown> = { ...updateRequestDto };
    if (updateRequestDto.assigneeId && !updates.assignedTo) {
      updates.assignedTo = updateRequestDto.assigneeId;
    }
    delete updates.assigneeId;

    // Update timestamps based on status changes
    if (updateRequestDto.status === 'submitted' && !updates.submittedAt) {
      updates.submittedAt = new Date();
    }
    if (updateRequestDto.status === 'approved' && !updates.reviewedAt) {
      updates.reviewedAt = new Date();
    }

    // Convert date string to Date
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate as string);
    }

    return this.prisma.auditRequest.update({
      where: { id },
      data: updates,
      include: {
        evidence: true,
        comments: true,
      },
    });
  }

  async delete(id: string, organizationId: string, userId?: string) {
    // SECURITY: First verify the request belongs to this organization (IDOR prevention)
    const request = await this.prisma.auditRequest.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    // Soft delete
    return this.prisma.auditRequest.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || 'system',
      },
    });
  }

  async addComment(
    requestId: string,
    data: {
      content: string;
      isInternal?: boolean;
      authorType: string;
      authorId?: string;
      authorName: string;
    }
  ) {
    // SECURITY: Explicit field mapping to prevent mass assignment vulnerabilities
    return this.prisma.auditRequestComment.create({
      data: {
        requestId,
        content: data.content,
        isInternal: data.isInternal,
        authorType: data.authorType,
        authorId: data.authorId,
        authorName: data.authorName,
      },
    });
  }

  async getComments(requestId: string, organizationId: string) {
    // SECURITY: First verify the request belongs to the user's organization (IDOR prevention)
    const request = await this.prisma.auditRequest.findFirst({
      where: { id: requestId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!request) {
      return []; // Return empty if request not found or doesn't belong to org
    }

    return this.prisma.auditRequestComment.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
