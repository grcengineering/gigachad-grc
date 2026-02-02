import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  // Valid UUIDs that match the regex pattern (version 1-5, variant 8-b)
  const validUserId = '123e4567-e89b-12d3-a456-426614174000';
  const validOrgId = '987fcdeb-51a2-4bc4-a567-890123456789'; // Fixed: version 4, variant a
  const validProxySecret = 'test-proxy-secret-32-chars-long!';

  beforeEach(() => {
    // Reset environment variables
    delete process.env.AUTH_PROXY_SECRET;
    delete process.env.REQUIRE_PROXY_AUTH;
    delete process.env.NODE_ENV;

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    delete process.env.AUTH_PROXY_SECRET;
    delete process.env.REQUIRE_PROXY_AUTH;
    delete process.env.NODE_ENV;
  });

  describe('when user context is already set', () => {
    it('should return true if request.user.userId exists', () => {
      mockRequest.user = { userId: validUserId, organizationId: validOrgId };
      guard = new AuthGuard();

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
    });
  });

  describe('proxy secret verification', () => {
    beforeEach(() => {
      process.env.AUTH_PROXY_SECRET = validProxySecret;
    });

    it('should allow request with valid proxy secret', () => {
      guard = new AuthGuard();
      mockRequest.headers = {
        'x-proxy-secret': validProxySecret,
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should reject request with invalid proxy secret', () => {
      guard = new AuthGuard();
      mockRequest.headers = {
        'x-proxy-secret': 'wrong-secret',
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject request with proxy secret of different length', () => {
      guard = new AuthGuard();
      mockRequest.headers = {
        'x-proxy-secret': 'short',
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should allow request without proxy secret when REQUIRE_PROXY_AUTH is false', () => {
      process.env.REQUIRE_PROXY_AUTH = 'false';
      guard = new AuthGuard();
      mockRequest.headers = {
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should reject request without proxy secret when REQUIRE_PROXY_AUTH is true', () => {
      process.env.REQUIRE_PROXY_AUTH = 'true';
      guard = new AuthGuard();
      mockRequest.headers = {
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('UUID format validation', () => {
    beforeEach(() => {
      guard = new AuthGuard();
    });

    it('should accept valid UUID v4 for user-id', () => {
      mockRequest.headers = {
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should accept valid UUID v1 for user-id', () => {
      mockRequest.headers = {
        'x-user-id': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'x-organization-id': validOrgId,
      };

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should reject invalid UUID format for user-id', () => {
      mockRequest.headers = {
        'x-user-id': 'not-a-valid-uuid',
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject SQL injection attempt in user-id', () => {
      mockRequest.headers = {
        'x-user-id': "'; DROP TABLE users; --",
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject invalid UUID format for organization-id', () => {
      mockRequest.headers = {
        'x-user-id': validUserId,
        'x-organization-id': 'invalid-org-id',
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject path traversal attempt in organization-id', () => {
      mockRequest.headers = {
        'x-user-id': validUserId,
        'x-organization-id': '../../../etc/passwd',
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject empty string for user-id', () => {
      mockRequest.headers = {
        'x-user-id': '',
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject UUID with wrong version number', () => {
      mockRequest.headers = {
        'x-user-id': '123e4567-e89b-72d3-a456-426614174000', // version 7 not valid
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('missing required headers', () => {
    beforeEach(() => {
      guard = new AuthGuard();
    });

    it('should reject request missing x-user-id header', () => {
      mockRequest.headers = {
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject request missing x-organization-id header', () => {
      mockRequest.headers = {
        'x-user-id': validUserId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject request with no headers', () => {
      mockRequest.headers = {};

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('user context population', () => {
    beforeEach(() => {
      guard = new AuthGuard();
    });

    it('should populate user context from valid headers', () => {
      mockRequest.headers = {
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
        'x-user-email': 'test@example.com',
      };

      guard.canActivate(mockExecutionContext);

      expect(mockRequest.user).toEqual({
        userId: validUserId,
        organizationId: validOrgId,
        email: 'test@example.com',
        permissions: [],
      });
    });

    it('should set empty email when x-user-email header is missing', () => {
      mockRequest.headers = {
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      guard.canActivate(mockExecutionContext);

      expect(mockRequest.user.email).toBe('');
    });
  });

  describe('production environment warnings', () => {
    it('should not throw in production without AUTH_PROXY_SECRET', () => {
      process.env.NODE_ENV = 'production';
      // Should warn but not throw during construction
      expect(() => new AuthGuard()).not.toThrow();
    });
  });

  describe('timing-safe comparison', () => {
    beforeEach(() => {
      process.env.AUTH_PROXY_SECRET = validProxySecret;
    });

    it('should use timing-safe comparison for secrets of same length', () => {
      guard = new AuthGuard();
      
      // Create a secret that differs only in last character
      const almostCorrectSecret = validProxySecret.slice(0, -1) + 'X';
      mockRequest.headers = {
        'x-proxy-secret': almostCorrectSecret,
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject secrets that differ only in case', () => {
      guard = new AuthGuard();
      mockRequest.headers = {
        'x-proxy-secret': validProxySecret.toUpperCase(),
        'x-user-id': validUserId,
        'x-organization-id': validOrgId,
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
