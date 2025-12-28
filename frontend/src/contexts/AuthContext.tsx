import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Keycloak from 'keycloak-js';
import { setErrorTrackingUser, addBreadcrumb } from '@/lib/errorTracking';
import { secureStorage, STORAGE_KEYS } from '@/lib/secureStorage';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

interface JWTPayload {
  sub?: string;  // Optional - may not be present in access tokens
  sid?: string;  // Session ID - present in Keycloak tokens
  exp: number;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  roles?: string[];
  realm_access?: {
    roles?: string[];
  };
  organization_id?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
  devLogin?: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'gigachad-grc',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'grc-frontend',
};

// Suppress Keycloak config log in development
// // Suppress Keycloak config log in development
// console.log('Keycloak config:', keycloakConfig);

let keycloak: Keycloak | null = null;
let initPromise: Promise<boolean> | null = null;
let initStarted = false;

function getKeycloak(): Keycloak {
  if (!keycloak) {
    keycloak = new Keycloak(keycloakConfig);
  }
  return keycloak;
}

// Reset keycloak state - useful for fixing stuck states
function resetKeycloakState() {
  initPromise = null;
  initStarted = false;
}

/**
 * Safely decode a JWT token with proper validation and error handling
 * @param token - The JWT token string to decode
 * @param options - Optional configuration for validation
 * @returns The decoded payload object, or null if token is invalid
 */
function safeDecodeJWT(token: string, options: { requireSub?: boolean } = {}): JWTPayload | null {
  const { requireSub = false } = options;
  try {
    // Validate token structure - JWT should have exactly 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    // Get the payload (second part)
    const payload = parts[1];
    
    // Validate base64 string before decoding
    if (!payload || payload.length === 0) {
      console.error('Invalid JWT token: Empty payload');
      return null;
    }

    // Decode the base64 payload
    // JWT uses URL-safe base64 encoding, convert to standard base64 first
    let decoded: string;
    try {
      // Convert URL-safe base64 to standard base64
      const standardBase64 = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        // Pad with = if necessary
        .padEnd(payload.length + (4 - payload.length % 4) % 4, '=');
      decoded = atob(standardBase64);
    } catch (base64Error) {
      console.error('Invalid JWT token: Base64 decoding failed', base64Error);
      return null;
    }
    
    // Parse the JSON payload
    try {
      const parsed = JSON.parse(decoded);
      
      // Validate required JWT fields - sub is optional for access tokens
      if (requireSub && (!parsed.sub || typeof parsed.sub !== 'string')) {
        console.error('Invalid JWT token: Missing or invalid subject (sub) field');
        return null;
      }
      
      if (!parsed.exp || typeof parsed.exp !== 'number') {
        console.error('Invalid JWT token: Missing or invalid expiration (exp) field');
        return null;
      }
      
      return parsed as JWTPayload;
    } catch (jsonError) {
      console.error('Invalid JWT token: JSON parsing failed');
      return null;
    }
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const loadUserProfile = useCallback(async (kc: Keycloak) => {
    try {
      const profile = await kc.loadUserProfile();
      const tokenParsed = kc.tokenParsed as any;

      console.log('Token parsed:', tokenParsed);
      console.log('Profile:', profile);

      const role = tokenParsed?.roles?.[0] || 
        tokenParsed?.realm_access?.roles?.find(
          (r: string) => ['admin', 'compliance_manager', 'auditor', 'viewer'].includes(r)
        ) || 'viewer';

      const userId = kc.subject || '';
      const organizationId = tokenParsed?.organization_id || 'default';
      
      const newUser = {
        id: userId,
        email: profile.email || '',
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email || '',
        role,
        organizationId,
      };
      setUser(newUser);
      
      // Set user for error tracking (Sentry)
      setErrorTrackingUser({
        id: userId,
        email: profile.email || undefined,
        organizationId,
      });
      addBreadcrumb({ category: 'auth', message: 'User logged in' });

      // Store in secure storage for API interceptor
      secureStorage.set(STORAGE_KEYS.USER_ID, userId);
      secureStorage.set(STORAGE_KEYS.ORGANIZATION_ID, organizationId);
      if (kc.token) {
        secureStorage.set(STORAGE_KEYS.TOKEN, kc.token);
      }

      setToken(kc.token || null);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Still set authenticated even if profile fails
      setToken(kc.token || null);
    }
  }, []);

  useEffect(() => {
    const initKeycloak = async () => {
      console.log('🚀 Starting Keycloak initialization...');
      
      // Check if dev auth is enabled (dev mode OR VITE_ENABLE_DEV_AUTH=true)
      const isDevAuthEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';
      
      // Check for existing dev auth session first
      if (isDevAuthEnabled) {
        console.log('📝 Checking for existing dev auth session...');
        const storedAuth = localStorage.getItem('grc-dev-auth');
        if (storedAuth) {
          try {
            const devUser = JSON.parse(storedAuth) as User;
            console.log('✅ Dev auth found, restoring session');
            setUser(devUser);
            setToken('dev-token-not-for-production');
            setIsAuthenticated(true);
            secureStorage.set(STORAGE_KEYS.USER_ID, devUser.id);
            secureStorage.set(STORAGE_KEYS.ORGANIZATION_ID, devUser.organizationId);
            secureStorage.set(STORAGE_KEYS.TOKEN, 'dev-token-not-for-production');
            setIsLoading(false);
            console.log('✅ Loading set to false (dev auth)');
            return;
          } catch (e) {
            console.error('❌ Failed to restore dev auth:', e);
            localStorage.removeItem('grc-dev-auth');
          }
        }
      }
      
      // Check for existing SSO session (token stored from previous login)
      const storedToken = secureStorage.get(STORAGE_KEYS.TOKEN);
      if (storedToken && storedToken !== 'dev-token-not-for-production') {
        console.log('📝 Found stored SSO token, attempting to restore session...');
        // Decode token to check if it's still valid
        const payload = safeDecodeJWT(storedToken);
        
        if (payload) {
          const expiresAt = payload.exp * 1000;
          const now = Date.now();
          
          if (expiresAt > now) {
            console.log('✅ Token still valid, restoring session');
            // Extract role - check top-level roles array first, then realm_access.roles
            const roles = payload.roles || payload.realm_access?.roles || [];
            const role = roles.includes('admin') ? 'admin' : (roles[0] || 'viewer');
            
            const user: User = {
              id: payload.sub,
              email: payload.email || '',
              name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || payload.preferred_username || '',
              role: role,
              organizationId: secureStorage.get(STORAGE_KEYS.ORGANIZATION_ID) || 'default-org',
            };
            
            setUser(user);
            setToken(storedToken);
            setIsAuthenticated(true);
            setIsLoading(false);
            console.log('✅ SSO session restored successfully');
            return;
          } else {
            console.log('⚠️ Stored token expired, clearing...');
            secureStorage.clearAll();
          }
        } else {
          console.error('❌ Failed to decode stored token, clearing...');
          secureStorage.clearAll();
        }
      }

      // Check if this is a callback from Keycloak (has code in URL params or state in hash)
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasCode = urlParams.has('code') || hashParams.has('code');
      const hasState = hashParams.has('state');
      const hasAccessToken = hashParams.has('access_token');
      const hasError = urlParams.has('error') || hashParams.has('error');
      
      // If there's an error in the hash, extract and display it
      if (hashParams.has('error')) {
        const error = hashParams.get('error');
        const errorDesc = decodeURIComponent(hashParams.get('error_description') || '');
        console.error('🔴 Keycloak error from hash:', error, errorDesc);
        // Clear the hash
        window.history.replaceState({}, document.title, '/login?error=' + error);
        setIsLoading(false);
        return;
      }
      
      // If we have an access_token in the hash (implicit flow), parse it directly
      if (hasAccessToken) {
        console.log('🎉 Found access_token in URL, processing implicit flow response...');
        const accessToken = hashParams.get('access_token');
        const idToken = hashParams.get('id_token');
        
        if (accessToken) {
          // Use id_token for user identity (it has 'sub' field), access_token for API calls
          // Keycloak access tokens may not include 'sub' field
          const tokenForUserInfo = idToken || accessToken;
          const payload = safeDecodeJWT(tokenForUserInfo, { requireSub: !!idToken });
          
          if (payload) {
            console.log('📋 Token payload:', payload);
            
            // Extract role - check top-level roles array first, then realm_access.roles
            const roles = payload.roles || payload.realm_access?.roles || [];
            const role = roles.includes('admin') ? 'admin' : (roles[0] || 'viewer');
            
            // For user ID, prefer sub from id_token, fall back to sid (session id) or generate from email
            const userId = payload.sub || payload.sid || `user-${payload.email || payload.preferred_username || 'unknown'}`;
            
            const user: User = {
              id: userId,
              email: payload.email || '',
              name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || payload.preferred_username || '',
              role: role,
              organizationId: payload.organization_id || 'default-org',
            };
            
            setUser(user);
            setToken(accessToken);  // Always use access_token for API calls
            setIsAuthenticated(true);
            
            // Store in secure storage
            secureStorage.set(STORAGE_KEYS.USER_ID, user.id);
            secureStorage.set(STORAGE_KEYS.ORGANIZATION_ID, user.organizationId);
            secureStorage.set(STORAGE_KEYS.TOKEN, accessToken);
            
            // Clean up URL and navigate to dashboard
            // Use window.location.href to trigger full navigation since we're outside React Router
            console.log('✅ Implicit flow login successful! Redirecting to dashboard...');
            setIsLoading(false);
            
            // Small delay to ensure state updates propagate before navigation
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 100);
            return;
          } else {
            console.error('❌ Failed to decode access token - invalid token format');
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Determine if we have an auth callback (code in query OR state in hash from keycloak-js)
      const hasAuthCallback = hasCode || hasState;
      
      console.log('🔍 Auth callback check:', { hasCode, hasState, hasError, url: window.location.href });

      // Initialize Keycloak (required for login to work)
      const kc = getKeycloak();
      
      // Prevent double initialization
      if (initStarted) {
        console.log('⚠️ Keycloak init already started, waiting...');
        return;
      }
      initStarted = true;

      // If no auth callback, just initialize Keycloak without checking session
      if (!hasAuthCallback && !hasError) {
        console.log('📋 No auth callback, initializing Keycloak for login...');
        try {
          await kc.init({
            checkLoginIframe: false,
            flow: 'implicit', // Use implicit flow to avoid PKCE sessionStorage issues
          });
          console.log('✅ Keycloak ready for login');
        } catch (e) {
          console.error('❌ Keycloak init failed:', e);
        }
        setIsLoading(false);
        return;
      }

      // We have an auth callback - need to process it with Keycloak
      console.log('🔄 Processing auth callback...');
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('⏱️ Keycloak initialization timeout!');
        setIsLoading(false);
        resetKeycloakState();
        window.history.replaceState({}, document.title, '/login?error=timeout');
      }, 10000);

      try {
        console.log('🚀 Processing auth callback with Keycloak...');
        
        // Debug: Check what's in sessionStorage for PKCE
        const kcCsrfToken = sessionStorage.getItem('kc-csrf-token');
        console.log('📦 Session storage kc-csrf-token:', kcCsrfToken);
        console.log('📦 All sessionStorage keys:', Object.keys(sessionStorage));
        
        // Set up error handler before init
        kc.onAuthError = (errorData) => {
          console.error('🔴 Keycloak onAuthError:', errorData);
        };
        
        // Initialize Keycloak to process the token from URL fragment
        initPromise = kc.init({
          checkLoginIframe: false,
          flow: 'implicit', // Use implicit flow to avoid PKCE sessionStorage issues
        });

        const authenticated = await initPromise;
        clearTimeout(timeoutId);
        console.log('✅ Keycloak initialized, authenticated:', authenticated);
        
        // Clean up URL after successful auth
        if (authenticated) {
          window.history.replaceState({}, document.title, '/dashboard');
          await loadUserProfile(kc);
        } else {
          window.history.replaceState({}, document.title, '/login?error=auth_failed');
        }

        setIsAuthenticated(authenticated);

        // Token refresh
        kc.onTokenExpired = () => {
          console.log('Token expired, refreshing...');
          kc.updateToken(30).then((refreshed) => {
            if (refreshed) {
              console.log('Token refreshed');
              setToken(kc.token || null);
            }
          }).catch(() => {
            console.error('Failed to refresh token');
            setIsAuthenticated(false);
            setUser(null);
            setToken(null);
          });
        };

        // Handle auth success callback
        kc.onAuthSuccess = () => {
          console.log('Auth success');
          loadUserProfile(kc);
          setIsAuthenticated(true);
        };

        kc.onAuthError = (error) => {
          console.error('Auth error:', error);
        };

      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Keycloak initialization failed:', error);
        resetKeycloakState();
      } finally {
        setIsLoading(false);
        console.log('✅ Loading set to false (finally block)');
      }
    };

    initKeycloak();
  }, [loadUserProfile]);

  const login = useCallback(() => {
    const kc = getKeycloak();
    console.log('🔐 Login clicked, Keycloak instance:', kc);
    console.log('🔐 Redirecting to Keycloak...');
    // Redirect back to root so Keycloak can process the callback
    kc.login({
      redirectUri: window.location.origin + '/',
    });
  }, []);

  const logout = useCallback(() => {
    const kc = getKeycloak();
    // Clear dev login state and user info
    localStorage.removeItem('grc-dev-auth');
    localStorage.removeItem('userId');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    
    // Clear user from error tracking
    setErrorTrackingUser(null);
    addBreadcrumb({ category: 'auth', message: 'User logged out' });
    
    // Only call keycloak logout if we were authenticated via keycloak
    if (kc.authenticated) {
      kc.logout({
        redirectUri: window.location.origin,
      });
    }
  }, []);

  // Dev login bypass - available when VITE_ENABLE_DEV_AUTH is true (dev or staging mode)
  const isDevAuthEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';
  
  const devLogin = useCallback(() => {
    if (isDevAuthEnabled) {
      console.log('Dev login activated');
      const devUser: User = {
        id: '8f88a42b-e799-455c-b68a-308d7d2e9aa4', // John Doe - seeded user
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'admin',
        organizationId: '8924f0c1-7bb1-4be8-84ee-ad8725c712bf',
      };
      setUser(devUser);
      setToken('dev-token-not-for-production');
      setIsAuthenticated(true);
      // Persist dev auth state and user info for API calls
      localStorage.setItem('grc-dev-auth', JSON.stringify(devUser));
      localStorage.setItem('userId', devUser.id);
      localStorage.setItem('organizationId', devUser.organizationId);
    }
  }, [isDevAuthEnabled]);

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const rolePermissions: Record<string, string[]> = {
      compliance_manager: [
        'controls:view', 'controls:create', 'controls:update',
        'evidence:view', 'evidence:upload', 'evidence:approve',
        'frameworks:view', 'frameworks:manage',
        'policies:view', 'policies:create', 'policies:update', 'policies:approve',
        'integrations:view', 'integrations:manage',
      ],
      auditor: [
        'controls:view', 'evidence:view', 'frameworks:view', 'policies:view',
      ],
      viewer: [
        'controls:view', 'evidence:view', 'frameworks:view', 'policies:view',
      ],
    };

    return rolePermissions[user.role]?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        login,
        logout,
        devLogin: isDevAuthEnabled ? devLogin : undefined,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

