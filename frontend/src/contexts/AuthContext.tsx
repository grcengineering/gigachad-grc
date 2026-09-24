import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Keycloak from 'keycloak-js';
import { setApiBearerToken } from '../lib/api';

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
  login: () => void;
  logout: () => void;
  devLogin?: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultKeycloakUrl =
  typeof window !== 'undefined' && !import.meta.env.DEV
    ? `${window.location.origin}/auth`
    : 'http://localhost:8080';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || defaultKeycloakUrl,
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'gigachad-grc',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'grc-frontend',
};
const ORGANIZATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LOCAL_DOCKER_DEV_AUTH_ENABLED =
  import.meta.env.VITE_ENABLE_DEV_AUTH === 'true' &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const DEV_AUTH_ENABLED =
  import.meta.env.DEV || import.meta.env.MODE === 'test' || LOCAL_DOCKER_DEV_AUTH_ENABLED;

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

  const loadUserProfile = useCallback(async (kc: Keycloak): Promise<boolean> => {
    try {
      const profile = await kc.loadUserProfile();
      const tokenParsed = kc.tokenParsed as any;

      const role =
        tokenParsed?.roles?.[0] ||
        tokenParsed?.realm_access?.roles?.find((r: string) =>
          ['admin', 'compliance_manager', 'auditor', 'viewer'].includes(r)
        ) ||
        'viewer';

      const userId = kc.subject || '';
      const organizationId = tokenParsed?.organization_id;
      if (!ORGANIZATION_ID_PATTERN.test(organizationId || '')) {
        throw new Error('Authenticated token is missing a valid organization_id claim');
      }

      setUser({
        id: userId,
        email: profile.email || '',
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email || '',
        role,
        organizationId,
      });

      // Store in localStorage for API interceptor
      localStorage.setItem('userId', userId);
      localStorage.setItem('organizationId', organizationId);

      const bearerToken = kc.token || null;
      setToken(bearerToken);
      setApiBearerToken(bearerToken);
      return true;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      localStorage.removeItem('userId');
      localStorage.removeItem('organizationId');
      setApiBearerToken(null);
      setUser(null);
      setToken(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const initKeycloak = async () => {
      const isLocalHost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      if (
        DEV_AUTH_ENABLED &&
        isLocalHost &&
        new URLSearchParams(window.location.search).get('devAuth') === '1'
      ) {
        // Explicit one-time local opt-in used by Playwright setup; persisted
        // in localStorage so subsequent routes/contexts keep using dev auth.
        localStorage.setItem('grc-dev-auth-enabled', '1');
      }

      const hasLocalDevAuthOptIn =
        DEV_AUTH_ENABLED && isLocalHost && localStorage.getItem('grc-dev-auth-enabled') === '1';

      // Check for dev auth first
      if (DEV_AUTH_ENABLED || hasLocalDevAuthOptIn) {
        const storedAuth = localStorage.getItem('grc-dev-auth');
        if (storedAuth) {
          try {
            const devUser = JSON.parse(storedAuth) as User;
            console.log('Restoring dev auth session');
            setUser(devUser);
            setToken('dev-token-not-for-production');
            setApiBearerToken(null);
            setIsAuthenticated(true);
            // Ensure userId and organizationId are set for API calls
            localStorage.setItem('userId', devUser.id);
            localStorage.setItem('organizationId', devUser.organizationId);
            setIsLoading(false);
            return;
          } catch {
            localStorage.removeItem('grc-dev-auth');
          }
        }

        // A development build with no existing session should render the
        // Login page immediately so the explicit Dev Login button can create
        // one. Falling through to Keycloak here makes Docker dev builds hang
        // on silent SSO even though the bypass was intentionally enabled.
        setIsLoading(false);
        return;
      }

      const kc = getKeycloak();

      // Prevent double initialization
      if (initPromise) {
        try {
          const authenticated = await initPromise;
          const profileLoaded = authenticated ? await loadUserProfile(kc) : false;
          setIsAuthenticated(authenticated && profileLoaded);
        } catch (e) {
          console.error('Keycloak init promise failed:', e);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log('Initializing Keycloak...');

        initPromise = kc.init({
          onLoad: 'check-sso',
          checkLoginIframe: false, // Disable iframe check which can cause issues
          pkceMethod: 'S256',
          redirectUri: window.location.origin + '/',
        });

        const authenticated = await initPromise;
        console.log('Keycloak initialized, authenticated:', authenticated);

        const profileLoaded = authenticated ? await loadUserProfile(kc) : false;
        setIsAuthenticated(authenticated && profileLoaded);

        // Token refresh
        kc.onTokenExpired = () => {
          console.log('Token expired, refreshing...');
          kc.updateToken(30)
            .then((refreshed) => {
              if (refreshed) console.log('Token refreshed');
              const bearerToken = kc.token || null;
              setToken(bearerToken);
              setApiBearerToken(bearerToken);
            })
            .catch(() => {
              console.error('Failed to refresh token');
              setApiBearerToken(null);
              setIsAuthenticated(false);
              setUser(null);
              setToken(null);
            });
        };

        // Handle auth success callback
        kc.onAuthSuccess = async () => {
          console.log('Auth success');
          const profileLoadedAfterLogin = await loadUserProfile(kc);
          setIsAuthenticated(profileLoadedAfterLogin);
        };

        kc.onAuthError = (error) => {
          console.error('Auth error:', error);
          setApiBearerToken(null);
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
    console.log('Logging in...');
    // Redirect back to root so Keycloak can process the callback
    kc.login({
      redirectUri: window.location.origin + '/',
    });
  }, []);

  const logout = useCallback(() => {
    const kc = getKeycloak();
    // Clear dev login state and user info
    localStorage.removeItem('grc-dev-auth');
    localStorage.removeItem('grc-dev-auth-enabled');
    localStorage.removeItem('userId');
    localStorage.removeItem('organizationId');
    setApiBearerToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);

    // Only call keycloak logout if we were authenticated via keycloak
    if (kc.authenticated) {
      kc.logout({
        redirectUri: window.location.origin,
      });
    }
  }, []);

  // Dev login bypass - only available in development
  const devLogin = useCallback(() => {
    if (DEV_AUTH_ENABLED) {
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
      setApiBearerToken(null);
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
        login,
        logout,
        devLogin: DEV_AUTH_ENABLED ? devLogin : undefined,
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
