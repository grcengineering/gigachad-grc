import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCommunicationPlanDto, UpdateCommunicationPlanDto, CreateContactDto } from './dto/bcdr.dto';

@Injectable()
export class CommunicationPlansService {
  private readonly logger = new Logger(CommunicationPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, filters?: { search?: string; planType?: string; bcdrPlanId?: string }) {
    const { search, planType, bcdrPlanId } = filters || {};

    // Build dynamic query
    const conditions: string[] = ['cp.organization_id = $1', 'cp.deleted_at IS NULL'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`cp.name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (planType) {
      conditions.push(`cp.plan_type = $${paramIndex}`);
      params.push(planType);
      paramIndex++;
    }
    if (bcdrPlanId) {
      conditions.push(`cp.bcdr_plan_id = $${paramIndex}`);
      params.push(bcdrPlanId);
      paramIndex++;
    }

    const plans = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT cp.*, 
             bp.title as bcdr_plan_title,
             (SELECT COUNT(*) FROM bcdr.communication_contacts WHERE communication_plan_id = cp.id) as contact_count
      FROM bcdr.communication_plans cp
      LEFT JOIN bcdr.bcdr_plans bp ON cp.bcdr_plan_id = bp.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY cp.name ASC
    `, ...params);

    return plans;
  }

  async findOne(id: string, organizationId: string) {
    const plans = await this.prisma.$queryRaw<any[]>`
      SELECT cp.*, bp.title as bcdr_plan_title
      FROM bcdr.communication_plans cp
      LEFT JOIN bcdr.bcdr_plans bp ON cp.bcdr_plan_id = bp.id
      WHERE cp.id = ${id}
        AND cp.organization_id = ${organizationId}
        AND cp.deleted_at IS NULL
    `;

    if (!plans || plans.length === 0) {
      throw new NotFoundException(`Communication plan ${id} not found`);
    }

    // Get contacts
    const contacts = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM bcdr.communication_contacts
      WHERE communication_plan_id = ${id}
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
    userName?: string,
  ) {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.communication_plans (
        organization_id, name, description, plan_type, bcdr_plan_id,
        activation_triggers, created_by, updated_by
      ) VALUES (
        ${organizationId}, ${dto.name}, ${dto.description || null},
        ${dto.planType || 'emergency'}, ${dto.bcdrPlanId || null},
        ${dto.activationTriggers || null}, ${userId}, ${userId}
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
    userName?: string,
  ) {
    await this.findOne(id, organizationId);

    const updates: string[] = ['updated_by = $2', 'updated_at = NOW()'];
    const values: any[] = [id, userId];
    let paramIndex = 3;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(dto.name);
      paramIndex++;
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(dto.description);
      paramIndex++;
    }
    if (dto.planType !== undefined) {
      updates.push(`plan_type = $${paramIndex}`);
      values.push(dto.planType);
      paramIndex++;
    }
    if (dto.bcdrPlanId !== undefined) {
      updates.push(`bcdr_plan_id = $${paramIndex}`);
      values.push(dto.bcdrPlanId);
      paramIndex++;
    }
    if (dto.activationTriggers !== undefined) {
      updates.push(`activation_triggers = $${paramIndex}`);
      values.push(dto.activationTriggers);
      paramIndex++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(dto.isActive);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.communication_plans SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      ...values,
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
    userName?: string,
  ) {
    const plan = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.communication_plans 
      SET deleted_at = NOW()
      WHERE id = ${id}
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
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.communication_contacts (
        communication_plan_id, name, title, organization_name, contact_type,
        primary_phone, secondary_phone, email, alternate_email,
        location, time_zone, role_in_plan, responsibilities,
        escalation_level, escalation_wait_minutes, availability_hours, notes,
        sort_order, created_by
      ) VALUES (
        ${planId}, ${dto.name}, ${dto.title || null}, ${dto.organizationName || null},
        ${dto.contactType}::bcdr.contact_type,
        ${dto.primaryPhone || null}, ${dto.secondaryPhone || null},
        ${dto.email || null}, ${dto.alternateEmail || null},
        ${dto.location || null}, ${dto.timeZone || null},
        ${dto.roleInPlan || null}, ${dto.responsibilities || null},
        ${dto.escalationLevel || 1}, ${dto.escalationWaitMinutes || 30},
        ${dto.availabilityHours || null}, ${dto.notes || null},
        ${dto.sortOrder || 0}, ${userId}
      )
      RETURNING *
    `;

    return result[0];
  }

  async updateContact(contactId: string, updates: Partial<CreateContactDto> & { isActive?: boolean }) {
    const updateFields: string[] = ['updated_at = NOW()'];
    const values: any[] = [contactId];
    let paramIndex = 2;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }
    if (updates.organizationName !== undefined) {
      updateFields.push(`organization_name = $${paramIndex}`);
      values.push(updates.organizationName);
      paramIndex++;
    }
    if (updates.contactType !== undefined) {
      updateFields.push(`contact_type = $${paramIndex}::bcdr.contact_type`);
      values.push(updates.contactType);
      paramIndex++;
    }
    if (updates.primaryPhone !== undefined) {
      updateFields.push(`primary_phone = $${paramIndex}`);
      values.push(updates.primaryPhone);
      paramIndex++;
    }
    if (updates.secondaryPhone !== undefined) {
      updateFields.push(`secondary_phone = $${paramIndex}`);
      values.push(updates.secondaryPhone);
      paramIndex++;
    }
    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      values.push(updates.email);
      paramIndex++;
    }
    if (updates.alternateEmail !== undefined) {
      updateFields.push(`alternate_email = $${paramIndex}`);
      values.push(updates.alternateEmail);
      paramIndex++;
    }
    if (updates.location !== undefined) {
      updateFields.push(`location = $${paramIndex}`);
      values.push(updates.location);
      paramIndex++;
    }
    if (updates.timeZone !== undefined) {
      updateFields.push(`time_zone = $${paramIndex}`);
      values.push(updates.timeZone);
      paramIndex++;
    }
    if (updates.roleInPlan !== undefined) {
      updateFields.push(`role_in_plan = $${paramIndex}`);
      values.push(updates.roleInPlan);
      paramIndex++;
    }
    if (updates.responsibilities !== undefined) {
      updateFields.push(`responsibilities = $${paramIndex}`);
      values.push(updates.responsibilities);
      paramIndex++;
    }
    if (updates.escalationLevel !== undefined) {
      updateFields.push(`escalation_level = $${paramIndex}`);
      values.push(updates.escalationLevel);
      paramIndex++;
    }
    if (updates.escalationWaitMinutes !== undefined) {
      updateFields.push(`escalation_wait_minutes = $${paramIndex}`);
      values.push(updates.escalationWaitMinutes);
      paramIndex++;
    }
    if (updates.availabilityHours !== undefined) {
      updateFields.push(`availability_hours = $${paramIndex}`);
      values.push(updates.availabilityHours);
      paramIndex++;
    }
    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      values.push(updates.notes);
      paramIndex++;
    }
    if (updates.sortOrder !== undefined) {
      updateFields.push(`sort_order = $${paramIndex}`);
      values.push(updates.sortOrder);
      paramIndex++;
    }
    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      values.push(updates.isActive);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.communication_contacts SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      ...values,
    );

    return result[0];
  }

  async deleteContact(contactId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.communication_contacts WHERE id = ${contactId}
    `;

    return { success: true };
  }

  async reorderContacts(planId: string, contactIds: string[]) {
    for (let i = 0; i < contactIds.length; i++) {
      await this.prisma.$executeRaw`
        UPDATE bcdr.communication_contacts
        SET sort_order = ${i}
        WHERE id = ${contactIds[i]} AND communication_plan_id = ${planId}
      `;
    }

    return { success: true };
  }

  // Get contacts by escalation level
  async getContactsByEscalation(organizationId: string, planId?: string) {
    // Build dynamic query
    const conditions: string[] = [
      'cp.organization_id = $1',
      'cp.is_active = true',
      'c.is_active = true'
    ];
    const params: any[] = [organizationId];

    if (planId) {
      conditions.push(`cp.id = $2`);
      params.push(planId);
    }

    const contacts = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*, cp.name as plan_name
      FROM bcdr.communication_contacts c
      JOIN bcdr.communication_plans cp ON c.communication_plan_id = cp.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.escalation_level ASC, c.sort_order ASC
    `, ...params);

    // Group by escalation level
    const grouped = contacts.reduce((acc: Record<number, any[]>, contact) => {
      const level = contact.escalation_level || 1;
      if (!acc[level]) acc[level] = [];
      acc[level].push(contact);
      return acc;
    }, {});

    return grouped;
  }
}

