import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Resource, Action } from '../../permissions/dto/permission.dto';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  resource: Resource;
  action: Action;
  // Optional: get resource ID from request params/body for ownership checks
  resourceIdParam?: string; // e.g., 'id' to get req.params.id
}

/**
 * Decorator to require a specific permission for a route
 *
 * @example
 * @RequirePermission(Resource.CONTROLS, Action.UPDATE)
 * async updateControl() { }
 *
 * @example
 * // With ownership check using URL param
 * @RequirePermission(Resource.CONTROLS, Action.UPDATE, 'id')
 * async updateControl(@Param('id') id: string) { }
 */
export const RequirePermission = (resource: Resource, action: Action, resourceIdParam?: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action, resourceIdParam } as RequiredPermission);

/**
 * Decorator to require multiple permissions (OR logic - any permission passes)
 */
export const PERMISSIONS_KEY = 'required_permissions';

export const RequireAnyPermission = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to extract the current user from the request
 * In dev mode, this extracts user info from headers
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  if (request.user) {
    return {
      userId: request.user.userId,
      organizationId: request.user.organizationId,
      email: request.user.email,
    };
  }
  // In dev mode, user info comes from headers set by DevAuthGuard
  return {
    userId: request.headers['x-user-id'] || 'dev-user-id',
    organizationId: request.headers['x-organization-id'] || 'dev-org-id',
    email: request.headers['x-user-email'] || 'dev@example.com',
  };
});
