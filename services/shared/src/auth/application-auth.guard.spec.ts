import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApplicationAuthGuard } from './application-auth.guard';
import { DevAuthGuard } from './dev-auth.guard';
import { CombinedAuthGuard } from './jwt.guard';

describe('ApplicationAuthGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUseDevAuth = process.env.USE_DEV_AUTH;
  const createContext = () => {
    const request: any = { headers: {} };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
    return { context, request };
  };

  afterEach(() => {
    originalNodeEnv === undefined
      ? delete process.env.NODE_ENV
      : (process.env.NODE_ENV = originalNodeEnv);
    originalUseDevAuth === undefined
      ? delete process.env.USE_DEV_AUTH
      : (process.env.USE_DEV_AUTH = originalUseDevAuth);
  });

  it('retains injectable runtime metadata without an auth-guard import cycle', () => {
    const parameterTypes = Reflect.getMetadata('design:paramtypes', ApplicationAuthGuard);
    expect(parameterTypes?.[1]).toBe(CombinedAuthGuard);
  });

  it('rejects a production request instead of honoring USE_DEV_AUTH', async () => {
    process.env.NODE_ENV = 'production';
    process.env.USE_DEV_AUTH = 'true';
    const developmentGuard = { canActivate: jest.fn().mockResolvedValue(true) };
    const productionGuard = {
      canActivate: jest.fn().mockRejectedValue(new UnauthorizedException('No token provided')),
    };
    const guard = new ApplicationAuthGuard(
      developmentGuard,
      productionGuard as unknown as CombinedAuthGuard
    );
    await expect(guard.canActivate(createContext().context)).rejects.toThrow('No token provided');
    expect(developmentGuard.canActivate).not.toHaveBeenCalled();
  });

  it('accepts a validated production JWT context', async () => {
    process.env.NODE_ENV = 'production';
    const { context, request } = createContext();
    const productionGuard = {
      canActivate: jest.fn().mockImplementation(async (executionContext: ExecutionContext) => {
        executionContext.switchToHttp().getRequest().user = {
          userId: '123e4567-e89b-42d3-a456-426614174001',
          organizationId: '123e4567-e89b-42d3-a456-426614174000',
        };
        return true;
      }),
    };
    const guard = new ApplicationAuthGuard(
      { canActivate: jest.fn() },
      productionGuard as unknown as CombinedAuthGuard
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user.organizationId).toBe('123e4567-e89b-42d3-a456-426614174000');
  });

  it('retains seeded authentication in test mode', async () => {
    process.env.NODE_ENV = 'test';
    const { context, request } = createContext();
    const productionGuard = { canActivate: jest.fn() };
    const guard = new ApplicationAuthGuard(
      new DevAuthGuard(),
      productionGuard as unknown as CombinedAuthGuard
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({ organizationId: expect.any(String), role: 'admin' })
    );
    expect(productionGuard.canActivate).not.toHaveBeenCalled();
  });

  it('keeps direct development guard use fail-closed in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.USE_DEV_AUTH = 'true';
    await expect(new DevAuthGuard().canActivate(createContext().context)).rejects.toThrow(
      'DevAuthGuard cannot be used in production'
    );
  });
});
