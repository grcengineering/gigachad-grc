import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard, AuthenticatedGuard } from './permission.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { PERMISSION_KEY, PERMISSIONS_KEY } from './decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let permissionsService: PermissionsService;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  const validUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Mock Reflector
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    // Mock PermissionsService
    permissionsService = {
      hasPermission: jest.fn(),
      canAccessControl: jest.fn(),
      canAccessEvidence: jest.fn(),
      canAccessPolicy: jest.fn(),
    } as unknown as PermissionsService;

    guard = new PermissionGuard(reflector, permissionsService);

    mockRequest = {
      headers: {},
      user: undefined,
      params: {},
      body: {},
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  });

  describe('when no permission decorator is present', () => {
    it('should allow access when no permission is required', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('user context validation', () => {
    beforeEach(() => {
      // Set up a required permission
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSION_KEY) {
          return { resource: Resource.CONTROLS, action: Action.READ };
        }
        return undefined;
      });
    });

    it('should use request.user.userId (not raw headers) for permission check', async () => {
      mockRequest.user = { userId: validUserId };
      (permissionsService.hasPermission as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await guard.canActivate(mockExecutionContext);

      expect(permissionsService.hasPermission).toHaveBeenCalledWith(
        validUserId,
        Resource.CONTROLS,
        Action.READ,
      );
    });

    it('should throw ForbiddenException when request.user is undefined', async () => {
      mockRequest.user = undefined;

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when request.user.userId is undefined', async () => {
      mockRequest.user = { permissions: [] };

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should NOT use x-user-id header directly', async () => {
      // Even if header is set, guard should not use it
      mockRequest.headers['x-user-id'] = 'header-user-id';
      mockRequest.user = undefined;

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw with message "User not authenticated" when no user context', async () => {
      mockRequest.user = undefined;

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'User not authenticated',
      );
    });
  });

  describe('permission checking', () => {
    beforeEach(() => {
      mockRequest.user = { userId: validUserId };
    });

    it('should allow access when user has required permission', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSION_KEY) {
          return { resource: Resource.CONTROLS, action: Action.READ };
        }
        return undefined;
      });
      (permissionsService.hasPermission as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when permission is denied', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSION_KEY) {
          return { resource: Resource.CONTROLS, action: Action.DELETE };
        }
        return undefined;
      });
      (permissionsService.hasPermission as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Insufficient permissions',
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('multiple permissions (OR logic)', () => {
    beforeEach(() => {
      mockRequest.user = { userId: validUserId };
    });

    it('should allow access if any permission is granted', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSIONS_KEY) {
          return [
            { resource: Resource.CONTROLS, action: Action.DELETE },
            { resource: Resource.CONTROLS, action: Action.READ },
          ];
        }
        return undefined;
      });
      (permissionsService.hasPermission as jest.Mock)
        .mockResolvedValueOnce({ allowed: false })
        .mockResolvedValueOnce({ allowed: true });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access if no permissions are granted', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSIONS_KEY) {
          return [
            { resource: Resource.CONTROLS, action: Action.DELETE },
            { resource: Resource.CONTROLS, action: Action.UPDATE },
          ];
        }
        return undefined;
      });
      (permissionsService.hasPermission as jest.Mock).mockResolvedValue({
        allowed: false,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('resource-specific checks', () => {
    beforeEach(() => {
      mockRequest.user = { userId: validUserId };
      mockRequest.params = { id: 'resource-123' };
    });

    it('should use canAccessControl for CONTROLS resource with resourceId', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSION_KEY) {
          return {
            resource: Resource.CONTROLS,
            action: Action.UPDATE,
            resourceIdParam: 'id',
          };
        }
        return undefined;
      });
      (permissionsService.canAccessControl as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await guard.canActivate(mockExecutionContext);

      expect(permissionsService.canAccessControl).toHaveBeenCalledWith(
        validUserId,
        'resource-123',
        Action.UPDATE,
      );
    });

    it('should use canAccessEvidence for EVIDENCE resource with resourceId', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSION_KEY) {
          return {
            resource: Resource.EVIDENCE,
            action: Action.READ,
            resourceIdParam: 'id',
          };
        }
        return undefined;
      });
      (permissionsService.canAccessEvidence as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await guard.canActivate(mockExecutionContext);

      expect(permissionsService.canAccessEvidence).toHaveBeenCalledWith(
        validUserId,
        'resource-123',
        Action.READ,
      );
    });
  });

  describe('DevAuthGuard permissions in non-production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should grant access from request.user.permissions in dev mode', async () => {
      mockRequest.user = {
        userId: validUserId,
        permissions: ['controls:read'],
      };
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === PERMISSION_KEY) {
          return { resource: Resource.CONTROLS, action: Action.READ };
        }
        return undefined;
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      // Should not call permissionsService since DevAuthGuard permissions were used
      expect(permissionsService.hasPermission).not.toHaveBeenCalled();
    });
  });
});

describe('AuthenticatedGuard', () => {
  let guard: AuthenticatedGuard;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    guard = new AuthenticatedGuard();

    mockRequest = {
      headers: {},
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  });

  it('should allow access when x-user-id header is present', () => {
    mockRequest.headers['x-user-id'] = 'some-user-id';

    const result = guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when x-user-id header is missing', () => {
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      ForbiddenException,
    );
  });

  it('should throw with message "User not authenticated"', () => {
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      'User not authenticated',
    );
  });
});
