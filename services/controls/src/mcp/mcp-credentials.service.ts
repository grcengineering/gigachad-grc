import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface EncryptedData {
  iv: string;
  encrypted: string;
  authTag: string;
  salt?: string; // SECURITY: Random salt per encryption (optional for backwards compatibility)
}

interface MCPCredentialRecord {
  serverId: string;
  templateId: string;
  serverName: string;
  encryptedEnv: string;
  configuredIntegrations: string[];
  createdAt: Date;
  createdBy: string;
  lastUpdated: Date;
}

@Injectable()
export class MCPCredentialsService {
  private readonly logger = new Logger(MCPCredentialsService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: string;
  
  // In-memory cache for decrypted credentials (never persisted)
  private credentialsCache: Map<string, Record<string, string>> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Use dedicated MCP encryption key or fall back to main encryption key
    const mcpKey = this.configService.get<string>('MCP_ENCRYPTION_KEY');
    const mainKey = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (mcpKey) {
      this.encryptionKey = mcpKey;
    } else if (mainKey) {
      this.encryptionKey = mainKey;
    } else {
      throw new Error('ENCRYPTION_KEY environment variable is required for MCP credential storage');
    }

    if (this.encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * SECURITY: Uses random salt per encryption to strengthen key derivation
   */
  private encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    // SECURITY FIX: Generate random salt per encryption instead of using hardcoded salt
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, salt, 32);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex'), // Store salt with encrypted data
    };
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(data: EncryptedData): string {
    try {
      // SECURITY: Use stored salt if available, fall back to legacy salt for backwards compatibility
      const salt = data.salt ? Buffer.from(data.salt, 'hex') : 'mcp-salt';
      const key = crypto.scryptSync(this.encryptionKey, salt, 32);
      const iv = Buffer.from(data.iv, 'hex');
      const authTag = Buffer.from(data.authTag, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt MCP credentials', error);
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Store encrypted credentials for an MCP server
   */
  async storeCredentials(
    serverId: string,
    templateId: string,
    serverName: string,
    env: Record<string, string>,
    configuredIntegrations: string[],
    createdBy: string,
  ): Promise<void> {
    // Filter to only store sensitive credentials (keys, tokens, secrets, passwords)
    const sensitiveKeys = Object.keys(env).filter(key => 
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('credential')
    );

    const sensitiveEnv: Record<string, string> = {};
    for (const key of sensitiveKeys) {
      if (env[key]) {
        sensitiveEnv[key] = env[key];
      }
    }

    // Encrypt the sensitive environment variables
    const encryptedData = this.encrypt(JSON.stringify(sensitiveEnv));
    const encryptedEnvString = JSON.stringify(encryptedData);

    // Store in database using raw query (MCP credentials table may not exist in schema)
    try {
      await this.prisma.$executeRaw`
        INSERT INTO mcp_credentials (
          server_id, 
          template_id, 
          server_name,
          encrypted_env, 
          configured_integrations,
          created_at,
          created_by,
          last_updated
        ) VALUES (
          ${serverId},
          ${templateId},
          ${serverName},
          ${encryptedEnvString},
          ${JSON.stringify(configuredIntegrations)},
          NOW(),
          ${createdBy},
          NOW()
        )
        ON CONFLICT (server_id) 
        DO UPDATE SET 
          encrypted_env = ${encryptedEnvString},
          configured_integrations = ${JSON.stringify(configuredIntegrations)},
          last_updated = NOW()
      `;
      
      // Cache the decrypted credentials
      this.credentialsCache.set(serverId, sensitiveEnv);
      
      this.logger.log(`Stored encrypted credentials for MCP server: ${serverId}`);
    } catch {
      // If table doesn't exist, just cache in memory
      this.logger.warn('MCP credentials table not found, using in-memory storage only');
      this.credentialsCache.set(serverId, sensitiveEnv);
    }
  }

  /**
   * Retrieve and decrypt credentials for an MCP server
   */
  async getCredentials(serverId: string): Promise<Record<string, string> | null> {
    // Check cache first
    if (this.credentialsCache.has(serverId)) {
      return this.credentialsCache.get(serverId) || null;
    }

    try {
      const result = await this.prisma.$queryRaw<Array<{ encrypted_env: string }>>`
        SELECT encrypted_env FROM mcp_credentials WHERE server_id = ${serverId}
      `;

      if (result.length === 0) {
        return null;
      }

      const encryptedData: EncryptedData = JSON.parse(result[0].encrypted_env);
      const decrypted = this.decrypt(encryptedData);
      const credentials = JSON.parse(decrypted);

      // Cache for future use
      this.credentialsCache.set(serverId, credentials);

      return credentials;
    } catch (error) {
      this.logger.warn(`Failed to retrieve credentials for ${serverId}:`, error);
      return null;
    }
  }

  /**
   * Delete credentials for an MCP server
   */
  async deleteCredentials(serverId: string): Promise<void> {
    this.credentialsCache.delete(serverId);

    try {
      await this.prisma.$executeRaw`
        DELETE FROM mcp_credentials WHERE server_id = ${serverId}
      `;
      this.logger.log(`Deleted credentials for MCP server: ${serverId}`);
    } catch {
      // Table might not exist
      this.logger.warn('Could not delete from mcp_credentials table');
    }
  }

  /**
   * Get all stored MCP server configurations (without decrypted credentials)
   */
  async getAllServerConfigs(): Promise<MCPCredentialRecord[]> {
    try {
      const results = await this.prisma.$queryRaw<MCPCredentialRecord[]>`
        SELECT 
          server_id as "serverId",
          template_id as "templateId",
          server_name as "serverName",
          configured_integrations as "configuredIntegrations",
          created_at as "createdAt",
          created_by as "createdBy",
          last_updated as "lastUpdated"
        FROM mcp_credentials
        ORDER BY created_at DESC
      `;
      
      return results.map(r => ({
        ...r,
        configuredIntegrations: typeof r.configuredIntegrations === 'string' 
          ? JSON.parse(r.configuredIntegrations) 
          : r.configuredIntegrations,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Mask credentials for display (showing only first/last few characters)
   */
  maskCredential(value: string): string {
    if (!value || value.length < 8) {
      return '••••••••';
    }
    return `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`;
  }

  /**
   * Get masked credentials for audit display
   */
  async getMaskedCredentials(serverId: string): Promise<Record<string, string>> {
    const credentials = await this.getCredentials(serverId);
    if (!credentials) {
      return {};
    }

    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      masked[key] = this.maskCredential(value);
    }
    return masked;
  }

  /**
   * Validate that required credentials exist for a server
   */
  async validateCredentials(serverId: string, requiredKeys: string[]): Promise<{
    valid: boolean;
    missing: string[];
  }> {
    const credentials = await this.getCredentials(serverId);
    if (!credentials) {
      return { valid: false, missing: requiredKeys };
    }

    const missing = requiredKeys.filter(key => !credentials[key]);
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Clear all cached credentials from memory
   */
  clearCache(): void {
    this.credentialsCache.clear();
    this.logger.log('Cleared MCP credentials cache');
  }

  /**
   * Rotate encryption key (re-encrypt all credentials with new key)
   * 
   * IMPORTANT: After calling this method, you MUST update the ENCRYPTION_KEY
   * or MCP_ENCRYPTION_KEY environment variable to the new key and restart
   * the service. Otherwise, credentials will be unreadable.
   * 
   * @param newKey - The new encryption key (must be at least 32 characters)
   * @returns Summary of the rotation operation
   */
  async rotateEncryptionKey(newKey: string): Promise<{
    success: boolean;
    credentialsRotated: number;
    errors: string[];
  }> {
    // Validate new key
    if (!newKey || newKey.length < 32) {
      throw new Error('New encryption key must be at least 32 characters long');
    }

    if (newKey === this.encryptionKey) {
      throw new Error('New encryption key must be different from the current key');
    }

    this.logger.log('Starting encryption key rotation...');
    
    const errors: string[] = [];
    let credentialsRotated = 0;

    try {
      // Get all stored credentials
      const allCredentials = await this.getAllStoredCredentials();
      
      if (allCredentials.length === 0) {
        this.logger.log('No credentials to rotate');
        return { success: true, credentialsRotated: 0, errors: [] };
      }

      this.logger.log(`Found ${allCredentials.length} credential sets to rotate`);

      // Process each credential set
      for (const credential of allCredentials) {
        try {
          // Decrypt with old key
          const decrypted = await this.getCredentials(credential.serverId);
          
          if (!decrypted) {
            errors.push(`Could not decrypt credentials for ${credential.serverId}`);
            continue;
          }

          // Re-encrypt with new key
          const reEncrypted = this.encryptWithKey(JSON.stringify(decrypted), newKey);
          const reEncryptedString = JSON.stringify(reEncrypted);

          // Update in database
          await this.prisma.$executeRaw`
            UPDATE mcp_credentials 
            SET encrypted_env = ${reEncryptedString},
                last_updated = NOW()
            WHERE server_id = ${credential.serverId}
          `;

          credentialsRotated++;
          this.logger.log(`Rotated credentials for server: ${credential.serverId}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to rotate ${credential.serverId}: ${errorMessage}`);
          this.logger.error(`Failed to rotate credentials for ${credential.serverId}`, error);
        }
      }

      // Clear the cache - credentials need to be re-decrypted with new key
      this.clearCache();

      if (errors.length > 0) {
        this.logger.warn(`Key rotation completed with ${errors.length} errors`);
      } else {
        this.logger.log(`Key rotation completed successfully. ${credentialsRotated} credentials rotated.`);
      }

      this.logger.warn(
        'IMPORTANT: Update ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable to the new key and restart the service!'
      );

      return {
        success: errors.length === 0,
        credentialsRotated,
        errors,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Key rotation failed', error);
      throw new Error(`Key rotation failed: ${errorMessage}`);
    }
  }

  /**
   * Get all stored credentials from database (for rotation)
   */
  private async getAllStoredCredentials(): Promise<Array<{ serverId: string; encryptedEnv: string }>> {
    try {
      const results = await this.prisma.$queryRaw<Array<{ server_id: string; encrypted_env: string }>>`
        SELECT server_id, encrypted_env FROM mcp_credentials
      `;
      
      return results.map(r => ({
        serverId: r.server_id,
        encryptedEnv: r.encrypted_env,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Encrypt with a specific key (used during key rotation)
   * SECURITY: Uses random salt per encryption
   */
  private encryptWithKey(text: string, key: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    // SECURITY FIX: Generate random salt per encryption
    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.scryptSync(key, salt, 32);
    const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex'), // Store salt with encrypted data
    };
  }

  /**
   * Verify that credentials can be decrypted with the current key
   * Useful for health checks and troubleshooting
   */
  async verifyCredentialIntegrity(): Promise<{
    total: number;
    valid: number;
    invalid: string[];
  }> {
    const allCredentials = await this.getAllStoredCredentials();
    const invalid: string[] = [];

    for (const credential of allCredentials) {
      try {
        const encryptedData: EncryptedData = JSON.parse(credential.encryptedEnv);
        this.decrypt(encryptedData);
      } catch {
        invalid.push(credential.serverId);
      }
    }

    return {
      total: allCredentials.length,
      valid: allCredentials.length - invalid.length,
      invalid,
    };
  }
}




