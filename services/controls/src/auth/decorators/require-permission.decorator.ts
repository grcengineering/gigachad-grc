import { SetMetadata } from '@nestjs/common';
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
export const RequirePermission = (
  resource: Resource,
  action: Action,
  resourceIdParam?: string,
) => SetMetadata(PERMISSION_KEY, { resource, action, resourceIdParam } as RequiredPermission);

/**
 * Decorator to require multiple permissions (OR logic - any permission passes)
 */
export const PERMISSIONS_KEY = 'required_permissions';

export const RequireAnyPermission = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);



