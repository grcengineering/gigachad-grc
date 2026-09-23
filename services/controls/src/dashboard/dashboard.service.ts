import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ControlImplementationStatus, EvidenceStatus } from '@prisma/client';
import { CacheService, CacheKeys } from '@gigachad-grc/shared';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService
  ) {}

  /**
   * Consolidated dashboard endpoint - fetches all dashboard data in a single call.
   * This reduces 6+ frontend API calls to 1, significantly improving initial load time.
   * Cache TTL: 300 seconds (5 minutes) for better performance.
   */
  async getFullDashboard(organizationId: string) {
    const cacheKey = `dashboard:full:${organizationId}`;
    const startTime = Date.now();

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Building full dashboard for org ${organizationId}`);

        // Execute all queries in parallel for maximum performance
        const [summary, frameworks, policyStats, riskSummary, vendorSummary] = await Promise.all([
          this.getSummaryUncached(organizationId),
          this.getFrameworksWithReadiness(organizationId),
          this.getPolicyStats(organizationId),
          this.getRiskSummary(organizationId),
          this.getVendorSummary(organizationId),
        ]);

        const duration = Date.now() - startTime;
        this.logger.debug(`Full dashboard built in ${duration}ms`);

        return {
          summary,
          frameworks,
          policyStats,
          riskSummary,
          vendorSummary,
          generatedAt: new Date().toISOString(),
        };
      },
      300 // 5 minute cache - dashboard data doesn't change frequently
    );
  }

  /**
   * Get summary data without caching (for use in consolidated endpoint)
   */
  private async getSummaryUncached(organizationId: string) {
    const [controlStats, evidenceStats, upcomingTests, recentActivity, complianceScore] =
      await Promise.all([
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

  /**
   * Get frameworks with readiness scores
   */
  private async getFrameworksWithReadiness(organizationId: string) {
    const frameworks = await this.prisma.framework.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: null }, // System frameworks
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        version: true,
        _count: {
          select: { requirements: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // If no frameworks, return empty
    if (frameworks.length === 0) {
      return [];
    }

    // Calculate readiness for each framework using a single query
    // Use Prisma.join for safe IN clause parameterization
    const frameworkIds = frameworks.map((f) => f.id);
    const readinessData = await this.prisma.$queryRaw<
      { frameworkId: string; total: number; compliant: number }[]
    >`
      SELECT 
        cm.framework_id as "frameworkId",
        COUNT(DISTINCT cm.control_id)::int as total,
        COUNT(DISTINCT CASE WHEN ci.status::text = ${ControlImplementationStatus.implemented} THEN cm.control_id END)::int as compliant
      FROM control_mappings cm
      LEFT JOIN control_implementations ci ON ci.control_id = cm.control_id AND ci.organization_id = ${organizationId}
      WHERE cm.framework_id = ANY(${frameworkIds}::text[])
      GROUP BY cm.framework_id
    `;

    const readinessMap = new Map(readinessData.map((r) => [r.frameworkId, r]));

    return frameworks.map((fw) => {
      const readiness = readinessMap.get(fw.id);
      const score =
        readiness && readiness.total > 0
          ? Math.round((readiness.compliant / readiness.total) * 100)
          : 0;

      return {
        id: fw.id,
        name: fw.name,
        type: fw.type,
        version: fw.version,
        requirementCount: fw._count.requirements,
        readiness: {
          score,
          total: readiness?.total || 0,
          compliant: readiness?.compliant || 0,
        },
      };
    });
  }

  /**
   * Get policy statistics
   */
  private async getPolicyStats(organizationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, byStatus, overdueReview] = await Promise.all([
      this.prisma.policy.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.policy.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.policy.count({
        where: {
          organizationId,
          deletedAt: null,
          nextReviewDue: { lt: new Date() },
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      draft: 0,
      in_review: 0,
      approved: 0,
      published: 0,
    };

    byStatus.forEach((s) => {
      statusCounts[s.status] = s._count;
    });

    return {
      total,
      draft: statusCounts.draft,
      inReview: statusCounts.in_review,
      approved: statusCounts.approved,
      published: statusCounts.published,
      overdueReview,
    };
  }

  /**
   * Get risk summary for dashboard heatmap
   */
  private async getRiskSummary(organizationId: string) {
    const risks = await this.prisma.risk.findMany({
      where: {
        organizationId,
        deletedAt: null,
        likelihood: { not: null },
        impact: { not: null },
      },
      select: {
        id: true,
        riskId: true,
        title: true,
        likelihood: true,
        impact: true,
        inherentRisk: true,
      },
      take: 100, // Limit for performance
    });

    // Calculate counts by risk level
    const byLevel: Record<string, number> = {};
    risks.forEach((r) => {
      if (r.inherentRisk) {
        byLevel[r.inherentRisk] = (byLevel[r.inherentRisk] || 0) + 1;
      }
    });

    return {
      risks,
      total: risks.length,
      byLevel,
    };
  }

  /**
   * Get vendor summary with criticality breakdown
   */
  private async getVendorSummary(organizationId: string) {
    const [vendors, byCriticality, byStatus] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          name: true,
          criticality: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10, // Only need recent vendors for dashboard
      }),
      this.prisma.vendor.groupBy({
        by: ['criticality'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.vendor.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
    ]);

    const criticalityCounts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    byCriticality.forEach((c) => {
      if (c.criticality) {
        criticalityCounts[c.criticality] = c._count;
      }
    });

    const statusCounts: Record<string, number> = {};
    byStatus.forEach((s) => {
      statusCounts[s.status] = s._count;
    });

    const total = Object.values(criticalityCounts).reduce((a, b) => a + b, 0);

    return {
      total,
      recentVendors: vendors,
      byCriticality: criticalityCounts,
      byStatus: statusCounts,
      active: statusCounts['active'] || 0,
      pendingReview: (statusCounts['pending_review'] || 0) + (statusCounts['in_review'] || 0),
    };
  }

  async getSummary(organizationId: string) {
    const cacheKey = CacheKeys.dashboard(organizationId);

    // Try to get from cache first (60 second TTL for dashboard)
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const [controlStats, evidenceStats, upcomingTests, recentActivity, complianceScore] =
          await Promise.all([
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
      },
      60 // 60 second cache for dashboard data
    );
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

    implementations.forEach((impl) => {
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
      (i) => i.status === ControlImplementationStatus.implemented
    ).length;

    const applicableCount = implementations.filter(
      (i) => i.status !== ControlImplementationStatus.not_applicable
    ).length;

    const overall =
      applicableCount > 0 ? Math.round((implementedCount / applicableCount) * 100) : 0;

    // Calculate by framework
    // Note: Raw SQL uses ENUM string values - cast to text for comparison
    const frameworkScores = await this.prisma.$queryRaw<
      { frameworkId: string; name: string; score: number }[]
    >`
      SELECT
        f.id as "frameworkId",
        f.name,
        ROUND(
          COUNT(CASE WHEN ci.status::text = ${ControlImplementationStatus.implemented} THEN 1 END)::numeric /
          NULLIF(COUNT(CASE WHEN ci.status::text != ${ControlImplementationStatus.not_applicable} THEN 1 END), 0) * 100
        ) as score
      FROM frameworks f
      JOIN control_mappings cm ON cm.framework_id = f.id
      JOIN control_implementations ci ON ci.control_id = cm.control_id
      WHERE ci.organization_id = ${organizationId}
      GROUP BY f.id, f.name
    `;

    const byFramework: Record<string, number> = {};
    frameworkScores.forEach((fs) => {
      byFramework[fs.name] = Number(fs.score) || 0;
    });

    return { overall, byFramework };
  }

  async getComplianceTrend(organizationId: string, days = 30) {
    const periodDays = Math.max(1, Math.min(Math.trunc(Number(days) || 30), 365));
    const now = new Date();
    const oldestBoundary = new Date(now);
    oldestBoundary.setUTCDate(oldestBoundary.getUTCDate() - (periodDays - 1));

    const [implementations, statusChanges] = await Promise.all([
      this.prisma.controlImplementation.findMany({
        where: { organizationId },
        select: { controlId: true, status: true, createdAt: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          organizationId,
          entityType: 'control',
          timestamp: { gte: oldestBoundary },
        },
        select: { entityId: true, changes: true, timestamp: true },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const statuses = new Map(
      implementations.map((implementation) => [implementation.controlId, implementation.status])
    );
    const createdAt = new Map(
      implementations.map((implementation) => [implementation.controlId, implementation.createdAt])
    );
    const validStatuses = new Set(Object.values(ControlImplementationStatus));
    const points: Array<{ date: Date; score: number }> = [];
    let changeIndex = 0;

    for (let offset = 0; offset < periodDays; offset++) {
      const boundary = new Date(now);
      boundary.setUTCDate(boundary.getUTCDate() - offset);

      while (
        changeIndex < statusChanges.length &&
        statusChanges[changeIndex].timestamp.getTime() > boundary.getTime()
      ) {
        const change = statusChanges[changeIndex];
        const changes = change.changes as {
          before?: { status?: ControlImplementationStatus };
        } | null;
        const previousStatus = changes?.before?.status;
        if (previousStatus && validStatuses.has(previousStatus)) {
          statuses.set(change.entityId, previousStatus);
        }
        changeIndex++;
      }

      const historicalStatuses = [...statuses.entries()]
        .filter(([controlId]) => (createdAt.get(controlId)?.getTime() ?? 0) <= boundary.getTime())
        .map(([, status]) => status);
      const applicable = historicalStatuses.filter(
        (status) => status !== ControlImplementationStatus.not_applicable
      );
      const implemented = applicable.filter(
        (status) => status === ControlImplementationStatus.implemented
      ).length;

      points.push({
        date: boundary,
        score: applicable.length > 0 ? Math.round((implemented / applicable.length) * 100) : 0,
      });
    }

    return points.reverse();
  }

  async getControlsByOwner(organizationId: string) {
    const owners = await this.prisma.controlImplementation.groupBy({
      by: ['ownerId'],
      where: { organizationId, ownerId: { not: null } },
      _count: true,
    });

    const ownerDetails = await this.prisma.user.findMany({
      where: {
        id: { in: owners.map((o) => o.ownerId!).filter(Boolean) },
      },
      select: { id: true, displayName: true, email: true },
    });

    const ownerMap = new Map(ownerDetails.map((o) => [o.id, o]));

    return owners.map((o) => ({
      owner: ownerMap.get(o.ownerId!) || { id: o.ownerId, displayName: 'Unknown' },
      count: o._count,
    }));
  }
}
