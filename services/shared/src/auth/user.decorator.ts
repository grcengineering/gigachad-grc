import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from '../types';

export const CurrentUser = createParamDecorator(
  (data: keyof UserContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserContext;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

// Decorator to get organization ID from current user
export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationId;
  },
);



