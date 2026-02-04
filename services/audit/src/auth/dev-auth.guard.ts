/**
 * Re-export DevAuthGuard from shared module for backward compatibility.
 *
 * NOTE: This guard has been centralized in @gigachad-grc/shared.
 * New code should import directly from '@gigachad-grc/shared' instead.
 */
export {
  DevAuthGuard,
  UserDecorator as User,
  AuthUserContext as UserContext,
} from '@gigachad-grc/shared';
