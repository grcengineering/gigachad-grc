/**
 * Roles and Permissions Guards Test Suite
 *
 * Tests for:
 * - RolesGuard - Role-based access control
 * - PermissionsGuard - Permission-based access control
 * - RolesOrPermissionsGuard - Combined role OR permission access
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, PermissionsGuard, RolesOrPermissionsGuard } from './roles.guard';
import { UserRole, RolePermissions } from '../types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user: Record<string, unknown> | null) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Role Validation', () => {
    it('should allow access when no roles are required', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const context = createMockContext({ userId: 'user-1', role: 'admin' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const context = createMockContext({ userId: 'user-1', role: 'compliance_manager' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin', 'compliance_manager']);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Access denied. Required role: admin');
    });

    it('should throw ForbiddenException when no user in request', () => {
      const context = createMockContext(null);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Authentication required');
    });
  });
});

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const createMockContext = (user: Record<string, unknown> | null) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Permission Validation', () => {
    it('should allow access when no permissions are required', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when permissions array is empty', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role has required permission', () => {
      const context = createMockContext({ userId: 'user-1', role: 'admin' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['controls:write']);

      // Admin should have controls:write permission
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role has all required permissions', () => {
      const context = createMockContext({ userId: 'user-1', role: 'admin' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'controls:read',
        'controls:write',
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permission', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['controls:write']);

      // Viewer should not have controls:write permission
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when no user in request', () => {
      const context = createMockContext(null);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['controls:read']);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Authentication required');
    });

    it('should handle unknown role gracefully', () => {
      const context = createMockContext({ userId: 'user-1', role: 'unknown_role' });
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['controls:write']);

      // Unknown role should have no permissions
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

describe('RolesOrPermissionsGuard', () => {
  let guard: RolesOrPermissionsGuard;
  let reflector: Reflector;

  const createMockContext = (user: Record<string, unknown> | null) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesOrPermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesOrPermissionsGuard>(RolesOrPermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Combined Role OR Permission Validation', () => {
    it('should allow access when neither roles nor permissions are required', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(null) // roles
        .mockReturnValueOnce(null); // permissions

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const context = createMockContext({ userId: 'user-1', role: 'admin' });
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(['admin']) // roles
        .mockReturnValueOnce(null); // permissions

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required permission', () => {
      const context = createMockContext({ userId: 'user-1', role: 'admin' });
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(null) // roles
        .mockReturnValueOnce(['controls:read']); // permissions

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has role even without all permissions', () => {
      const context = createMockContext({ userId: 'user-1', role: 'admin' });
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(['admin']) // roles
        .mockReturnValueOnce(['some:nonexistent:permission']); // permissions

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user has neither role nor permissions', () => {
      const context = createMockContext({ userId: 'user-1', role: 'viewer' });
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(['admin']) // roles
        .mockReturnValueOnce(['controls:write']); // permissions

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Access denied. Insufficient permissions.');
    });

    it('should throw ForbiddenException when no user in request', () => {
      const context = createMockContext(null);
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(['admin']) // roles
        .mockReturnValueOnce(null); // permissions

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Authentication required');
    });
  });
});

describe('Role Permissions Mapping', () => {
  it('should have permissions defined for all standard roles', () => {
    const standardRoles: UserRole[] = ['admin', 'compliance_manager', 'auditor', 'viewer'];

    for (const role of standardRoles) {
      expect(RolePermissions[role]).toBeDefined();
      expect(Array.isArray(RolePermissions[role])).toBe(true);
    }
  });

  it('should have admin role with more permissions than viewer', () => {
    const adminPermissions = RolePermissions['admin'] || [];
    const viewerPermissions = RolePermissions['viewer'] || [];

    expect(adminPermissions.length).toBeGreaterThan(viewerPermissions.length);
  });
});
