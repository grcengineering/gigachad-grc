import { Request } from 'express';

/**
 * Authenticated user information attached to requests
 */
export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Express Request with authenticated user information
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && typeof (req as AuthenticatedRequest).user?.userId === 'string';
}
