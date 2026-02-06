import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CorrelationService } from './correlation.service';
import { ComplianceScoreService } from './compliance-score.service';
import { safeOrderBy } from '@gigachad-grc/shared';

interface ListEmployeesParams {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: string;
  complianceStatus?: 'compliant' | 'at_risk' | 'non_compliant';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeDetail {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  jobTitle?: string;
  managerEmail?: string;
  hireDate?: Date;
  employmentStatus?: string;
  employmentType?: string;
  location?: string;
  complianceScore?: number;
  complianceIssues?: any[];
  lastCorrelatedAt: Date;
  backgroundChecks: any[];
  trainingRecords: any[];
  assetAssignments: any[];
  attestations: any[];
  accessRecords: any[];
  securityScores: any[];
  dataSources: {
    integration: string;
    type: string;
    lastSyncedAt: Date;
  }[];
}

@Injectable()
export class EmployeeComplianceService {
  private readonly logger = new Logger(EmployeeComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correlationService: CorrelationService,
    private readonly complianceScoreService: ComplianceScoreService
  ) {}

  /**
   * List employees with compliance data
   */
  async listEmployees(params: ListEmployeesParams) {
    const {
      organizationId,
      page = 1,
      limit = 25,
      search,
      department,
      status,
      complianceStatus,
      sortBy = 'lastName',
      sortOrder = 'asc',
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { organizationId };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (status) {
      where.employmentStatus = status;
    }

    if (complianceStatus) {
      switch (complianceStatus) {
        case 'compliant':
          where.complianceScore = { gte: 80 };
          break;
        case 'at_risk':
          where.complianceScore = { gte: 60, lt: 80 };
          break;
        case 'non_compliant':
          where.complianceScore = { lt: 60 };
          break;
      }
    }

    // SECURITY: Use safeOrderBy to prevent prototype pollution from user-controlled sortBy
    const orderBy = safeOrderBy(sortBy, sortOrder);

    const [employees, total] = await Promise.all([
      this.prisma.correlatedEmployee.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          sourceIntegration: {
            select: { id: true, name: true, type: true },
          },
          backgroundChecks: {
            select: { status: true },
            take: 1,
            orderBy: { completedAt: 'desc' },
          },
          trainingRecords: {
            select: { status: true },
            where: { status: { in: ['overdue', 'assigned', 'in_progress'] } },
          },
          attestations: {
            select: { status: true },
            where: { status: { in: ['pending', 'expired'] } },
          },
          _count: {
            select: {
              backgroundChecks: true,
              trainingRecords: true,
              assetAssignments: true,
              attestations: true,
              accessRecords: true,
            },
          },
        },
      }),
      this.prisma.correlatedEmployee.count({ where }),
    ]);

    // Transform to include data source indicators
    const transformedEmployees = employees.map((emp) => ({
      id: emp.id,
      email: emp.email,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email,
      department: emp.department,
      jobTitle: emp.jobTitle,
      employmentStatus: emp.employmentStatus,
      complianceScore: emp.complianceScore,
      complianceIssues: emp.complianceIssues,
      backgroundCheckStatus: emp.backgroundChecks[0]?.status || null,
      overdueTrainings: emp.trainingRecords.length,
      pendingAttestations: emp.attestations.length,
      dataSources: {
        hasHris: !!emp.sourceIntegration,
        hasBackgroundCheck: emp._count.backgroundChecks > 0,
        hasTraining: emp._count.trainingRecords > 0,
        hasAssets: emp._count.assetAssignments > 0,
        hasAccess: emp._count.accessRecords > 0,
      },
      lastCorrelatedAt: emp.lastCorrelatedAt,
    }));

    return {
      data: transformedEmployees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed employee compliance profile
   */
  async getEmployeeDetail(organizationId: string, employeeId: string): Promise<EmployeeDetail> {
    const employee = await this.prisma.correlatedEmployee.findFirst({
      where: {
        id: employeeId,
        organizationId,
      },
      include: {
        sourceIntegration: {
          select: { id: true, name: true, type: true, lastSyncAt: true },
        },
        backgroundChecks: {
          include: {
            integration: { select: { id: true, name: true, type: true } },
          },
          orderBy: { completedAt: 'desc' },
        },
        trainingRecords: {
          include: {
            integration: { select: { id: true, name: true, type: true } },
          },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        },
        assetAssignments: {
          include: {
            integration: { select: { id: true, name: true, type: true } },
            asset: { select: { id: true, name: true, type: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        attestations: {
          include: {
            policy: { select: { id: true, title: true, category: true } },
          },
          orderBy: { requestedAt: 'desc' },
        },
        accessRecords: {
          include: {
            integration: { select: { id: true, name: true, type: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
        securityScores: {
          include: {
            integration: { select: { id: true, name: true, type: true } },
          },
          orderBy: { lastUpdated: 'desc' },
          take: 5,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Build data sources list
    const dataSources: EmployeeDetail['dataSources'] = [];

    if (employee.sourceIntegration) {
      dataSources.push({
        integration: employee.sourceIntegration.name,
        type: 'HRIS',
        lastSyncedAt: employee.sourceIntegration.lastSyncAt || employee.lastCorrelatedAt,
      });
    }

    // Add unique integrations from each data type
    const seenIntegrations = new Set<string>();

    const addIntegrationSource = (
      items: { integration: { id: string; name: string; type: string } | null }[],
      type: string
    ) => {
      for (const item of items) {
        if (item.integration && !seenIntegrations.has(item.integration.id)) {
          seenIntegrations.add(item.integration.id);
          dataSources.push({
            integration: item.integration.name,
            type,
            lastSyncedAt: employee.lastCorrelatedAt,
          });
        }
      }
    };

    addIntegrationSource(employee.backgroundChecks, 'Background Check');
    addIntegrationSource(employee.trainingRecords, 'LMS');
    addIntegrationSource(employee.assetAssignments, 'MDM');
    addIntegrationSource(employee.accessRecords, 'Identity');
    addIntegrationSource(employee.securityScores, 'Security Awareness');

    return {
      id: employee.id,
      email: employee.email,
      firstName: employee.firstName || undefined,
      lastName: employee.lastName || undefined,
      department: employee.department || undefined,
      jobTitle: employee.jobTitle || undefined,
      managerEmail: employee.managerEmail || undefined,
      hireDate: employee.hireDate || undefined,
      employmentStatus: employee.employmentStatus || undefined,
      employmentType: employee.employmentType || undefined,
      location: employee.location || undefined,
      complianceScore: employee.complianceScore || undefined,
      complianceIssues: (employee.complianceIssues as any[]) || [],
      lastCorrelatedAt: employee.lastCorrelatedAt,
      backgroundChecks: employee.backgroundChecks,
      trainingRecords: employee.trainingRecords,
      assetAssignments: employee.assetAssignments,
      attestations: employee.attestations,
      accessRecords: employee.accessRecords,
      securityScores: employee.securityScores,
      dataSources,
    };
  }

  /**
   * Get compliance dashboard metrics
   */
  async getDashboardMetrics(organizationId: string) {
    const metrics = await this.complianceScoreService.getOrganizationMetrics(organizationId);

    // Get additional stats
    const [departmentStats, upcomingDeadlines, recentChanges] = await Promise.all([
      this.getDepartmentComplianceStats(organizationId),
      this.getUpcomingDeadlines(organizationId),
      this.getRecentChanges(organizationId),
    ]);

    return {
      ...metrics,
      departmentStats,
      upcomingDeadlines,
      recentChanges,
    };
  }

  /**
   * Get compliance stats by department
   */
  private async getDepartmentComplianceStats(organizationId: string) {
    const departments = await this.prisma.correlatedEmployee.groupBy({
      by: ['department'],
      where: {
        organizationId,
        employmentStatus: 'active',
        department: { not: null },
      },
      _avg: { complianceScore: true },
      _count: true,
    });

    return departments
      .filter((d) => d.department)
      .map((d) => ({
        department: d.department!,
        employeeCount: d._count,
        averageScore: Math.round(d._avg.complianceScore || 0),
      }))
      .sort((a, b) => b.employeeCount - a.employeeCount);
  }

  /**
   * Get upcoming compliance deadlines
   */
  private async getUpcomingDeadlines(organizationId: string) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [expiringBackgroundChecks, overdueTrainings, pendingAttestations] = await Promise.all([
      // Expiring background checks
      this.prisma.employeeBackgroundCheck.findMany({
        where: {
          correlatedEmployee: { organizationId },
          expiresAt: { lte: thirtyDaysFromNow, gte: new Date() },
        },
        include: {
          correlatedEmployee: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { expiresAt: 'asc' },
        take: 10,
      }),

      // Overdue or due soon trainings
      this.prisma.employeeTrainingRecord.findMany({
        where: {
          correlatedEmployee: { organizationId },
          OR: [
            { status: 'overdue' },
            {
              status: { in: ['assigned', 'in_progress'] },
              dueDate: { lte: thirtyDaysFromNow },
            },
          ],
        },
        include: {
          correlatedEmployee: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // Pending attestations
      this.prisma.employeeAttestation.findMany({
        where: {
          correlatedEmployee: { organizationId },
          status: 'pending',
        },
        include: {
          correlatedEmployee: {
            select: { email: true, firstName: true, lastName: true },
          },
          policy: { select: { title: true } },
        },
        orderBy: { requestedAt: 'asc' },
        take: 10,
      }),
    ]);

    return {
      expiringBackgroundChecks: expiringBackgroundChecks.map((bc) => ({
        type: 'background_check_expiring',
        employeeEmail: bc.correlatedEmployee.email,
        employeeName: [bc.correlatedEmployee.firstName, bc.correlatedEmployee.lastName]
          .filter(Boolean)
          .join(' '),
        deadline: bc.expiresAt,
        details: { checkType: bc.checkType },
      })),
      overdueTrainings: overdueTrainings.map((t) => ({
        type: t.status === 'overdue' ? 'training_overdue' : 'training_due_soon',
        employeeEmail: t.correlatedEmployee.email,
        employeeName: [t.correlatedEmployee.firstName, t.correlatedEmployee.lastName]
          .filter(Boolean)
          .join(' '),
        deadline: t.dueDate,
        details: { courseName: t.courseName },
      })),
      pendingAttestations: pendingAttestations.map((a) => ({
        type: 'attestation_pending',
        employeeEmail: a.correlatedEmployee.email,
        employeeName: [a.correlatedEmployee.firstName, a.correlatedEmployee.lastName]
          .filter(Boolean)
          .join(' '),
        deadline: a.requestedAt,
        details: { policyTitle: a.policy.title },
      })),
    };
  }

  /**
   * Get recent compliance changes
   */
  private async getRecentChanges(organizationId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [newEmployees, completedTrainings, clearedBackgroundChecks] = await Promise.all([
      // New employees
      this.prisma.correlatedEmployee.findMany({
        where: {
          organizationId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recently completed trainings
      this.prisma.employeeTrainingRecord.findMany({
        where: {
          correlatedEmployee: { organizationId },
          status: 'completed',
          completedAt: { gte: sevenDaysAgo },
        },
        include: {
          correlatedEmployee: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),

      // Recently cleared background checks
      this.prisma.employeeBackgroundCheck.findMany({
        where: {
          correlatedEmployee: { organizationId },
          status: 'clear',
          completedAt: { gte: sevenDaysAgo },
        },
        include: {
          correlatedEmployee: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      newEmployees,
      completedTrainings,
      clearedBackgroundChecks,
    };
  }

  /**
   * Get unique departments in organization
   */
  async getDepartments(organizationId: string): Promise<string[]> {
    const departments = await this.prisma.correlatedEmployee.findMany({
      where: {
        organizationId,
        department: { not: null },
      },
      distinct: ['department'],
      select: { department: true },
    });

    return departments
      .map((d) => d.department)
      .filter((d): d is string => d !== null)
      .sort();
  }

  /**
   * Trigger sync from all employee-related integrations
   */
  async triggerSync(organizationId: string): Promise<{ message: string }> {
    // This would trigger integration syncs in a real implementation
    // For now, we just recalculate scores
    await this.complianceScoreService.recalculateOrganizationScores(organizationId);

    return { message: 'Sync initiated and compliance scores recalculated' };
  }

  /**
   * Find employees missing data from certain systems
   */
  async findMissingData(organizationId: string) {
    const employees = await this.prisma.correlatedEmployee.findMany({
      where: {
        organizationId,
        employmentStatus: 'active',
      },
      include: {
        _count: {
          select: {
            backgroundChecks: true,
            trainingRecords: true,
            assetAssignments: true,
            accessRecords: true,
          },
        },
      },
    });

    return {
      noBackgroundCheck: employees
        .filter((e) => e._count.backgroundChecks === 0)
        .map((e) => ({
          email: e.email,
          name: [e.firstName, e.lastName].filter(Boolean).join(' '),
        })),
      noTrainingData: employees
        .filter((e) => e._count.trainingRecords === 0)
        .map((e) => ({
          email: e.email,
          name: [e.firstName, e.lastName].filter(Boolean).join(' '),
        })),
      noDeviceData: employees
        .filter((e) => e._count.assetAssignments === 0)
        .map((e) => ({
          email: e.email,
          name: [e.firstName, e.lastName].filter(Boolean).join(' '),
        })),
      noAccessData: employees
        .filter((e) => e._count.accessRecords === 0)
        .map((e) => ({
          email: e.email,
          name: [e.firstName, e.lastName].filter(Boolean).join(' '),
        })),
    };
  }
}
