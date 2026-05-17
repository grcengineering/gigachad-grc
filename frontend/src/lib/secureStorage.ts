/**
 * Secure Storage Utility
 * 
 * Provides secure storage mechanisms for sensitive data like tokens.
 * In production, tokens should be stored in httpOnly cookies set by the server.
 * This utility provides a fallback for development and abstracts storage operations.
 */

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: 'grc_token',
  REFRESH_TOKEN: 'grc_refresh_token',
  USER_ID: 'grc_user_id',
  ORGANIZATION_ID: 'grc_org_id',
  SESSION_EXPIRY: 'grc_session_expiry',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Check if we're in a secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Check if cookies are available
 */
export function areCookiesEnabled(): boolean {
  try {
    document.cookie = 'grc_cookie_test=1';
    const cookiesEnabled = document.cookie.indexOf('grc_cookie_test') !== -1;
    document.cookie = 'grc_cookie_test=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
    return cookiesEnabled;
  } catch {
    return false;
  }
}

/**
 * Set a secure cookie (for non-httpOnly data only)
 * Note: Auth tokens should be set as httpOnly by the server
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number; // in seconds
    path?: string;
    sameSite?: 'Strict' | 'Lax' | 'None';
    secure?: boolean;
  } = {}
): void {
  const {
    maxAge = 86400, // 24 hours default
    path = '/',
    sameSite = 'Strict',
    secure = isSecureContext() && window.location.protocol === 'https:',
  } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; path=${path}`;
  cookie += `; max-age=${maxAge}`;
  cookie += `; samesite=${sameSite}`;
  
  if (secure) {
    cookie += '; secure';
  }

  document.cookie = cookie;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === encodeURIComponent(name)) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, path: string = '/'): void {
  document.cookie = `${encodeURIComponent(name)}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Secure storage class that abstracts token storage
 * Uses sessionStorage in development for tokens (more secure than localStorage)
 * In production with proper backend, tokens should be httpOnly cookies
 */
class SecureStorage {
  private useSessionStorage: boolean;

  constructor() {
    // Use sessionStorage for tokens - they're cleared when the tab closes
    this.useSessionStorage = true;
  }

  /**
   * Store a value securely
   */
  set(key: StorageKey, value: string): void {
    try {
      if (this.useSessionStorage) {
        sessionStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Failed to store value:', error);
    }
  }

  /**
   * Retrieve a stored value
   */
  get(key: StorageKey): string | null {
    try {
      // Check sessionStorage first, then localStorage for migration
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) return sessionValue;
      
      const localValue = localStorage.getItem(key);
      if (localValue) {
        // Migrate from localStorage to sessionStorage
        sessionStorage.setItem(key, localValue);
        localStorage.removeItem(key);
        return localValue;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to retrieve value:', error);
      return null;
    }
  }

  /**
   * Remove a stored value
   */
  remove(key: StorageKey): void {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key); // Also clean localStorage
    } catch (error) {
      console.error('Failed to remove value:', error);
    }
  }

  /**
   * Clear all GRC-related stored values
   */
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.remove(key);
    });
  }

  /**
   * Check if we have a valid session
   */
  hasValidSession(): boolean {
    const token = this.get(STORAGE_KEYS.TOKEN);
    const expiry = this.get(STORAGE_KEYS.SESSION_EXPIRY);
    
    if (!token) return false;
    if (!expiry) return true; // No expiry set, assume valid
    
    return Date.now() < parseInt(expiry, 10);
  }

  /**
   * Set session with expiry
   */
  setSession(token: string, expiresIn: number): void {
    this.set(STORAGE_KEYS.TOKEN, token);
    this.set(STORAGE_KEYS.SESSION_EXPIRY, String(Date.now() + expiresIn * 1000));
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

/**
 * Returns the current authenticated organization ID, or null if none is
 * available. Reads from secureStorage first (the new path) and falls back to
 * a legacy localStorage key, which dev-login still writes (see AuthContext).
 *
 * Callers that get null here should fail loud (toast, log, or no-op) — do not
 * substitute a placeholder org ID; that pattern was the cause of PR #298/299.
 */
export function getCurrentOrgId(): string | null {
  return (
    secureStorage.get(STORAGE_KEYS.ORGANIZATION_ID) ||
    localStorage.getItem('organizationId') ||
    null
  );
}

// Legacy compatibility - these map to the secure storage
// Used during migration from direct localStorage usage
export const legacyStorageKeys = {
  token: 'token',
  userId: 'userId',
  organizationId: 'organizationId',
} as const;

/**
 * Migrate from legacy localStorage keys to secure storage
 * Call this on app initialization
 */
export function migrateLegacyStorage(): void {
  // Migrate token
  const legacyToken = localStorage.getItem(legacyStorageKeys.token);
  if (legacyToken) {
    secureStorage.set(STORAGE_KEYS.TOKEN, legacyToken);
    localStorage.removeItem(legacyStorageKeys.token);
  }

  // Migrate userId
  const legacyUserId = localStorage.getItem(legacyStorageKeys.userId);
  if (legacyUserId) {
    secureStorage.set(STORAGE_KEYS.USER_ID, legacyUserId);
    localStorage.removeItem(legacyStorageKeys.userId);
  }

  // Migrate organizationId
  const legacyOrgId = localStorage.getItem(legacyStorageKeys.organizationId);
  if (legacyOrgId) {
    secureStorage.set(STORAGE_KEYS.ORGANIZATION_ID, legacyOrgId);
    localStorage.removeItem(legacyStorageKeys.organizationId);
  }
}

export default secureStorage;

