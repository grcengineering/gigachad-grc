import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
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

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  /** Epoch ms when the SSO session expires (null if unknown or dev mode) */
  sessionExpiry: number | null;
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

function getKeycloak(): Keycloak {
  if (!keycloak) {
    keycloak = new Keycloak(keycloakConfig);
  }
  return keycloak;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);

  // BroadcastChannel for cross-tab auth synchronization
  const authChannel = useRef<BroadcastChannel | null>(null);

  // Set up cross-tab logout synchronization
  useEffect(() => {
    // Create broadcast channel for cross-tab auth sync
    authChannel.current = new BroadcastChannel('grc_auth_channel');

    authChannel.current.onmessage = (event) => {
      if (event.data.type === 'logout') {
        // Force logout on this tab when another tab logs out
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
    };

    return () => {
      authChannel.current?.close();
    };
  }, []);

  const loadUserProfile = useCallback(async (kc: Keycloak) => {
    try {
      const profile = await kc.loadUserProfile();
      const tokenParsed = kc.tokenParsed as any;

      // Token and profile logged only in development for debugging
      if (import.meta.env.DEV) {
        console.debug('Auth profile loaded for user:', profile.email);
      }

      const role =
        tokenParsed?.roles?.[0] ||
        tokenParsed?.realm_access?.roles?.find((r: string) =>
          ['admin', 'compliance_manager', 'auditor', 'viewer'].includes(r)
        ) ||
        'viewer';

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
      // Check for dev auth first
      const isDevMode = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';
      if (isDevMode) {
        const storedAuth = localStorage.getItem('grc-dev-auth');
        if (storedAuth) {
          try {
            const devUser = JSON.parse(storedAuth) as User;
            // Suppress dev auth session log
            // console.log('Restoring dev auth session');
            setUser(devUser);
            setToken('dev-token-not-for-production');
            setIsAuthenticated(true);
            // Ensure userId and organizationId are set for API calls
            secureStorage.set(STORAGE_KEYS.USER_ID, devUser.id);
            secureStorage.set(STORAGE_KEYS.ORGANIZATION_ID, devUser.organizationId);
            secureStorage.set(STORAGE_KEYS.TOKEN, 'dev-token-not-for-production');
            setIsLoading(false);
            return;
          } catch {
            localStorage.removeItem('grc-dev-auth');
          }
        }
      }

      const kc = getKeycloak();

      // Prevent double initialization
      if (initPromise) {
        try {
          const authenticated = await initPromise;
          setIsAuthenticated(authenticated);
          if (authenticated) {
            await loadUserProfile(kc);
          }
        } catch (e) {
          console.error('Keycloak init promise failed:', e);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (import.meta.env.DEV) {
          console.log('Initializing Keycloak...');
        }

        initPromise = kc.init({
          onLoad: 'check-sso',
          checkLoginIframe: false, // Disable iframe check which can cause issues
          pkceMethod: 'S256',
          redirectUri: window.location.origin + '/',
        });

        const authenticated = await initPromise;
        if (import.meta.env.DEV) {
          console.log('Keycloak initialized, authenticated:', authenticated);
        }

        if (authenticated) {
          await loadUserProfile(kc);
        }

        setIsAuthenticated(authenticated);

        // Track SSO session expiry from the refresh token
        // The refresh token exp reflects the SSO session, not the short-lived access token
        const updateSessionExpiry = () => {
          const refreshParsed = kc.refreshTokenParsed as Record<string, unknown> | undefined;
          if (refreshParsed?.exp) {
            setSessionExpiry((refreshParsed.exp as number) * 1000);
          }
        };
        updateSessionExpiry();

        // Token refresh
        kc.onTokenExpired = () => {
          if (import.meta.env.DEV) {
            console.log('Token expired, refreshing...');
          }
          kc.updateToken(30)
            .then((refreshed) => {
              if (refreshed && import.meta.env.DEV) {
                console.log('Token refreshed');
              }
              if (refreshed) {
                setToken(kc.token || null);
                updateSessionExpiry();
              }
            })
            .catch(() => {
              console.error('Failed to refresh token — SSO session expired');
              setSessionExpiry(Date.now()); // Mark as expired now
              setIsAuthenticated(false);
              setUser(null);
              setToken(null);
            });
        };

        // Handle auth success callback
        kc.onAuthSuccess = () => {
          if (import.meta.env.DEV) {
            console.log('Auth success');
          }
          loadUserProfile(kc);
          setIsAuthenticated(true);
        };

        kc.onAuthError = (error) => {
          console.error('Auth error:', error);
        };
      } catch (error) {
        console.error('Keycloak initialization failed:', error);
        initPromise = null;
      } finally {
        setIsLoading(false);
      }
    };

    initKeycloak();
  }, [loadUserProfile]);

  const login = useCallback(() => {
    const kc = getKeycloak();
    if (import.meta.env.DEV) {
      console.log('Logging in...');
    }
    // Redirect back to root so Keycloak can process the callback
    kc.login({
      redirectUri: window.location.origin + '/',
    });
  }, []);

  const logout = useCallback(() => {
    const kc = getKeycloak();

    // Broadcast logout to other tabs for cross-tab sync
    authChannel.current?.postMessage({ type: 'logout' });

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

  // Dev login bypass - only available in development
  const devLogin = useCallback(() => {
    const isDevMode = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';
    if (isDevMode) {
      if (import.meta.env.DEV) {
        console.log('Dev login activated');
      }
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
  }, []);

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
        'controls:view',
        'controls:create',
        'controls:update',
        'evidence:view',
        'evidence:upload',
        'evidence:approve',
        'frameworks:view',
        'frameworks:manage',
        'policies:view',
        'policies:create',
        'policies:update',
        'policies:approve',
        'integrations:view',
        'integrations:manage',
      ],
      auditor: ['controls:view', 'evidence:view', 'frameworks:view', 'policies:view'],
      viewer: ['controls:view', 'evidence:view', 'frameworks:view', 'policies:view'],
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
        sessionExpiry,
        login,
        logout,
        devLogin:
          import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTH === 'true'
            ? devLogin
            : undefined,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Default context for cases when useAuth is called outside the provider (e.g., lazy-loaded components)
const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  sessionExpiry: null,
  login: () => {},
  logout: () => {},
  hasRole: () => false,
  hasPermission: () => false,
};

export function useAuth() {
  const context = useContext(AuthContext);
  // Return default context instead of throwing - safer for lazy-loaded components
  if (context === undefined) {
    console.warn('useAuth called outside of AuthProvider - using defaults');
    return defaultAuthContext;
  }
  return context;
}
