import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Use SHA-256 to ensure consistent key length
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iterations = 100000;
  
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    KEY_LENGTH,
    'sha256'
  );
  
  return `${iterations}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  
  if (parts.length !== 3) {
    return false;
  }
  
  const iterations = parseInt(parts[0], 10);
  const salt = Buffer.from(parts[1], 'hex');
  const hash = Buffer.from(parts[2], 'hex');
  
  const verifyHash = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    KEY_LENGTH,
    'sha256'
  );
  
  return crypto.timingSafeEqual(hash, verifyHash);
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate a 32-byte random key
  const keyBytes = crypto.randomBytes(32);
  const key = `grc_${keyBytes.toString('base64url')}`;
  
  // Hash the key for storage
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  // Get first 8 characters as prefix for identification
  const prefix = key.substring(4, 12);
  
  return { key, hash, prefix };
}

/**
 * Verify an API key against its hash
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/**
 * Generate a random token (for password reset, email verification, etc.)
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a webhook signing secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sign a webhook payload
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify a webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds = 300
): boolean {
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));
  
  if (!timestampPart || !signaturePart) {
    return false;
  }
  
  const timestamp = parseInt(timestampPart.substring(2), 10);
  const receivedSignature = signaturePart.substring(3);
  
  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }
  
  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );
}



