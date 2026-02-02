import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionsService } from '../permissions/permissions.service';
import {
  PERMISSION_KEY,
  PERMISSIONS_KEY,
  RequiredPermission,
} from './decorators/require-permission.decorator';
import { Resource } from '../permissions/dto/permission.dto';

/**
 * Request with optional user and params for permission checking
 */
interface PermissionCheckRequest extends Request {
  user?: {
    userId?: string;
    permissions?: string[];
  };
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permission from decorator
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission decorator, allow access
    if (!requiredPermission && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as PermissionCheckRequest;
    
    // SECURITY: Use authenticated user context set by AuthGuard, NOT raw headers
    // This ensures the userId has been validated by the auth guard
    const userId = request.user?.userId;

    if (!userId) {
      this.logger.warn('No authenticated user context for permission check');
      throw new ForbiddenException('User not authenticated');
    }

    // Single permission check
    if (requiredPermission) {
      return this.checkPermission(requiredPermission, userId, request);
    }

    // Multiple permissions (OR logic)
    if (requiredPermissions && requiredPermissions.length > 0) {
      for (const perm of requiredPermissions) {
        try {
          const allowed = await this.checkPermission(perm, userId, request);
          if (allowed) return true;
        } catch {
          // Continue to next permission
        }
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private async checkPermission(
    permission: RequiredPermission,
    userId: string,
    request: PermissionCheckRequest,
  ): Promise<boolean> {
    const { resource, action, resourceIdParam } = permission;

    // In dev mode, first check request.user.permissions (set by DevAuthGuard)
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv !== 'production' && request.user?.permissions) {
      const requiredPerm = `${resource}:${action}`;
      if (request.user.permissions.includes(requiredPerm)) {
        this.logger.debug(`Permission granted via DevAuthGuard: ${requiredPerm}`);
        return true;
      }
    }

    // Get resource ID if specified
    let resourceId: string | undefined;
    if (resourceIdParam) {
      const body = request.body as Record<string, unknown> | undefined;
      const bodyValue = body?.[resourceIdParam];
      resourceId = request.params?.[resourceIdParam] || (typeof bodyValue === 'string' ? bodyValue : undefined);
    }

    // Check permission based on resource type
    let result;
    if (resourceId) {
      // Use specific resource check for ownership validation
      switch (resource) {
        case Resource.CONTROLS:
          result = await this.permissionsService.canAccessControl(userId, resourceId, action);
          break;
        case Resource.EVIDENCE:
          result = await this.permissionsService.canAccessEvidence(userId, resourceId, action);
          break;
        case Resource.POLICIES:
          result = await this.permissionsService.canAccessPolicy(userId, resourceId, action);
          break;
        default:
          result = await this.permissionsService.hasPermission(userId, resource, action);
      }
    } else {
      // General permission check without resource context
      result = await this.permissionsService.hasPermission(userId, resource, action);
    }

    if (!result.allowed) {
      this.logger.debug(
        `Permission denied for user ${userId}: ${resource}:${action} - ${result.reason}`,
      );
      throw new ForbiddenException(result.reason || 'Insufficient permissions');
    }

    return true;
  }
}

/**
 * Optional: A simpler guard that just checks if user has any permissions
 * Useful for routes that just need authentication, not specific permissions
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'];

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    return true;
  }
}



