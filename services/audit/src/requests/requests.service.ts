import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditRequestDto } from './dto/create-request.dto';
import { UpdateAuditRequestDto } from './dto/update-request.dto';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async create(createRequestDto: CreateAuditRequestDto, createdBy: string) {
    const { auditId } = createRequestDto;

    // Generate request number if not provided
    const requestCount = await this.prisma.auditRequest.count({
      where: { auditId },
    });
    const requestNumber = createRequestDto.requestNumber || `REQ-${String(requestCount + 1).padStart(3, '0')}`;

    return this.prisma.auditRequest.create({
      data: {
        ...createRequestDto,
        requestNumber,
        dueDate: createRequestDto.dueDate ? new Date(createRequestDto.dueDate) : undefined,
        createdBy,
      },
      include: {
        evidence: true,
        comments: true,
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    auditId?: string;
    status?: string;
    assignedTo?: string;
    category?: string;
  }) {
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
    const updates: Record<string, unknown> = { ...updateRequestDto };

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
    // Soft delete
    return this.prisma.auditRequest.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || 'system',
      },
    });
  }

  async addComment(requestId: string, data: {
    content: string;
    isInternal?: boolean;
    authorType: string;
    authorId?: string;
    authorName: string;
  }) {
    return this.prisma.auditRequestComment.create({
      data: {
        requestId,
        ...data,
      },
    });
  }

  async getComments(requestId: string) {
    return this.prisma.auditRequestComment.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
