import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { createHash } from 'crypto';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { UserContext, UserRole, RolePermissions } from '../types';
import { ROLES_KEY } from './roles.decorator';
import { TokenBlacklistService } from './token-blacklist.service';
import { PRISMA_SERVICE } from './dev-auth.guard';

export interface JwtPayload {
  sub: string;
  email: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  roles?: string[];
  realm_access?: {
    roles: string[];
  };
  organization_id?: string;
  jti?: string;
  exp: number;
  iat: number;
  iss: string;
}

const ORGANIZATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireOrganizationId(value: unknown): string {
  if (typeof value !== 'string' || !ORGANIZATION_ID_PATTERN.test(value)) {
    throw new UnauthorizedException('Valid organization claim required');
  }
  return value;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwksClient: jwksRsa.JwksClient;

  constructor(
    private reflector: Reflector,
    @Optional() @Inject(TokenBlacklistService) private tokenBlacklistService?: TokenBlacklistService
  ) {
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM || 'gigachad-grc';

    this.jwksClient = jwksRsa({
      jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decoded = await this.verifyToken(token);

      // Check if token is revoked (if blacklist service is available)
      if (this.tokenBlacklistService && decoded.jti) {
        const isRevoked = await this.tokenBlacklistService.isTokenRevoked(decoded.jti);
        if (isRevoked) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      const userContext = this.buildUserContext(decoded);

      // Attach user context and token info to request
      request.user = userContext;
      request.tokenJti = decoded.jti;
      request.tokenExp = decoded.exp;
      request.headers['x-user-id'] = userContext.userId;
      request.headers['x-organization-id'] = userContext.organizationId;
      request.headers['x-user-email'] = userContext.email;
      request.headers['x-auth-method'] = 'jwt';

      // Check role requirements
      const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.some((role: UserRole) => userContext.role === role);
        if (!hasRole) {
          throw new ForbiddenException('Insufficient role permissions');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new Error('Invalid token format');
    }

    const key = await this.jwksClient.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    return jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      issuer: `${process.env.KEYCLOAK_URL || 'http://localhost:8080'}/realms/${process.env.KEYCLOAK_REALM || 'gigachad-grc'}`,
    }) as JwtPayload;
  }

  private buildUserContext(payload: JwtPayload): UserContext {
    // Extract roles from Keycloak token
    const roles = payload.realm_access?.roles || payload.roles || [];

    // Map Keycloak role to our UserRole type
    let role: UserRole = 'viewer';
    if (roles.includes('admin')) {
      role = 'admin';
    } else if (roles.includes('compliance_manager')) {
      role = 'compliance_manager';
    } else if (roles.includes('auditor')) {
      role = 'auditor';
    }

    const permissions = RolePermissions[role];
    const organizationId = requireOrganizationId(payload.organization_id);

    return {
      userId: payload.sub,
      keycloakId: payload.sub,
      email: payload.email,
      organizationId,
      role,
      permissions,
    };
  }
}

interface ApiKeyStore {
  apiKey?: {
    findFirst(args: unknown): Promise<any>;
    update(args: unknown): Promise<unknown>;
  };
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    @Optional()
    @Inject(PRISMA_SERVICE)
    private readonly prisma?: ApiKeyStore
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('No API key provided');
    }

    if (!this.prisma?.apiKey) {
      this.logger.error('API key authentication is unavailable: no API key store configured');
      throw new UnauthorizedException('API key authentication unavailable');
    }

    // API keys contain 256 bits of CSPRNG entropy and are looked up by a
    // deterministic digest; this is not password hashing.
    // codeql[js/insufficient-password-hash] suppressed: SHA-256 is appropriate
    // for high-entropy API key lookup, not low-entropy user passwords.
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const record = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        apiKeyScopes: { select: { scope: true } },
      },
    });
    if (!record) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    const organizationId = requireOrganizationId(record.organizationId);
    const scopes = [
      ...(Array.isArray(record.scopes) ? record.scopes : []),
      ...(Array.isArray(record.apiKeyScopes)
        ? record.apiKeyScopes.map((entry: { scope: string }) => entry.scope)
        : []),
    ];
    const scopeActions = new Set(['read', 'write', 'create', 'update', 'delete', 'export']);

    request.user = {
      userId: record.createdBy,
      keycloakId: `api-key:${record.id}`,
      email: `api-key-${record.keyPrefix}@system`,
      organizationId,
      role: 'viewer',
      permissions: [...new Set(scopes)].map((scope) => {
        const [first, second] = scope.split(':');
        return first && second && scopeActions.has(first) ? `${second}:${first}` : scope;
      }),
      name: `API Key: ${record.name}`,
    } satisfies UserContext;
    request.apiKeyId = record.id;
    request.headers['x-user-id'] = record.createdBy;
    request.headers['x-organization-id'] = organizationId;
    request.headers['x-auth-method'] = 'api-key';

    void this.prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch((error: unknown) => {
        this.logger.warn(
          `Failed to update API key usage timestamp: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        );
      });
    return true;
  }

  private extractApiKey(request: Request): string | null {
    const headerKey = request.headers['x-api-key'];
    if (typeof headerKey === 'string' && headerKey.length > 0) return headerKey;

    const authorization = request.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('ApiKey ')) {
      const key = authorization.slice('ApiKey '.length);
      return key.length > 0 ? key : null;
    }
    return null;
  }
}

// Combined guard that accepts either JWT or API key
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private jwtGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyAuthGuard
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (
      request.headers['x-api-key'] ||
      (typeof request.headers.authorization === 'string' &&
        request.headers.authorization.startsWith('ApiKey '))
    ) {
      return this.apiKeyGuard.canActivate(context);
    }

    // Fall back to JWT
    return this.jwtGuard.canActivate(context);
  }
}
