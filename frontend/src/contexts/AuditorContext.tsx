import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ============================================
// Types
// ============================================

export interface AuditorSession {
  accessCode: string;
  auditId: string;
  auditName: string;
  auditorName: string;
  auditorEmail: string;
  role: string;
  organizationName: string;
  portalUserId: string;
  expiresAt: Date;
  permissions: {
    canViewAll: boolean;
    canUpload: boolean;
    canComment: boolean;
    // Legacy aliases for backwards compatibility
    canViewRequests: boolean;
    canDownloadEvidence: boolean;
    canSubmitComments: boolean;
    canMarkReviewed: boolean;
  };
}

interface AuditorContextType {
  session: AuditorSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (accessCode: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// ============================================
// Context
// ============================================

const AuditorContext = createContext<AuditorContextType | undefined>(undefined);

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEY = 'auditor_session';

// ============================================
// Provider Component
// ============================================

interface AuditorProviderProps {
  children: ReactNode;
}

export function AuditorProvider({ children }: AuditorProviderProps) {
  const [session, setSession] = useState<AuditorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedSession = sessionStorage.getItem(STORAGE_KEY);
        if (storedSession) {
          const parsed = JSON.parse(storedSession) as AuditorSession;
          parsed.expiresAt = new Date(parsed.expiresAt);

          // Check if session has expired
          if (parsed.expiresAt > new Date()) {
            setSession(parsed);
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to restore auditor session:', err);
        sessionStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  // Check session expiration periodically
  useEffect(() => {
    if (!session) return;

    const checkExpiration = () => {
      if (session.expiresAt <= new Date()) {
        logout();
      }
    };

    const interval = setInterval(checkExpiration, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session]);

  const login = useCallback(async (accessCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the audit service to validate the access code
      const response = await fetch(`/api/audit-portal/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid access code');
      }

      const data = await response.json();
      
      // Map backend permissions to frontend format
      const permissions = data.permissions || {};
      
      const newSession: AuditorSession = {
        accessCode,
        auditId: data.auditId,
        auditName: data.auditName,
        auditorName: data.auditorName,
        auditorEmail: data.auditorEmail,
        role: data.role || 'auditor',
        organizationName: data.organizationName,
        portalUserId: data.portalUserId,
        expiresAt: new Date(data.expiresAt),
        permissions: {
          // New permission structure from backend
          canViewAll: permissions.canViewAll ?? true,
          canUpload: permissions.canUpload ?? false,
          canComment: permissions.canComment ?? true,
          // Legacy aliases for backwards compatibility
          canViewRequests: permissions.canViewAll ?? true,
          canDownloadEvidence: permissions.canViewAll ?? true,
          canSubmitComments: permissions.canComment ?? true,
          canMarkReviewed: data.role === 'lead_auditor',
        },
      };

      // Store session
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setError(null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/audit-portal/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode: session.accessCode }),
      });

      if (!response.ok) {
        throw new Error('Session refresh failed');
      }

      const data = await response.json();
      const permissions = data.permissions || {};
      
      const updatedSession: AuditorSession = {
        ...session,
        expiresAt: new Date(data.expiresAt),
        permissions: {
          canViewAll: permissions.canViewAll ?? true,
          canUpload: permissions.canUpload ?? false,
          canComment: permissions.canComment ?? true,
          canViewRequests: permissions.canViewAll ?? true,
          canDownloadEvidence: permissions.canViewAll ?? true,
          canSubmitComments: permissions.canComment ?? true,
          canMarkReviewed: data.role === 'lead_auditor',
        },
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
      setSession(updatedSession);
    } catch (err) {
      console.error('Failed to refresh session:', err);
      logout();
    }
  }, [session, logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuditorContextType = {
    session,
    isAuthenticated: !!session && session.expiresAt > new Date(),
    isLoading,
    error,
    login,
    logout,
    refreshSession,
    clearError,
  };

  return (
    <AuditorContext.Provider value={value}>
      {children}
    </AuditorContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuditor() {
  const context = useContext(AuditorContext);
  if (context === undefined) {
    throw new Error('useAuditor must be used within an AuditorProvider');
  }
  return context;
}

// ============================================
// Protected Route Component
// ============================================

interface AuditorProtectedRouteProps {
  children: ReactNode;
}

export function AuditorProtectedRoute({ children }: AuditorProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuditor();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login will be handled by the router
    window.location.href = '/portal';
    return null;
  }

  return <>{children}</>;
}

