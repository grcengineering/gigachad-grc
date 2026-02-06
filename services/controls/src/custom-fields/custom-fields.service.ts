import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
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

// In-memory stores
const fieldStore = new Map<string, CustomFieldRecord>();
const valueStore = new Map<string, CustomFieldValueRecord>(); // Key: `${fieldId}:${entityId}`

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createField(
    organizationId: string,
    userId: string,
    dto: CreateCustomFieldDto
  ): Promise<CustomFieldDto> {
    // Check for duplicate slug
    const existing = Array.from(fieldStore.values()).find(
      (f) =>
        f.organizationId === organizationId &&
        f.entityType === dto.entityType &&
        f.slug === dto.slug
    );
    if (existing) {
      throw new ConflictException(
        `Field with slug '${dto.slug}' already exists for ${dto.entityType}`
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const field: CustomFieldRecord = {
      id,
      organizationId,
      name: dto.name,
      slug: dto.slug,
      fieldType: dto.fieldType,
      entityType: dto.entityType,
      description: dto.description,
      defaultValue: dto.defaultValue,
      options: dto.options,
      isRequired: dto.isRequired || false,
      placeholder: dto.placeholder,
      displayOrder: dto.displayOrder || 0,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    fieldStore.set(id, field);
    this.logger.log(`Created custom field ${id} (${dto.slug}) for ${dto.entityType}`);

    return this.toFieldDto(field);
  }

  async updateField(
    organizationId: string,
    fieldId: string,
    dto: UpdateCustomFieldDto
  ): Promise<CustomFieldDto> {
    const field = fieldStore.get(fieldId);
    if (!field || field.organizationId !== organizationId) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }

    const updated: CustomFieldRecord = {
      ...field,
      name: dto.name ?? field.name,
      description: dto.description ?? field.description,
      defaultValue: dto.defaultValue ?? field.defaultValue,
      options: dto.options ?? field.options,
      isRequired: dto.isRequired ?? field.isRequired,
      placeholder: dto.placeholder ?? field.placeholder,
      displayOrder: dto.displayOrder ?? field.displayOrder,
      isActive: dto.isActive ?? field.isActive,
      updatedAt: new Date(),
    };

    fieldStore.set(fieldId, updated);
    return this.toFieldDto(updated);
  }

  async deleteField(organizationId: string, fieldId: string): Promise<void> {
    const field = fieldStore.get(fieldId);
    if (!field || field.organizationId !== organizationId) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }

    // Delete all values for this field
    for (const [key, value] of valueStore.entries()) {
      if (value.fieldId === fieldId) {
        valueStore.delete(key);
      }
    }

    fieldStore.delete(fieldId);
    this.logger.log(`Deleted custom field ${fieldId}`);
  }

  async getField(organizationId: string, fieldId: string): Promise<CustomFieldDto> {
    const field = fieldStore.get(fieldId);
    if (!field || field.organizationId !== organizationId) {
      throw new NotFoundException(`Custom field ${fieldId} not found`);
    }
    return this.toFieldDto(field);
  }

  async listFields(organizationId: string, query: CustomFieldListQueryDto) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    let fields = Array.from(fieldStore.values()).filter((f) => f.organizationId === organizationId);

    if (query.entityType) {
      fields = fields.filter((f) => f.entityType === query.entityType);
    }

    if (query.activeOnly) {
      fields = fields.filter((f) => f.isActive);
    }

    fields.sort((a, b) => a.displayOrder - b.displayOrder);

    const total = fields.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedFields = fields.slice(offset, offset + pagination.limit);

    return createPaginatedResponse(
      paginatedFields.map((f) => this.toFieldDto(f)),
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
    // Find field by ID or slug
    let field = fieldStore.get(dto.fieldIdOrSlug);
    if (!field) {
      field = Array.from(fieldStore.values()).find(
        (f) =>
          f.organizationId === organizationId &&
          f.entityType === entityType &&
          f.slug === dto.fieldIdOrSlug
      );
    }

    if (!field || field.organizationId !== organizationId) {
      throw new NotFoundException(`Custom field '${dto.fieldIdOrSlug}' not found`);
    }

    if (field.entityType !== entityType) {
      throw new BadRequestException(`Field '${field.slug}' is not applicable to ${entityType}`);
    }

    // Validate value
    this.validateFieldValue(field, dto.value);

    const key = `${field.id}:${entityId}`;
    const now = new Date();

    const existing = valueStore.get(key);
    const valueRecord: CustomFieldValueRecord = {
      id: existing?.id || crypto.randomUUID(),
      fieldId: field.id,
      entityId,
      value: dto.value,
      createdBy: existing?.createdBy || userId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    valueStore.set(key, valueRecord);

    return this.toValueDto(field, valueRecord);
  }

  async getEntityFieldValues(
    organizationId: string,
    entityType: CustomFieldEntityType,
    entityId: string
  ): Promise<EntityCustomFieldsDto> {
    const fields = Array.from(fieldStore.values()).filter(
      (f) => f.organizationId === organizationId && f.entityType === entityType && f.isActive
    );

    const values: CustomFieldValueDto[] = [];

    for (const field of fields) {
      const key = `${field.id}:${entityId}`;
      const valueRecord = valueStore.get(key);

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
    entityType: CustomFieldEntityType,
    entityId: string,
    fieldIdOrSlug: string
  ): Promise<void> {
    let field = fieldStore.get(fieldIdOrSlug);
    if (!field) {
      field = Array.from(fieldStore.values()).find(
        (f) =>
          f.organizationId === organizationId &&
          f.entityType === entityType &&
          f.slug === fieldIdOrSlug
      );
    }

    if (!field || field.organizationId !== organizationId) {
      throw new NotFoundException(`Custom field '${fieldIdOrSlug}' not found`);
    }

    const key = `${field.id}:${entityId}`;
    valueStore.delete(key);
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
