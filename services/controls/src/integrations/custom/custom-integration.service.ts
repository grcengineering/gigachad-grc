/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
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
  'apiKey', 'api_key', 'secret', 'secretKey', 'secret_key',
  'password', 'token', 'accessToken', 'access_token',
  'privateKey', 'private_key', 'clientSecret', 'client_secret',
  'bearerToken', 'bearer_token', 'refreshToken', 'refresh_token',
];

@Injectable()
export class CustomIntegrationService {
  private readonly logger = new Logger(CustomIntegrationService.name);
  private readonly encryptionKey: string;

  private validateEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required for secure credential storage');
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
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {
    this.encryptionKey = this.validateEncryptionKey();
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
      if (typeof value === 'string' && AUTH_SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        encrypted[key] = this.encrypt(value);
      } else if (typeof value === 'object' && value !== null) {
        encrypted[key] = this.encryptAuthConfig(value);
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  }

  private decryptAuthConfig(authConfig: Record<string, any>): Record<string, any> {
    if (!authConfig) return authConfig;
    
    const decrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(authConfig)) {
      if (typeof value === 'string' && AUTH_SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        decrypted[key] = this.decrypt(value);
      } else if (typeof value === 'object' && value !== null) {
        decrypted[key] = this.decryptAuthConfig(value);
      } else {
        decrypted[key] = value;
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
    const maskedAuthConfig = this.maskAuthConfig(config.authType, config.authConfig as Record<string, any>);

    return {
      ...config,
      authConfig: maskedAuthConfig,
      customCode: config.customCode || CODE_TEMPLATE,
    };
  }

  /**
   * Save custom config for an integration
   */
  async saveConfig(
    integrationId: string,
    organizationId: string,
    userId: string,
    dto: SaveCustomConfigDto,
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
      include: { customConfig: true },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Validate code if in code mode
    if (dto.mode === 'code' && dto.customCode) {
      const validation = this.validateCode(dto.customCode);
      if (!validation.valid) {
        throw new BadRequestException(`Invalid code: ${validation.errors?.join(', ')}`);
      }
    }

    // Encrypt sensitive auth config fields before saving
    const encryptedAuthConfig = dto.authConfig ? this.encryptAuthConfig(dto.authConfig) : null;

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
      metadata: { mode: dto.mode, hasCode: !!dto.customCode, endpointCount: dto.endpoints?.length || 0 },
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
    dto: TestEndpointDto,
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
      throw new BadRequestException('No custom configuration found. Please save a configuration first.');
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
   */
  private async testVisualEndpoint(
    config: any,
    dto: TestEndpointDto,
  ): Promise<TestResultDto> {
    const baseUrl = dto.baseUrl || config.baseUrl;
    if (!baseUrl) {
      return { success: false, message: 'Base URL is required', error: 'No base URL configured' };
    }

    const endpoints = config.endpoints as any[];
    if (!endpoints || endpoints.length === 0) {
      return { success: false, message: 'No endpoints configured', error: 'Add at least one endpoint' };
    }

    const endpointIndex = dto.endpointIndex ?? 0;
    if (endpointIndex >= endpoints.length) {
      return { success: false, message: 'Invalid endpoint index', error: `Endpoint ${endpointIndex} not found` };
    }

    const endpoint = endpoints[endpointIndex];
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint.path}`;

    // Build headers with auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpoint.headers,
    };

    // Add authentication - decrypt stored authConfig for use
    const rawAuthConfig = dto.authConfig || config.authConfig;
    const authConfig = rawAuthConfig ? this.decryptAuthConfig(rawAuthConfig) : null;
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
      const response = await fetch(finalUrl, fetchOptions);
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
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
      };
    }
  }

  /**
   * Test code mode execution
   */
  private async testCodeExecution(
    config: any,
    organizationId: string,
    integrationId: string,
  ): Promise<TestResultDto> {
    if (!config.customCode) {
      return { success: false, message: 'No custom code configured', error: 'Add custom code first' };
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
   */
  validateCode(code: string): ValidateCodeResultDto {
    const errors: string[] = [];
    const warnings: string[] = [];

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
      
      // Dangerous object access patterns
      { pattern: /\['constructor'\]/, message: "['constructor'] is not allowed - sandbox bypass" },
      { pattern: /\["constructor"\]/, message: '["constructor"] is not allowed - sandbox bypass' },
      { pattern: /\['__proto__'\]/, message: "['__proto__'] is not allowed - prototype pollution" },
      { pattern: /\["__proto__"\]/, message: '["__proto__"] is not allowed - prototype pollution' },
      
      // Timer functions that could enable DoS or async escapes
      { pattern: /\bsetTimeout\b/, message: 'setTimeout is not allowed' },
      { pattern: /\bsetInterval\b/, message: 'setInterval is not allowed' },
      { pattern: /\bsetImmediate\b/, message: 'setImmediate is not allowed' },
      
      // Web APIs that shouldn't be available
      { pattern: /\bWebSocket\b/, message: 'WebSocket is not allowed' },
      { pattern: /\bWorker\b/, message: 'Worker is not allowed' },
      { pattern: /\bSharedArrayBuffer\b/, message: 'SharedArrayBuffer is not allowed' },
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

    // Basic syntax check - note: we still use Function() here but ONLY for syntax validation
    // The actual execution will be blocked if the code contains dangerous patterns
    try {
      // Use strict mode to catch more syntax errors
      new Function('"use strict";\n' + code);
    } catch (syntaxError: any) {
      errors.push(`Syntax error: ${syntaxError.message}`);
      return { valid: false, errors, warnings };
    }

    // Check for required sync function
    if (!code.includes('function sync') && !code.includes('sync =') && !code.includes('async function sync')) {
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
    userId: string,
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
          syncResult.evidence,
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
    _integrationId: string,
  ): Promise<SyncResult> {
    const evidence: EvidenceItem[] = [];
    const baseUrl = config.baseUrl;
    const endpoints = config.endpoints as any[];

    if (!baseUrl || !endpoints || endpoints.length === 0) {
      return { evidence: [] };
    }

    // Get auth headers - decrypt stored authConfig for use
    const decryptedAuthConfig = config.authConfig ? this.decryptAuthConfig(config.authConfig) : null;
    const authHeaders = config.authType && decryptedAuthConfig
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

        const response = await fetch(finalUrl, fetchOptions);
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
              description = this.extractValue(data, endpoint.responseMapping.description) || description;
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
   * Execute custom JavaScript code in a sandbox
   * 
   * SECURITY: Defense-in-depth approach:
   * 1. Code is validated before execution via validateCode()
   * 2. Runtime validation is performed here as a double-check
   * 3. Limited scope is provided to the function
   * 
   * NOTE: For maximum security, consider migrating to vm2 or isolated-vm
   * for proper process-level sandboxing.
   */
  private async executeCode(code: string, context: ExecutionContext): Promise<SyncResult> {
    // SECURITY: Runtime validation - double-check for dangerous patterns
    // This catches any patterns that might have been missed or smuggled in
    const dangerousPatterns = [
      /\bglobalThis\b/, /\bglobal\b(?!\.)/, /\bprocess\b/, /\brequire\s*\(/,
      /\beval\s*\(/, /\bFunction\s*\(/, /__proto__/, /\.constructor\b/,
      /\bReflect\b/, /\bProxy\b/, /\bimport\s*\(/,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error('SECURITY: Dangerous pattern detected in code. Execution blocked.');
      }
    }
    
    // Create a safe execution environment
    // Note: For production, use vm2 or isolated-vm for proper sandboxing
    const sandbox = {
      fetch: fetch,
      console: {
        log: (...args: any[]) => this.logger.log(`[Custom Code] ${args.join(' ')}`),
        error: (...args: any[]) => this.logger.error(`[Custom Code] ${args.join(' ')}`),
        warn: (...args: any[]) => this.logger.warn(`[Custom Code] ${args.join(' ')}`),
      },
      context,
      JSON,
      Date,
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Promise,
      setTimeout: undefined, // Disabled for safety
      setInterval: undefined, // Disabled for safety
    };

    try {
      // Wrap code to capture the sync function
      const wrappedCode = `
        ${code}
        
        // Execute sync and return result
        if (typeof sync === 'function') {
          return sync(context);
        } else if (typeof module !== 'undefined' && module.exports && typeof module.exports.sync === 'function') {
          return module.exports.sync(context);
        } else {
          throw new Error('No sync function found');
        }
      `;

      // Create function with limited scope
      const fn = new Function('fetch', 'console', 'context', 'JSON', 'Date', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'module', wrappedCode);

      const module = { exports: {} };
      const result = await fn(
        sandbox.fetch,
        sandbox.console,
        sandbox.context,
        sandbox.JSON,
        sandbox.Date,
        sandbox.Math,
        sandbox.Array,
        sandbox.Object,
        sandbox.String,
        sandbox.Number,
        sandbox.Boolean,
        sandbox.Promise,
        module,
      );

      return result || { evidence: [] };

    } catch (error: any) {
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
    integrationId: string,
  ): Promise<ExecutionContext> {
    // Decrypt stored authConfig for use in execution context
    const decryptedAuthConfig = config.authConfig ? this.decryptAuthConfig(config.authConfig) : null;
    const authHeaders = config.authType && decryptedAuthConfig
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
  private async getAuthHeaders(authType: string, authConfig: Record<string, any>): Promise<Record<string, string>> {
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
          const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
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

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth2 token request failed: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Create evidence from sync results
   */
  private async createEvidenceFromResults(
    organizationId: string,
    userId: string,
    integrationId: string,
    integrationName: string,
    evidenceItems: EvidenceItem[],
  ): Promise<number> {
    let created = 0;
    const timestamp = Date.now();

    for (let i = 0; i < evidenceItems.length; i++) {
      const item = evidenceItems[i];

      try {
        const jsonData = JSON.stringify(item.data, null, 2);
        const storagePath = `integrations/custom/${integrationId}/${timestamp}-${i}.json`;

        // Save to storage
        await this.storage.upload(
          Buffer.from(jsonData, 'utf-8'),
          storagePath,
          { contentType: 'application/json' },
        );

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
  private maskAuthConfig(authType: string | null, authConfig: Record<string, any> | null): Record<string, any> | null {
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



