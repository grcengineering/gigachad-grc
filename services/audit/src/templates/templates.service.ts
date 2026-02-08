import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { validatePropertyName } from '@gigachad-grc/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAuditTemplateDto,
  UpdateAuditTemplateDto,
  CreateAuditFromTemplateDto,
  UpdateChecklistProgressDto,
  ChecklistItemDto,
  RequestTemplateDto,
  TestProcedureTemplateDto,
} from './dto/template.dto';

// SECURITY: Maximum number of templates to process in a single batch operation
const MAX_TEMPLATE_ITEMS = 500;

interface ChecklistProgress {
  [itemId: string]: {
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
  };
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Template CRUD
  // ===========================================

  async create(organizationId: string, dto: CreateAuditTemplateDto, userId: string) {
    this.logger.log(`Creating audit template for org ${organizationId}`);

    return this.prisma.auditTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        auditType: dto.auditType,
        framework: dto.framework,
        checklistItems: JSON.parse(JSON.stringify(dto.checklistItems || [])),
        requestTemplates: JSON.parse(JSON.stringify(dto.requestTemplates || [])),
        testProcedureTemplates: JSON.parse(JSON.stringify(dto.testProcedureTemplates || [])),
        createdBy: userId,
      },
    });
  }

  async findAll(
    organizationId: string,
    filters?: {
      auditType?: string;
      framework?: string;
      includeSystem?: boolean;
    }
  ) {
    const where: Record<string, unknown> = {
      OR: [{ organizationId }, ...(filters?.includeSystem !== false ? [{ isSystem: true }] : [])],
      status: 'active',
    };

    if (filters?.auditType) {
      where.auditType = filters.auditType;
    }
    if (filters?.framework) {
      where.framework = filters.framework;
    }

    return this.prisma.auditTemplate.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const template = await this.prisma.auditTemplate.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { isSystem: true }],
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async update(id: string, organizationId: string, dto: UpdateAuditTemplateDto) {
    const template = await this.prisma.auditTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot modify system templates');
    }

    return this.prisma.auditTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        auditType: dto.auditType,
        framework: dto.framework,
        status: dto.status,
        checklistItems: dto.checklistItems
          ? JSON.parse(JSON.stringify(dto.checklistItems))
          : undefined,
        requestTemplates: dto.requestTemplates
          ? JSON.parse(JSON.stringify(dto.requestTemplates))
          : undefined,
        testProcedureTemplates: dto.testProcedureTemplates
          ? JSON.parse(JSON.stringify(dto.testProcedureTemplates))
          : undefined,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const template = await this.prisma.auditTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    return this.prisma.auditTemplate.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  // ===========================================
  // Create Audit from Template
  // ===========================================

  async createAuditFromTemplate(
    organizationId: string,
    dto: CreateAuditFromTemplateDto,
    userId: string
  ) {
    const template = await this.findOne(dto.templateId, organizationId);

    // Generate audit ID
    const auditCount = await this.prisma.audit.count({
      where: { organizationId },
    });
    const auditId = `AUD-${String(auditCount + 1).padStart(3, '0')}`;

    // Parse template items
    const checklistItems = (template.checklistItems as unknown as ChecklistItemDto[]) || [];
    const requestTemplates = (template.requestTemplates as unknown as RequestTemplateDto[]) || [];
    const testProcedureTemplates =
      (template.testProcedureTemplates as unknown as TestProcedureTemplateDto[]) || [];

    // Initialize checklist progress
    const checklistProgress: ChecklistProgress = {};
    checklistItems.forEach((item: ChecklistItemDto) => {
      checklistProgress[item.id] = { completed: false };
    });

    // Create the audit
    const audit = await this.prisma.audit.create({
      data: {
        organizationId,
        auditId,
        name: dto.name,
        description: dto.description || template.description,
        auditType: template.auditType,
        framework: template.framework,
        templateId: template.id,
        checklistProgress,
        checklistTotalCount: checklistItems.length,
        checklistCompletedCount: 0,
        plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
        createdBy: userId,
      },
    });

    // Create requests from template if requested
    if (dto.createRequests !== false && requestTemplates.length > 0) {
      await this.createRequestsFromTemplate(audit.id, organizationId, requestTemplates, userId);
    }

    // Create test procedures from template if requested
    if (dto.createTestProcedures !== false && testProcedureTemplates.length > 0) {
      await this.createTestProceduresFromTemplate(
        audit.id,
        organizationId,
        testProcedureTemplates,
        userId
      );
    }

    // Increment template usage count
    await this.prisma.auditTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    });

    return this.prisma.audit.findUnique({
      where: { id: audit.id },
      include: {
        requests: true,
        testProcedures: true,
      },
    });
  }

  private async createRequestsFromTemplate(
    auditId: string,
    organizationId: string,
    templates: RequestTemplateDto[],
    userId: string
  ) {
    // SECURITY: Limit iterations to prevent loop bound injection attacks
    const maxItems = Math.min(templates.length, MAX_TEMPLATE_ITEMS);

    for (let i = 0; i < maxItems; i++) {
      const template = templates[i];
      await this.prisma.auditRequest.create({
        data: {
          auditId,
          organizationId,
          requestNumber: `REQ-${String(i + 1).padStart(3, '0')}`,
          title: template.title,
          category: template.category,
          description: template.description,
          requirementRef: template.controlRef,
          priority: template.priority || 'medium',
          createdBy: userId,
        },
      });
    }
  }

  private async createTestProceduresFromTemplate(
    auditId: string,
    organizationId: string,
    templates: TestProcedureTemplateDto[],
    _userId: string
  ) {
    // SECURITY: Limit iterations to prevent loop bound injection attacks
    const maxItems = Math.min(templates.length, MAX_TEMPLATE_ITEMS);

    for (let i = 0; i < maxItems; i++) {
      const template = templates[i];
      await this.prisma.auditTestProcedure.create({
        data: {
          auditId,
          organizationId,
          procedureNumber: `TP-${String(i + 1).padStart(3, '0')}`,
          title: template.title,
          testType: template.testType,
          description: template.description,
          expectedResult: template.expectedResult,
          sampleSelection: template.sampleSelection,
        },
      });
    }
  }

  // ===========================================
  // Checklist Management
  // ===========================================

  async updateChecklistProgress(
    auditId: string,
    organizationId: string,
    dto: UpdateChecklistProgressDto,
    userId: string
  ) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
    });

    if (!audit) {
      throw new NotFoundException(`Audit ${auditId} not found`);
    }

    const progress = (audit.checklistProgress as ChecklistProgress) || {};

    // Validate itemId to prevent property injection
    validatePropertyName(dto.itemId, 'checklist item ID');

    // Update the item
    // codeql[js/remote-property-injection] suppressed: itemId is validated above by validatePropertyName()
    progress[dto.itemId] = {
      completed: dto.completed,
      completedAt: dto.completed ? new Date().toISOString() : undefined,
      completedBy: dto.completed ? userId : undefined,
      notes: dto.notes,
    };

    // Count completed items
    const completedCount = Object.values(progress).filter((p) => p.completed).length;

    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        checklistProgress: progress,
        checklistCompletedCount: completedCount,
      },
    });
  }

  async getChecklistStatus(auditId: string, organizationId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
      include: {
        template: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(`Audit ${auditId} not found`);
    }

    const checklistItems = (audit.template?.checklistItems as unknown as ChecklistItemDto[]) || [];
    const progress = (audit.checklistProgress as ChecklistProgress) || {};

    const items = checklistItems.map((item: ChecklistItemDto) => ({
      ...item,
      ...progress[item.id],
    }));

    const completedCount = items.filter((i) => i.completed).length;
    const totalCount = items.length;
    const requiredCount = items.filter((i) => i.required).length;
    const requiredCompletedCount = items.filter((i) => i.required && i.completed).length;

    return {
      auditId,
      items,
      completedCount,
      totalCount,
      completionPercentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      requiredCount,
      requiredCompletedCount,
      requiredCompletionPercentage:
        requiredCount > 0 ? Math.round((requiredCompletedCount / requiredCount) * 100) : 0,
    };
  }

  // ===========================================
  // Clone Template
  // ===========================================

  async cloneTemplate(id: string, organizationId: string, newName: string, _userId: string) {
    const template = await this.findOne(id, organizationId);

    return this.prisma.auditTemplate.create({
      data: {
        organizationId,
        name: newName || `${template.name} (Copy)`,
        description: template.description,
        auditType: template.auditType,
        framework: template.framework,
        checklistItems: template.checklistItems ?? [],
        requestTemplates: template.requestTemplates ?? [],
        testProcedureTemplates: template.testProcedureTemplates ?? [],
        isSystem: false,
        createdBy: _userId,
      },
    });
  }
}
