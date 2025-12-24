import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  generators,
  DEMO_CONTROLS,
  DEMO_POLICIES,
  DEMO_VENDORS,
  DEMO_RISKS,
  DEMO_TRAINING_COURSES,
  DEMO_ASSET_TYPES,
  DEMO_INTEGRATIONS,
  DEMO_AUDITS,
} from './seed-data.generators';
import {
  getCatalogFramework,
  flattenRequirements,
} from '../frameworks/catalog';

export interface SeedResult {
  success: boolean;
  recordsCreated: {
    frameworks: number;
    frameworkRequirements: number;
    controls: number;
    controlImplementations: number;
    controlMappings: number;
    evidence: number;
    evidenceLinks: number;
    policies: number;
    vendors: number;
    vendorAssessments: number;
    risks: number;
    employees: number;
    trainingRecords: number;
    backgroundChecks: number;
    assets: number;
    integrations: number;
    audits: number;
  };
  totalRecords: number;
}

@Injectable()
export class SeedDataService {
  private readonly logger = new Logger(SeedDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure the organization exists, creating it if necessary
   * This is needed because the dev auth guard uses a hardcoded org ID
   */
  private async ensureOrganizationExists(organizationId: string): Promise<void> {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    
    if (!existing) {
      this.logger.log(`Creating organization ${organizationId}...`);
      await this.prisma.organization.create({
        data: {
          id: organizationId,
          name: 'Demo Organization',
          slug: 'demo-org',
          description: 'Default organization for GigaChad GRC demo',
          status: 'active',
          settings: {
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
          },
        },
      });
      this.logger.log(`Organization ${organizationId} created successfully`);
    }
  }

  /**
   * Ensure a User record exists in the database
   * This is necessary because dev auth guard creates a virtual user that may not exist in DB
   */
  private async ensureUserExists(organizationId: string, userId: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!existingUser) {
      this.logger.log(`Creating user ${userId}...`);
      await this.prisma.user.create({
        data: {
          id: userId,
          keycloakId: `demo-${userId}`,
          email: 'admin@demo.local',
          firstName: 'Demo',
          lastName: 'Admin',
          displayName: 'Demo Admin',
          organizationId: organizationId,
          role: 'admin',
          status: 'active',
        },
      });
      this.logger.log(`User ${userId} created successfully`);
    }
  }

  /**
   * Check if organization already has data
   */
  async hasExistingData(organizationId: string): Promise<boolean> {
    const [controls, vendors, employees, frameworks] = await Promise.all([
      this.prisma.control.count({ where: { organizationId } }),
      this.prisma.vendor.count({ where: { organizationId } }),
      this.prisma.correlatedEmployee.count({ where: { organizationId } }),
      this.prisma.framework.count({ where: { organizationId, deletedAt: null } }),
    ]);
    
    return controls > 0 || vendors > 0 || employees > 0 || frameworks > 0;
  }

  /**
   * Check if demo data is currently loaded
   */
  async isDemoDataLoaded(organizationId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    
    const settings = org?.settings as any;
    return settings?.demoDataLoaded === true;
  }

  /**
   * Load all demo data for an organization
   */
  async loadDemoData(organizationId: string, userId: string): Promise<SeedResult> {
    this.logger.log(`Loading demo data for organization ${organizationId}`);
    
    // Ensure the organization exists (create if not)
    await this.ensureOrganizationExists(organizationId);
    
    // Ensure the user exists (create if not) - required for foreign key constraints
    await this.ensureUserExists(organizationId, userId);
    
    // Check if demo data already loaded
    if (await this.isDemoDataLoaded(organizationId)) {
      throw new ConflictException('Demo data is already loaded. Reset first to reload.');
    }

    // Check for existing real data
    if (await this.hasExistingData(organizationId)) {
      throw new ConflictException('Organization already has data. Reset first to load demo data.');
    }

    const result: SeedResult = {
      success: false,
      recordsCreated: {
        frameworks: 0,
        frameworkRequirements: 0,
        controls: 0,
        controlImplementations: 0,
        controlMappings: 0,
        evidence: 0,
        evidenceLinks: 0,
        policies: 0,
        vendors: 0,
        vendorAssessments: 0,
        risks: 0,
        employees: 0,
        trainingRecords: 0,
        backgroundChecks: 0,
        assets: 0,
        integrations: 0,
        audits: 0,
      },
      totalRecords: 0,
    };

    try {
      // Create frameworks with requirements
      const { frameworkIds, requirementIds } = await this.seedFrameworksWithRequirements(organizationId, userId);
      result.recordsCreated.frameworks = frameworkIds.length;
      result.recordsCreated.frameworkRequirements = requirementIds.length;

      // Create controls with implementations (varied statuses)
      const { controlIds, implementationIds } = await this.seedControlsWithImplementations(organizationId, userId);
      result.recordsCreated.controls = controlIds.length;
      result.recordsCreated.controlImplementations = implementationIds.length;

      // Map controls to framework requirements
      result.recordsCreated.controlMappings = await this.seedControlMappings(organizationId, controlIds, requirementIds);

      // Create evidence items
      const evidenceIds = await this.seedEvidence(organizationId, userId);
      result.recordsCreated.evidence = evidenceIds.length;

      // Link evidence to controls
      result.recordsCreated.evidenceLinks = await this.seedEvidenceControlLinks(organizationId, evidenceIds, controlIds, implementationIds, userId);

      // Create policies
      result.recordsCreated.policies = await this.seedPolicies(organizationId, userId);

      // Create vendors with assessments
      const { vendorIds, assessmentCount } = await this.seedVendorsWithAssessments(organizationId, userId);
      result.recordsCreated.vendors = vendorIds.length;
      result.recordsCreated.vendorAssessments = assessmentCount;

      // Create risks
      result.recordsCreated.risks = await this.seedRisks(organizationId, userId);

      // Create employees
      const employeeIds = await this.seedEmployees(organizationId);
      result.recordsCreated.employees = employeeIds.length;

      // Create training records for employees
      result.recordsCreated.trainingRecords = await this.seedTrainingRecords(organizationId, employeeIds);

      // Create background checks for employees
      result.recordsCreated.backgroundChecks = await this.seedBackgroundChecks(organizationId, employeeIds);

      // Create assets
      result.recordsCreated.assets = await this.seedAssets(organizationId, userId, employeeIds);

      // Create integrations
      result.recordsCreated.integrations = await this.seedIntegrations(organizationId, userId);

      // Create audits
      result.recordsCreated.audits = await this.seedAudits(organizationId, userId);

      // Mark demo data as loaded
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            demoDataLoaded: true,
            demoDataLoadedAt: new Date().toISOString(),
            demoDataLoadedBy: userId,
          },
        },
      });

      // Calculate total
      result.totalRecords = Object.values(result.recordsCreated).reduce((a, b) => a + b, 0);
      result.success = true;

      this.logger.log(`Demo data loaded successfully. Total records: ${result.totalRecords}`);
      
      // Create audit log entry
      await this.createAuditLogEntry(organizationId, userId, 'demo_data_loaded', result);

      return result;
    } catch (error) {
      this.logger.error(`Failed to load demo data: ${error}`);
      throw error;
    }
  }

  private async seedFrameworksWithRequirements(organizationId: string, _userId: string): Promise<{ frameworkIds: string[]; requirementIds: string[] }> {
    const frameworkIds: string[] = [];
    const requirementIds: string[] = [];
    
    // Use the Framework Catalog to seed frameworks with full requirements
    // This ensures consistency between demo data and catalog-activated frameworks
    const catalogFrameworkIds = ['soc2-type2', 'iso27001-2022', 'hipaa'];
    
    for (const catalogId of catalogFrameworkIds) {
      const catalogFramework = getCatalogFramework(catalogId);
      if (!catalogFramework) {
        this.logger.warn(`Catalog framework not found: ${catalogId}`);
        continue;
      }
      
      // Check if this framework is already activated for the organization
      const existingFramework = await this.prisma.framework.findFirst({
        where: {
          organizationId,
          type: catalogId,
          deletedAt: null,
        },
      });
      
      if (existingFramework) {
        this.logger.log(`Framework '${catalogFramework.name}' already exists, skipping...`);
        frameworkIds.push(existingFramework.id);
        // Get existing requirement IDs for mapping later
        const existingReqs = await this.prisma.frameworkRequirement.findMany({
          where: { frameworkId: existingFramework.id },
          select: { id: true },
        });
        requirementIds.push(...existingReqs.map(r => r.id));
        continue;
      }
      
      // Create the framework with the catalog ID as the type
      // This allows the Framework Library to recognize it as "activated"
      const created = await this.prisma.framework.create({
        data: {
          type: catalogId, // Use catalog ID so it shows as activated in Framework Library
          name: catalogFramework.name,
          description: catalogFramework.description,
          version: catalogFramework.version,
          isActive: true,
          isCustom: false,
          organizationId,
        },
      });
      frameworkIds.push(created.id);
      
      // Flatten and create all requirements from the catalog
      const flatRequirements = flattenRequirements(catalogFramework.requirements);
      const referenceToId: Record<string, string> = {};
      
      for (let i = 0; i < flatRequirements.length; i++) {
        const req = flatRequirements[i];
        const parentId = req.parentReference ? referenceToId[req.parentReference] : null;
        
        const reqCreated = await this.prisma.frameworkRequirement.create({
          data: {
            frameworkId: created.id,
            parentId,
            reference: req.reference,
            title: req.title,
            description: req.description,
            guidance: req.guidance,
            level: req.level,
            order: i,
            isCategory: req.isCategory,
          },
        });
        
        referenceToId[req.reference] = reqCreated.id;
        requirementIds.push(reqCreated.id);
      }
      
      this.logger.log(`Seeded framework '${catalogFramework.name}' with ${flatRequirements.length} requirements`);
    }
    
    return { frameworkIds, requirementIds };
  }

  private async seedControlsWithImplementations(organizationId: string, userId: string): Promise<{ controlIds: string[]; implementationIds: string[] }> {
    const controlIds: string[] = [];
    const implementationIds: string[] = [];
    
    // Status distribution: 60% implemented, 25% in_progress, 10% not_started, 5% not_applicable
    const statusDistribution = ['implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented',
                                'in_progress', 'in_progress', 'in_progress',
                                'not_started',
                                'not_applicable'];
    
    for (let i = 0; i < DEMO_CONTROLS.length; i++) {
      const control = DEMO_CONTROLS[i];
      const created = await this.prisma.control.create({
        data: {
          organizationId,
          controlId: control.code,
          title: control.title,
          description: control.description,
          category: control.category,
        },
      });
      controlIds.push(created.id);
      
      // Create implementation record with varied status
      const status = statusDistribution[i % statusDistribution.length];
      const implementation = await this.prisma.controlImplementation.create({
        data: {
          controlId: created.id,
          organizationId,
          status: status as any,
          ownerId: userId,
          implementationNotes: status === 'implemented' 
            ? `${control.title} has been fully implemented and tested.`
            : status === 'in_progress'
            ? `Implementation of ${control.title} is currently in progress.`
            : status === 'not_started'
            ? `${control.title} implementation is planned for next quarter.`
            : `This control is not applicable to our environment.`,
          testingFrequency: 'quarterly',
          lastTestedAt: status === 'implemented' ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : null,
          nextTestDue: status === 'implemented' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          effectivenessScore: status === 'implemented' ? Math.floor(Math.random() * 20) + 80 : 
                             status === 'in_progress' ? Math.floor(Math.random() * 30) + 40 : null,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      implementationIds.push(implementation.id);
    }
    
    return { controlIds, implementationIds };
  }

  private async seedControlMappings(organizationId: string, controlIds: string[], requirementIds: string[]): Promise<number> {
    let count = 0;
    
    // Map controls to random framework requirements (each control maps to 1-3 requirements)
    for (const controlId of controlIds) {
      const numMappings = Math.floor(Math.random() * 3) + 1;
      const selectedRequirements = requirementIds
        .sort(() => 0.5 - Math.random())
        .slice(0, numMappings);
      
      for (const requirementId of selectedRequirements) {
        try {
          // Get the framework ID from the requirement
          const requirement = await this.prisma.frameworkRequirement.findUnique({
            where: { id: requirementId },
            select: { frameworkId: true },
          });
          
          if (requirement) {
            // Get a valid user ID for createdBy
            const users = await this.prisma.user.findMany({ take: 1 });
            const createdBy = users[0]?.id || 'system';
            
            await this.prisma.controlMapping.create({
              data: {
                frameworkId: requirement.frameworkId,
                controlId,
                requirementId,
                mappingType: 'primary',
                notes: 'Auto-mapped by demo data seeder',
                createdBy,
              },
            });
            count++;
          }
        } catch (e) {
          // Skip duplicate mappings
        }
      }
    }
    
    return count;
  }

  private async seedEvidence(organizationId: string, userId: string): Promise<string[]> {
    const evidenceIds: string[] = [];
    
    // Evidence items with realistic data
    const evidenceItems = [
      { title: 'AWS Security Hub Report', type: 'report', source: 'aws', category: 'Cloud Security', description: 'Monthly AWS Security Hub findings and compliance status' },
      { title: 'Penetration Test Report Q4 2024', type: 'report', source: 'manual', category: 'Security Testing', description: 'External penetration test results from third-party assessor' },
      { title: 'Access Review Export - November 2024', type: 'export', source: 'okta', category: 'Access Control', description: 'Quarterly access review completed for all systems' },
      { title: 'SOC 2 Readiness Assessment', type: 'document', source: 'manual', category: 'Compliance', description: 'Internal readiness assessment for SOC 2 certification' },
      { title: 'Vulnerability Scan Results', type: 'report', source: 'datadog', category: 'Security Operations', description: 'Weekly vulnerability scan from Datadog Security Monitoring' },
      { title: 'Employee Security Training Completion', type: 'export', source: 'knowbe4', category: 'Security Awareness', description: 'Training completion report for security awareness program' },
      { title: 'GitHub Branch Protection Settings', type: 'screenshot', source: 'github', category: 'Development', description: 'Screenshot of branch protection rules on main repositories' },
      { title: 'Firewall Configuration Export', type: 'export', source: 'manual', category: 'Network Security', description: 'Export of firewall rules and configuration' },
      { title: 'Incident Response Plan', type: 'document', source: 'manual', category: 'Incident Management', description: 'Current incident response procedures document' },
      { title: 'Data Classification Policy', type: 'document', source: 'manual', category: 'Data Protection', description: 'Data classification guidelines and handling procedures' },
      { title: 'MFA Enrollment Report', type: 'export', source: 'okta', category: 'Access Control', description: 'Multi-factor authentication enrollment status for all users' },
      { title: 'Backup Verification Log', type: 'report', source: 'aws', category: 'Business Continuity', description: 'Backup restoration test results and verification' },
      { title: 'Change Management Log', type: 'export', source: 'jira', category: 'Change Management', description: 'Change advisory board approvals and deployment history' },
      { title: 'SSL Certificate Inventory', type: 'export', source: 'manual', category: 'Network Security', description: 'Inventory of all SSL/TLS certificates and expiration dates' },
      { title: 'Asset Inventory Report', type: 'export', source: 'jamf', category: 'Asset Management', description: 'Complete inventory of managed devices and software' },
      { title: 'Encryption at Rest Configuration', type: 'screenshot', source: 'aws', category: 'Data Protection', description: 'AWS KMS configuration and encryption settings' },
      { title: 'Physical Security Assessment', type: 'document', source: 'manual', category: 'Physical Security', description: 'Annual physical security assessment of office locations' },
      { title: 'Vendor Security Questionnaire - AWS', type: 'document', source: 'manual', category: 'Third Party', description: 'Completed security questionnaire from AWS' },
      { title: 'Network Diagram', type: 'document', source: 'manual', category: 'Network Security', description: 'Current network architecture and segmentation diagram' },
      { title: 'Privileged Access Audit', type: 'export', source: 'okta', category: 'Access Control', description: 'Audit of privileged access accounts and permissions' },
    ];
    
    const statuses = ['approved', 'approved', 'approved', 'pending_review', 'pending_review'];
    
    for (let i = 0; i < evidenceItems.length; i++) {
      const item = evidenceItems[i];
      const collectedDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      
      const evidence = await this.prisma.evidence.create({
        data: {
          organization: { connect: { id: organizationId } },
          title: item.title,
          description: item.description,
          type: item.type,
          source: item.source,
          status: statuses[i % statuses.length] as any,
          category: item.category,
          filename: `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
          mimeType: item.type === 'screenshot' ? 'image/png' : 'application/pdf',
          size: Math.floor(Math.random() * 2000000) + 100000,
          storagePath: `/evidence/${organizationId}/${Date.now()}-${i}.pdf`,
          collectedAt: collectedDate,
          validFrom: collectedDate,
          validUntil: new Date(collectedDate.getTime() + 365 * 24 * 60 * 60 * 1000),
          tags: [item.category, item.source],
          createdByUser: { connect: { id: userId } },
          updatedByUser: { connect: { id: userId } },
        },
      });
      evidenceIds.push(evidence.id);
    }
    
    return evidenceIds;
  }

  private async seedEvidenceControlLinks(
    organizationId: string, 
    evidenceIds: string[], 
    controlIds: string[],
    implementationIds: string[],
    userId: string
  ): Promise<number> {
    let count = 0;
    
    // Link each evidence item to 1-3 random controls
    for (const evidenceId of evidenceIds) {
      const numLinks = Math.floor(Math.random() * 3) + 1;
      const selectedIndices = Array.from({ length: controlIds.length }, (_, i) => i)
        .sort(() => 0.5 - Math.random())
        .slice(0, numLinks);
      
      for (const idx of selectedIndices) {
        try {
          await this.prisma.evidenceControlLink.create({
            data: {
              evidenceId,
              controlId: controlIds[idx],
              implementationId: implementationIds[idx],
              linkedBy: userId,
              notes: 'Linked by demo data seeder',
            },
          });
          count++;
        } catch (e) {
          // Skip duplicates
        }
      }
    }
    
    return count;
  }

  private async seedPolicies(organizationId: string, userId: string): Promise<number> {
    let count = 0;
    
    for (const policy of DEMO_POLICIES) {
      await this.prisma.policy.create({
        data: {
          organizationId,
          title: policy.title,
          description: policy.description,
          category: policy.category,
          status: policy.status as any,
          version: '1.0',
          filename: `${policy.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
          mimeType: 'application/pdf',
          size: Math.floor(Math.random() * 500000) + 50000,
          storagePath: `/policies/${organizationId}/${Date.now()}.pdf`,
          ownerId: userId,
          createdBy: userId,
          updatedBy: userId,
          effectiveDate: new Date('2024-01-01'),
          lastReviewedAt: new Date('2024-06-01'),
          nextReviewDue: new Date('2025-06-01'),
        },
      });
      count++;
    }
    
    return count;
  }

  private async seedVendorsWithAssessments(organizationId: string, userId: string): Promise<{ vendorIds: string[]; assessmentCount: number }> {
    const vendorIds: string[] = [];
    let assessmentCount = 0;
    let vendorCounter = 1;
    
    const assessmentTypes = ['initial_onboarding', 'annual_review', 'continuous_monitoring', 'contract_renewal'];
    const riskScores = ['very_low', 'low', 'medium', 'high', 'critical'];
    
    for (let i = 0; i < DEMO_VENDORS.length; i++) {
      const vendor = DEMO_VENDORS[i];
      const created = await this.prisma.vendor.create({
        data: {
          organizationId,
          vendorId: `VND-${String(vendorCounter++).padStart(3, '0')}`,
          name: vendor.name,
          category: vendor.category === 'Cloud Infrastructure' ? 'cloud_provider' :
                   vendor.category === 'CRM' ? 'software_vendor' :
                   vendor.category === 'Collaboration' ? 'software_vendor' :
                   vendor.category === 'Development' ? 'software_vendor' :
                   vendor.category === 'Identity' ? 'software_vendor' :
                   vendor.category === 'Monitoring' ? 'software_vendor' :
                   vendor.category === 'Payments' ? 'professional_services' :
                   vendor.category === 'Support' ? 'software_vendor' :
                   vendor.category === 'Marketing' ? 'software_vendor' :
                   vendor.category === 'Legal' ? 'professional_services' :
                   vendor.category === 'HR' ? 'software_vendor' :
                   vendor.category === 'Security' ? 'software_vendor' :
                   vendor.category === 'Infrastructure' ? 'cloud_provider' :
                   vendor.category === 'Communications' ? 'software_vendor' :
                   vendor.category === 'Data Warehouse' ? 'cloud_provider' :
                   vendor.category === 'Operations' ? 'software_vendor' :
                   'software_vendor' as any,
          criticality: vendor.criticality as any,
          status: vendor.status as any,
          website: vendor.website,
          hasDataAccess: vendor.dataAccess.length > 0,
          serviceDescription: `${vendor.category} services`,
          createdBy: userId,
        },
      });
      vendorIds.push(created.id);
      
      // Create 1-2 assessments per vendor
      const numAssessments = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < numAssessments; j++) {
        const assessmentType = assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)];
        const isCompleted = Math.random() > 0.3;
        const inherentRisk = riskScores[Math.floor(Math.random() * riskScores.length)];
        const residualRisk = riskScores[Math.max(0, riskScores.indexOf(inherentRisk) - 1)];
        
        await this.prisma.vendorAssessment.create({
          data: {
            vendorId: created.id,
            organizationId,
            assessmentType,
            status: isCompleted ? 'completed' : (Math.random() > 0.5 ? 'in_progress' : 'pending'),
            dueDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
            completedAt: isCompleted ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : null,
            inherentRiskScore: inherentRisk,
            residualRiskScore: isCompleted ? residualRisk : null,
            overallScore: isCompleted ? Math.floor(Math.random() * 40) + 60 : null,
            securityRisk: isCompleted ? riskScores[Math.floor(Math.random() * 4)] : null,
            complianceRisk: isCompleted ? riskScores[Math.floor(Math.random() * 4)] : null,
            operationalRisk: isCompleted ? riskScores[Math.floor(Math.random() * 4)] : null,
            financialRisk: isCompleted ? riskScores[Math.floor(Math.random() * 3)] : null,
            outcome: isCompleted ? 'approved' : null,
            outcomeNotes: isCompleted 
              ? `Annual security assessment completed. ${vendor.name} demonstrates strong security posture.`
              : null,
            reviewerId: isCompleted ? userId : null,
            createdBy: userId,
          },
        });
        assessmentCount++;
      }
    }
    
    return { vendorIds, assessmentCount };
  }

  private async seedRisks(organizationId: string, userId: string): Promise<number> {
    let count = 0;
    
    // Map demo data impact values to valid RiskImpact enum values
    const mapImpact = (impact: string) => {
      switch (impact) {
        case 'critical': return 'severe';
        case 'major': return 'major';
        case 'moderate': return 'moderate';
        case 'minor': return 'minor';
        default: return 'moderate';
      }
    };
    
    for (let i = 0; i < DEMO_RISKS.length; i++) {
      const risk = DEMO_RISKS[i];
      const mappedImpact = mapImpact(risk.impact);
      await this.prisma.risk.create({
        data: {
          organizationId,
          riskId: `RISK-${String(i + 1).padStart(3, '0')}`,
          title: risk.title,
          description: risk.description,
          category: risk.category,
          status: risk.status as any,
          likelihood: risk.likelihood as any,
          impact: mappedImpact as any,
          source: 'internal_security_reviews',
          initialSeverity: mappedImpact === 'severe' ? 'very_high' : mappedImpact === 'major' ? 'high' : 'medium' as any,
          reporterId: userId,
          riskOwnerId: userId,
          createdBy: userId,
        },
      });
      count++;
    }
    
    return count;
  }

  private async seedEmployees(organizationId: string): Promise<string[]> {
    const employees = generators.generateEmployees(50);
    const ids: string[] = [];
    
    for (const employee of employees) {
      const created = await this.prisma.correlatedEmployee.create({
        data: {
          organizationId,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department,
          jobTitle: employee.jobTitle,
          employmentStatus: employee.employmentStatus,
          employmentType: employee.employmentType,
          hireDate: employee.hireDate,
          location: employee.location,
          complianceScore: Math.floor(Math.random() * 40) + 60, // 60-100
          lastCorrelatedAt: new Date(),
        },
      });
      ids.push(created.id);
    }
    
    return ids;
  }

  private async seedTrainingRecords(organizationId: string, employeeIds: string[]): Promise<number> {
    let count = 0;
    
    // Create a fake integration for training data
    const integration = await this.prisma.integration.create({
      data: {
        organizationId,
        type: 'knowbe4',
        name: 'KnowBe4 (Demo)',
        status: 'active',
        config: {},
        syncFrequency: 'daily',
        createdBy: 'system',
        updatedBy: 'system',
      },
    });

    for (const employeeId of employeeIds) {
      // Each employee gets 3-6 training records
      const trainingCount = Math.floor(Math.random() * 4) + 3;
      const courses = [...DEMO_TRAINING_COURSES].sort(() => 0.5 - Math.random()).slice(0, trainingCount);
      
      for (const course of courses) {
        const isCompleted = Math.random() > 0.2;
        const isOverdue = !isCompleted && Math.random() > 0.7;
        
        await this.prisma.employeeTrainingRecord.create({
          data: {
            correlatedEmployeeId: employeeId,
            integrationId: integration.id,
            courseName: course.name,
            courseType: course.type,
            status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'assigned',
            assignedAt: this.randomDate(new Date('2024-10-01'), new Date('2025-01-01')),
            dueDate: this.randomDate(new Date('2025-01-01'), new Date('2025-03-01')),
            completedAt: isCompleted ? this.randomDate(new Date('2024-11-01'), new Date('2025-01-15')) : null,
            score: isCompleted ? Math.floor(Math.random() * 30) + 70 : null,
          },
        });
        count++;
      }
    }
    
    return count;
  }

  private async seedBackgroundChecks(organizationId: string, employeeIds: string[]): Promise<number> {
    let count = 0;
    
    // Create a fake integration for background checks
    const integration = await this.prisma.integration.create({
      data: {
        organizationId,
        type: 'checkr',
        name: 'Checkr (Demo)',
        status: 'active',
        config: {},
        syncFrequency: 'daily',
        createdBy: 'system',
        updatedBy: 'system',
      },
    });

    for (const employeeId of employeeIds) {
      // 90% of employees have background checks
      if (Math.random() > 0.1) {
        const status = Math.random() > 0.95 ? 'pending' : 'clear';
        const completedAt = status === 'clear' ? this.randomDate(new Date('2023-01-01'), new Date('2024-12-01')) : null;
        
        await this.prisma.employeeBackgroundCheck.create({
          data: {
            correlatedEmployeeId: employeeId,
            integrationId: integration.id,
            externalId: `BGC-${Date.now()}-${count}`,
            status,
            checkType: 'criminal',
            initiatedAt: this.randomDate(new Date('2023-01-01'), new Date('2024-11-01')),
            completedAt,
            expiresAt: completedAt ? new Date(completedAt.getTime() + 365 * 3 * 24 * 60 * 60 * 1000) : null, // 3 years
          },
        });
        count++;
      }
    }
    
    return count;
  }

  private async seedAssets(organizationId: string, userId: string, employeeIds: string[]): Promise<number> {
    let count = 0;
    
    // Create laptops and assign to employees
    for (let i = 0; i < Math.min(employeeIds.length, 30); i++) {
      const laptop = DEMO_ASSET_TYPES.laptops[i % DEMO_ASSET_TYPES.laptops.length];
      await this.prisma.asset.create({
        data: {
          organizationId,
          name: laptop.name,
          type: 'workstation',
          category: 'laptop',
          status: 'active',
          criticality: 'medium',
          owner: employeeIds[i],
          metadata: {
            manufacturer: laptop.manufacturer,
            serialNumber: `SN-${Date.now()}-${i}`,
          },
          source: 'manual',
        },
      });
      count++;
    }
    
    // Create servers
    for (const server of DEMO_ASSET_TYPES.servers) {
      await this.prisma.asset.create({
        data: {
          organizationId,
          name: server.name,
          type: 'server',
          category: server.category,
          status: 'active',
          criticality: 'critical',
          source: 'manual',
        },
      });
      count++;
    }
    
    // Create cloud resources as applications
    for (const cloud of DEMO_ASSET_TYPES.cloud) {
      await this.prisma.asset.create({
        data: {
          organizationId,
          name: cloud.name,
          type: 'application',
          category: cloud.category,
          status: 'active',
          criticality: 'critical',
          source: 'manual',
        },
      });
      count++;
    }
    
    return count;
  }

  private async seedIntegrations(organizationId: string, userId: string): Promise<number> {
    let count = 0;
    
    for (const integration of DEMO_INTEGRATIONS) {
      await this.prisma.integration.create({
        data: {
          organizationId,
          type: integration.type,
          name: integration.name,
          status: integration.status as any,
          config: {},
          syncFrequency: 'daily',
          createdBy: userId,
          updatedBy: userId,
        },
      });
      count++;
    }
    
    return count;
  }

  private async seedAudits(organizationId: string, userId: string): Promise<number> {
    let count = 0;
    let auditCounter = 1;
    
    // Map demo status values to valid AuditStatus enum values
    const mapStatus = (status: string) => {
      switch (status) {
        case 'completed': return 'completed';
        case 'in_progress': return 'fieldwork';
        case 'scheduled': return 'planning';
        case 'cancelled': return 'cancelled';
        default: return 'planning';
      }
    };
    
    for (const audit of DEMO_AUDITS) {
      await this.prisma.audit.create({
        data: {
          organizationId,
          auditId: `AUD-${String(auditCounter++).padStart(3, '0')}`,
          name: audit.name,
          auditType: audit.type === 'soc2_type2' ? 'external' : 
                     audit.type === 'iso27001' ? 'certification' :
                     audit.type === 'internal' ? 'internal' :
                     audit.type === 'pentest' ? 'external' : 'internal',
          status: mapStatus(audit.status) as any,
          plannedStartDate: audit.startDate,
          plannedEndDate: audit.endDate,
          isExternal: audit.type !== 'internal',
          auditFirm: audit.auditor,
          framework: audit.type === 'soc2_type2' ? 'SOC2' :
                    audit.type === 'iso27001' ? 'ISO27001' : null,
          createdBy: userId,
        },
      });
      count++;
    }
    
    return count;
  }

  private async createAuditLogEntry(
    organizationId: string,
    userId: string,
    action: string,
    details: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organization: { connect: { id: organizationId } },
        userId,
        action,
        entityType: 'organization',
        entityId: organizationId,
        description: `Demo data loaded: ${details.totalRecords} records created`,
        changes: details,
        ipAddress: '127.0.0.1',
        userAgent: 'System',
      },
    });
  }

  private randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

