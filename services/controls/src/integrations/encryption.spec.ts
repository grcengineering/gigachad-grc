import * as crypto from 'crypto';

/**
 * Tests for encryption format compatibility
 * These tests verify that the new encryption format with random salt
 * is backwards compatible with the legacy hardcoded salt format.
 */

const ENCRYPTION_KEY = 'test-encryption-key-at-least-32-chars-long';
const ALGORITHM = 'aes-256-gcm';

/**
 * Legacy encrypt function (old format: iv:authTag:encrypted)
 * Using hardcoded 'salt'
 */
function legacyEncrypt(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32); // Hardcoded salt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Old format: iv:authTag:encrypted (3 parts)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * New encrypt function (new format: iv:authTag:salt:encrypted)
 * Using random salt per encryption
 */
function newEncrypt(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(16); // Random salt
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // New format: iv:authTag:salt:encrypted (4 parts)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${salt.toString('hex')}:${encrypted}`;
}

/**
 * Backwards-compatible decrypt function
 * Handles both old (3-part) and new (4-part) formats
 */
function backwardsCompatibleDecrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  const parts = encryptedText.split(':');
  
  if (parts.length === 3) {
    // Legacy format without salt
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32); // Legacy salt
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
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
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } else {
    // Not encrypted or invalid format
    return encryptedText;
  }
}

describe('Encryption Backwards Compatibility', () => {
  const testData = 'sensitive-api-key-12345';

  describe('new format encryption', () => {
    it('should produce 4-part encrypted string with random salt', () => {
      const encrypted = newEncrypt(testData);
      const parts = encrypted.split(':');
      
      expect(parts.length).toBe(4);
      expect(parts[0]).toHaveLength(32); // IV (16 bytes = 32 hex chars)
      expect(parts[1]).toHaveLength(32); // AuthTag (16 bytes = 32 hex chars)
      expect(parts[2]).toHaveLength(32); // Salt (16 bytes = 32 hex chars)
      expect(parts[3].length).toBeGreaterThan(0); // Encrypted data
    });

    it('should produce different output for same input (random salt)', () => {
      const encrypted1 = newEncrypt(testData);
      const encrypted2 = newEncrypt(testData);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should be decryptable with backwards-compatible decrypt', () => {
      const encrypted = newEncrypt(testData);
      const decrypted = backwardsCompatibleDecrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });
  });

  describe('legacy format encryption', () => {
    it('should produce 3-part encrypted string with hardcoded salt', () => {
      const encrypted = legacyEncrypt(testData);
      const parts = encrypted.split(':');
      
      expect(parts.length).toBe(3);
      expect(parts[0]).toHaveLength(32); // IV
      expect(parts[1]).toHaveLength(32); // AuthTag
      expect(parts[2].length).toBeGreaterThan(0); // Encrypted data
    });

    it('should be decryptable with backwards-compatible decrypt', () => {
      const encrypted = legacyEncrypt(testData);
      const decrypted = backwardsCompatibleDecrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });
  });

  describe('backwards compatibility', () => {
    it('should decrypt legacy format (3 parts) correctly', () => {
      // Simulate existing data encrypted with old format
      const legacyEncrypted = legacyEncrypt(testData);
      const decrypted = backwardsCompatibleDecrypt(legacyEncrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should decrypt new format (4 parts) correctly', () => {
      const newEncrypted = newEncrypt(testData);
      const decrypted = backwardsCompatibleDecrypt(newEncrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should return non-encrypted strings as-is', () => {
      const plainText = 'not-encrypted-data';
      const result = backwardsCompatibleDecrypt(plainText);
      
      expect(result).toBe(plainText);
    });

    it('should handle empty strings', () => {
      expect(backwardsCompatibleDecrypt('')).toBe('');
    });

    it('should handle strings with fewer than 3 colons as unencrypted', () => {
      const notEncrypted = 'some:data';
      const result = backwardsCompatibleDecrypt(notEncrypted);
      
      expect(result).toBe(notEncrypted);
    });

    it('should handle strings with more than 4 colons as unencrypted', () => {
      const notEncrypted = 'a:b:c:d:e:f';
      const result = backwardsCompatibleDecrypt(notEncrypted);
      
      expect(result).toBe(notEncrypted);
    });
  });

  describe('special characters', () => {
    const specialChars = [
      'api_key_with_special_!@#$%^&*()',
      'password with spaces',
      'key:with:colons',
      'unicode_こんにちは',
      'json_{"key":"value"}',
      'newline\n\ttabs',
    ];

    specialChars.forEach((testCase) => {
      it(`should encrypt and decrypt: ${testCase.substring(0, 20)}...`, () => {
        const encrypted = newEncrypt(testCase);
        const decrypted = backwardsCompatibleDecrypt(encrypted);
        
        expect(decrypted).toBe(testCase);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'x'.repeat(10000);
      const encrypted = newEncrypt(longString);
      const decrypted = backwardsCompatibleDecrypt(encrypted);
      
      expect(decrypted).toBe(longString);
    });

    it('should handle single character', () => {
      const encrypted = newEncrypt('a');
      const decrypted = backwardsCompatibleDecrypt(encrypted);
      
      expect(decrypted).toBe('a');
    });
  });
});

describe('MCP Credentials Encryption Format', () => {
  // Test the object-based format used by MCP credentials service
  
  interface EncryptedData {
    iv: string;
    encrypted: string;
    authTag: string;
    salt?: string;
  }

  function mcpEncryptWithRandomSalt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  function mcpDecryptBackwardsCompatible(data: EncryptedData): string {
    const salt = data.salt ? Buffer.from(data.salt, 'hex') : 'mcp-salt';
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  it('should encrypt with salt in object format', () => {
    const testData = 'mcp-credential-secret';
    const encrypted = mcpEncryptWithRandomSalt(testData);
    
    expect(encrypted.iv).toHaveLength(32);
    expect(encrypted.authTag).toHaveLength(32);
    expect(encrypted.salt).toHaveLength(32);
    expect(encrypted.encrypted.length).toBeGreaterThan(0);
  });

  it('should decrypt new format with salt', () => {
    const testData = 'mcp-credential-secret';
    const encrypted = mcpEncryptWithRandomSalt(testData);
    const decrypted = mcpDecryptBackwardsCompatible(encrypted);
    
    expect(decrypted).toBe(testData);
  });

  it('should decrypt legacy format without salt', () => {
    const testData = 'legacy-mcp-credential';
    
    // Simulate legacy encrypted data (no salt field)
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'mcp-salt', 32); // Legacy salt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const legacyData: EncryptedData = {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
      // No salt field - legacy format
    };
    
    const decrypted = mcpDecryptBackwardsCompatible(legacyData);
    
    expect(decrypted).toBe(testData);
  });
});
