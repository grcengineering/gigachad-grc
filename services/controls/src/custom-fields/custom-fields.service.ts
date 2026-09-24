import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomFieldDefinition, CustomFieldValue, Prisma } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldDto,
  SetCustomFieldValueDto,
  CustomFieldValueDto,
  EntityCustomFieldsDto,
  CustomFieldListQueryDto,
  CustomFieldType,
  CustomFieldEntityType,
} from './dto/custom-field.dto';
import { parsePaginationParams, createPaginatedResponse } from '@gigachad-grc/shared';

interface CustomFieldRecord {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  fieldType: CustomFieldType;
  entityType: CustomFieldEntityType;
  description?: string;
  defaultValue?: string;
  options?: string[];
  isRequired: boolean;
  placeholder?: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomFieldValueRecord {
  id: string;
  fieldId: string;
  entityId: string;
  value: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createField(
    organizationId: string,
    userId: string,
    dto: CreateCustomFieldDto
  ): Promise<CustomFieldDto> {
    const existing = await this.prisma.customFieldDefinition.findFirst({
      where: { organizationId, entityType: dto.entityType, name: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Field with slug '${dto.slug}' already exists for ${dto.entityType}`
      );
    }

    const created = await this.prisma.customFieldDefinition.create({
      data: {
        organizationId,
        name: dto.slug,
        label: dto.name,
        description: dto.description,
        fieldType: dto.fieldType,
        entityType: dto.entityType,
        entityTypes: [dto.entityType],
        isRequired: dto.isRequired || false,
        defaultValue: dto.defaultValue === undefined
          ? undefined
          : (dto.defaultValue as Prisma.InputJsonValue),
        placeholder: dto.placeholder,
        options: dto.options as Prisma.InputJsonValue | undefined,
        order: dto.displayOrder || 0,
        createdBy: userId,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'CustomFieldDefinition',
      entityId: created.id,
      entityName: created.label,
      description: `Created custom field ${created.name}`,
    });
    this.logger.log(`Created custom field ${created.id} (${dto.slug}) for ${dto.entityType}`);
    return this.toFieldDto(this.toFieldRecord(created));
  }

  async updateField(
    organizationId: string,
    userId: string,
    fieldId: string,
    dto: UpdateCustomFieldDto
  ): Promise<CustomFieldDto> {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id: fieldId, organizationId },
    });
    if (!field) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }
    const updated = await this.prisma.customFieldDefinition.update({
      where: { id: fieldId },
      data: {
        label: dto.name,
        description: dto.description,
        defaultValue: dto.defaultValue as Prisma.InputJsonValue | undefined,
        options: dto.options as Prisma.InputJsonValue | undefined,
        isRequired: dto.isRequired,
        placeholder: dto.placeholder,
        order: dto.displayOrder,
        isActive: dto.isActive,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'CustomFieldDefinition',
      entityId: fieldId,
      entityName: updated.label,
      description: `Updated custom field ${updated.name}`,
    });
    return this.toFieldDto(this.toFieldRecord(updated));
  }

  async deleteField(organizationId: string, userId: string, fieldId: string): Promise<void> {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id: fieldId, organizationId },
    });
    if (!field) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }

    await this.prisma.customFieldDefinition.delete({ where: { id: fieldId } });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'CustomFieldDefinition',
      entityId: fieldId,
      entityName: field.label,
      description: `Deleted custom field ${field.name}`,
    });
    this.logger.log(`Deleted custom field ${fieldId}`);
  }

  async getField(organizationId: string, fieldId: string): Promise<CustomFieldDto> {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id: fieldId, organizationId },
    });
    if (!field) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }
    return this.toFieldDto(this.toFieldRecord(field));
  }

  async listFields(organizationId: string, query: CustomFieldListQueryDto) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where: Prisma.CustomFieldDefinitionWhereInput = {
      organizationId,
      entityType: query.entityType,
      isActive: query.activeOnly ? true : undefined,
    };
    const [fields, total] = await Promise.all([
      this.prisma.customFieldDefinition.findMany({
        where,
        orderBy: { order: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.customFieldDefinition.count({ where }),
    ]);

    return createPaginatedResponse(
      fields.map((f) => this.toFieldDto(this.toFieldRecord(f))),
      total,
      pagination
    );
  }

  async setEntityFieldValue(
    organizationId: string,
    userId: string,
    entityType: CustomFieldEntityType,
    entityId: string,
    dto: SetCustomFieldValueDto
  ): Promise<CustomFieldValueDto> {
    const fieldRow = await this.prisma.customFieldDefinition.findFirst({
      where: {
        organizationId,
        entityType,
        OR: [{ id: dto.fieldIdOrSlug }, { name: dto.fieldIdOrSlug }],
      },
    });
    if (!fieldRow) {
      throw new NotFoundException(`Custom field '${dto.fieldIdOrSlug}' not found`);
    }
    const field = this.toFieldRecord(fieldRow);

    if (field.entityType !== entityType) {
      throw new BadRequestException(`Field '${field.slug}' is not applicable to ${entityType}`);
    }

    // Validate value
    this.validateFieldValue(field, dto.value);

    const value = await this.prisma.customFieldValue.upsert({
      where: {
        fieldId_entityType_entityId: {
          fieldId: field.id,
          entityType,
          entityId,
        },
      },
      create: {
        fieldId: field.id,
        entityType,
        entityId,
        value: dto.value as Prisma.InputJsonValue,
        createdBy: userId,
      },
      update: {
        value: dto.value as Prisma.InputJsonValue,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'SET_VALUE',
      entityType: 'CustomFieldValue',
      entityId: value.id,
      entityName: field.name,
      description: `Set custom field ${field.slug} on ${entityType} ${entityId}`,
    });
    const valueRecord = this.toValueRecord(value);
    return this.toValueDto(field, valueRecord);
  }

  async getEntityFieldValues(
    organizationId: string,
    entityType: CustomFieldEntityType,
    entityId: string
  ): Promise<EntityCustomFieldsDto> {
    const fieldRows = await this.prisma.customFieldDefinition.findMany({
      where: { organizationId, entityType, isActive: true },
      include: {
        values: {
          where: { entityType, entityId },
        },
      },
      orderBy: { order: 'asc' },
    });
    const fields = fieldRows.map((field) => this.toFieldRecord(field));

    const values: CustomFieldValueDto[] = [];

    for (const field of fields) {
      const row = fieldRows.find((candidate) => candidate.id === field.id)?.values[0];
      const valueRecord = row ? this.toValueRecord(row) : undefined;

      if (valueRecord) {
        values.push(this.toValueDto(field, valueRecord));
      } else if (field.defaultValue !== undefined) {
        // Return default value if no value set
        values.push({
          fieldId: field.id,
          fieldSlug: field.slug,
          fieldName: field.name,
          fieldType: field.fieldType,
          value: field.defaultValue,
          parsedValue: this.parseValue(field.fieldType, field.defaultValue),
        });
      }
    }

    return {
      entityType,
      entityId,
      values,
    };
  }

  async deleteEntityFieldValue(
    organizationId: string,
    userId: string,
    entityType: CustomFieldEntityType,
    entityId: string,
    fieldIdOrSlug: string
  ): Promise<void> {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: {
        organizationId,
        entityType,
        OR: [{ id: fieldIdOrSlug }, { name: fieldIdOrSlug }],
      },
    });
    if (!field) {
      throw new NotFoundException(`Custom field '${fieldIdOrSlug}' not found`);
    }

    const deleted = await this.prisma.customFieldValue.deleteMany({
      where: { fieldId: field.id, entityType, entityId },
    });
    if (deleted.count > 0) {
      await auditMutation(this.prisma, {
        organizationId,
        userId,
        action: 'DELETE_VALUE',
        entityType: 'CustomFieldValue',
        entityId: `${field.id}:${entityId}`,
        entityName: field.label,
        description: `Deleted custom field ${field.name} from ${entityType} ${entityId}`,
      });
    }
  }

  private validateFieldValue(field: CustomFieldRecord, value: string): void {
    if (field.isRequired && (!value || value.trim() === '')) {
      throw new BadRequestException(`Field '${field.name}' is required`);
    }

    if (!value) return;

    switch (field.fieldType) {
      case CustomFieldType.NUMBER:
        if (isNaN(Number(value))) {
          throw new BadRequestException(`Field '${field.name}' must be a number`);
        }
        break;

      case CustomFieldType.DATE:
      case CustomFieldType.DATETIME:
        if (isNaN(Date.parse(value))) {
          throw new BadRequestException(`Field '${field.name}' must be a valid date`);
        }
        break;

      case CustomFieldType.SELECT:
        if (field.options && !field.options.includes(value)) {
          throw new BadRequestException(`Invalid option for field '${field.name}'`);
        }
        break;

      case CustomFieldType.MULTISELECT: {
        const values = value.split(',').map((v) => v.trim());
        if (field.options && !values.every((v) => field.options!.includes(v))) {
          throw new BadRequestException(`Invalid option for field '${field.name}'`);
        }
        break;
      }

      case CustomFieldType.EMAIL: {
        // SECURITY: Use length limit and structured validation to prevent ReDoS
        if (value.length > 254) {
          throw new BadRequestException(`Field '${field.name}' must be a valid email`);
        }
        const emailParts = value.split('@');
        if (emailParts.length !== 2) {
          throw new BadRequestException(`Field '${field.name}' must be a valid email`);
        }
        const [local, domain] = emailParts;
        // Validate local and domain parts separately with safe patterns
        const localValid =
          local && local.length <= 64 && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local);
        const domainValid =
          domain &&
          domain.length <= 255 &&
          /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(
            domain
          );
        if (!localValid || !domainValid) {
          throw new BadRequestException(`Field '${field.name}' must be a valid email`);
        }
        break;
      }

      case CustomFieldType.URL:
        try {
          new URL(value);
        } catch {
          throw new BadRequestException(`Field '${field.name}' must be a valid URL`);
        }
        break;

      case CustomFieldType.CHECKBOX:
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          throw new BadRequestException(`Field '${field.name}' must be a boolean`);
        }
        break;
    }
  }

  private parseValue(fieldType: CustomFieldType, value: string): any {
    if (!value) return null;

    switch (fieldType) {
      case CustomFieldType.NUMBER:
        return Number(value);
      case CustomFieldType.DATE:
      case CustomFieldType.DATETIME:
        return new Date(value);
      case CustomFieldType.CHECKBOX:
        return ['true', '1'].includes(value.toLowerCase());
      case CustomFieldType.MULTISELECT:
        return value.split(',').map((v) => v.trim());
      default:
        return value;
    }
  }

  private toFieldRecord(field: CustomFieldDefinition): CustomFieldRecord {
    return {
      id: field.id,
      organizationId: field.organizationId,
      name: field.label,
      slug: field.name,
      fieldType: field.fieldType as CustomFieldType,
      entityType: field.entityType as CustomFieldEntityType,
      description: field.description ?? undefined,
      defaultValue: typeof field.defaultValue === 'string' ? field.defaultValue : undefined,
      options: Array.isArray(field.options) ? field.options.map(String) : undefined,
      isRequired: field.isRequired,
      placeholder: field.placeholder ?? undefined,
      displayOrder: field.order,
      isActive: field.isActive,
      createdBy: field.createdBy ?? 'system',
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
    };
  }

  private toValueRecord(value: CustomFieldValue): CustomFieldValueRecord {
    return {
      id: value.id,
      fieldId: value.fieldId,
      entityId: value.entityId,
      value: typeof value.value === 'string' ? value.value : JSON.stringify(value.value),
      createdBy: value.createdBy ?? 'system',
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  private toFieldDto(field: CustomFieldRecord): CustomFieldDto {
    return {
      id: field.id,
      name: field.name,
      slug: field.slug,
      fieldType: field.fieldType,
      entityType: field.entityType,
      description: field.description,
      defaultValue: field.defaultValue,
      options: field.options,
      isRequired: field.isRequired,
      placeholder: field.placeholder,
      displayOrder: field.displayOrder,
      isActive: field.isActive,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
    };
  }

  private toValueDto(
    field: CustomFieldRecord,
    valueRecord: CustomFieldValueRecord
  ): CustomFieldValueDto {
    return {
      fieldId: field.id,
      fieldSlug: field.slug,
      fieldName: field.name,
      fieldType: field.fieldType,
      value: valueRecord.value,
      parsedValue: this.parseValue(field.fieldType, valueRecord.value),
    };
  }
}
