import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalAudits,
      activeAudits,
      completedAudits,
      totalFindings,
      openFindings,
      criticalFindings,
      overdueFindings,
      totalRequests,
      openRequests,
      recentActivity,
    ] = await Promise.all([
      this.prisma.audit.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.audit.count({ 
        where: { 
          organizationId, 
          deletedAt: null,
          status: { in: ['planning', 'fieldwork', 'testing', 'reporting'] } 
        } 
      }),
      this.prisma.audit.count({ 
        where: { organizationId, deletedAt: null, status: 'completed' } 
      }),
      this.prisma.auditFinding.count({ where: { organizationId } }),
      this.prisma.auditFinding.count({ 
        where: { organizationId, status: { in: ['open', 'acknowledged'] } } 
      }),
      this.prisma.auditFinding.count({ 
        where: { organizationId, severity: 'critical' } 
      }),
      this.prisma.auditFinding.count({
        where: {
          organizationId,
          status: { notIn: ['resolved', 'accepted_risk'] },
          targetDate: { lt: now },
        },
      }),
      this.prisma.auditRequest.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.auditRequest.count({
        where: { organizationId, deletedAt: null, status: { in: ['open', 'in_progress'] } },
      }),
      this.prisma.audit.findMany({
        where: { organizationId, deletedAt: null, updatedAt: { gte: thirtyDaysAgo } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, name: true, status: true, updatedAt: true },
      }),
    ]);

    return {
      totalAudits,
      activeAudits,
      completedAudits,
      totalFindings,
      openFindings,
      criticalFindings,
      overdueFindings,
      totalRequests,
      openRequests,
      recentActivity,
    };
  }

  async getTrends(organizationId: string, period: 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
    const now = new Date();
    let startDate: Date;
    let groupBy: 'month' | 'quarter' | 'year';

    switch (period) {
      case 'quarterly':
        startDate = new Date(now.getFullYear() - 2, 0, 1);
        groupBy = 'quarter';
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear() - 5, 0, 1);
        groupBy = 'year';
        break;
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        groupBy = 'month';
    }

    // Get audits by period
    const audits = await this.prisma.audit.findMany({
      where: { organizationId, createdAt: { gte: startDate }, deletedAt: null },
      select: { id: true, status: true, createdAt: true },
    });

    // Get findings by period
    const findings = await this.prisma.auditFinding.findMany({
      where: { organizationId, createdAt: { gte: startDate } },
      select: { id: true, severity: true, status: true, createdAt: true },
    });

    // Group data by period
    const auditTrends = this.groupByPeriod(audits, groupBy);
    const findingTrends = this.groupByPeriod(findings, groupBy);

    return {
      period,
      audits: auditTrends,
      findings: findingTrends,
    };
  }

  private groupByPeriod(items: { createdAt: Date }[], groupBy: 'month' | 'quarter' | 'year') {
    const grouped: Record<string, number> = {};

    items.forEach(item => {
      const date = new Date(item.createdAt);
      let key: string;

      switch (groupBy) {
        case 'quarter': {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        }
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async getFindingAnalytics(organizationId: string) {
    const [bySeverity, byCategory, byStatus, avgRemediationTime] = await Promise.all([
      this.prisma.auditFinding.groupBy({
        by: ['severity'],
        where: { organizationId },
        _count: { severity: true },
      }),
      this.prisma.auditFinding.groupBy({
        by: ['category'],
        where: { organizationId },
        _count: { category: true },
      }),
      this.prisma.auditFinding.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { status: true },
      }),
      this.calculateAvgRemediationTime(organizationId),
    ]);

    return {
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count.severity })),
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count.category })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.status })),
      avgRemediationDays: avgRemediationTime,
    };
  }

  private async calculateAvgRemediationTime(organizationId: string): Promise<number> {
    const resolvedFindings = await this.prisma.auditFinding.findMany({
      where: {
        organizationId,
        status: 'resolved',
        actualDate: { not: null },
      },
      select: { createdAt: true, actualDate: true },
    });

    if (resolvedFindings.length === 0) return 0;

    const totalDays = resolvedFindings.reduce((sum, f) => {
      const days = Math.floor(
        (new Date(f.actualDate!).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);

    return Math.round(totalDays / resolvedFindings.length);
  }

  async getCoverageMetrics(organizationId: string, auditId?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (auditId) where.auditId = auditId;

    const [totalTests, passedTests, testsByType] = await Promise.all([
      this.prisma.auditTestProcedure.count({ where }),
      this.prisma.auditTestProcedure.count({ where: { ...where, conclusion: 'effective' } }),
      this.prisma.auditTestProcedure.groupBy({
        by: ['testType'],
        where,
        _count: { testType: true },
      }),
    ]);

    return {
      totalTests,
      passedTests,
      effectivenessRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      byTestType: testsByType.map(t => ({ type: t.testType, count: t._count.testType })),
    };
  }

  async createSnapshot(organizationId: string, snapshotType: string = 'daily') {
    const dashboard = await this.getDashboard(organizationId);
    const findings = await this.getFindingAnalytics(organizationId);
    const coverage = await this.getCoverageMetrics(organizationId);

    return this.prisma.auditAnalyticsSnapshot.create({
      data: {
        organizationId,
        snapshotDate: new Date(),
        snapshotType,
        totalAudits: dashboard.totalAudits,
        activeAudits: dashboard.activeAudits,
        completedAudits: dashboard.completedAudits,
        totalFindings: dashboard.totalFindings,
        openFindings: dashboard.openFindings,
        criticalFindings: dashboard.criticalFindings,
        overdueFindings: dashboard.overdueFindings,
        avgRemediationDays: findings.avgRemediationDays,
        testsCompleted: coverage.totalTests,
        testsPassed: coverage.passedTests,
        controlEffectivenessRate: coverage.effectivenessRate,
        totalRequests: dashboard.totalRequests,
        openRequests: dashboard.openRequests,
        findingsByCategory: findings.byCategory,
        findingsByStatus: findings.byStatus,
      },
    });
  }
}

