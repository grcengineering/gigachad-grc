import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditFinding, AuditRequest, AuditTestResult, AuditTeamMember, AuditWorkpaper, User } from '@prisma/client';

export interface ReportOptions {
  includeFindings?: boolean;
  includeRequests?: boolean;
  includeTestResults?: boolean;
  includeWorkpapers?: boolean;
  findingSeverityFilter?: string[];
}

interface AuditWithRelations {
  id: string;
  name: string;
  auditType: string;
  framework: string | null;
  status: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  scope: string | null;
  methodology: string | null;
  objectives: string | null;
  overallRating: string | null;
  findings?: AuditFinding[];
  requests?: (AuditRequest & { evidence?: unknown[] })[];
  testResults?: AuditTestResult[];
  teamMembers?: (AuditTeamMember & { user: Pick<User, 'displayName' | 'email'> | null })[];
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateAuditReport(
    auditId: string,
    organizationId: string,
    reportType: string = 'full',
    options: ReportOptions = {},
  ) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
      include: {
        findings: options.includeFindings !== false,
        requests: options.includeRequests !== false ? {
          include: { evidence: true },
        } : false,
        testResults: options.includeTestResults !== false,
        teamMembers: {
          include: { user: { select: { displayName: true, email: true } } },
        },
      },
    });

    if (!audit) throw new NotFoundException(`Audit ${auditId} not found`);

    const workpapers = options.includeWorkpapers ? await this.prisma.auditWorkpaper.findMany({
      where: { auditId, status: 'approved' },
    }) : [];

    // Generate report based on type
    switch (reportType) {
      case 'executive':
        return this.generateExecutiveReport(audit);
      case 'management_letter':
        return this.generateManagementLetter(audit);
      case 'findings_summary':
        return this.generateFindingsSummary(audit);
      default:
        return this.generateFullReport(audit, workpapers);
    }
  }

  private generateExecutiveReport(audit: AuditWithRelations) {
    const findings = audit.findings || [];
    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const highCount = findings.filter((f) => f.severity === 'high').length;
    const mediumCount = findings.filter((f) => f.severity === 'medium').length;
    const lowCount = findings.filter((f) => f.severity === 'low').length;

    return {
      reportType: 'executive',
      generatedAt: new Date(),
      audit: {
        id: audit.id,
        name: audit.name,
        auditType: audit.auditType,
        framework: audit.framework,
        status: audit.status,
        period: {
          plannedStart: audit.plannedStartDate,
          plannedEnd: audit.plannedEndDate,
          actualStart: audit.actualStartDate,
          actualEnd: audit.actualEndDate,
        },
      },
      executiveSummary: this.buildExecutiveSummary(audit, findings),
      findingsOverview: {
        total: findings.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        open: findings.filter((f) => f.status === 'open').length,
        resolved: findings.filter((f) => f.status === 'resolved').length,
      },
      keyFindings: findings
        .filter((f) => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
        .map((f) => ({
          title: f.title,
          severity: f.severity,
          category: f.category,
          status: f.status,
        })),
      recommendations: this.buildRecommendations(findings),
      overallRating: audit.overallRating || this.calculateRating(criticalCount, highCount),
    };
  }

  private generateManagementLetter(audit: AuditWithRelations) {
    const findings = audit.findings || [];

    return {
      reportType: 'management_letter',
      generatedAt: new Date(),
      audit: {
        id: audit.id,
        name: audit.name,
        framework: audit.framework,
      },
      introduction: `This management letter summarizes the results of the ${audit.name} audit conducted for ${audit.framework || 'the specified scope'}.`,
      scope: audit.scope || 'As defined in the audit plan',
      methodology: audit.methodology || 'Standard audit procedures were performed including inquiry, observation, inspection, and testing.',
      findings: findings.map((f) => ({
        findingNumber: f.findingNumber,
        title: f.title,
        severity: f.severity,
        description: f.description,
        recommendation: f.recommendation,
        managementResponse: f.managementResponse,
        targetDate: f.targetDate,
      })),
      conclusion: this.buildConclusion(audit, findings),
    };
  }

  private generateFindingsSummary(audit: AuditWithRelations) {
    const findings = audit.findings || [];

    return {
      reportType: 'findings_summary',
      generatedAt: new Date(),
      audit: {
        id: audit.id,
        name: audit.name,
      },
      summary: {
        total: findings.length,
        bySeverity: this.groupByField(findings, 'severity'),
        byStatus: this.groupByField(findings, 'status'),
        byCategory: this.groupByField(findings, 'category'),
      },
      findings: findings.map((f) => ({
        findingNumber: f.findingNumber,
        title: f.title,
        severity: f.severity,
        category: f.category,
        status: f.status,
        identifiedAt: f.identifiedAt,
        targetDate: f.targetDate,
        actualDate: f.actualDate,
        daysOpen: f.actualDate 
          ? Math.floor((new Date(f.actualDate).getTime() - new Date(f.identifiedAt).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((new Date().getTime() - new Date(f.identifiedAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };
  }

  private generateFullReport(audit: AuditWithRelations, workpapers: AuditWorkpaper[]) {
    const executiveSection = this.generateExecutiveReport(audit);
    const findingsSection = this.generateFindingsSummary(audit);

    return {
      reportType: 'full',
      generatedAt: new Date(),
      ...executiveSection,
      detailedFindings: findingsSection.findings,
      testingResults: (audit.testResults || []).map((t) => ({
        testNumber: t.testNumber,
        controlId: t.controlId,
        objective: t.testObjective,
        result: t.result,
        exceptionCount: t.exceptionCount,
        observations: t.observations,
      })),
      requestsStatus: {
        total: (audit.requests || []).length,
        byStatus: this.groupByField(audit.requests || [], 'status'),
      },
      workpapers: workpapers.map((w) => ({
        workpaperNumber: w.workpaperNumber,
        title: w.title,
        status: w.status,
        preparedBy: w.preparedBy,
        approvedAt: w.approvedAt,
      })),
      teamMembers: (audit.teamMembers || []).map((m) => ({
        name: m.user?.displayName,
        role: m.role,
      })),
      appendix: {
        methodology: audit.methodology,
        scope: audit.scope,
        objectives: audit.objectives,
      },
    };
  }

  private buildExecutiveSummary(audit: AuditWithRelations, findings: AuditFinding[]): string {
    const critical = findings.filter((f) => f.severity === 'critical').length;
    const high = findings.filter((f) => f.severity === 'high').length;
    const open = findings.filter((f) => f.status === 'open').length;

    let summary = `The ${audit.name} audit has been completed. `;
    summary += `A total of ${findings.length} findings were identified, `;
    summary += `including ${critical} critical and ${high} high severity issues. `;
    
    if (open > 0) {
      summary += `Currently, ${open} findings remain open and require management attention. `;
    }

    if (critical > 0) {
      summary += 'Immediate action is required to address critical findings.';
    } else if (high > 2) {
      summary += 'Prompt attention is recommended for high severity findings.';
    } else {
      summary += 'Overall, the control environment demonstrates reasonable maturity.';
    }

    return summary;
  }

  private buildRecommendations(findings: AuditFinding[]): string[] {
    const recommendations: string[] = [];
    
    const openFindings = findings.filter((f) => f.status === 'open');
    if (openFindings.length > 0) {
      recommendations.push(`Develop remediation plans for ${openFindings.length} open findings`);
    }

    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      recommendations.push('Prioritize immediate remediation of critical findings');
    }

    const categories = [...new Set(findings.map((f) => f.category))];
    if (categories.length > 3) {
      recommendations.push('Implement cross-functional improvement program');
    }

    recommendations.push('Schedule follow-up assessment to validate remediation effectiveness');

    return recommendations;
  }

  private buildConclusion(_audit: AuditWithRelations, findings: AuditFinding[]): string {
    const critical = findings.filter((f) => f.severity === 'critical').length;
    const high = findings.filter((f) => f.severity === 'high').length;

    if (critical === 0 && high === 0) {
      return 'Based on our audit procedures, we conclude that the control environment is operating effectively with no significant deficiencies identified.';
    } else if (critical === 0 && high <= 2) {
      return 'Based on our audit procedures, we conclude that while some improvements are needed, the overall control environment is adequate. Management should address the identified high severity findings in a timely manner.';
    } else {
      return 'Based on our audit procedures, we have identified significant control deficiencies that require immediate management attention. We recommend prioritizing remediation efforts to address critical and high severity findings.';
    }
  }

  private calculateRating(critical: number, high: number): string {
    if (critical > 0) return 'fail';
    if (high > 2) return 'pass_with_observations';
    return 'pass';
  }

  private groupByField<T extends Record<string, unknown>>(items: T[], key: keyof T): Record<string, number> {
    const result: Record<string, number> = {};
    items.forEach(item => {
      const value = String(item[key] || 'unspecified');
      result[value] = (result[value] || 0) + 1;
    });
    return result;
  }

  async listReportTypes() {
    return [
      { id: 'full', name: 'Full Audit Report', description: 'Comprehensive report with all sections' },
      { id: 'executive', name: 'Executive Summary', description: 'High-level summary for leadership' },
      { id: 'management_letter', name: 'Management Letter', description: 'Formal letter with findings and recommendations' },
      { id: 'findings_summary', name: 'Findings Summary', description: 'Detailed listing of all findings' },
    ];
  }
}

