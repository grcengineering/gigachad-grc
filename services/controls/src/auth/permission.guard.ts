import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions/permissions.service';
import {
  PERMISSION_KEY,
  PERMISSIONS_KEY,
  RequiredPermission,
} from './decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

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

    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'];

    if (!userId) {
      this.logger.warn('No user ID in request headers for permission check');
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
    request: any,
  ): Promise<boolean> {
    const { resource, action, resourceIdParam } = permission;

    // Get resource ID if specified
    let resourceId: string | undefined;
    if (resourceIdParam) {
      resourceId = request.params?.[resourceIdParam] || request.body?.[resourceIdParam];
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



