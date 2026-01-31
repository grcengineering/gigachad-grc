import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessProcessesService } from './business-processes.service';
import { BCDRPlansService } from './bcdr-plans.service';
import { DRTestsService } from './dr-tests.service';
import { RunbooksService } from './runbooks.service';
import { RecoveryStrategiesService } from './recovery-strategies.service';

/**
 * Raw query result types for BC/DR dashboard
 */
export interface OverdueItem {
  id: string;
  title?: string;
  name?: string;
  entity_type: string;
  due_date: Date;
  plan_id?: string;
  process_id?: string;
  test_id?: string;
  test_name?: string;
}

export interface CriticalityDistributionItem {
  criticality_tier: string;
  count: bigint | number;
  avg_rto: number | null;
  avg_rpo: number | null;
}

export interface TestHistoryItem {
  month: Date;
  total_tests: bigint | number;
  passed: bigint | number;
  passed_with_issues: bigint | number;
  failed: bigint | number;
  avg_recovery_time: number | null;
}

export interface RTORPOAnalysisItem {
  id: string;
  process_id: string;
  name: string;
  criticality_tier: string;
  rto_hours: number | null;
  rpo_hours: number | null;
  strategy_recovery_time: number | null;
  rto_status: string;
}

export interface PlanCoverageItem {
  id: string;
  process_id: string;
  name: string;
  criticality_tier: string;
  has_plan: boolean;
  plan_count: bigint | number;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  description: string | null;
  timestamp: Date;
  user_email: string | null;
  user_name: string | null;
}

@Injectable()
export class BCDRDashboardService {
  private readonly logger = new Logger(BCDRDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processesService: BusinessProcessesService,
    private readonly plansService: BCDRPlansService,
    private readonly testsService: DRTestsService,
    private readonly runbooksService: RunbooksService,
    private readonly strategiesService: RecoveryStrategiesService,
  ) {}

  // Helper function to convert BigInt values to Numbers in an object
  private convertBigIntToNumber(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(item => this.convertBigIntToNumber(item));
    if (typeof obj === 'object') {
      const converted: Record<string, unknown> = {};
      for (const key in obj) {
        converted[key] = this.convertBigIntToNumber((obj as Record<string, unknown>)[key]);
      }
      return converted;
    }
    return obj;
  }

  async getSummary(organizationId: string) {
    // Default empty stats for when queries fail (e.g., schema not fully migrated)
    const emptyProcessStats = { total: 0, tier_1_count: 0, tier_2_count: 0, tier_3_count: 0, tier_4_count: 0, active_count: 0, overdue_review_count: 0 };
    const emptyPlanStats = { total: 0, draft_count: 0, in_review_count: 0, approved_count: 0, published_count: 0, overdue_review_count: 0, expired_count: 0 };
    const emptyTestStats = { total: 0, scheduled_count: 0, completed_count: 0, passed_count: 0, issues_count: 0, failed_count: 0, overdue_review_count: 0 };
    const emptyGenericStats = { total: 0, active_count: 0 };
    
    // Wrap each service call to handle missing tables gracefully
    const safeCall = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        this.logger.warn(`BC/DR query failed (schema may not be fully migrated): ${error}`);
        return fallback;
      }
    };

    const [
      processStats,
      planStats,
      testStats,
      runbookStats,
      strategyStats,
      upcomingTests,
      overdueItems,
    ] = await Promise.all([
      safeCall(() => this.processesService.getStats(organizationId), emptyProcessStats),
      safeCall(() => this.plansService.getStats(organizationId), emptyPlanStats),
      safeCall(() => this.testsService.getStats(organizationId), emptyTestStats),
      safeCall(() => this.runbooksService.getStats(organizationId), emptyGenericStats),
      safeCall(() => this.strategiesService.getStats(organizationId), emptyGenericStats),
      safeCall(() => this.testsService.getUpcomingTests(organizationId, 30), []),
      safeCall(() => this.getOverdueItems(organizationId), { plans: [], processes: [], findings: [], totalOverdue: 0 }),
    ]);

    return {
      processes: this.convertBigIntToNumber(processStats),
      plans: this.convertBigIntToNumber(planStats),
      tests: this.convertBigIntToNumber(testStats),
      runbooks: this.convertBigIntToNumber(runbookStats),
      strategies: this.convertBigIntToNumber(strategyStats),
      upcomingTests: this.convertBigIntToNumber(Array.isArray(upcomingTests) ? upcomingTests.slice(0, 5) : []),
      overdueItems: this.convertBigIntToNumber(overdueItems),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getOverdueItems(organizationId: string) {
    // Get overdue plan reviews
    const overduePlans = await this.prisma.$queryRaw<OverdueItem[]>`
      SELECT id, plan_id, title, 'bcdr_plan' as entity_type, next_review_due as due_date
      FROM bcdr.bcdr_plans
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND status = 'published'
        AND next_review_due < NOW()
      ORDER BY next_review_due ASC
      LIMIT 10
    `;

    // Get overdue process reviews
    const overdueProcesses = await this.prisma.$queryRaw<OverdueItem[]>`
      SELECT id, process_id, name as title, 'business_process' as entity_type, next_review_due as due_date
      FROM bcdr.business_processes
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND is_active = true
        AND next_review_due < NOW()
      ORDER BY next_review_due ASC
      LIMIT 10
    `;

    // Get overdue test findings
    const overdueFindings = await this.prisma.$queryRaw<OverdueItem[]>`
      SELECT f.id, f.title, 'test_finding' as entity_type, f.remediation_due_date as due_date,
             t.test_id, t.name as test_name
      FROM bcdr.dr_test_findings f
      JOIN bcdr.dr_tests t ON f.test_id = t.id
      WHERE t.organization_id = ${organizationId}::uuid
        AND f.remediation_required = true
        AND f.remediation_status NOT IN ('resolved', 'accepted')
        AND f.remediation_due_date < NOW()
      ORDER BY f.remediation_due_date ASC
      LIMIT 10
    `;

    return {
      plans: overduePlans,
      processes: overdueProcesses,
      findings: overdueFindings,
      totalOverdue: overduePlans.length + overdueProcesses.length + overdueFindings.length,
    };
  }

  async getCriticalityDistribution(organizationId: string) {
    const distribution = await this.prisma.$queryRaw<CriticalityDistributionItem[]>`
      SELECT 
        criticality_tier,
        COUNT(*) as count,
        AVG(rto_hours) as avg_rto,
        AVG(rpo_hours) as avg_rpo
      FROM bcdr.business_processes
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND is_active = true
      GROUP BY criticality_tier
      ORDER BY 
        CASE criticality_tier 
          WHEN 'tier_1_critical' THEN 1 
          WHEN 'tier_2_essential' THEN 2 
          WHEN 'tier_3_important' THEN 3 
          ELSE 4 
        END
    `;

    return distribution;
  }

  async getTestHistory(organizationId: string, months: number = 12) {
    // Validate and sanitize months parameter to prevent SQL injection
    const safeMonths = Math.min(Math.max(1, Math.floor(Number(months) || 12)), 60);
    
    const history = await this.prisma.$queryRaw<TestHistoryItem[]>`
      SELECT 
        DATE_TRUNC('month', actual_end_at) as month,
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE result = 'passed') as passed,
        COUNT(*) FILTER (WHERE result = 'passed_with_issues') as passed_with_issues,
        COUNT(*) FILTER (WHERE result = 'failed') as failed,
        AVG(actual_recovery_time_minutes) as avg_recovery_time
      FROM bcdr.dr_tests
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND status = 'completed'
        AND actual_end_at >= NOW() - (${safeMonths} || ' months')::INTERVAL
      GROUP BY DATE_TRUNC('month', actual_end_at)
      ORDER BY month DESC
    `;

    return history;
  }

  async getRTORPOAnalysis(organizationId: string) {
    const analysis = await this.prisma.$queryRaw<RTORPOAnalysisItem[]>`
      SELECT 
        bp.id, bp.process_id, bp.name, bp.criticality_tier,
        bp.rto_hours, bp.rpo_hours,
        rs.estimated_recovery_time_hours as strategy_recovery_time,
        CASE 
          WHEN rs.estimated_recovery_time_hours <= bp.rto_hours THEN 'compliant'
          WHEN rs.estimated_recovery_time_hours IS NULL THEN 'no_strategy'
          ELSE 'at_risk'
        END as rto_status
      FROM bcdr.business_processes bp
      LEFT JOIN bcdr.recovery_strategies rs ON bp.id = rs.process_id AND rs.deleted_at IS NULL
      WHERE bp.organization_id = ${organizationId}::uuid
        AND bp.deleted_at IS NULL
        AND bp.is_active = true
        AND bp.rto_hours IS NOT NULL
      ORDER BY 
        CASE bp.criticality_tier 
          WHEN 'tier_1_critical' THEN 1 
          WHEN 'tier_2_essential' THEN 2 
          WHEN 'tier_3_important' THEN 3 
          ELSE 4 
        END,
        bp.rto_hours ASC
    `;

    const summary = {
      compliant: analysis.filter(a => a.rto_status === 'compliant').length,
      atRisk: analysis.filter(a => a.rto_status === 'at_risk').length,
      noStrategy: analysis.filter(a => a.rto_status === 'no_strategy').length,
      total: analysis.length,
    };

    return { analysis, summary };
  }

  async getPlanCoverage(organizationId: string) {
    const coverage = await this.prisma.$queryRaw<PlanCoverageItem[]>`
      SELECT 
        bp.id, bp.process_id, bp.name, bp.criticality_tier,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM bcdr.bcdr_plans p 
            WHERE p.organization_id = ${organizationId}::uuid
              AND p.deleted_at IS NULL
              AND p.status = 'published'
              AND bp.id = ANY(p.in_scope_processes)
          ) THEN true
          ELSE false
        END as has_plan,
        (
          SELECT COUNT(*) FROM bcdr.bcdr_plans p 
          WHERE p.organization_id = ${organizationId}::uuid
            AND p.deleted_at IS NULL
            AND p.status = 'published'
            AND bp.id = ANY(p.in_scope_processes)
        ) as plan_count
      FROM bcdr.business_processes bp
      WHERE bp.organization_id = ${organizationId}::uuid
        AND bp.deleted_at IS NULL
        AND bp.is_active = true
      ORDER BY 
        CASE bp.criticality_tier 
          WHEN 'tier_1_critical' THEN 1 
          WHEN 'tier_2_essential' THEN 2 
          WHEN 'tier_3_important' THEN 3 
          ELSE 4 
        END
    `;

    const summary = {
      covered: coverage.filter(c => c.has_plan).length,
      notCovered: coverage.filter(c => !c.has_plan).length,
      total: coverage.length,
      coveragePercent: coverage.length > 0 
        ? Math.round((coverage.filter(c => c.has_plan).length / coverage.length) * 100)
        : 0,
    };

    return { coverage, summary };
  }

  async getRecentActivity(organizationId: string, limit: number = 20) {
    const activity = await this.prisma.$queryRaw<ActivityLogItem[]>`
      SELECT 
        id, action, entity_type, entity_id, entity_name, 
        description, timestamp, user_email, user_name
      FROM controls.audit_logs
      WHERE organization_id = ${organizationId}::uuid
        AND entity_type IN ('business_process', 'bcdr_plan', 'dr_test', 'runbook', 'recovery_strategy', 'communication_plan')
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return activity;
  }

  async getMetrics(organizationId: string) {
    try {
      // Calculate overall BC/DR readiness score
      const emptyTestStats = { total: 0, completed_count: 0, passed_count: 0, issues_count: 0, failed_count: 0, overdue_review_count: 0 };
      const emptyProcessStats = { total: 0, tier_1_count: 0, tier_2_count: 0, tier_3_count: 0, tier_4_count: 0, active_count: 0, overdue_review_count: 0 };
      const emptyRtoAnalysis = { analysis: [] as RTORPOAnalysisItem[], summary: { compliant: 0, atRisk: 0, noStrategy: 0, total: 0 } };
      const emptyPlanCoverage = { coverage: [] as PlanCoverageItem[], summary: { covered: 0, notCovered: 0, total: 0, coveragePercent: 0 } };

      const safeCall = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fn();
        } catch (error) {
          this.logger.warn(`BC/DR metrics query failed: ${error}`);
          return fallback;
        }
      };

      const [rtoAnalysis, planCoverage, testStats, processStats] = await Promise.all([
        safeCall(() => this.getRTORPOAnalysis(organizationId), emptyRtoAnalysis),
        safeCall(() => this.getPlanCoverage(organizationId), emptyPlanCoverage),
        safeCall(() => this.testsService.getStats(organizationId), emptyTestStats),
        safeCall(() => this.processesService.getStats(organizationId), emptyProcessStats),
      ]);

      // Calculate readiness score (0-100)
      const rtoScore = rtoAnalysis.summary?.total > 0
        ? (rtoAnalysis.summary.compliant / rtoAnalysis.summary.total) * 100
        : 0;

      const planScore = planCoverage.summary?.coveragePercent || 0;

      const testSuccessRate = testStats.completed_count > 0
        ? ((Number(testStats.passed_count || 0) + Number(testStats.issues_count || 0)) / Number(testStats.completed_count)) * 100
        : 0;

      const overdueProcessPenalty = processStats.overdue_review_count > 0
        ? Math.min(20, Number(processStats.overdue_review_count) * 2)
        : 0;

      const readinessScore = Math.max(0, Math.min(100, 
        (rtoScore * 0.3 + planScore * 0.3 + testSuccessRate * 0.3) - overdueProcessPenalty
      ));

      return {
        readinessScore: Math.round(readinessScore),
        metrics: {
          rtoCoverage: Math.round(rtoScore),
          planCoverage: planScore,
          testSuccessRate: Math.round(testSuccessRate),
          overdueItems: Number(processStats.overdue_review_count || 0),
        },
        breakdown: {
          rto: rtoAnalysis.summary || { total: 0, compliant: 0 },
          plans: planCoverage.summary || { coveragePercent: 0 },
          tests: {
            total: Number(testStats.total || 0),
            completed: Number(testStats.completed_count || 0),
            passed: Number(testStats.passed_count || 0),
            failed: Number(testStats.failed_count || 0),
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get BC/DR metrics: ${error}`);
      // Return empty metrics on failure
      return {
        readinessScore: 0,
        metrics: { rtoCoverage: 0, planCoverage: 0, testSuccessRate: 0, overdueItems: 0 },
        breakdown: {
          rto: { total: 0, compliant: 0 },
          plans: { coveragePercent: 0 },
          tests: { total: 0, completed: 0, passed: 0, failed: 0 },
        },
      };
    }
  }
}

