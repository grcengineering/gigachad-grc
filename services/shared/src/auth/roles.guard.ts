import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY } from './roles.decorator';
import { UserRole, RolePermissions, UserContext } from '../types';

/**
 * RolesGuard - Enforces role-based access control
 * 
 * Usage:
 * 1. Add @UseGuards(RolesGuard) to controller or method
 * 2. Add @Roles('admin', 'compliance_manager') to specify allowed roles
 * 
 * The guard checks if the authenticated user has one of the required roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserContext = request.user;

    if (!user) {
      this.logger.warn('RolesGuard: No user context found in request');
      throw new ForbiddenException('Authentication required');
    }

    const userRole = user.role as UserRole;
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.userId} with role ${userRole}. Required roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}

/**
 * PermissionsGuard - Enforces permission-based access control
 * 
 * Usage:
 * 1. Add @UseGuards(PermissionsGuard) to controller or method
 * 2. Add @RequirePermissions('controls:write', 'risks:read') to specify required permissions
 * 
 * The guard checks if the authenticated user's role has all required permissions.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserContext = request.user;

    if (!user) {
      this.logger.warn('PermissionsGuard: No user context found in request');
      throw new ForbiddenException('Authentication required');
    }

    const userRole = user.role as UserRole;
    const userPermissions = RolePermissions[userRole] || [];

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (p) => !userPermissions.includes(p),
      );
      this.logger.warn(
        `Access denied for user ${user.userId}. Missing permissions: ${missingPermissions.join(', ')}`,
      );
      throw new ForbiddenException(
        `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

/**
 * Combined RolesOrPermissionsGuard - Allows access if user has role OR permissions
 * 
 * Useful when you want flexible access control where either condition is sufficient.
 */
@Injectable()
export class RolesOrPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(RolesOrPermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If neither roles nor permissions specified, allow access
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserContext = request.user;

    if (!user) {
      this.logger.warn('RolesOrPermissionsGuard: No user context found');
      throw new ForbiddenException('Authentication required');
    }

    const userRole = user.role as UserRole;
    const userPermissions = RolePermissions[userRole] || [];

    // Check if user has any of the required roles
    const hasRole = requiredRoles?.some((role) => role === userRole) ?? false;

    // Check if user has all required permissions
    const hasAllPermissions =
      requiredPermissions?.every((permission) =>
        userPermissions.includes(permission),
      ) ?? false;

    if (!hasRole && !hasAllPermissions) {
      this.logger.warn(
        `Access denied for user ${user.userId}. Role: ${userRole}, Required roles: ${requiredRoles?.join(', ') || 'none'}, Required permissions: ${requiredPermissions?.join(', ') || 'none'}`,
      );
      throw new ForbiddenException('Access denied. Insufficient permissions.');
    }

    return true;
  }
}
