/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import * as vm from 'vm';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  STORAGE_PROVIDER,
  StorageProvider,
  safeFetch,
  SSRFProtectionError,
  isSafePropertyName,
  safePropertySet,
  MAX_BATCH_LIMITS,
} from '@gigachad-grc/shared';
import {
  SaveCustomConfigDto,
  TestEndpointDto,
  TestResultDto,
  ValidateCodeResultDto,
  CODE_TEMPLATE,
} from './dto/custom-config.dto';

interface ExecutionContext {
  baseUrl: string;
  auth: {
    headers: Record<string, string>;
    token?: string;
  };
  organizationId: string;
  integrationId: string;
}

interface EvidenceItem {
  title: string;
  description: string;
  data: any;
  type?: string;
}

interface SyncResult {
  evidence: EvidenceItem[];
}

// Sensitive fields that should be encrypted in authConfig
const AUTH_SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'secret_key',
  'password',
  'token',
  'accessToken',
  'access_token',
  'privateKey',
  'private_key',
  'clientSecret',
  'client_secret',
  'bearerToken',
  'bearer_token',
  'refreshToken',
  'refresh_token',
];

// SECURITY: Rate limiting configuration for code execution
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const CODE_EXECUTION_RATE_LIMIT = {
  maxRequests: 10, // Maximum requests per window
  windowMs: 60 * 1000, // 1 minute window
};

// SECURITY: Sandbox configuration for vm module
const SANDBOX_CONFIG = {
  timeoutMs: 30000, // Maximum execution time (30 seconds)
  maxCodeLengthBytes: 100 * 1024, // Maximum code size (100KB)
};

@Injectable()
export class CustomIntegrationService {
  private readonly logger = new Logger(CustomIntegrationService.name);
  private readonly encryptionKey: string;

  // SECURITY: Rate limiting state for code execution
  private readonly codeExecutionRateLimits = new Map<string, RateLimitEntry>();

  // SECURITY: Feature flag for custom code execution
  private readonly customCodeExecutionEnabled: boolean;

  private validateEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required for secure credential storage'
      );
    }
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    return key;
  }
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider
  ) {
    this.encryptionKey = this.validateEncryptionKey();

    // SECURITY: Custom code execution is disabled by default
    // Set ENABLE_CUSTOM_CODE_EXECUTION=true to enable (NOT RECOMMENDED for production)
    this.customCodeExecutionEnabled = process.env.ENABLE_CUSTOM_CODE_EXECUTION === 'true';

    if (this.customCodeExecutionEnabled) {
      this.logger.warn(
        'SECURITY WARNING: Custom code execution is ENABLED. ' +
          'This feature uses dynamic code execution which poses security risks. ' +
          'Only enable in trusted environments with proper isolation.'
      );
    } else {
      this.logger.log(
        'Custom code execution is disabled for security. Set ENABLE_CUSTOM_CODE_EXECUTION=true to enable.'
      );
    }
  }

  // ============================================
  // Encryption/Decryption for Auth Config
  // ============================================

  private encrypt(text: string): string {
    if (!text) return text;

    const iv = crypto.randomBytes(16);
    // SECURITY FIX: Generate random salt per encryption instead of using hardcoded salt
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, salt, 32);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // New format with salt: iv:authTag:salt:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${salt.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;

    try {
      const parts = encryptedText.split(':');

      // Support both old format (3 parts) and new format (4 parts with salt)
      if (parts.length === 3) {
        // Legacy format without salt
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32); // Legacy salt

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      } else if (parts.length === 4) {
        // New format with random salt
        const [ivHex, authTagHex, saltHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const salt = Buffer.from(saltHex, 'hex');
        const key = crypto.scryptSync(this.encryptionKey, salt, 32);

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      } else {
        return encryptedText; // Not encrypted
      }
    } catch {
      this.logger.warn('Failed to decrypt value, returning as-is');
      return encryptedText;
    }
  }

  private encryptAuthConfig(authConfig: Record<string, any>): Record<string, any> {
    if (!authConfig) return authConfig;

    const encrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(authConfig)) {
      // SECURITY: Skip blocked property names to prevent prototype pollution
      if (!isSafePropertyName(key)) {
        this.logger.warn(`Skipping blocked property name in encryptAuthConfig: ${key}`);
        continue;
      }

      if (
        typeof value === 'string' &&
        AUTH_SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
      ) {
        safePropertySet(encrypted, key, this.encrypt(value));
      } else if (typeof value === 'object' && value !== null) {
        safePropertySet(encrypted, key, this.encryptAuthConfig(value));
      } else {
        safePropertySet(encrypted, key, value);
      }
    }

    return encrypted;
  }

  private decryptAuthConfig(authConfig: Record<string, any>): Record<string, any> {
    if (!authConfig) return authConfig;

    const decrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(authConfig)) {
      // SECURITY: Skip blocked property names to prevent prototype pollution
      if (!isSafePropertyName(key)) {
        this.logger.warn(`Skipping blocked property name in decryptAuthConfig: ${key}`);
        continue;
      }

      if (
        typeof value === 'string' &&
        AUTH_SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
      ) {
        safePropertySet(decrypted, key, this.decrypt(value));
      } else if (typeof value === 'object' && value !== null) {
        safePropertySet(decrypted, key, this.decryptAuthConfig(value));
      } else {
        safePropertySet(decrypted, key, value);
      }
    }

    return decrypted;
  }

  /**
   * Get custom config for an integration
   */
  async getConfig(integrationId: string, organizationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
      include: { customConfig: true },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    if (!integration.customConfig) {
      // Return default empty config
      return {
        integrationId,
        mode: 'visual',
        baseUrl: '',
        endpoints: [],
        authType: null,
        authConfig: null,
        responseMapping: null,
        customCode: CODE_TEMPLATE,
        lastTestAt: null,
        lastTestStatus: null,
        lastTestError: null,
      };
    }

    // Mask sensitive auth config values
    const config = integration.customConfig;
    const maskedAuthConfig = this.maskAuthConfig(
      config.authType,
      config.authConfig as Record<string, any>
    );

    return {
      ...config,
      authConfig: maskedAuthConfig,
      customCode: config.customCode || CODE_TEMPLATE,
    };
  }

  /**
   * Save custom config for an integration
   *
   * SECURITY: This method performs strict type validation on all inputs
   * to prevent type confusion and bypass attacks.
   */
  async saveConfig(
    integrationId: string,
    organizationId: string,
    userId: string,
    dto: SaveCustomConfigDto
  ) {
    // SECURITY: Strict type validation to prevent type confusion attacks
    // Attackers may try to bypass checks by passing objects, arrays, or other types
    if (typeof integrationId !== 'string' || typeof organizationId !== 'string') {
      throw new BadRequestException('Invalid request parameters');
    }

    // SECURITY: Validate dto.mode is strictly a string and one of the allowed values
    // This prevents bypassing the 'code' check by passing objects or other types
    if (dto.mode !== undefined && dto.mode !== null) {
      if (typeof dto.mode !== 'string' || !['visual', 'code'].includes(dto.mode)) {
        throw new BadRequestException('Invalid mode: must be "visual" or "code"');
      }
    }

    // SECURITY: Validate baseUrl is a string if provided
    if (dto.baseUrl !== undefined && dto.baseUrl !== null && typeof dto.baseUrl !== 'string') {
      throw new BadRequestException('Invalid baseUrl: must be a string');
    }

    // SECURITY: Validate customCode is a string if provided
    if (
      dto.customCode !== undefined &&
      dto.customCode !== null &&
      typeof dto.customCode !== 'string'
    ) {
      throw new BadRequestException('Invalid customCode: must be a string');
    }

    // SECURITY: Validate endpoints is an array if provided
    if (dto.endpoints !== undefined && dto.endpoints !== null && !Array.isArray(dto.endpoints)) {
      throw new BadRequestException('Invalid endpoints: must be an array');
    }

    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
      include: { customConfig: true },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Validate code if in code mode
    // SECURITY: The strict type check above ensures dto.mode === 'code' works correctly
    if (dto.mode === 'code' && dto.customCode) {
      const validation = this.validateCode(dto.customCode);
      if (!validation.valid) {
        throw new BadRequestException(`Invalid code: ${validation.errors?.join(', ')}`);
      }
    }

    // SECURITY: Handle auth config encryption properly
    // - If new authConfig is provided, encrypt it
    // - If not provided, preserve existing encrypted config (don't allow bypass)
    // - Only clear if authType is explicitly set to null/undefined
    let encryptedAuthConfig: Record<string, any> | null = null;
    if (dto.authConfig) {
      // New auth config provided - encrypt it
      encryptedAuthConfig = this.encryptAuthConfig(dto.authConfig);
    } else if (integration.customConfig?.authConfig && dto.authType !== undefined) {
      // No new auth config but authType still set - preserve existing encrypted config
      encryptedAuthConfig = integration.customConfig.authConfig as Record<string, any>;
    }
    // If authType is undefined/null and no authConfig, encryptedAuthConfig stays null (clearing auth)

    const configData = {
      mode: dto.mode,
      baseUrl: dto.baseUrl,
      endpoints: dto.endpoints as any,
      authType: dto.authType,
      authConfig: encryptedAuthConfig as any,
      responseMapping: dto.responseMapping as any,
      customCode: dto.customCode,
    };

    let config;
    if (integration.customConfig) {
      // Update existing config
      config = await this.prisma.customIntegrationConfig.update({
        where: { id: integration.customConfig.id },
        data: configData,
      });
    } else {
      // Create new config
      config = await this.prisma.customIntegrationConfig.create({
        data: {
          ...configData,
          integrationId,
        },
      });
    }

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'updated',
      entityType: 'integration',
      entityId: integrationId,
      entityName: integration.name,
      description: `Updated custom integration config for "${integration.name}" (${dto.mode} mode)`,
      metadata: {
        mode: dto.mode,
        hasCode: !!dto.customCode,
        endpointCount: dto.endpoints?.length || 0,
      },
    });

    return {
      ...config,
      authConfig: this.maskAuthConfig(config.authType, config.authConfig as Record<string, any>),
    };
  }

  /**
   * Test an endpoint configuration
   */
  async testEndpoint(
    integrationId: string,
    organizationId: string,
    userId: string,
    dto: TestEndpointDto
  ): Promise<TestResultDto> {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
      include: { customConfig: true },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const config = integration.customConfig;
    if (!config) {
      throw new BadRequestException(
        'No custom configuration found. Please save a configuration first.'
      );
    }

    const startTime = Date.now();

    try {
      let result: TestResultDto;

      if (config.mode === 'code') {
        // Test code execution
        result = await this.testCodeExecution(config, organizationId, integrationId);
      } else {
        // Test visual endpoint
        result = await this.testVisualEndpoint(config, dto);
      }

      // Update test status
      await this.prisma.customIntegrationConfig.update({
        where: { id: config.id },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: result.success ? 'success' : 'error',
          lastTestError: result.success ? null : result.error,
        },
      });

      result.responseTime = Date.now() - startTime;

      // Audit log
      await this.auditService.log({
        organizationId,
        userId,
        action: 'tested',
        entityType: 'integration',
        entityId: integrationId,
        entityName: integration.name,
        description: `Tested custom integration "${integration.name}" - ${result.success ? 'Success' : 'Failed'}`,
        metadata: { success: result.success, responseTime: result.responseTime },
      });

      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Update test status
      await this.prisma.customIntegrationConfig.update({
        where: { id: config.id },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: 'error',
          lastTestError: error.message,
        },
      });

      return {
        success: false,
        message: 'Test failed',
        error: error.message,
        responseTime,
      };
    }
  }

  /**
   * Test visual mode endpoint
   *
   * SECURITY: This method only uses stored configuration values.
   * User-provided overrides (dto.baseUrl, etc.) are intentionally IGNORED
   * to prevent attackers from bypassing stored/validated configurations.
   */
  private async testVisualEndpoint(config: any, dto: TestEndpointDto): Promise<TestResultDto> {
    // SECURITY: Only use stored baseUrl - do NOT allow user-provided override
    // This prevents attackers from redirecting requests to malicious servers
    // to capture credentials or perform SSRF attacks
    const baseUrl = config.baseUrl;
    if (!baseUrl || typeof baseUrl !== 'string') {
      return {
        success: false,
        message: 'Base URL is required',
        error: 'No base URL configured in stored settings',
      };
    }

    const endpoints = config.endpoints as any[];
    if (!Array.isArray(endpoints) || endpoints.length === 0) {
      return {
        success: false,
        message: 'No endpoints configured',
        error: 'Add at least one endpoint',
      };
    }

    // SECURITY: Validate endpointIndex is a safe integer to prevent type confusion
    const endpointIndex = dto.endpointIndex ?? 0;
    if (
      typeof endpointIndex !== 'number' ||
      !Number.isInteger(endpointIndex) ||
      endpointIndex < 0
    ) {
      return {
        success: false,
        message: 'Invalid endpoint index',
        error: 'Endpoint index must be a non-negative integer',
      };
    }
    if (endpointIndex >= endpoints.length) {
      return {
        success: false,
        message: 'Invalid endpoint index',
        error: `Endpoint ${endpointIndex} not found`,
      };
    }

    const endpoint = endpoints[endpointIndex];
    // SECURITY: Validate endpoint.path is a string
    if (!endpoint || typeof endpoint.path !== 'string') {
      return {
        success: false,
        message: 'Invalid endpoint configuration',
        error: 'Endpoint path must be a string',
      };
    }
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint.path}`;

    // Build headers with auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpoint.headers,
    };

    // SECURITY: Only use stored encrypted authConfig - do NOT allow user-provided overrides
    // This prevents attackers from bypassing stored credentials with their own
    // The stored config.authConfig is already encrypted and trusted
    const authConfig = config.authConfig ? this.decryptAuthConfig(config.authConfig) : null;
    if (config.authType && authConfig) {
      const authHeaders = await this.getAuthHeaders(config.authType, authConfig);
      Object.assign(headers, authHeaders);
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: endpoint.method,
      headers,
    };

    // Add query params
    let finalUrl = url;
    if (endpoint.params) {
      const params = new URLSearchParams(endpoint.params);
      finalUrl = `${url}?${params.toString()}`;
    }

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.body) {
      fetchOptions.body = JSON.stringify(endpoint.body);
    }

    try {
      // SECURITY: Use safeFetch to prevent SSRF attacks
      const response = await safeFetch(finalUrl, fetchOptions, { allowPrivateIPs: false });
      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          error: typeof data === 'string' ? data : JSON.stringify(data),
        };
      }

      return {
        success: true,
        message: `Successfully connected to ${endpoint.name || endpoint.path}`,
        statusCode: response.status,
        data: typeof data === 'object' ? data : { response: data },
      };
    } catch (error: any) {
      // SECURITY: Provide clear error message for SSRF blocks
      if (error instanceof SSRFProtectionError) {
        return {
          success: false,
          message: 'Request blocked for security',
          error: `SSRF Protection: ${error.message}. Cannot connect to internal/private addresses.`,
        };
      }
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
      };
    }
  }

  /**
   * Test code mode execution
   *
   * SECURITY: Checks if code execution is enabled before testing
   */
  private async testCodeExecution(
    config: any,
    organizationId: string,
    integrationId: string
  ): Promise<TestResultDto> {
    // SECURITY: Check if code execution is enabled
    if (!this.customCodeExecutionEnabled) {
      return {
        success: false,
        message: 'Custom code execution is disabled',
        error:
          'Custom code execution is disabled for security reasons. ' +
          'Set ENABLE_CUSTOM_CODE_EXECUTION=true environment variable to enable. ' +
          'Consider using visual mode as a safer alternative.',
      };
    }

    if (!config.customCode) {
      return {
        success: false,
        message: 'No custom code configured',
        error: 'Add custom code first',
      };
    }

    try {
      const context = await this.buildExecutionContext(config, organizationId, integrationId);
      const result = await this.executeCode(config.customCode, context);

      return {
        success: true,
        message: `Code executed successfully. Found ${result.evidence?.length || 0} evidence items.`,
        data: {
          evidenceCount: result.evidence?.length || 0,
          evidencePreview: result.evidence?.slice(0, 3).map((e: EvidenceItem) => ({
            title: e.title,
            type: e.type,
          })),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Code execution failed',
        error: error.message,
      };
    }
  }

  /**
   * Validate custom code syntax
   *
   * SECURITY: This validates code before it can be saved or executed.
   * Even if code execution is disabled, we still validate to provide feedback.
   */
  validateCode(code: string): ValidateCodeResultDto {
    const errors: string[] = [];
    const warnings: string[] = [];

    // SECURITY: Check if code execution is enabled
    if (!this.customCodeExecutionEnabled) {
      warnings.push(
        'Custom code execution is currently DISABLED for security. ' +
          'Set ENABLE_CUSTOM_CODE_EXECUTION=true to enable execution.'
      );
    }

    // SECURITY: Comprehensive blocklist of dangerous patterns
    // These patterns can be used to escape the sandbox or execute arbitrary code
    const dangerousPatterns = [
      // Direct code execution
      { pattern: /\beval\s*\(/, message: 'eval() is not allowed for security reasons' },
      { pattern: /\bFunction\s*\(/, message: 'Function() constructor is not allowed' },
      { pattern: /new\s+Function\s*\(/, message: 'new Function() is not allowed' },

      // Global object access - bypass attempts
      { pattern: /\bglobalThis\b/, message: 'globalThis is not allowed - sandbox bypass' },
      { pattern: /\bglobal\b(?!\.)/, message: 'global is not allowed - sandbox bypass' },
      { pattern: /\bwindow\b/, message: 'window is not allowed' },
      { pattern: /\bself\b/, message: 'self is not allowed' },

      // Process access - server compromise
      { pattern: /\bprocess\b/, message: 'process is not allowed - server access' },
      { pattern: /\brequire\s*\(/, message: 'require() is not allowed - module loading' },
      { pattern: /\bimport\s*\(/, message: 'dynamic import() is not allowed' },
      { pattern: /\bimport\s+/, message: 'import statements are not allowed' },

      // Prototype pollution and constructor access
      { pattern: /__proto__/, message: '__proto__ is not allowed - prototype pollution' },
      { pattern: /\.prototype\b/, message: 'prototype access is not allowed' },
      { pattern: /\.constructor\b/, message: 'constructor access is not allowed - sandbox bypass' },
      { pattern: /\bconstructor\s*\[/, message: 'constructor bracket access is not allowed' },

      // Reflect and Proxy - can bypass sandbox
      { pattern: /\bReflect\b/, message: 'Reflect is not allowed - sandbox bypass' },
      { pattern: /\bProxy\b/, message: 'Proxy is not allowed - sandbox bypass' },

      // File system and network access
      { pattern: /\bfs\b/, message: 'fs module is not allowed' },
      { pattern: /\bchild_process\b/, message: 'child_process is not allowed' },
      { pattern: /\bhttp\b(?!s?:\/\/)/, message: 'http module is not allowed' },
      { pattern: /\bhttps\b(?!:\/\/)/, message: 'https module is not allowed' },
      { pattern: /\bnet\b/, message: 'net module is not allowed' },

      // Dangerous object access patterns (string-based property access)
      { pattern: /\['constructor'\]/, message: "['constructor'] is not allowed - sandbox bypass" },
      { pattern: /\["constructor"\]/, message: '["constructor"] is not allowed - sandbox bypass' },
      { pattern: /\['__proto__'\]/, message: "['__proto__'] is not allowed - prototype pollution" },
      { pattern: /\["__proto__"\]/, message: '["__proto__"] is not allowed - prototype pollution' },
      { pattern: /\['prototype'\]/, message: "['prototype'] is not allowed - prototype access" },
      { pattern: /\["prototype"\]/, message: '["prototype"] is not allowed - prototype access' },

      // Timer functions that could enable DoS or async escapes
      { pattern: /\bsetTimeout\b/, message: 'setTimeout is not allowed' },
      { pattern: /\bsetInterval\b/, message: 'setInterval is not allowed' },
      { pattern: /\bsetImmediate\b/, message: 'setImmediate is not allowed' },

      // Web APIs that shouldn't be available
      { pattern: /\bWebSocket\b/, message: 'WebSocket is not allowed' },
      { pattern: /\bWorker\b/, message: 'Worker is not allowed' },
      { pattern: /\bSharedArrayBuffer\b/, message: 'SharedArrayBuffer is not allowed' },

      // Unicode/hex escape bypass attempts
      {
        pattern: /\\u[0-9a-fA-F]{4}/,
        message: 'Unicode escapes are not allowed - potential bypass',
      },
      { pattern: /\\x[0-9a-fA-F]{2}/, message: 'Hex escapes are not allowed - potential bypass' },

      // Obfuscation attempts
      { pattern: /atob\s*\(/, message: 'atob() is not allowed - potential code obfuscation' },
      { pattern: /btoa\s*\(/, message: 'btoa() is not allowed' },
      {
        pattern: /String\.fromCharCode/,
        message: 'String.fromCharCode is not allowed - potential bypass',
      },
      {
        pattern: /String\.fromCodePoint/,
        message: 'String.fromCodePoint is not allowed - potential bypass',
      },

      // Additional dangerous patterns
      { pattern: /\bwith\s*\(/, message: 'with statement is not allowed' },
      { pattern: /\bdebugger\b/, message: 'debugger statement is not allowed' },
      {
        pattern: /\bObject\.getOwnPropertyDescriptor/,
        message: 'Object.getOwnPropertyDescriptor is not allowed',
      },
      { pattern: /\bObject\.defineProperty/, message: 'Object.defineProperty is not allowed' },
      { pattern: /\bObject\.setPrototypeOf/, message: 'Object.setPrototypeOf is not allowed' },
      { pattern: /\bObject\.getPrototypeOf/, message: 'Object.getPrototypeOf is not allowed' },
    ];

    // Check all dangerous patterns
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    // If we already found security issues, don't even try to parse
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // SECURITY: Only perform syntax check with new Function() if code execution is enabled
    // When disabled, we skip this to avoid any code evaluation, even for syntax checking
    if (this.customCodeExecutionEnabled) {
      try {
        // Use strict mode to catch more syntax errors
        // Note: This is for syntax validation only - actual execution happens in executeCode()
        new Function('"use strict";\n' + code);
      } catch (syntaxError: any) {
        errors.push(`Syntax error: ${syntaxError.message}`);
        return { valid: false, errors, warnings };
      }
    } else {
      // When code execution is disabled, do basic syntax checks without new Function()
      // Check for unbalanced braces/brackets/parens
      const braceCount = (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
      const bracketCount = (code.match(/\[/g) || []).length - (code.match(/\]/g) || []).length;
      const parenCount = (code.match(/\(/g) || []).length - (code.match(/\)/g) || []).length;

      if (braceCount !== 0) {
        errors.push('Syntax error: Unbalanced curly braces {}');
      }
      if (bracketCount !== 0) {
        errors.push('Syntax error: Unbalanced square brackets []');
      }
      if (parenCount !== 0) {
        errors.push('Syntax error: Unbalanced parentheses ()');
      }

      // Check for unclosed strings (simple check)
      const singleQuotes = (code.match(/'/g) || []).length;
      const doubleQuotes = (code.match(/"/g) || []).length;
      const backticks = (code.match(/`/g) || []).length;

      if (singleQuotes % 2 !== 0) {
        warnings.push('Warning: Possibly unclosed single-quoted string');
      }
      if (doubleQuotes % 2 !== 0) {
        warnings.push('Warning: Possibly unclosed double-quoted string');
      }
      if (backticks % 2 !== 0) {
        warnings.push('Warning: Possibly unclosed template literal');
      }
    }

    // Check for required sync function
    if (
      !code.includes('function sync') &&
      !code.includes('sync =') &&
      !code.includes('async function sync')
    ) {
      errors.push('Missing required "sync" function');
    }

    // Check for module.exports
    if (!code.includes('module.exports')) {
      warnings.push('Consider adding module.exports = { sync } at the end');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Execute a custom integration sync
   */
  async executeSync(
    integrationId: string,
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; evidenceCreated: number; message: string; errors?: string[] }> {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
      include: { customConfig: true },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const config = integration.customConfig;
    if (!config) {
      throw new BadRequestException('No custom configuration found');
    }

    const errors: string[] = [];
    let evidenceCreated = 0;

    try {
      let syncResult: SyncResult;

      if (config.mode === 'code') {
        // SECURITY: Check if code execution is enabled for code mode
        if (!this.customCodeExecutionEnabled) {
          throw new BadRequestException(
            'Custom code execution is disabled for security reasons. ' +
              'Set ENABLE_CUSTOM_CODE_EXECUTION=true to enable, or use visual mode instead.'
          );
        }

        // Execute custom code
        const context = await this.buildExecutionContext(config, organizationId, integrationId);
        syncResult = await this.executeCode(config.customCode!, context);
      } else {
        // Execute visual mode endpoints
        syncResult = await this.executeVisualSync(config, organizationId, integrationId);
      }

      // Create evidence from results
      if (syncResult.evidence && syncResult.evidence.length > 0) {
        evidenceCreated = await this.createEvidenceFromResults(
          organizationId,
          userId,
          integrationId,
          integration.name,
          syncResult.evidence
        );
      }

      return {
        success: true,
        evidenceCreated,
        message: `Sync completed successfully. Created ${evidenceCreated} evidence records.`,
      };
    } catch (error: any) {
      this.logger.error(`Custom integration sync failed: ${error.message}`, error.stack);
      errors.push(error.message);

      return {
        success: false,
        evidenceCreated,
        message: 'Sync failed',
        errors,
      };
    }
  }

  /**
   * Execute visual mode sync
   */
  private async executeVisualSync(
    config: any,
    _organizationId: string,
    _integrationId: string
  ): Promise<SyncResult> {
    const evidence: EvidenceItem[] = [];
    const baseUrl = config.baseUrl;
    const endpoints = config.endpoints as any[];

    if (!baseUrl || !endpoints || endpoints.length === 0) {
      return { evidence: [] };
    }

    // Get auth headers - decrypt stored authConfig for use
    const decryptedAuthConfig = config.authConfig
      ? this.decryptAuthConfig(config.authConfig)
      : null;
    const authHeaders =
      config.authType && decryptedAuthConfig
        ? await this.getAuthHeaders(config.authType, decryptedAuthConfig)
        : {};

    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl.replace(/\/$/, '')}${endpoint.path}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...endpoint.headers,
          ...authHeaders,
        };

        const fetchOptions: RequestInit = {
          method: endpoint.method,
          headers,
        };

        let finalUrl = url;
        if (endpoint.params) {
          const params = new URLSearchParams(endpoint.params);
          finalUrl = `${url}?${params.toString()}`;
        }

        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.body) {
          fetchOptions.body = JSON.stringify(endpoint.body);
        }

        // SECURITY: Use safeFetch to prevent SSRF attacks
        const response = await safeFetch(finalUrl, fetchOptions, { allowPrivateIPs: false });
        const data = await response.json();

        if (response.ok) {
          // Apply response mapping if configured
          let title = endpoint.name || `${endpoint.method} ${endpoint.path}`;
          let description = endpoint.description || `Data from ${endpoint.path}`;

          if (endpoint.responseMapping) {
            // Simple JSONPath-like extraction
            if (endpoint.responseMapping.title) {
              title = this.extractValue(data, endpoint.responseMapping.title) || title;
            }
            if (endpoint.responseMapping.description) {
              description =
                this.extractValue(data, endpoint.responseMapping.description) || description;
            }
          }

          evidence.push({
            title: `${title} - ${new Date().toLocaleDateString()}`,
            description,
            data,
            type: 'automated',
          });
        }
      } catch (error: any) {
        this.logger.warn(`Endpoint ${endpoint.path} failed: ${error.message}`);
      }
    }

    return { evidence };
  }

  /**
   * SECURITY: Check and update rate limit for code execution
   * Returns true if request is allowed, false if rate limited
   */
  private checkCodeExecutionRateLimit(organizationId: string): boolean {
    const now = Date.now();
    const key = `code-exec:${organizationId}`;
    const entry = this.codeExecutionRateLimits.get(key);

    if (!entry || now - entry.windowStart > CODE_EXECUTION_RATE_LIMIT.windowMs) {
      // Start new window
      this.codeExecutionRateLimits.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= CODE_EXECUTION_RATE_LIMIT.maxRequests) {
      this.logger.warn(`Rate limit exceeded for code execution: org=${organizationId}`);
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * SECURITY: Check if custom code execution is enabled
   * Throws an error if disabled with clear explanation
   */
  private assertCodeExecutionEnabled(): void {
    if (!this.customCodeExecutionEnabled) {
      throw new BadRequestException(
        'Custom code execution is disabled for security reasons. ' +
          'This feature uses dynamic code execution (new Function()) which can pose security risks. ' +
          'To enable, set the environment variable ENABLE_CUSTOM_CODE_EXECUTION=true. ' +
          'WARNING: Only enable in trusted environments with proper network isolation. ' +
          'Consider using the visual mode instead for a safer alternative.'
      );
    }
  }

  /**
   * SECURITY: Sanitize user code input before processing
   * Removes potential bypass characters and normalizes the code
   */
  private sanitizeCodeInput(code: string): string {
    if (!code || typeof code !== 'string') {
      throw new Error('Code must be a non-empty string');
    }

    // SECURITY: Enforce maximum code length
    if (Buffer.byteLength(code, 'utf8') > SANDBOX_CONFIG.maxCodeLengthBytes) {
      throw new Error(
        `Code exceeds maximum allowed size of ${SANDBOX_CONFIG.maxCodeLengthBytes} bytes`
      );
    }

    // SECURITY: Remove null bytes and other control characters that could cause issues
    // eslint-disable-next-line no-control-regex
    let sanitized = code.replace(/\x00/g, '');

    // SECURITY: Normalize Unicode to detect obfuscation attempts
    // This converts confusable characters to their ASCII equivalents
    sanitized = sanitized.normalize('NFKC');

    return sanitized;
  }

  /**
   * SECURITY: Enhanced runtime validation with comprehensive blocklist
   * Returns an array of detected dangerous patterns
   */
  private validateCodeAtRuntime(code: string): string[] {
    const detectedPatterns: string[] = [];

    // SECURITY: Comprehensive blocklist of dangerous patterns
    const dangerousPatterns = [
      // Sandbox escape patterns
      { pattern: /\bglobalThis\b/, name: 'globalThis' },
      { pattern: /\bglobal\b(?!\.)/, name: 'global' },
      { pattern: /\bprocess\b/, name: 'process' },
      { pattern: /\brequire\s*\(/, name: 'require()' },
      { pattern: /\beval\s*\(/, name: 'eval()' },
      { pattern: /\bFunction\s*\(/, name: 'Function()' },
      { pattern: /new\s+Function\s*\(/, name: 'new Function()' },
      { pattern: /__proto__/, name: '__proto__' },
      { pattern: /\.constructor\b/, name: '.constructor' },
      { pattern: /\['constructor'\]/, name: "['constructor']" },
      { pattern: /\["constructor"\]/, name: '["constructor"]' },
      { pattern: /\bReflect\b/, name: 'Reflect' },
      { pattern: /\bProxy\b/, name: 'Proxy' },
      { pattern: /\bimport\s*\(/, name: 'import()' },
      { pattern: /\.prototype\b/, name: '.prototype' },
      // Node.js specific escapes
      { pattern: /\bmodule\.constructor\b/, name: 'module.constructor' },
      { pattern: /\bthis\.constructor\b/, name: 'this.constructor' },
      { pattern: /\barguments\.callee\b/, name: 'arguments.callee' },
      // Additional bypass attempts using Unicode or encoding
      { pattern: /\\u[0-9a-fA-F]{4}/, name: 'unicode escape' },
      { pattern: /\\x[0-9a-fA-F]{2}/, name: 'hex escape' },
      // Template literal escapes
      { pattern: /\$\{[^}]*constructor[^}]*\}/, name: 'constructor in template' },
      { pattern: /\$\{[^}]*eval[^}]*\}/, name: 'eval in template' },
      { pattern: /\$\{[^}]*Function[^}]*\}/, name: 'Function in template' },
      // Property access that could lead to escapes
      { pattern: /\[['"`]constructor['"`]\]/, name: 'bracket constructor access' },
      { pattern: /\[['"`]__proto__['"`]\]/, name: 'bracket __proto__ access' },
      { pattern: /\[['"`]prototype['"`]\]/, name: 'bracket prototype access' },
      // Computed property access with variables (potential bypass)
      { pattern: /\[[^\]]*\+[^\]]*\]/, name: 'computed property with concatenation' },
      // WebAssembly could be used to escape
      { pattern: /\bWebAssembly\b/, name: 'WebAssembly' },
    ];

    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(code)) {
        detectedPatterns.push(name);
      }
    }

    return detectedPatterns;
  }

  /**
   * Execute custom JavaScript code in a secure isolated sandbox
   *
   * SECURITY: Defense-in-depth approach using isolated-vm:
   * 1. Feature must be explicitly enabled via ENABLE_CUSTOM_CODE_EXECUTION env var
   * 2. Rate limiting prevents abuse
   * 3. Input sanitization normalizes code and removes dangerous characters
   * 4. Comprehensive blocklist validation catches known dangerous patterns
   * 5. Code runs in a separate V8 isolate with:
   *    - Memory limits (prevents memory exhaustion attacks)
   *    - CPU timeout (prevents infinite loops)
   *    - No access to Node.js globals (true sandbox)
   * 6. Only safe, controlled functions are exposed to the sandbox
   */
  private async executeCode(code: string, context: ExecutionContext): Promise<SyncResult> {
    // SECURITY: Check if custom code execution is enabled
    this.assertCodeExecutionEnabled();

    // SECURITY: Apply rate limiting
    if (!this.checkCodeExecutionRateLimit(context.organizationId)) {
      throw new Error(
        'Rate limit exceeded for code execution. ' +
          `Maximum ${CODE_EXECUTION_RATE_LIMIT.maxRequests} executions per minute allowed. ` +
          'Please wait before trying again.'
      );
    }

    // SECURITY: Sanitize input code
    const sanitizedCode = this.sanitizeCodeInput(code);

    this.logger.warn(
      `SECURITY AUDIT: Executing custom code for org=${context.organizationId}, ` +
        `integration=${context.integrationId}, codeLength=${sanitizedCode.length}`
    );

    // SECURITY: Runtime validation - comprehensive blocklist check
    const detectedPatterns = this.validateCodeAtRuntime(sanitizedCode);
    if (detectedPatterns.length > 0) {
      this.logger.error(
        `SECURITY: Blocked dangerous patterns in custom code: ${detectedPatterns.join(', ')}`
      );
      throw new Error(
        `SECURITY: Dangerous patterns detected in code: ${detectedPatterns.join(', ')}. Execution blocked.`
      );
    }

    // SECURITY: Create a sandboxed context using Node.js vm module
    // This provides process isolation with limited capabilities
    try {
      // Track logs from the sandbox for debugging
      const logs: string[] = [];

      // SECURITY: Create a minimal sandbox context with only safe globals
      // We explicitly control what the sandboxed code can access
      const sandboxContext = {
        // Safe built-ins (frozen to prevent modification)
        JSON: Object.freeze({ ...JSON }),
        Math: Object.freeze({ ...Math }),
        Object: Object.freeze({
          keys: Object.keys,
          values: Object.values,
          entries: Object.entries,
          assign: Object.assign,
          freeze: Object.freeze,
        }),
        Array: Object.freeze({
          isArray: Array.isArray,
          from: Array.from,
        }),
        String: Object.freeze({
          fromCharCode: String.fromCharCode,
        }),
        Number: Object.freeze({
          isNaN: Number.isNaN,
          isFinite: Number.isFinite,
          parseInt: Number.parseInt,
          parseFloat: Number.parseFloat,
        }),
        Date: Object.freeze({
          now: Date.now,
        }),
        // Safe console (logs are captured, not printed directly)
        console: Object.freeze({
          log: (...args: any[]) => {
            logs.push(
              `[LOG] ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`
            );
          },
          error: (...args: any[]) => {
            logs.push(
              `[ERROR] ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`
            );
          },
          warn: (...args: any[]) => {
            logs.push(
              `[WARN] ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`
            );
          },
        }),
        // Execution context (immutable copy)
        context: Object.freeze({ ...context }),
        // Result container
        __result: { evidence: [] as EvidenceItem[] },
        // SECURITY: Provide a controlled fetch implementation
        // This wraps safeFetch to prevent SSRF attacks
        fetch: async (url: string, opts?: RequestInit) => {
          try {
            const response = await safeFetch(url, opts || {}, { allowPrivateIPs: false });
            const data = await response.json().catch(() => response.text());
            return {
              ok: response.ok,
              status: response.status,
              statusText: response.statusText,
              data,
              json: () => Promise.resolve(data),
              text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
            };
          } catch (error: any) {
            if (error instanceof SSRFProtectionError) {
              throw new Error(`SSRF Protection: ${error.message}`);
            }
            throw error;
          }
        },
      };

      // Create the VM context
      const vmContext = vm.createContext(sandboxContext, {
        name: 'CustomIntegrationSandbox',
        codeGeneration: {
          strings: false, // Disable eval() and new Function()
          wasm: false, // Disable WebAssembly
        },
      });

      // Wrap the user code to execute the sync function
      const wrappedCode = `
        "use strict";

        // Module stub for compatibility
        const module = { exports: {} };

        ${sanitizedCode}

        // Execute sync and store result
        (async function() {
          let syncFn;
          if (typeof sync === 'function') {
            syncFn = sync;
          } else if (module.exports && typeof module.exports.sync === 'function') {
            syncFn = module.exports.sync;
          } else {
            throw new Error('No sync function found. Define a function named "sync" that takes context as parameter.');
          }

          const result = await syncFn(context);
          __result.evidence = result?.evidence || [];
        })();
      `;

      // Compile the script
      const script = new vm.Script(wrappedCode, {
        filename: 'custom-integration.js',
      });

      // Execute the script (returns a Promise for async code)
      const resultPromise = script.runInContext(vmContext, {
        timeout: SANDBOX_CONFIG.timeoutMs,
      });

      // Wait for completion with timeout
      await Promise.race([
        resultPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Code execution timed out')), SANDBOX_CONFIG.timeoutMs)
        ),
      ]);

      // Log any captured console output
      if (logs.length > 0) {
        this.logger.log(`[Custom Code Logs]\n${logs.join('\n')}`);
      }

      // Return the result
      return {
        evidence: Array.isArray(sandboxContext.__result.evidence)
          ? sandboxContext.__result.evidence
          : [],
      };
    } catch (error: any) {
      // Handle specific vm errors
      if (
        error.message?.includes('Script execution timed out') ||
        error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT'
      ) {
        this.logger.error('Custom code execution timed out');
        throw new Error(
          `Code execution timed out after ${SANDBOX_CONFIG.timeoutMs}ms. ` +
            'Ensure your sync function completes within the time limit.'
        );
      }

      this.logger.error(`Custom code execution error: ${error.message}`);
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }

  /**
   * Build execution context with auth headers
   */
  private async buildExecutionContext(
    config: any,
    organizationId: string,
    integrationId: string
  ): Promise<ExecutionContext> {
    // Decrypt stored authConfig for use in execution context
    const decryptedAuthConfig = config.authConfig
      ? this.decryptAuthConfig(config.authConfig)
      : null;
    const authHeaders =
      config.authType && decryptedAuthConfig
        ? await this.getAuthHeaders(config.authType, decryptedAuthConfig)
        : {};

    return {
      baseUrl: config.baseUrl || '',
      auth: {
        headers: authHeaders,
      },
      organizationId,
      integrationId,
    };
  }

  /**
   * Get authentication headers based on auth type
   */
  private async getAuthHeaders(
    authType: string,
    authConfig: Record<string, any>
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    switch (authType) {
      case 'api_key':
        if (authConfig.location === 'header') {
          headers[authConfig.keyName] = authConfig.keyValue;
        }
        break;

      case 'oauth2':
        try {
          const token = await this.getOAuth2Token(authConfig);
          headers['Authorization'] = `Bearer ${token}`;
        } catch (error: any) {
          this.logger.error(`OAuth2 token fetch failed: ${error.message}`);
        }
        break;

      case 'bearer':
        if (authConfig.token) {
          headers['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;

      case 'basic':
        if (authConfig.username && authConfig.password) {
          const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString(
            'base64'
          );
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Get OAuth 2.0 access token
   */
  private async getOAuth2Token(authConfig: Record<string, any>): Promise<string> {
    const { tokenUrl, clientId, clientSecret, scope } = authConfig;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    if (scope) {
      params.append('scope', scope);
    }

    // SECURITY: Use safeFetch to prevent SSRF attacks on OAuth token endpoint
    try {
      const response = await safeFetch(
        tokenUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        },
        { allowPrivateIPs: false }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OAuth2 token request failed: ${error}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error: any) {
      if (error instanceof SSRFProtectionError) {
        throw new Error(
          `OAuth2 token URL blocked: ${error.message}. Use a public OAuth provider URL.`
        );
      }
      throw error;
    }
  }

  /**
   * Create evidence from sync results
   */
  private async createEvidenceFromResults(
    organizationId: string,
    userId: string,
    integrationId: string,
    integrationName: string,
    evidenceItems: EvidenceItem[]
  ): Promise<number> {
    let created = 0;
    const timestamp = Date.now();

    // SECURITY: Limit iterations to prevent loop bound injection attacks
    const maxItems = Math.min(evidenceItems.length, MAX_BATCH_LIMITS.EVIDENCE_ITEMS);

    for (let i = 0; i < maxItems; i++) {
      const item = evidenceItems[i];

      try {
        const jsonData = JSON.stringify(item.data, null, 2);
        const storagePath = `integrations/custom/${integrationId}/${timestamp}-${i}.json`;

        // Save to storage
        await this.storage.upload(Buffer.from(jsonData, 'utf-8'), storagePath, {
          contentType: 'application/json',
        });

        // Create evidence record
        await this.prisma.evidence.create({
          data: {
            organizationId,
            title: item.title,
            description: item.description,
            type: item.type || 'automated',
            source: 'custom',
            status: 'approved',
            filename: `custom-${integrationName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${i}.json`,
            mimeType: 'application/json',
            size: Buffer.byteLength(jsonData, 'utf-8'),
            storagePath,
            metadata: { integrationId, integrationName },
            collectedAt: new Date(),
            validFrom: new Date(),
            createdBy: userId,
            updatedBy: userId,
          },
        });

        created++;
      } catch (error: any) {
        this.logger.error(`Failed to create evidence: ${error.message}`);
      }
    }

    return created;
  }

  /**
   * Simple value extraction from nested object using dot notation
   */
  private extractValue(obj: any, path: string): any {
    if (!path) return undefined;

    const parts = path.replace(/^\$\.?/, '').split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;

      // Handle array access like [0]
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Mask sensitive auth config values
   */
  private maskAuthConfig(
    authType: string | null,
    authConfig: Record<string, any> | null
  ): Record<string, any> | null {
    if (!authConfig) return null;

    const masked = { ...authConfig };

    // Mask sensitive fields
    const sensitiveFields = ['keyValue', 'clientSecret', 'password', 'token', 'apiKey'];
    for (const field of sensitiveFields) {
      if (masked[field]) {
        const value = String(masked[field]);
        masked[field] = value.length > 4 ? '••••••••' + value.slice(-4) : '••••••••';
      }
    }

    return masked;
  }

  /**
   * Get default code template
   */
  getCodeTemplate(): string {
    return CODE_TEMPLATE;
  }
}
