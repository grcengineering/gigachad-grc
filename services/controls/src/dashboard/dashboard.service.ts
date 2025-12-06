import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ControlImplementationStatus, EvidenceStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const [
      controlStats,
      evidenceStats,
      upcomingTests,
      recentActivity,
      complianceScore,
    ] = await Promise.all([
      this.getControlStats(organizationId),
      this.getEvidenceStats(organizationId),
      this.getUpcomingTests(organizationId),
      this.getRecentActivity(organizationId),
      this.calculateComplianceScore(organizationId),
    ]);

    return {
      complianceScore,
      controls: controlStats,
      evidence: evidenceStats,
      upcomingTests,
      recentActivity,
    };
  }

  async getControlStats(organizationId: string) {
    const implementations = await this.prisma.controlImplementation.findMany({
      where: { organizationId },
      select: {
        status: true,
        control: { select: { category: true } },
      },
    });

    const byStatus: Record<string, number> = {
      not_started: 0,
      in_progress: 0,
      implemented: 0,
      not_applicable: 0,
    };

    const byCategory: Record<string, number> = {};

    implementations.forEach(impl => {
      byStatus[impl.status] = (byStatus[impl.status] || 0) + 1;
      const category = impl.control.category;
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    const overdue = await this.prisma.controlImplementation.count({
      where: {
        organizationId,
        dueDate: { lt: new Date() },
        status: { not: ControlImplementationStatus.implemented },
      },
    });

    return {
      total: implementations.length,
      byStatus,
      byCategory,
      overdue,
    };
  }

  async getEvidenceStats(organizationId: string) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [total, pendingReview, expiringSoon, expired] = await Promise.all([
      this.prisma.evidence.count({ where: { organizationId } }),
      this.prisma.evidence.count({
        where: { organizationId, status: EvidenceStatus.pending_review },
      }),
      this.prisma.evidence.count({
        where: {
          organizationId,
          isExpired: false,
          validUntil: { lte: thirtyDaysFromNow, gt: new Date() },
        },
      }),
      this.prisma.evidence.count({
        where: { organizationId, isExpired: true },
      }),
    ]);

    return { total, pendingReview, expiringSoon, expired };
  }

  async getUpcomingTests(organizationId: string) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return this.prisma.controlImplementation.findMany({
      where: {
        organizationId,
        nextTestDue: { lte: sevenDaysFromNow },
      },
      include: {
        control: { select: { controlId: true, title: true } },
        owner: { select: { displayName: true } },
      },
      orderBy: { nextTestDue: 'asc' },
      take: 10,
    });
  }

  async getRecentActivity(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: { in: ['control', 'evidence'] },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });
  }

  async calculateComplianceScore(organizationId: string) {
    const implementations = await this.prisma.controlImplementation.findMany({
      where: { organizationId },
      select: { status: true },
    });

    if (implementations.length === 0) {
      return { overall: 0, byFramework: {} };
    }

    const implementedCount = implementations.filter(
      i => i.status === ControlImplementationStatus.implemented,
    ).length;

    const applicableCount = implementations.filter(
      i => i.status !== ControlImplementationStatus.not_applicable,
    ).length;

    const overall =
      applicableCount > 0
        ? Math.round((implementedCount / applicableCount) * 100)
        : 0;

    // Calculate by framework
    // Note: Raw SQL uses ENUM string values directly
    const frameworkScores = await this.prisma.$queryRaw<
      { frameworkId: string; name: string; score: number }[]
    >`
      SELECT
        f.id as "frameworkId",
        f.name,
        ROUND(
          COUNT(CASE WHEN ci.status = ${ControlImplementationStatus.implemented} THEN 1 END)::numeric /
          NULLIF(COUNT(CASE WHEN ci.status != ${ControlImplementationStatus.not_applicable} THEN 1 END), 0) * 100
        ) as score
      FROM frameworks f
      JOIN control_mappings cm ON cm.framework_id = f.id
      JOIN control_implementations ci ON ci.control_id = cm.control_id
      WHERE ci.organization_id = ${organizationId}
      GROUP BY f.id, f.name
    `;

    const byFramework: Record<string, number> = {};
    frameworkScores.forEach(fs => {
      byFramework[fs.name] = Number(fs.score) || 0;
    });

    return { overall, byFramework };
  }

  async getComplianceTrend(organizationId: string, days = 30) {
    // This would typically query a historical scores table
    // For now, return current score as single point
    const currentScore = await this.calculateComplianceScore(organizationId);
    
    return [
      {
        date: new Date(),
        score: currentScore.overall,
      },
    ];
  }

  async getControlsByOwner(organizationId: string) {
    const owners = await this.prisma.controlImplementation.groupBy({
      by: ['ownerId'],
      where: { organizationId, ownerId: { not: null } },
      _count: true,
    });

    const ownerDetails = await this.prisma.user.findMany({
      where: {
        id: { in: owners.map(o => o.ownerId!).filter(Boolean) },
      },
      select: { id: true, displayName: true, email: true },
    });

    const ownerMap = new Map(ownerDetails.map(o => [o.id, o]));

    return owners.map(o => ({
      owner: ownerMap.get(o.ownerId!) || { id: o.ownerId, displayName: 'Unknown' },
      count: o._count,
    }));
  }
}

