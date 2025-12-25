import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessProcessesService } from './business-processes.service';
import { BCDRPlansService } from './bcdr-plans.service';
import { DRTestsService } from './dr-tests.service';
import { RunbooksService } from './runbooks.service';
import { RecoveryStrategiesService } from './recovery-strategies.service';

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
  private convertBigIntToNumber(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(item => this.convertBigIntToNumber(item));
    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        converted[key] = this.convertBigIntToNumber(obj[key]);
      }
      return converted;
    }
    return obj;
  }

  async getSummary(organizationId: string) {
    const [
      processStats,
      planStats,
      testStats,
      runbookStats,
      strategyStats,
      upcomingTests,
      overdueItems,
    ] = await Promise.all([
      this.processesService.getStats(organizationId),
      this.plansService.getStats(organizationId),
      this.testsService.getStats(organizationId),
      this.runbooksService.getStats(organizationId),
      this.strategiesService.getStats(organizationId),
      this.testsService.getUpcomingTests(organizationId, 30),
      this.getOverdueItems(organizationId),
    ]);

    return {
      processes: this.convertBigIntToNumber(processStats),
      plans: this.convertBigIntToNumber(planStats),
      tests: this.convertBigIntToNumber(testStats),
      runbooks: this.convertBigIntToNumber(runbookStats),
      strategies: this.convertBigIntToNumber(strategyStats),
      upcomingTests: this.convertBigIntToNumber(upcomingTests.slice(0, 5)),
      overdueItems: this.convertBigIntToNumber(overdueItems),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getOverdueItems(organizationId: string) {
    // Get overdue plan reviews
    const overduePlans = await this.prisma.$queryRaw<any[]>`
      SELECT id, plan_id, title, 'bcdr_plan' as entity_type, next_review_due as due_date
      FROM bcdr.bcdr_plans
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
        AND status = 'published'
        AND next_review_due < NOW()
      ORDER BY next_review_due ASC
      LIMIT 10
    `;

    // Get overdue process reviews
    const overdueProcesses = await this.prisma.$queryRaw<any[]>`
      SELECT id, process_id, name as title, 'business_process' as entity_type, next_review_due as due_date
      FROM bcdr.business_processes
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
        AND is_active = true
        AND next_review_due < NOW()
      ORDER BY next_review_due ASC
      LIMIT 10
    `;

    // Get overdue test findings - simplified query as remediation columns may not exist
    let overdueFindings: any[] = [];
    try {
      overdueFindings = await this.prisma.$queryRaw<any[]>`
        SELECT f.id, f.title, 'test_finding' as entity_type,
               t.test_id, t.name as test_name
        FROM bcdr.dr_test_findings f
        JOIN bcdr.dr_tests t ON f.test_id = t.id
        WHERE t.organization_id = ${organizationId}
        ORDER BY f.created_at DESC
        LIMIT 10
      `;
    } catch (e) {
      const errorMessage = 'Could not fetch overdue findings for organization ' + organizationId;
      if (e instanceof Error) {
        this.logger.error(errorMessage + ': ' + e.message, e.stack);
      } else {
        this.logger.error(errorMessage + ': ' + JSON.stringify(e));
      }
      overdueFindings = [];
    }

    return {
      plans: overduePlans,
      processes: overdueProcesses,
      findings: overdueFindings,
      totalOverdue: overduePlans.length + overdueProcesses.length + overdueFindings.length,
    };
  }

  async getCriticalityDistribution(organizationId: string) {
    const distribution = await this.prisma.$queryRaw<any[]>`
      SELECT 
        criticality_tier,
        COUNT(*) as count,
        AVG(rto_hours) as avg_rto,
        AVG(rpo_hours) as avg_rpo
      FROM bcdr.business_processes
      WHERE organization_id = ${organizationId}
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
    
    const history = await this.prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC('month', actual_end_at) as month,
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE result = 'passed') as passed,
        COUNT(*) FILTER (WHERE result = 'passed_with_issues') as passed_with_issues,
        COUNT(*) FILTER (WHERE result = 'failed') as failed,
        AVG(actual_recovery_time_minutes) as avg_recovery_time
      FROM bcdr.dr_tests
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
        AND status = 'completed'
        AND actual_end_at >= NOW() - (${safeMonths} || ' months')::INTERVAL
      GROUP BY DATE_TRUNC('month', actual_end_at)
      ORDER BY month DESC
    `;

    return history;
  }

  async getRTORPOAnalysis(organizationId: string) {
    const analysis = await this.prisma.$queryRaw<any[]>`
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
      WHERE bp.organization_id = ${organizationId}
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
    const coverage = await this.prisma.$queryRaw<any[]>`
      SELECT 
        bp.id, bp.process_id, bp.name, bp.criticality_tier,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM bcdr.bcdr_plans p 
            WHERE p.organization_id = ${organizationId}
              AND p.deleted_at IS NULL
              AND p.status = 'published'
              AND bp.id = ANY(p.in_scope_processes)
          ) THEN true
          ELSE false
        END as has_plan,
        (
          SELECT COUNT(*) FROM bcdr.bcdr_plans p 
          WHERE p.organization_id = ${organizationId}
            AND p.deleted_at IS NULL
            AND p.status = 'published'
            AND bp.id = ANY(p.in_scope_processes)
        ) as plan_count
      FROM bcdr.business_processes bp
      WHERE bp.organization_id = ${organizationId}
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
    const activity = await this.prisma.$queryRaw<any[]>`
      SELECT 
        id, action, entity_type, entity_id, entity_name, 
        description, timestamp, user_email, user_name
      FROM controls.audit_logs
      WHERE organization_id = ${organizationId}
        AND entity_type IN ('business_process', 'bcdr_plan', 'dr_test', 'runbook', 'recovery_strategy', 'communication_plan')
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return activity;
  }

  async getMetrics(organizationId: string) {
    // Calculate overall BC/DR readiness score
    const [rtoAnalysis, planCoverage, testStats, processStats] = await Promise.all([
      this.getRTORPOAnalysis(organizationId),
      this.getPlanCoverage(organizationId),
      this.testsService.getStats(organizationId),
      this.processesService.getStats(organizationId),
    ]);

    // Calculate readiness score (0-100)
    const rtoScore = rtoAnalysis.summary.total > 0
      ? (rtoAnalysis.summary.compliant / rtoAnalysis.summary.total) * 100
      : 0;

    const planScore = planCoverage.summary.coveragePercent || 0;

    const testSuccessRate = testStats.completed_count > 0
      ? ((Number(testStats.passed_count) + Number(testStats.issues_count)) / Number(testStats.completed_count)) * 100
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
        rto: rtoAnalysis.summary,
        plans: planCoverage.summary,
        tests: {
          total: Number(testStats.total || 0),
          completed: Number(testStats.completed_count || 0),
          passed: Number(testStats.passed_count || 0),
          failed: Number(testStats.failed_count || 0),
        },
      },
    };
  }
}

