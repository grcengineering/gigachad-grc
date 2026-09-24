import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  PDFReportGenerator,
  ReportMetadata,
  ComplianceSummaryData,
  FrameworkAssessmentData,
  RiskRegisterData,
  RiskTrendData,
  ControlStatusData,
} from '@gigachad-grc/shared';
import { ControlImplementationStatus, Prisma } from '@prisma/client';

export interface GenerateReportDto {
  reportType:
    | 'compliance_summary'
    | 'framework_assessment'
    | 'risk_register'
    | 'risk_summary'
    | 'treatment_status'
    | 'risk_trends'
    | 'executive_summary'
    | 'control_status'
    | 'bcdr_summary'
    | 'bia_report'
    | 'dr_test_report';
  title?: string;
  frameworkId?: string;
  periodStart?: string;
  periodEnd?: string;
  confidential?: boolean;
  category?: string;
  riskLevel?: string;
  status?: string;
}

export interface MappingGapsReport {
  totals: {
    totalGaps: number;
    requirementsWithoutControls: number;
    controlsWithoutEvidence: number;
    evidenceWithoutApproval: number;
  };
  requirementGaps: Array<{
    id: string;
    framework: string;
    requirementCode: string;
    requirementTitle: string;
    mappedControlCount: number;
  }>;
  controlGaps: Array<{
    id: string;
    controlCode: string;
    controlTitle: string;
    evidenceCount: number;
    lastReviewDate?: Date;
  }>;
  evidenceGaps: Array<{
    id: string;
    evidenceTitle: string;
    type: string;
    status: string;
    daysPending: number;
  }>;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Generate a compliance report PDF
   */
  async generateReport(
    organizationId: string,
    userId: string,
    dto: GenerateReportDto,
    userEmail?: string,
    userName?: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    this.logger.log(`Generating ${dto.reportType} report for org ${organizationId}`);

    // Get organization name
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const orgName = org?.name || 'Organization';

    // Build metadata
    const metadata: ReportMetadata = {
      title: dto.title || this.getDefaultTitle(dto.reportType),
      organization: orgName,
      generatedBy: userName || userEmail || 'System',
      generatedAt: new Date(),
      reportType: this.getRenderType(dto.reportType),
      confidential: dto.confidential ?? true,
    };

    if (dto.periodStart && dto.periodEnd) {
      metadata.period = {
        start: new Date(dto.periodStart),
        end: new Date(dto.periodEnd),
      };
    }

    // Generate report based on type
    let data:
      | ComplianceSummaryData
      | FrameworkAssessmentData
      | RiskRegisterData
      | RiskTrendData
      | ControlStatusData;
    let filename: string;

    switch (dto.reportType) {
      case 'compliance_summary':
        data = await this.getComplianceSummaryData(organizationId);
        filename = `compliance-summary-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'framework_assessment':
        if (!dto.frameworkId) {
          throw new NotFoundException('Framework ID is required for framework assessment reports');
        }
        data = await this.getFrameworkAssessmentData(organizationId, dto.frameworkId);
        metadata.frameworkName = (data as FrameworkAssessmentData).frameworkName;
        filename = `${metadata.frameworkName?.toLowerCase().replace(/\s+/g, '-')}-assessment-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'risk_register':
        data = await this.getRiskRegisterData(organizationId, dto);
        filename = `risk-register-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'risk_summary':
        data = await this.getComplianceSummaryData(organizationId, dto);
        filename = `risk-summary-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'treatment_status':
        data = await this.getRiskRegisterData(organizationId, dto, true);
        filename = `risk-treatment-status-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'risk_trends':
        data = await this.getRiskTrendData(organizationId, dto.periodStart, dto.periodEnd);
        filename = `risk-trends-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'executive_summary':
        data = await this.getComplianceSummaryData(organizationId, dto);
        filename = `risk-executive-summary-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'control_status':
        data = await this.getControlStatusData(organizationId);
        filename = `control-status-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'bcdr_summary':
        data = (await this.getBCDRSummaryData(organizationId)) as unknown as ComplianceSummaryData;
        filename = `bcdr-summary-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'bia_report':
        data = (await this.getBIAReportData(organizationId)) as unknown as ComplianceSummaryData;
        filename = `bia-report-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      case 'dr_test_report':
        data = (await this.getDRTestReportData(
          organizationId,
          dto.periodStart,
          dto.periodEnd
        )) as unknown as ComplianceSummaryData;
        filename = `dr-test-report-${this.formatDateForFilename(new Date())}.pdf`;
        break;

      default:
        throw new NotFoundException(`Unknown report type: ${dto.reportType}`);
    }

    // Generate PDF
    const generator = new PDFReportGenerator(metadata);
    const buffer = await generator.generate(data);

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'report_generated',
      entityType: 'report',
      entityId: filename,
      entityName: metadata.title,
      description: `Generated ${dto.reportType} report: ${metadata.title}`,
      metadata: {
        reportType: dto.reportType,
        frameworkId: dto.frameworkId,
      },
    });

    return { buffer, filename };
  }

  /**
   * Get compliance summary data
   */
  private async getComplianceSummaryData(
    organizationId: string,
    riskFilters?: GenerateReportDto
  ): Promise<ComplianceSummaryData> {
    // Get framework scores
    const frameworks = await this.prisma.framework.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        mappings: {
          select: {
            control: {
              select: {
                implementations: {
                  where: { organizationId },
                  select: { status: true },
                },
              },
            },
          },
        },
      },
    });

    const frameworkScores = frameworks.map((fw) => {
      const implementations = fw.mappings
        .map((m) => m.control.implementations[0]?.status)
        .filter(Boolean);

      const total = implementations.length;
      const implemented = implementations.filter(
        (s) => s === ControlImplementationStatus.implemented
      ).length;

      return {
        name: fw.name,
        score: total > 0 ? Math.round((implemented / total) * 100) : 0,
        totalControls: total,
        implementedControls: implemented,
      };
    });

    // Get overall control status
    const controlStats = await this.prisma.controlImplementation.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    const controlsByStatus = {
      implemented: 0,
      in_progress: 0,
      not_started: 0,
      not_applicable: 0,
    };

    controlStats.forEach((stat) => {
      const key = stat.status.toLowerCase().replace(/ /g, '_') as keyof typeof controlsByStatus;
      if (key in controlsByStatus) {
        controlsByStatus[key] = stat._count;
      }
    });

    const totalControls = Object.values(controlsByStatus).reduce((a, b) => a + b, 0);
    const applicableControls = totalControls - controlsByStatus.not_applicable;
    const overallScore =
      applicableControls > 0
        ? Math.round((controlsByStatus.implemented / applicableControls) * 100)
        : 0;

    // Get risk summary
    const riskWhere: Prisma.RiskWhereInput = {
      organizationId,
      deletedAt: null,
      ...(riskFilters?.category ? { category: riskFilters.category } : {}),
      ...(riskFilters?.status ? { status: riskFilters.status as never } : {}),
      ...(riskFilters?.riskLevel ? { inherentRisk: riskFilters.riskLevel as never } : {}),
    };
    if (riskFilters?.periodStart || riskFilters?.periodEnd) {
      riskWhere.createdAt = {
        ...(riskFilters.periodStart ? { gte: new Date(riskFilters.periodStart) } : {}),
        ...(riskFilters.periodEnd
          ? { lte: new Date(`${riskFilters.periodEnd}T23:59:59.999`) }
          : {}),
      };
    }

    const riskStats = await this.prisma.risk.groupBy({
      by: ['inherentRisk'],
      where: riskWhere,
      _count: true,
    });

    const totalRisks = await this.prisma.risk.count({
      where: riskWhere,
    });

    const openRisks = await this.prisma.risk.count({
      where: {
        ...riskWhere,
        status: {
          in: ['risk_identified', 'actual_risk', 'risk_analysis_in_progress', 'risk_analyzed'],
        },
      },
    });

    const byLevel: Record<string, number> = {};
    riskStats.forEach((stat) => {
      if (stat.inherentRisk) {
        byLevel[stat.inherentRisk] = stat._count;
      }
    });

    // Get evidence summary
    const totalEvidence = await this.prisma.evidence.count({
      where: { organizationId, deletedAt: null },
    });

    const pendingReview = await this.prisma.evidence.count({
      where: { organizationId, deletedAt: null, status: 'pending_review' },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringSoon = await this.prisma.evidence.count({
      where: {
        organizationId,
        deletedAt: null,
        validUntil: { gte: now, lte: thirtyDaysFromNow },
      },
    });

    const expired = await this.prisma.evidence.count({
      where: { organizationId, deletedAt: null, isExpired: true },
    });

    // Get recent activity
    const recentLogs = await this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        action: true,
        entityType: true,
        entityName: true,
        timestamp: true,
        userName: true,
        userEmail: true,
      },
    });

    const recentActivity = recentLogs.map((log) => ({
      action: log.action,
      entityType: log.entityType,
      entityName: log.entityName || 'Unknown',
      timestamp: log.timestamp,
      user: log.userName || log.userEmail || 'System',
    }));

    return {
      overallScore,
      frameworkScores,
      controlsByStatus,
      riskSummary: {
        total: totalRisks,
        byLevel,
        openCount: openRisks,
      },
      evidenceSummary: {
        total: totalEvidence,
        pendingReview,
        expiringSoon,
        expired,
      },
      recentActivity,
    };
  }

  /**
   * Get framework assessment data
   */
  private async getFrameworkAssessmentData(
    organizationId: string,
    frameworkId: string
  ): Promise<FrameworkAssessmentData> {
    const framework = await this.prisma.framework.findUnique({
      where: { id: frameworkId },
      select: {
        id: true,
        name: true,
        version: true,
        requirements: {
          where: { isCategory: false },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            reference: true,
            title: true,
            mappings: {
              select: {
                control: {
                  select: {
                    implementations: {
                      where: { organizationId },
                      select: { status: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!framework) {
      throw new NotFoundException(`Framework ${frameworkId} not found`);
    }

    const requirements = framework.requirements.map((req) => {
      const implementations = req.mappings
        .map((m) => m.control.implementations[0]?.status)
        .filter(Boolean);

      const mappedControls = req.mappings.length;
      const implementedControls = implementations.filter(
        (s) => s === ControlImplementationStatus.implemented
      ).length;

      let status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable' | 'not_assessed';
      if (mappedControls === 0) {
        status = 'not_assessed';
      } else if (implementedControls === mappedControls) {
        status = 'compliant';
      } else if (implementedControls > 0) {
        status = 'partial';
      } else {
        status = 'non_compliant';
      }

      return {
        reference: req.reference,
        title: req.title,
        status,
        mappedControls,
        implementedControls,
      };
    });

    const gapSummary = {
      compliant: requirements.filter((r) => r.status === 'compliant').length,
      partial: requirements.filter((r) => r.status === 'partial').length,
      nonCompliant: requirements.filter((r) => r.status === 'non_compliant').length,
      notAssessed: requirements.filter((r) => r.status === 'not_assessed').length,
    };

    const totalAssessed = gapSummary.compliant + gapSummary.partial + gapSummary.nonCompliant;
    const overallScore =
      totalAssessed > 0 ? Math.round((gapSummary.compliant / totalAssessed) * 100) : 0;

    return {
      frameworkName: framework.name,
      frameworkVersion: framework.version || undefined,
      overallScore,
      requirements,
      gapSummary,
    };
  }

  /**
   * Get risk register data
   */
  private async getRiskRegisterData(
    organizationId: string,
    dto: GenerateReportDto,
    treatmentOnly = false
  ): Promise<RiskRegisterData> {
    const where: Prisma.RiskWhereInput = {
      organizationId,
      deletedAt: null,
      ...(dto.category ? { category: dto.category } : {}),
      ...(dto.status ? { status: dto.status as Prisma.EnumRiskIntakeStatusFilter } : {}),
      ...(dto.riskLevel
        ? { inherentRisk: dto.riskLevel as Prisma.EnumRiskLevelNullableFilter }
        : {}),
      ...(treatmentOnly ? { treatmentPlan: { not: null } } : {}),
    };
    if (dto.periodStart || dto.periodEnd) {
      where.createdAt = {
        ...(dto.periodStart ? { gte: new Date(dto.periodStart) } : {}),
        ...(dto.periodEnd ? { lte: new Date(`${dto.periodEnd}T23:59:59.999`) } : {}),
      };
    }

    const risks = await this.prisma.risk.findMany({
      where,
      orderBy: [{ inherentRisk: 'desc' }, { createdAt: 'desc' }],
      select: {
        riskId: true,
        title: true,
        category: true,
        status: true,
        inherentRisk: true,
        residualRisk: true,
        treatmentPlan: true,
        lastReviewedAt: true,
      },
    });

    return {
      risks: risks.map((risk) => ({
        riskId: risk.riskId,
        title: risk.title,
        category: risk.category || 'Uncategorized',
        status: risk.status,
        inherentRisk: risk.inherentRisk || 'unknown',
        residualRisk: risk.residualRisk || 'unknown',
        treatmentPlan: risk.treatmentPlan || undefined,
        lastReviewed: risk.lastReviewedAt || undefined,
      })),
    };
  }

  private async getRiskTrendData(
    organizationId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<RiskTrendData> {
    const changedAt: Prisma.DateTimeFilter = {
      gte: periodStart ? new Date(periodStart) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      ...(periodEnd ? { lte: new Date(`${periodEnd}T23:59:59.999`) } : {}),
    };
    const history = await this.prisma.riskHistory.findMany({
      where: {
        risk: { organizationId, deletedAt: null },
        changedAt,
        action: {
          in: ['risk_submitted', 'assessment_approved', 'mitigation_done', 'executive_approved'],
        },
      },
      orderBy: { changedAt: 'asc' },
      select: { action: true, changedAt: true },
    });

    const weekly = new Map<
      string,
      { created: number; assessed: number; mitigated: number; accepted: number }
    >();
    for (const entry of history) {
      const date = new Date(entry.changedAt);
      date.setUTCDate(date.getUTCDate() - date.getUTCDay());
      const week = date.toISOString().slice(0, 10);
      const values = weekly.get(week) ?? {
        created: 0,
        assessed: 0,
        mitigated: 0,
        accepted: 0,
      };
      if (entry.action === 'risk_submitted') values.created += 1;
      if (entry.action === 'assessment_approved') values.assessed += 1;
      if (entry.action === 'mitigation_done') values.mitigated += 1;
      if (entry.action === 'executive_approved') values.accepted += 1;
      weekly.set(week, values);
    }

    return {
      trends: Array.from(weekly, ([week, values]) => ({ week, ...values })),
    };
  }

  async getMappingGaps(organizationId: string): Promise<MappingGapsReport> {
    const [requirements, controls, evidence] = await Promise.all([
      this.prisma.frameworkRequirement.findMany({
        where: {
          isCategory: false,
          framework: {
            deletedAt: null,
            OR: [{ organizationId }, { organizationId: null }],
          },
          mappings: {
            none: {
              control: {
                deletedAt: null,
                OR: [{ organizationId }, { organizationId: null }],
              },
            },
          },
        },
        select: {
          id: true,
          reference: true,
          title: true,
          framework: { select: { name: true } },
          _count: {
            select: {
              mappings: {
                where: {
                  control: {
                    deletedAt: null,
                    OR: [{ organizationId }, { organizationId: null }],
                  },
                },
              },
            },
          },
        },
        orderBy: [{ framework: { name: 'asc' } }, { reference: 'asc' }],
      }),
      this.prisma.control.findMany({
        where: {
          deletedAt: null,
          OR: [{ organizationId }, { organizationId: null }],
          implementations: { some: { organizationId } },
          evidenceLinks: {
            none: { evidence: { organizationId, deletedAt: null } },
          },
        },
        select: {
          id: true,
          controlId: true,
          title: true,
          evidenceLinks: {
            where: { evidence: { organizationId, deletedAt: null } },
            select: { id: true },
          },
          implementations: {
            where: { organizationId },
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { lastTestedAt: true, updatedAt: true },
          },
        },
        orderBy: { controlId: 'asc' },
      }),
      this.prisma.evidence.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: { not: 'approved' },
        },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const requirementGaps = requirements.map((requirement) => ({
      id: requirement.id,
      framework: requirement.framework.name,
      requirementCode: requirement.reference,
      requirementTitle: requirement.title,
      mappedControlCount: requirement._count.mappings,
    }));
    const controlGaps = controls.map((control) => ({
      id: control.id,
      controlCode: control.controlId,
      controlTitle: control.title,
      evidenceCount: control.evidenceLinks.length,
      lastReviewDate:
        control.implementations[0]?.lastTestedAt ??
        control.implementations[0]?.updatedAt ??
        undefined,
    }));
    const now = Date.now();
    const evidenceGaps = evidence.map((item) => ({
      id: item.id,
      evidenceTitle: item.title,
      type: item.type,
      status: item.status,
      daysPending: Math.max(
        0,
        Math.floor((now - item.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      ),
    }));

    return {
      totals: {
        totalGaps: requirementGaps.length + controlGaps.length + evidenceGaps.length,
        requirementsWithoutControls: requirementGaps.length,
        controlsWithoutEvidence: controlGaps.length,
        evidenceWithoutApproval: evidenceGaps.length,
      },
      requirementGaps,
      controlGaps,
      evidenceGaps,
    };
  }

  /**
   * Get control status data
   */
  private async getControlStatusData(organizationId: string): Promise<ControlStatusData> {
    const implementations = await this.prisma.controlImplementation.findMany({
      where: { organizationId },
      orderBy: [{ status: 'asc' }, { control: { controlId: 'asc' } }],
      select: {
        status: true,
        lastTestedAt: true,
        nextTestDue: true,
        control: {
          select: {
            controlId: true,
            title: true,
            category: true,
          },
        },
        owner: {
          select: { displayName: true },
        },
      },
    });

    return {
      controls: implementations.map((impl) => ({
        controlId: impl.control.controlId,
        title: impl.control.title,
        category: impl.control.category,
        status: impl.status,
        owner: impl.owner?.displayName,
        lastTested: impl.lastTestedAt || undefined,
        nextTestDue: impl.nextTestDue || undefined,
        // Evidence counts are not directly available on the implementation model
        // in the current Prisma schema, so we omit them here.
        evidenceCount: 0,
      })),
    };
  }

  /**
   * Get BC/DR summary data
   */
  private async getBCDRSummaryData(organizationId: string): Promise<Record<string, unknown>> {
    // Get processes stats
    const processStats = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_1_critical') as tier_1,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_2_essential') as tier_2,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_3_important') as tier_3,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_4_standard') as tier_4,
        AVG(rto_hours) as avg_rto,
        AVG(rpo_hours) as avg_rpo
      FROM bcdr.business_processes
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND is_active = true
    `;

    // Get plan stats
    const planStats = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE next_review_due < NOW()) as overdue_review
      FROM bcdr.bcdr_plans
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    // Get test stats
    const testStats = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE result = 'passed') as passed,
        COUNT(*) FILTER (WHERE result = 'failed') as failed,
        COUNT(*) FILTER (WHERE result = 'passed_with_issues') as issues,
        AVG(actual_recovery_time_minutes) as avg_recovery_time
      FROM bcdr.dr_tests
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND status = 'completed'
    `;

    // Get open findings
    const openFindings = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT f.id, f.title, f.severity, f.remediation_status, t.name as test_name
      FROM bcdr.dr_test_findings f
      JOIN bcdr.dr_tests t ON f.test_id = t.id
      WHERE t.organization_id = ${organizationId}::uuid
        AND f.remediation_required = true
        AND f.remediation_status NOT IN ('resolved', 'accepted')
      ORDER BY 
        CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        f.created_at DESC
      LIMIT 20
    `;

    return {
      processes: processStats[0] || {},
      plans: planStats[0] || {},
      tests: testStats[0] || {},
      openFindings: openFindings,
    };
  }

  /**
   * Get BIA (Business Impact Analysis) report data
   */
  private async getBIAReportData(organizationId: string): Promise<Record<string, unknown>> {
    const processes = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        bp.process_id, bp.name, bp.department, bp.criticality_tier,
        bp.rto_hours, bp.rpo_hours, bp.mtpd_hours,
        bp.financial_impact, bp.operational_impact, bp.reputational_impact, bp.regulatory_impact,
        bp.hourly_revenue_impact, bp.daily_revenue_impact, bp.recovery_cost_estimate,
        u.display_name as owner_name,
        (SELECT COUNT(*) FROM bcdr.process_dependencies WHERE dependent_process_id = bp.id) as dependency_count,
        (SELECT COUNT(*) FROM bcdr.process_assets WHERE process_id = bp.id) as asset_count
      FROM bcdr.business_processes bp
      LEFT JOIN shared.users u ON bp.owner_id = u.id
      WHERE bp.organization_id = ${organizationId}::uuid
        AND bp.deleted_at IS NULL
        AND bp.is_active = true
      ORDER BY 
        CASE bp.criticality_tier 
          WHEN 'tier_1_critical' THEN 1 
          WHEN 'tier_2_essential' THEN 2 
          WHEN 'tier_3_important' THEN 3 
          ELSE 4 
        END,
        bp.name ASC
    `;

    // Get recovery strategies
    const strategies = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        rs.name, rs.strategy_type, rs.estimated_recovery_time_hours, rs.estimated_cost,
        bp.name as process_name
      FROM bcdr.recovery_strategies rs
      LEFT JOIN bcdr.business_processes bp ON rs.process_id = bp.id
      WHERE rs.organization_id = ${organizationId}::uuid
        AND rs.deleted_at IS NULL
      ORDER BY rs.name ASC
    `;

    return {
      processes: processes,
      strategies: strategies,
    };
  }

  /**
   * Get DR Test report data
   */
  private async getDRTestReportData(
    organizationId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<Record<string, unknown>> {
    const startDate = periodStart
      ? new Date(periodStart)
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const endDate = periodEnd ? new Date(periodEnd) : new Date();

    const tests = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        t.test_id, t.name, t.test_type, t.status, t.result,
        t.scheduled_date, t.actual_start_at, t.actual_end_at,
        t.actual_recovery_time_minutes, t.data_loss_minutes,
        t.executive_summary, t.lessons_learned,
        u.display_name as coordinator_name,
        bp.title as plan_title,
        (SELECT COUNT(*) FROM bcdr.dr_test_findings WHERE test_id = t.id) as finding_count
      FROM bcdr.dr_tests t
      LEFT JOIN shared.users u ON t.coordinator_id = u.id
      LEFT JOIN bcdr.bcdr_plans bp ON t.plan_id = bp.id
      WHERE t.organization_id = ${organizationId}::uuid
        AND t.deleted_at IS NULL
        AND t.status = 'completed'
        AND t.actual_end_at >= ${startDate}
        AND t.actual_end_at <= ${endDate}
      ORDER BY t.actual_end_at DESC
    `;

    // Get findings for each test
    const testIds = tests.map((t) => t.id as string);
    const findings =
      testIds.length > 0
        ? await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT 
            f.test_id, f.finding_number, f.title, f.severity, f.category,
            f.remediation_status, f.remediation_notes
          FROM bcdr.dr_test_findings f
          WHERE f.test_id = ANY(${testIds}::uuid[])
          ORDER BY f.test_id, f.finding_number
        `
        : [];

    // Group findings by test
    const findingsByTest: Record<string, Array<Record<string, unknown>>> = {};
    for (const finding of findings) {
      const testId = finding.test_id as string;
      if (!findingsByTest[testId]) {
        findingsByTest[testId] = [];
      }
      findingsByTest[testId].push(finding);
    }

    return {
      tests: tests.map((t) => ({
        ...t,
        findings: findingsByTest[t.id as string] || [],
      })),
      summary: {
        total: tests.length,
        passed: tests.filter((t) => t.result === 'passed').length,
        failed: tests.filter((t) => t.result === 'failed').length,
        passedWithIssues: tests.filter((t) => t.result === 'passed_with_issues').length,
        avgRecoveryTime:
          tests.length > 0
            ? Math.round(
                tests.reduce(
                  (sum, t) => sum + ((t.actual_recovery_time_minutes as number) || 0),
                  0
                ) / tests.length
              )
            : 0,
      },
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Get list of available report types
   */
  getReportTypes() {
    return [
      {
        id: 'compliance_summary',
        name: 'Compliance Summary',
        description: 'Executive overview of compliance posture across all frameworks',
        requiresFramework: false,
      },
      {
        id: 'framework_assessment',
        name: 'Framework Assessment',
        description: 'Detailed assessment against a specific compliance framework',
        requiresFramework: true,
      },
      {
        id: 'risk_register',
        name: 'Risk Register',
        description: 'Complete list of identified risks with status and treatment plans',
        requiresFramework: false,
      },
      {
        id: 'risk_summary',
        name: 'Risk Summary',
        description: 'High-level risk distribution and open-risk summary',
        requiresFramework: false,
        supportsPeriod: true,
      },
      {
        id: 'treatment_status',
        name: 'Risk Treatment Status',
        description: 'Risks with active or completed treatment decisions',
        requiresFramework: false,
        supportsPeriod: true,
      },
      {
        id: 'risk_trends',
        name: 'Risk Trend Analysis',
        description: 'Weekly risk identification, assessment, mitigation, and acceptance activity',
        requiresFramework: false,
        supportsPeriod: true,
      },
      {
        id: 'executive_summary',
        name: 'Executive Risk Summary',
        description: 'Board-ready risk and compliance overview',
        requiresFramework: false,
        supportsPeriod: true,
      },
      {
        id: 'control_status',
        name: 'Control Status Report',
        description: 'Implementation status of all controls with evidence counts',
        requiresFramework: false,
      },
      {
        id: 'bcdr_summary',
        name: 'BC/DR Summary',
        description: 'Business Continuity and Disaster Recovery program overview',
        requiresFramework: false,
      },
      {
        id: 'bia_report',
        name: 'Business Impact Analysis',
        description: 'Detailed BIA report with all business processes and recovery requirements',
        requiresFramework: false,
      },
      {
        id: 'dr_test_report',
        name: 'DR Test Report',
        description: 'Summary of disaster recovery tests with results and findings',
        requiresFramework: false,
        supportsPeriod: true,
      },
    ];
  }

  private getDefaultTitle(reportType: string): string {
    switch (reportType) {
      case 'compliance_summary':
        return 'Compliance Summary Report';
      case 'framework_assessment':
        return 'Framework Assessment Report';
      case 'risk_register':
        return 'Risk Register';
      case 'risk_summary':
        return 'Risk Summary Report';
      case 'treatment_status':
        return 'Risk Treatment Status Report';
      case 'risk_trends':
        return 'Risk Trend Analysis';
      case 'executive_summary':
        return 'Executive Risk Summary';
      case 'control_status':
        return 'Control Status Report';
      case 'bcdr_summary':
        return 'BC/DR Summary Report';
      case 'bia_report':
        return 'Business Impact Analysis Report';
      case 'dr_test_report':
        return 'Disaster Recovery Test Report';
      default:
        return 'Compliance Report';
    }
  }

  private formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getRenderType(reportType: GenerateReportDto['reportType']): ReportMetadata['reportType'] {
    if (reportType === 'risk_trends') return 'risk_trends';
    if (reportType === 'risk_register' || reportType === 'treatment_status') {
      return 'risk_register';
    }
    if (reportType === 'framework_assessment') return 'framework_assessment';
    if (reportType === 'control_status') return 'control_status';
    return 'compliance_summary';
  }
}
