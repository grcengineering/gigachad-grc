import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Keycloak from 'keycloak-js';

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

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'gigachad-grc',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'grc-frontend',
};

console.log('Keycloak config:', keycloakConfig);

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

  const loadUserProfile = useCallback(async (kc: Keycloak) => {
    try {
      const profile = await kc.loadUserProfile();
      const tokenParsed = kc.tokenParsed as any;

      console.log('Token parsed:', tokenParsed);
      console.log('Profile:', profile);

      const role =
        tokenParsed?.roles?.[0] ||
        tokenParsed?.realm_access?.roles?.find((r: string) =>
          ['admin', 'compliance_manager', 'auditor', 'viewer'].includes(r)
        ) ||
        'viewer';

      const userId = kc.subject || '';
      const organizationId = tokenParsed?.organization_id || 'default';

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
      if (import.meta.env.DEV) {
        const storedAuth = localStorage.getItem('grc-dev-auth');
        if (storedAuth) {
          try {
            const devUser = JSON.parse(storedAuth) as User;
            console.log('Restoring dev auth session');
            setUser(devUser);
            setToken('dev-token-not-for-production');
            setIsAuthenticated(true);
            // Ensure userId and organizationId are set for API calls
            localStorage.setItem('userId', devUser.id);
            localStorage.setItem('organizationId', devUser.organizationId);
            setIsLoading(false);
            return;
          } catch (e) {
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
        console.log('Initializing Keycloak...');

        initPromise = kc.init({
          onLoad: 'check-sso',
          checkLoginIframe: false, // Disable iframe check which can cause issues
          pkceMethod: 'S256',
          redirectUri: window.location.origin + '/',
        });

        const authenticated = await initPromise;
        console.log('Keycloak initialized, authenticated:', authenticated);

        if (authenticated) {
          await loadUserProfile(kc);
        }

        setIsAuthenticated(authenticated);

        // Token refresh
        kc.onTokenExpired = () => {
          console.log('Token expired, refreshing...');
          kc.updateToken(30)
            .then((refreshed) => {
              if (refreshed) {
                console.log('Token refreshed');
                setToken(kc.token || null);
              }
            })
            .catch(() => {
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
    localStorage.removeItem('userId');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('token');
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
    if (import.meta.env.DEV) {
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
        devLogin: import.meta.env.DEV ? devLogin : undefined,
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
