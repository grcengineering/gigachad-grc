import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { UserContext, UserRole, RolePermissions } from '../types';
import { ROLES_KEY } from './roles.decorator';

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
  exp: number;
  iat: number;
  iss: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwksClient: jwksRsa.JwksClient;

  constructor(private reflector: Reflector) {
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
      const userContext = this.buildUserContext(decoded);
      
      // Attach user context to request
      request.user = userContext;

      // Check role requirements
      const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()]
      );

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

    return {
      userId: payload.sub,
      keycloakId: payload.sub,
      email: payload.email,
      organizationId: payload.organization_id || 'default',
      role,
      permissions,
    };
  }
}

// Optional guard for API key authentication
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('No API key provided');
    }

    // API key validation should be done by the service
    // This guard just ensures the header is present
    request.apiKey = apiKey;
    return true;
  }
}

// Combined guard that accepts either JWT or API key
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private jwtGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check for API key first
    if (request.headers['x-api-key']) {
      return this.apiKeyGuard.canActivate(context);
    }
    
    // Fall back to JWT
    return this.jwtGuard.canActivate(context);
  }
}

