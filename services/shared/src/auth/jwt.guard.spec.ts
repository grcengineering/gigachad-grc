/**
 * JwtAuthGuard Test Suite
 *
 * Tests for JWT authentication guard covering:
 * - Token extraction from Authorization header
 * - Token verification using JWKS
 * - Role-based access control
 * - Token blacklist checking
 * - User context building
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, ApiKeyAuthGuard, CombinedAuthGuard } from './jwt.guard';
import { TokenBlacklistService } from './token-blacklist.service';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

// Mock jwks-rsa
jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockResolvedValue({
      getPublicKey: () => 'mock-public-key',
    }),
  }));
});

import * as jwt from 'jsonwebtoken';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let tokenBlacklistService: TokenBlacklistService;

  const mockExecutionContext = (headers: Record<string, string> = {}) => {
    const request = {
      headers,
      user: null,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: TokenBlacklistService,
          useValue: {
            isTokenRevoked: jest.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    tokenBlacklistService = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Extraction', () => {
    it('should throw UnauthorizedException when no Authorization header', async () => {
      const context = mockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('No token provided');
    });

    it('should throw UnauthorizedException when Authorization header has wrong format', async () => {
      const context = mockExecutionContext({ authorization: 'Basic token123' });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Bearer token is missing', async () => {
      const context = mockExecutionContext({ authorization: 'Bearer ' });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Token Verification', () => {
    it('should throw UnauthorizedException for invalid token format', async () => {
      const context = mockExecutionContext({ authorization: 'Bearer invalid-token' });
      (jwt.decode as jest.Mock).mockReturnValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid token');
    });

    it('should throw UnauthorizedException when token has no kid', async () => {
      const context = mockExecutionContext({ authorization: 'Bearer token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should verify token with JWKS and build user context', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        realm_access: { roles: ['admin'] },
        organization_id: 'org-456',
        jti: 'token-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer valid-token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.user).toBeDefined();
      expect(request.user.userId).toBe('user-123');
      expect(request.user.email).toBe('test@example.com');
      expect(request.user.role).toBe('admin');
    });
  });

  describe('Token Blacklist', () => {
    it('should throw UnauthorizedException when token is revoked', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        realm_access: { roles: ['viewer'] },
        jti: 'revoked-token-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer valid-token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (tokenBlacklistService.isTokenRevoked as jest.Mock).mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Token has been revoked');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access when user has required role', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        realm_access: { roles: ['admin'] },
        jti: 'token-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer valid-token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        realm_access: { roles: ['viewer'] },
        jti: 'token-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer valid-token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Insufficient role permissions');
    });
  });

  describe('User Context Building', () => {
    it('should correctly map admin role', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'admin@example.com',
        realm_access: { roles: ['admin'] },
        organization_id: 'org-123',
        jti: 'jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();
      expect(request.user.role).toBe('admin');
    });

    it('should correctly map compliance_manager role', async () => {
      const mockPayload = {
        sub: 'user-456',
        email: 'manager@example.com',
        realm_access: { roles: ['compliance_manager'] },
        jti: 'jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();
      expect(request.user.role).toBe('compliance_manager');
    });

    it('should default to viewer role when no recognized role', async () => {
      const mockPayload = {
        sub: 'user-789',
        email: 'viewer@example.com',
        realm_access: { roles: ['unknown_role'] },
        jti: 'jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();
      expect(request.user.role).toBe('viewer');
    });

    it('should use default organization when not provided', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        realm_access: { roles: ['viewer'] },
        jti: 'jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'http://localhost:8080/realms/gigachad-grc',
      };

      const context = mockExecutionContext({ authorization: 'Bearer token' });
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-id' } });
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();
      expect(request.user.organizationId).toBe('default');
    });
  });
});

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;

  beforeEach(() => {
    guard = new ApiKeyAuthGuard();
  });

  it('should throw UnauthorizedException when no API key header', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow('No API key provided');
  });

  it('should allow access and attach API key when header is present', async () => {
    const request = { headers: { 'x-api-key': 'test-api-key-123' } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request['apiKey']).toBe('test-api-key-123');
  });
});

describe('CombinedAuthGuard', () => {
  let guard: CombinedAuthGuard;
  let jwtGuard: JwtAuthGuard;
  let apiKeyGuard: ApiKeyAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CombinedAuthGuard,
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ApiKeyAuthGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    guard = module.get<CombinedAuthGuard>(CombinedAuthGuard);
    jwtGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    apiKeyGuard = module.get<ApiKeyAuthGuard>(ApiKeyAuthGuard);
  });

  it('should use ApiKeyGuard when x-api-key header is present', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': 'api-key' } }),
      }),
    } as ExecutionContext;

    await guard.canActivate(context);

    expect(apiKeyGuard.canActivate).toHaveBeenCalledWith(context);
    expect(jwtGuard.canActivate).not.toHaveBeenCalled();
  });

  it('should use JwtGuard when no x-api-key header', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer token' } }),
      }),
    } as ExecutionContext;

    await guard.canActivate(context);

    expect(jwtGuard.canActivate).toHaveBeenCalledWith(context);
    expect(apiKeyGuard.canActivate).not.toHaveBeenCalled();
  });
});
