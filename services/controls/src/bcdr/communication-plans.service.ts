import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCommunicationPlanDto,
  UpdateCommunicationPlanDto,
  CreateContactDto,
} from './dto/bcdr.dto';
import { CommunicationPlanRecord, CommunicationContactRecord } from './types/bcdr-query.types';

@Injectable()
export class CommunicationPlansService {
  private readonly logger = new Logger(CommunicationPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async findAll(
    organizationId: string,
    filters?: { search?: string; planType?: string; bcdrPlanId?: string }
  ) {
    const { search, planType, bcdrPlanId } = filters || {};

    // Use parameterized queries to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    const plans = await this.prisma.$queryRaw<CommunicationPlanRecord[]>`
      SELECT cp.*, 
             bp.title as bcdr_plan_title,
             (SELECT COUNT(*) FROM bcdr.communication_contacts WHERE communication_plan_id = cp.id) as contact_count
      FROM bcdr.communication_plans cp
      LEFT JOIN bcdr.bcdr_plans bp ON cp.bcdr_plan_id = bp.id
      WHERE cp.organization_id = ${organizationId}::uuid
        AND cp.deleted_at IS NULL
        AND (${searchPattern}::text IS NULL OR cp.name ILIKE ${searchPattern})
        AND (${planType}::text IS NULL OR cp.plan_type = ${planType})
        AND (${bcdrPlanId}::text IS NULL OR cp.bcdr_plan_id = ${bcdrPlanId}::uuid)
      ORDER BY cp.name ASC
    `;

    return plans;
  }

  async findOne(id: string, organizationId: string) {
    const plans = await this.prisma.$queryRaw<CommunicationPlanRecord[]>`
      SELECT cp.*, bp.title as bcdr_plan_title
      FROM bcdr.communication_plans cp
      LEFT JOIN bcdr.bcdr_plans bp ON cp.bcdr_plan_id = bp.id
      WHERE cp.id = ${id}::uuid
        AND cp.organization_id = ${organizationId}::uuid
        AND cp.deleted_at IS NULL
    `;

    if (!plans || plans.length === 0) {
      throw new NotFoundException(`Communication plan ${id} not found`);
    }

    // Get contacts
    const contacts = await this.prisma.$queryRaw<CommunicationContactRecord[]>`
      SELECT *
      FROM bcdr.communication_contacts
      WHERE communication_plan_id = ${id}::uuid
        AND is_active = true
      ORDER BY escalation_level ASC, sort_order ASC, name ASC
    `;

    return {
      ...plans[0],
      contacts,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateCommunicationPlanDto,
    userEmail?: string,
    userName?: string
  ) {
    const result = await this.prisma.$queryRaw<CommunicationPlanRecord[]>`
      INSERT INTO bcdr.communication_plans (
        organization_id, name, description, plan_type, bcdr_plan_id,
        activation_triggers, created_by, updated_by
      ) VALUES (
        ${organizationId}, ${dto.name}, ${dto.description || null},
        ${dto.planType || 'emergency'}, ${dto.bcdrPlanId || null}::uuid,
        ${dto.activationTriggers || null}, ${userId}::uuid, ${userId}::uuid
      )
      RETURNING *
    `;

    const plan = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'communication_plan',
      entityId: plan.id,
      entityName: plan.name,
      description: `Created communication plan "${plan.name}"`,
    });

    return plan;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateCommunicationPlanDto,
    userEmail?: string,
    userName?: string
  ) {
    await this.findOne(id, organizationId);

    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    // This prevents SQL injection even though column names come from code, not user input.
    const ALLOWED_COLUMNS = new Set([
      'name',
      'description',
      'plan_type',
      'bcdr_plan_id',
      'activation_triggers',
      'is_active',
      'updated_by',
      'updated_at',
    ]);

    const updates: string[] = ['updated_by = $2::uuid', 'updated_at = NOW()'];
    const values: (string | boolean | null)[] = [id, userId];
    let paramIndex = 3;

    // Helper to safely add column updates - validates column is in allowed list
    const addUpdate = (column: string, value: string | boolean | null, typeCast?: string) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updates.push(`${column} = $${paramIndex}${typeCast || ''}`);
      values.push(value);
      paramIndex++;
    };

    if (dto.name !== undefined) {
      addUpdate('name', dto.name);
    }
    if (dto.description !== undefined) {
      addUpdate('description', dto.description);
    }
    if (dto.planType !== undefined) {
      addUpdate('plan_type', dto.planType);
    }
    if (dto.bcdrPlanId !== undefined) {
      addUpdate('bcdr_plan_id', dto.bcdrPlanId, '::uuid');
    }
    if (dto.activationTriggers !== undefined) {
      addUpdate('activation_triggers', dto.activationTriggers);
    }
    if (dto.isActive !== undefined) {
      addUpdate('is_active', dto.isActive);
    }

    // SECURITY NOTE: $queryRawUnsafe is used here because Prisma's tagged template
    // doesn't support dynamic column names. This is safe because:
    // 1. Column names are hardcoded strings validated against ALLOWED_COLUMNS
    // 2. All values are parameterized via positional parameters ($1, $2, etc.)
    // 3. No user input is interpolated into column names
    const result = await this.prisma.$queryRawUnsafe<CommunicationPlanRecord[]>(
      `UPDATE bcdr.communication_plans SET ${updates.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values
    );

    const plan = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'communication_plan',
      entityId: id,
      entityName: plan.name,
      description: `Updated communication plan "${plan.name}"`,
      changes: dto,
    });

    return plan;
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string
  ) {
    const plan = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.communication_plans 
      SET deleted_at = NOW()
      WHERE id = ${id}::uuid
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'communication_plan',
      entityId: id,
      entityName: plan.name,
      description: `Deleted communication plan "${plan.name}"`,
    });

    return { success: true };
  }

  // Contacts
  async addContact(planId: string, userId: string, dto: CreateContactDto) {
    const result = await this.prisma.$queryRaw<CommunicationContactRecord[]>`
      INSERT INTO bcdr.communication_contacts (
        communication_plan_id, name, title, organization_name, contact_type,
        primary_phone, secondary_phone, email, alternate_email,
        location, time_zone, role_in_plan, responsibilities,
        escalation_level, escalation_wait_minutes, availability_hours, notes,
        sort_order, created_by
      ) VALUES (
        ${planId}::uuid, ${dto.name}, ${dto.title || null}, ${dto.organizationName || null},
        ${dto.contactType}::bcdr.contact_type,
        ${dto.primaryPhone || null}, ${dto.secondaryPhone || null},
        ${dto.email || null}, ${dto.alternateEmail || null},
        ${dto.location || null}, ${dto.timeZone || null},
        ${dto.roleInPlan || null}, ${dto.responsibilities || null},
        ${dto.escalationLevel || 1}, ${dto.escalationWaitMinutes || 30},
        ${dto.availabilityHours || null}, ${dto.notes || null},
        ${dto.sortOrder || 0}, ${userId}::uuid
      )
      RETURNING *
    `;

    return result[0];
  }

  async updateContact(
    contactId: string,
    updates: Partial<CreateContactDto> & { isActive?: boolean }
  ) {
    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    const ALLOWED_COLUMNS = new Set([
      'name',
      'title',
      'organization_name',
      'contact_type',
      'primary_phone',
      'secondary_phone',
      'email',
      'alternate_email',
      'location',
      'time_zone',
      'role_in_plan',
      'responsibilities',
      'escalation_level',
      'escalation_wait_minutes',
      'availability_hours',
      'notes',
      'sort_order',
      'is_active',
      'updated_at',
    ]);

    const updateFields: string[] = ['updated_at = NOW()'];
    const values: (string | number | boolean | null)[] = [contactId];
    let paramIndex = 2;

    // Helper to safely add column updates - validates column is in allowed list
    const addUpdate = (
      column: string,
      value: string | number | boolean | null,
      typeCast?: string
    ) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updateFields.push(`${column} = $${paramIndex}${typeCast || ''}`);
      values.push(value);
      paramIndex++;
    };

    if (updates.name !== undefined) {
      addUpdate('name', updates.name);
    }
    if (updates.title !== undefined) {
      addUpdate('title', updates.title);
    }
    if (updates.organizationName !== undefined) {
      addUpdate('organization_name', updates.organizationName);
    }
    if (updates.contactType !== undefined) {
      addUpdate('contact_type', updates.contactType, '::bcdr.contact_type');
    }
    if (updates.primaryPhone !== undefined) {
      addUpdate('primary_phone', updates.primaryPhone);
    }
    if (updates.secondaryPhone !== undefined) {
      addUpdate('secondary_phone', updates.secondaryPhone);
    }
    if (updates.email !== undefined) {
      addUpdate('email', updates.email);
    }
    if (updates.alternateEmail !== undefined) {
      addUpdate('alternate_email', updates.alternateEmail);
    }
    if (updates.location !== undefined) {
      addUpdate('location', updates.location);
    }
    if (updates.timeZone !== undefined) {
      addUpdate('time_zone', updates.timeZone);
    }
    if (updates.roleInPlan !== undefined) {
      addUpdate('role_in_plan', updates.roleInPlan);
    }
    if (updates.responsibilities !== undefined) {
      addUpdate('responsibilities', updates.responsibilities);
    }
    if (updates.escalationLevel !== undefined) {
      addUpdate('escalation_level', updates.escalationLevel);
    }
    if (updates.escalationWaitMinutes !== undefined) {
      addUpdate('escalation_wait_minutes', updates.escalationWaitMinutes);
    }
    if (updates.availabilityHours !== undefined) {
      addUpdate('availability_hours', updates.availabilityHours);
    }
    if (updates.notes !== undefined) {
      addUpdate('notes', updates.notes);
    }
    if (updates.sortOrder !== undefined) {
      addUpdate('sort_order', updates.sortOrder);
    }
    if (updates.isActive !== undefined) {
      addUpdate('is_active', updates.isActive);
    }

    // SECURITY NOTE: $queryRawUnsafe is used here because Prisma's tagged template
    // doesn't support dynamic column names. This is safe because:
    // 1. Column names are hardcoded strings validated against ALLOWED_COLUMNS
    // 2. All values are parameterized via positional parameters ($1, $2, etc.)
    // 3. No user input is interpolated into column names
    const result = await this.prisma.$queryRawUnsafe<CommunicationContactRecord[]>(
      `UPDATE bcdr.communication_contacts SET ${updateFields.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values
    );

    return result[0];
  }

  async deleteContact(contactId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.communication_contacts WHERE id = ${contactId}::uuid
    `;

    return { success: true };
  }

  async reorderContacts(planId: string, contactIds: string[]) {
    // SECURITY: Limit maximum number of contacts to prevent loop bound injection
    const MAX_CONTACTS = 1000;
    const safeContactIds = contactIds.slice(0, MAX_CONTACTS);

    // codeql[js/loop-bound-injection] suppressed: Array is bounded by MAX_CONTACTS limit above
    for (let i = 0; i < safeContactIds.length; i++) {
      await this.prisma.$executeRaw`
        UPDATE bcdr.communication_contacts
        SET sort_order = ${i}
        WHERE id = ${safeContactIds[i]}::uuid AND communication_plan_id = ${planId}::uuid
      `;
    }

    return { success: true };
  }

  // Get contacts by escalation level
  async getContactsByEscalation(organizationId: string, planId?: string) {
    // Use parameterized queries to prevent SQL injection
    const contacts = await this.prisma.$queryRaw<
      (CommunicationContactRecord & { plan_name?: string })[]
    >`
      SELECT c.*, cp.name as plan_name
      FROM bcdr.communication_contacts c
      JOIN bcdr.communication_plans cp ON c.communication_plan_id = cp.id
      WHERE cp.organization_id = ${organizationId}::uuid
        AND cp.is_active = true
        AND c.is_active = true
        AND (${planId}::text IS NULL OR cp.id = ${planId}::uuid)
      ORDER BY c.escalation_level ASC, c.sort_order ASC
    `;

    // Group by escalation level
    const grouped = contacts.reduce(
      (acc: Record<number, (CommunicationContactRecord & { plan_name?: string })[]>, contact) => {
        const level = contact.escalation_level || 1;
        if (!acc[level]) acc[level] = [];
        acc[level].push(contact);
        return acc;
      },
      {}
    );

    return grouped;
  }
}
