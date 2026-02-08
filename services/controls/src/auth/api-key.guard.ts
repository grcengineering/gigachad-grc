import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import type { UserContext } from '@gigachad-grc/shared';
import { Request } from 'express';

/**
 * API Key record with organization and scopes
 */
interface ApiKeyRecord {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  organizationId: string;
  createdBy: string;
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  organization: {
    id: string;
    name: string;
  };
  apiKeyScopes: Array<{ scope: string }>;
}

/**
 * Request extended with API key context
 */
interface ApiKeyRequest extends Request {
  user?: UserContext;
  apiKeyId?: string;
}

/**
 * API Key Authentication Guard
 *
 * Validates API keys and injects organization context into the request.
 * This ensures API key requests are properly scoped to their organization.
 *
 * Usage:
 * @UseGuards(ApiKeyAuthGuard)
 * @Controller('api/external')
 * export class ExternalController { ... }
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key and get organization context
    const apiKeyRecord = await this.validateApiKey(apiKey);

    if (!apiKeyRecord) {
      // Log failed attempt for security monitoring
      this.logger.warn(
        `Invalid API key attempt from IP: ${request.ip}, ` +
          `Key prefix: ${apiKey.substring(0, 8)}...`
      );
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Build user context from API key
    // Note: API keys use 'viewer' as base role, permissions are defined by scopes
    const userContext: UserContext = {
      userId: apiKeyRecord.createdBy,
      keycloakId: `api-key:${apiKeyRecord.id}`,
      email: `api-key-${apiKeyRecord.keyPrefix}@system`,
      organizationId: apiKeyRecord.organizationId,
      role: 'viewer', // Base role - actual permissions come from scopes
      permissions: this.buildPermissions(apiKeyRecord.scopes),
      name: `API Key: ${apiKeyRecord.name}`,
    };

    // Attach context to request
    request.user = userContext;
    request.apiKeyId = apiKeyRecord.id;

    // Set headers for downstream services
    request.headers['x-user-id'] = userContext.userId;
    request.headers['x-organization-id'] = userContext.organizationId;
    request.headers['x-auth-method'] = 'api-key';

    // Update last used timestamp (fire and forget)
    this.updateLastUsed(apiKeyRecord.id).catch((err) => {
      this.logger.error(`Failed to update API key last used: ${err.message}`);
    });

    // Log successful API key usage
    this.logger.log(
      `API key authenticated: org=${apiKeyRecord.organizationId}, ` +
        `key=${apiKeyRecord.name}, path=${request.url}`
    );

    return true;
  }

  /**
   * Extract API key from request headers only
   *
   * SECURITY: API keys must ONLY be passed via headers (X-API-Key or Authorization).
   * Query parameter support has been removed due to security risks:
   * - Query params appear in server logs
   * - Query params appear in browser history
   * - Query params can be leaked via Referer headers
   */
  private extractApiKey(request: ApiKeyRequest): string | null {
    // SECURITY: Reject API keys in query parameters
    // This is a HIGH severity vulnerability - log and reject
    const queryKey = request.query?.api_key;
    if (queryKey) {
      this.logger.warn(
        `SECURITY: Rejected API key in query parameter from IP: ${request.ip}, ` +
          `path: ${request.url}. API keys must be passed via X-API-Key or Authorization header.`
      );
      throw new UnauthorizedException(
        'API keys in query parameters are not allowed. ' +
          'Please use the X-API-Key header or Authorization header with ApiKey scheme.'
      );
    }

    // Check X-API-Key header first (preferred method)
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return Array.isArray(headerKey) ? headerKey[0] : headerKey;
    }

    // Check Authorization header with ApiKey scheme
    const authHeader = request.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('ApiKey ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  /**
   * Validate API key and return the record if valid
   *
   * SECURITY: API key hashing uses SHA-256 which is appropriate because:
   * - API keys are randomly generated with high entropy (unlike passwords)
   * - bcrypt/argon2 would add ~100-500ms latency to every API request
   * - SHA-256 provides sufficient security for high-entropy secrets
   * - The database lookup is indexed, preventing brute-force enumeration
   *
   * Note: If migrating to bcrypt/argon2, consider caching validated keys
   * in memory with TTL to avoid performance degradation.
   */
  private async validateApiKey(
    apiKey: string
  ): Promise<(ApiKeyRecord & { scopes: string[] }) | null> {
    // SECURITY: Validate input is a string to prevent type confusion
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
      return null;
    }

    // Hash the provided key using SHA-256 (appropriate for high-entropy API keys)
    // codeql[js/insufficient-password-hash] suppressed: SHA-256 used for high-entropy API key lookup, not password storage
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Look up the API key
    const apiKeyRecord = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        apiKeyScopes: {
          select: { scope: true },
        },
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    // Merge scopes from both sources (legacy scopes array and new apiKeyScopes relation)
    const scopes = [...apiKeyRecord.scopes, ...apiKeyRecord.apiKeyScopes.map((s) => s.scope)];

    return {
      ...apiKeyRecord,
      scopes: [...new Set(scopes)], // Deduplicate
    };
  }

  /**
   * Build permissions array from API key scopes
   */
  private buildPermissions(scopes: string[]): string[] {
    // API key scopes are already in permission format
    // e.g., ['read:controls', 'write:evidence']
    return scopes.map((scope) => {
      // Convert scope format if needed
      // read:controls -> controls:read
      const [action, resource] = scope.split(':');
      if (action && resource) {
        return `${resource}:${action}`;
      }
      return scope;
    });
  }

  /**
   * Update the last used timestamp
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
    });
  }
}

/**
 * Combined guard that accepts either JWT or API key
 * Falls back to API key if JWT is not present
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  private readonly logger = new Logger(CombinedAuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if already authenticated via JWT
    if (request.user?.userId && request.user?.organizationId) {
      return true;
    }

    // Check for API key
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      const apiKeyGuard = new ApiKeyAuthGuard(this.prisma);
      return apiKeyGuard.canActivate(context);
    }

    // No authentication method provided
    throw new UnauthorizedException('Authentication required');
  }
}
