import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ResetResult {
  success: boolean;
  recordsDeleted: {
    controls: number;
    controlImplementations: number;
    evidence: number;
    policies: number;
    risks: number;
    riskScenarios: number;
    vendors: number;
    vendorAssessments: number;
    employees: number;
    employeeCompliance: number;
    assets: number;
    integrations: number;
    audits: number;
    frameworks: number;
    other: number;
  };
  totalRecords: number;
  preservedRecords: string[];
}

const CONFIRMATION_PHRASE = 'DELETE ALL DATA';

@Injectable()
export class ResetDataService {
  private readonly logger = new Logger(ResetDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reset all organization data
   * Requires explicit confirmation to prevent accidental data loss
   */
  async resetOrganizationData(
    organizationId: string,
    userId: string,
    confirmationPhrase: string,
  ): Promise<ResetResult> {
    // Validate confirmation phrase
    if (confirmationPhrase !== CONFIRMATION_PHRASE) {
      throw new ForbiddenException(
        `Invalid confirmation. Please type exactly: "${CONFIRMATION_PHRASE}"`,
      );
    }

    this.logger.warn(`Starting data reset for organization ${organizationId} by user ${userId}`);

    const result: ResetResult = {
      success: false,
      recordsDeleted: {
        controls: 0,
        controlImplementations: 0,
        evidence: 0,
        policies: 0,
        risks: 0,
        riskScenarios: 0,
        vendors: 0,
        vendorAssessments: 0,
        employees: 0,
        employeeCompliance: 0,
        assets: 0,
        integrations: 0,
        audits: 0,
        frameworks: 0,
        other: 0,
      },
      totalRecords: 0,
      preservedRecords: [
        'Organization record',
        'Users',
        'Permission groups',
        'Notification configuration',
        'API keys',
      ],
    };

    try {
      // Create audit log entry BEFORE deletion
      await this.createAuditLogEntry(organizationId, userId, 'data_reset_initiated', {
        confirmationProvided: true,
      });

      // Delete in correct order to respect foreign key constraints
      // Start with the most dependent tables first

      // 1. Employee compliance data
      const employeeIds = await this.prisma.correlatedEmployee.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const employeeIdList = employeeIds.map((e) => e.id);

      if (employeeIdList.length > 0) {
        // Delete employee-related records
        const trainingDeleted = await this.prisma.employeeTrainingRecord.deleteMany({
          where: { correlatedEmployeeId: { in: employeeIdList } },
        });
        result.recordsDeleted.employeeCompliance += trainingDeleted.count;

        const bgChecksDeleted = await this.prisma.employeeBackgroundCheck.deleteMany({
          where: { correlatedEmployeeId: { in: employeeIdList } },
        });
        result.recordsDeleted.employeeCompliance += bgChecksDeleted.count;

        const assetAssignmentsDeleted = await this.prisma.employeeAssetAssignment.deleteMany({
          where: { correlatedEmployeeId: { in: employeeIdList } },
        });
        result.recordsDeleted.employeeCompliance += assetAssignmentsDeleted.count;

        const accessRecordsDeleted = await this.prisma.employeeAccessRecord.deleteMany({
          where: { correlatedEmployeeId: { in: employeeIdList } },
        });
        result.recordsDeleted.employeeCompliance += accessRecordsDeleted.count;

        const securityScoresDeleted = await this.prisma.employeeSecurityScore.deleteMany({
          where: { correlatedEmployeeId: { in: employeeIdList } },
        });
        result.recordsDeleted.employeeCompliance += securityScoresDeleted.count;

        const attestationsDeleted = await this.prisma.employeeAttestation.deleteMany({
          where: { correlatedEmployeeId: { in: employeeIdList } },
        });
        result.recordsDeleted.employeeCompliance += attestationsDeleted.count;
      }

      // 2. Delete employees
      const employeesDeleted = await this.prisma.correlatedEmployee.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.employees = employeesDeleted.count;

      // 3. Delete audits and related data
      const auditIds = await this.prisma.audit.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const auditIdList = auditIds.map((a) => a.id);

      if (auditIdList.length > 0) {
        // Delete audit-related records (findings, requests, team members, etc.)
        await this.prisma.auditTestResult.deleteMany({
          where: { auditId: { in: auditIdList } },
        });
        await this.prisma.auditRequest.deleteMany({
          where: { auditId: { in: auditIdList } },
        });
        await this.prisma.auditFinding.deleteMany({
          where: { auditId: { in: auditIdList } },
        });
        await this.prisma.auditTeamMember.deleteMany({
          where: { auditId: { in: auditIdList } },
        });
      }

      const auditsDeleted = await this.prisma.audit.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.audits = auditsDeleted.count;

      // 4. Delete vendor assessments and vendors
      const vendorIds = await this.prisma.vendor.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const vendorIdList = vendorIds.map((v) => v.id);

      if (vendorIdList.length > 0) {
        // Delete vendor-related records
        await this.prisma.vendorAssessment.deleteMany({
          where: { vendorId: { in: vendorIdList } },
        });
        await this.prisma.vendorAccessReview.deleteMany({
          where: { vendorId: { in: vendorIdList } },
        });
        await this.prisma.vendorContact.deleteMany({
          where: { vendorId: { in: vendorIdList } },
        });
        await this.prisma.vendorDocument.deleteMany({
          where: { vendorId: { in: vendorIdList } },
        });
      }

      const vendorsDeleted = await this.prisma.vendor.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.vendors = vendorsDeleted.count;

      // 5. Delete risk scenarios (templates)
      const riskScenariosDeleted = await this.prisma.riskScenarioTemplate.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.riskScenarios = riskScenariosDeleted.count;

      // 6. Delete risks and related data
      const riskIds = await this.prisma.risk.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const riskIdList = riskIds.map((r) => r.id);

      if (riskIdList.length > 0) {
        await this.prisma.riskAsset.deleteMany({
          where: { riskId: { in: riskIdList } },
        });
        await this.prisma.riskAssessment.deleteMany({
          where: { riskId: { in: riskIdList } },
        });
        await this.prisma.riskTreatment.deleteMany({
          where: { riskId: { in: riskIdList } },
        });
        await this.prisma.riskHistory.deleteMany({
          where: { riskId: { in: riskIdList } },
        });
        // Delete risk scenarios that are linked to risks
        await this.prisma.riskScenario.deleteMany({
          where: { riskId: { in: riskIdList } },
        });
      }

      const risksDeleted = await this.prisma.risk.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.risks = risksDeleted.count;

      // 6. Delete assets
      const assetsDeleted = await this.prisma.asset.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.assets = assetsDeleted.count;

      // 7. Delete policies and related data
      const policyIds = await this.prisma.policy.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const policyIdList = policyIds.map((p) => p.id);

      if (policyIdList.length > 0) {
        await this.prisma.policyVersion.deleteMany({
          where: { policyId: { in: policyIdList } },
        });
        await this.prisma.policyApproval.deleteMany({
          where: { policyId: { in: policyIdList } },
        });
        await this.prisma.policyReview.deleteMany({
          where: { policyId: { in: policyIdList } },
        });
        await this.prisma.policyControlLink.deleteMany({
          where: { policyId: { in: policyIdList } },
        });
        await this.prisma.policyStatusHistory.deleteMany({
          where: { policyId: { in: policyIdList } },
        });
      }

      const policiesDeleted = await this.prisma.policy.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.policies = policiesDeleted.count;

      // 8. Delete evidence
      const evidenceDeleted = await this.prisma.evidence.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.evidence = evidenceDeleted.count;

      // 9. Delete controls and implementations
      const controlIds = await this.prisma.control.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const controlIdList = controlIds.map((c) => c.id);

      if (controlIdList.length > 0) {
        // Delete control-related records
        await this.prisma.controlMapping.deleteMany({
          where: { controlId: { in: controlIdList } },
        });
        await this.prisma.controlEvidenceCollector.deleteMany({
          where: { controlId: { in: controlIdList } },
        });

        const implIds = await this.prisma.controlImplementation.findMany({
          where: { controlId: { in: controlIdList } },
          select: { id: true },
        });
        const implIdList = implIds.map((i) => i.id);

        if (implIdList.length > 0) {
          await this.prisma.controlTest.deleteMany({
            where: { implementationId: { in: implIdList } },
          });
        }

        const implDeleted = await this.prisma.controlImplementation.deleteMany({
          where: { controlId: { in: controlIdList } },
        });
        result.recordsDeleted.controlImplementations = implDeleted.count;
      }

      const controlsDeleted = await this.prisma.control.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.controls = controlsDeleted.count;

      // 10. Delete integrations (except keep active ones? No, delete all)
      const integrationIds = await this.prisma.integration.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const integrationIdList = integrationIds.map((i) => i.id);

      if (integrationIdList.length > 0) {
        await this.prisma.syncJob.deleteMany({
          where: { integrationId: { in: integrationIdList } },
        });
        await this.prisma.complianceCheck.deleteMany({
          where: { integrationId: { in: integrationIdList } },
        });
        await this.prisma.customIntegrationConfig.deleteMany({
          where: { integrationId: { in: integrationIdList } },
        });
      }

      const integrationsDeleted = await this.prisma.integration.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.integrations = integrationsDeleted.count;

      // 11. Delete frameworks and related data
      await this.prisma.readinessAssessment.deleteMany({
        where: { organizationId },
      });
      
      // Delete frameworks for this organization
      const frameworksDeleted = await this.prisma.framework.deleteMany({
        where: { organizationId },
      });
      result.recordsDeleted.frameworks = frameworksDeleted.count;

      // 12. Delete other miscellaneous data
      await this.prisma.alert.deleteMany({
        where: { organizationId },
      });
      
      await this.prisma.task.deleteMany({
        where: { organizationId },
      });

      await this.prisma.comment.deleteMany({
        where: { organizationId },
      });

      // 13. Clear demo data flag (use upsert to handle case where org doesn't exist)
      await this.prisma.organization.upsert({
        where: { id: organizationId },
        update: {
          settings: {
            demoDataLoaded: false,
            demoDataLoadedAt: null,
            demoDataLoadedBy: null,
            lastResetAt: new Date().toISOString(),
            lastResetBy: userId,
          },
        },
        create: {
          id: organizationId,
          name: 'Demo Organization',
          slug: 'demo-org',
          description: 'Default organization for GigaChad GRC demo',
          status: 'active',
          settings: {
            demoDataLoaded: false,
            lastResetAt: new Date().toISOString(),
            lastResetBy: userId,
          },
        },
      });

      // Calculate total
      result.totalRecords = Object.values(result.recordsDeleted).reduce((a, b) => a + b, 0);
      result.success = true;

      this.logger.log(`Data reset completed. Total records deleted: ${result.totalRecords}`);

      // Create audit log entry AFTER deletion
      await this.createAuditLogEntry(organizationId, userId, 'data_reset_completed', result);

      return result;
    } catch (error) {
      this.logger.error(`Failed to reset data: ${error}`);
      throw error;
    }
  }

  /**
   * Get data summary for an organization (for confirmation dialog)
   */
  async getDataSummary(organizationId: string): Promise<Record<string, number>> {
    const [
      controls,
      evidence,
      policies,
      risks,
      riskScenarios,
      vendors,
      employees,
      assets,
      integrations,
      audits,
      frameworks,
    ] = await Promise.all([
      this.prisma.control.count({ where: { organizationId } }),
      this.prisma.evidence.count({ where: { organizationId } }),
      this.prisma.policy.count({ where: { organizationId } }),
      this.prisma.risk.count({ where: { organizationId } }),
      this.prisma.riskScenarioTemplate.count({ where: { organizationId } }),
      this.prisma.vendor.count({ where: { organizationId } }),
      this.prisma.correlatedEmployee.count({ where: { organizationId } }),
      this.prisma.asset.count({ where: { organizationId } }),
      this.prisma.integration.count({ where: { organizationId } }),
      this.prisma.audit.count({ where: { organizationId } }),
      this.prisma.framework.count({ where: { organizationId, deletedAt: null } }),
    ]);

    return {
      controls,
      evidence,
      policies,
      risks,
      riskScenarios,
      vendors,
      employees,
      assets,
      integrations,
      audits,
      frameworks,
      total: controls + evidence + policies + risks + riskScenarios + vendors + employees + assets + integrations + audits + frameworks,
    };
  }

  private async createAuditLogEntry(
    organizationId: string,
    userId: string,
    action: string,
    details: any,
  ): Promise<void> {
    try {
      // Check if organization exists first
      const orgExists = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });
      
      if (!orgExists) {
        this.logger.warn(`Skipping audit log - organization ${organizationId} does not exist`);
        return;
      }
      
      await this.prisma.auditLog.create({
        data: {
          organization: { connect: { id: organizationId } },
          userId,
          action,
          entityType: 'organization',
          entityId: organizationId,
          description: `${action}: ${action === 'data_reset_completed' ? 'All organization data has been reset' : 'Data reset initiated'}`,
          changes: details,
          ipAddress: '127.0.0.1',
          userAgent: 'System',
        },
      });
    } catch (error) {
      // Don't fail the operation if audit log fails
      this.logger.error(`Failed to create audit log: ${error}`);
    }
  }
}

