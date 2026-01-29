import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateAuditDto } from './dto/update-audit.dto';

@Injectable()
export class AuditsService {
  constructor(private prisma: PrismaService) {}

  async create(createAuditDto: CreateAuditDto & { organizationId: string }, createdBy: string) {
    const { organizationId, ...restDto } = createAuditDto;

    // Generate audit ID if not provided
    const auditCount = await this.prisma.audit.count({
      where: { organizationId },
    });
    const auditId = createAuditDto.auditId || `AUD-${String(auditCount + 1).padStart(3, '0')}`;

    // Generate portal access code if external audit
    let portalAccessCode = null;
    if (createAuditDto.isExternal) {
      portalAccessCode = this.generateAccessCode();
    }

    return this.prisma.audit.create({
      data: {
        ...restDto,
        organizationId,
        auditId,
        portalAccessCode,
        createdBy,
        plannedStartDate: createAuditDto.plannedStartDate
          ? new Date(createAuditDto.plannedStartDate)
          : undefined,
        plannedEndDate: createAuditDto.plannedEndDate
          ? new Date(createAuditDto.plannedEndDate)
          : undefined,
      },
      include: {
        requests: true,
        findings: true,
        evidence: true,
        meetings: true,
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    status?: string;
    auditType?: string;
    isExternal?: boolean;
  }) {
    const where: any = { organizationId, deletedAt: null };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.auditType) {
      where.auditType = filters.auditType;
    }
    if (filters?.isExternal !== undefined) {
      where.isExternal = filters.isExternal;
    }

    return this.prisma.audit.findMany({
      where,
      include: {
        _count: {
          select: {
            requests: true,
            findings: true,
            evidence: true,
            testResults: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.audit.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        requests: {
          include: {
            evidence: true,
            comments: true,
          },
        },
        findings: true,
        evidence: true,
        testResults: true,
        meetings: true,
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });
  }

  async update(id: string, organizationId: string, updateAuditDto: UpdateAuditDto) {
    // Update finding counts if status is changing to completed
    let updates: any = { ...updateAuditDto };

    if (updateAuditDto.status === 'completed') {
      const findingCounts = await this.prisma.auditFinding.groupBy({
        by: ['severity'],
        where: { auditId: id },
        _count: { severity: true },
      });

      const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      findingCounts.forEach(({ severity, _count }) => {
        if (severity in counts) {
          counts[severity as keyof typeof counts] = _count.severity;
        }
      });

      updates = {
        ...updates,
        findingsCount: counts.critical + counts.high + counts.medium + counts.low,
        criticalFindings: counts.critical,
        highFindings: counts.high,
        mediumFindings: counts.medium,
        lowFindings: counts.low,
        actualEndDate: new Date(),
      };
    }

    // Convert date strings to Date objects
    if (updates.plannedStartDate) {
      updates.plannedStartDate = new Date(updates.plannedStartDate);
    }
    if (updates.plannedEndDate) {
      updates.plannedEndDate = new Date(updates.plannedEndDate);
    }
    if (updates.actualStartDate) {
      updates.actualStartDate = new Date(updates.actualStartDate);
    }
    if (updates.actualEndDate) {
      updates.actualEndDate = new Date(updates.actualEndDate);
    }

    return this.prisma.audit.update({
      where: { id },
      data: updates,
      include: {
        requests: true,
        findings: true,
        evidence: true,
        meetings: true,
      },
    });
  }

  async delete(id: string, organizationId: string, userId?: string) {
    // Soft delete
    return this.prisma.audit.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || 'system',
      },
    });
  }

  async getDashboardStats(organizationId: string) {
    const [totalAudits, activeAudits, completedAudits, byType, byStatus, upcomingMeetings] =
      await Promise.all([
        this.prisma.audit.count({ where: { organizationId } }),
        this.prisma.audit.count({
          where: { organizationId, status: { in: ['planning', 'fieldwork', 'testing', 'reporting'] } },
        }),
        this.prisma.audit.count({ where: { organizationId, status: 'completed' } }),
        this.prisma.audit.groupBy({
          by: ['auditType'],
          where: { organizationId },
          _count: { auditType: true },
        }),
        this.prisma.audit.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { status: true },
        }),
        this.prisma.auditMeeting.findMany({
          where: {
            organizationId,
            status: 'scheduled',
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        }),
      ]);

    return {
      totalAudits,
      activeAudits,
      completedAudits,
      byType: byType.map((t) => ({ type: t.auditType, count: t._count.auditType })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
      upcomingMeetings,
    };
  }

  async enablePortal(id: string, organizationId: string, expiresInDays = 90) {
    const portalAccessCode = this.generateAccessCode();
    const portalExpiresAt = new Date();
    portalExpiresAt.setDate(portalExpiresAt.getDate() + expiresInDays);

    return this.prisma.audit.update({
      where: { id },
      data: {
        auditPortalEnabled: true,
        portalAccessCode,
        portalExpiresAt,
      },
    });
  }

  async disablePortal(id: string, organizationId: string) {
    return this.prisma.audit.update({
      where: { id },
      data: {
        auditPortalEnabled: false,
      },
    });
  }

  private generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code.match(/.{1,4}/g)?.join('-') || code; // Format as XXXX-XXXX-XXXX
  }
}
