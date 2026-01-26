import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generateApiKey, verifyApiKey } from '@gigachad-grc/shared';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyWithSecretResponseDto,
  ApiKeyListResponseDto,
  ApiKeyFilterDto,
} from './dto/api-key.dto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * List all API keys for an organization
   */
  async findAll(
    organizationId: string,
    filters: ApiKeyFilterDto,
    page: number = 1,
    limit: number = 50,
  ): Promise<ApiKeyListResponseDto> {
    const where: any = { organizationId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { keyPrefix: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [keys, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where,
        include: {
          apiKeyScopes: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.apiKey.count({ where }),
    ]);

    return {
      keys: keys.map(key => this.toResponseDto(key)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single API key by ID
   */
  async findOne(id: string, organizationId: string): Promise<ApiKeyResponseDto> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
      include: {
        apiKeyScopes: true,
      },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    return this.toResponseDto(key);
  }

  /**
   * Create a new API key
   * Returns the full key only once - it cannot be retrieved again
   */
  async create(
    organizationId: string,
    dto: CreateApiKeyDto,
    actorId: string,
    actorEmail?: string,
  ): Promise<ApiKeyWithSecretResponseDto> {
    // Generate the API key
    const { key, hash, prefix } = generateApiKey();

    // Create the API key record
    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: dto.scopes || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: actorId,
      },
      include: {
        apiKeyScopes: true,
      },
    });

    // Create scope records if provided
    if (dto.scopes && dto.scopes.length > 0) {
      await this.prisma.apiKeyScope.createMany({
        data: dto.scopes.map(scope => ({
          apiKeyId: apiKey.id,
          scope,
        })),
      });
    }

    this.logger.log(`Created API key: ${apiKey.name} (${prefix}...)`);

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'created',
      entityType: 'api_key',
      entityId: apiKey.id,
      entityName: apiKey.name,
      description: `Created API key "${apiKey.name}"`,
    });

    return {
      ...this.toResponseDto(apiKey),
      key, // Only returned on creation
    };
  }

  /**
   * Update an API key
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateApiKeyDto,
    actorId?: string,
    actorEmail?: string,
  ): Promise<ApiKeyResponseDto> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    // Update the API key
    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive,
      },
      include: {
        apiKeyScopes: true,
      },
    });

    // Update scopes if provided
    if (dto.scopes) {
      // Delete existing scopes
      await this.prisma.apiKeyScope.deleteMany({
        where: { apiKeyId: id },
      });

      // Create new scopes
      if (dto.scopes.length > 0) {
        await this.prisma.apiKeyScope.createMany({
          data: dto.scopes.map(scope => ({
            apiKeyId: id,
            scope,
          })),
        });
      }
    }

    this.logger.log(`Updated API key: ${apiKey.name}`);

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'updated',
      entityType: 'api_key',
      entityId: apiKey.id,
      entityName: apiKey.name,
      description: `Updated API key "${apiKey.name}"`,
      changes: {
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: apiKey.name, isActive: apiKey.isActive },
      },
    });

    return this.toResponseDto(apiKey);
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revoke(
    id: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Revoked API key: ${existing.name}`);

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'revoked',
      entityType: 'api_key',
      entityId: id,
      entityName: existing.name,
      description: `Revoked API key "${existing.name}"`,
    });
  }

  /**
   * Regenerate an API key
   * Creates a new key value, invalidating the old one
   */
  async regenerate(
    id: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<ApiKeyWithSecretResponseDto> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
      include: {
        apiKeyScopes: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    // Generate new key
    const { key, hash, prefix } = generateApiKey();

    // Update with new key hash and prefix
    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: {
        keyHash: hash,
        keyPrefix: prefix,
        lastUsedAt: null, // Reset last used
      },
      include: {
        apiKeyScopes: true,
      },
    });

    this.logger.log(`Regenerated API key: ${apiKey.name}`);

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'regenerated',
      entityType: 'api_key',
      entityId: id,
      entityName: apiKey.name,
      description: `Regenerated API key "${apiKey.name}"`,
    });

    return {
      ...this.toResponseDto(apiKey),
      key, // Only returned on regeneration
    };
  }

  /**
   * Delete an API key permanently
   */
  async delete(
    id: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });

    this.logger.log(`Deleted API key: ${existing.name}`);

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'deleted',
      entityType: 'api_key',
      entityId: id,
      entityName: existing.name,
      description: `Deleted API key "${existing.name}"`,
    });
  }

  /**
   * Get API key statistics
   */
  async getStats(organizationId: string) {
    const [total, active, expired, recentlyUsed] = await Promise.all([
      this.prisma.apiKey.count({ where: { organizationId } }),
      this.prisma.apiKey.count({ where: { organizationId, isActive: true } }),
      this.prisma.apiKey.count({
        where: {
          organizationId,
          expiresAt: { lt: new Date() },
        },
      }),
      this.prisma.apiKey.count({
        where: {
          organizationId,
          lastUsedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      expired,
      recentlyUsed,
    };
  }

  /**
   * Convert API key entity to response DTO
   */
  private toResponseDto(key: any): ApiKeyResponseDto {
    // Merge scopes from both the legacy array field and the relation
    const scopes = [
      ...new Set([
        ...(key.scopes || []),
        ...(key.apiKeyScopes?.map((s: any) => s.scope) || []),
      ]),
    ];

    return {
      id: key.id,
      name: key.name,
      description: key.description || undefined,
      keyPrefix: key.keyPrefix,
      scopes,
      lastUsedAt: key.lastUsedAt || undefined,
      expiresAt: key.expiresAt || undefined,
      isActive: key.isActive,
      createdBy: key.createdBy,
      createdAt: key.createdAt,
    };
  }
}
