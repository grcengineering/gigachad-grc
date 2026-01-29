import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';
import { AxiosError } from 'axios';

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'manager' | 'contributor' | 'viewer';
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

interface WorkspaceContextType {
  // State
  isMultiWorkspaceEnabled: boolean;
  isLoading: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  
  // Actions
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Multi-workspace toggle
  enableMultiWorkspace: () => Promise<void>;
  disableMultiWorkspace: () => Promise<void>;
  
  // Helpers
  getWorkspaceFilterParam: () => string | undefined;
  canManageWorkspaces: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = 'grc-current-workspace';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isMultiWorkspaceEnabled, setIsMultiWorkspaceEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const hasLoadedRef = useRef(false); // Prevent multiple loads

  // Determine if user can manage workspaces (admin only)
  const canManageWorkspaces = useMemo(() => {
    return user?.role === 'admin';
  }, [user?.role]);

  // Load workspace status and list
  const loadWorkspaceData = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (hasLoadedRef.current) {
      return;
    }

    if (!isAuthenticated || !user?.organizationId) {
      setIsLoading(false);
      return;
    }

    hasLoadedRef.current = true;
    setIsLoading(true);

    try {
      // Check if multi-workspace is enabled - catch errors to prevent reload loops
      const statusResponse = await api.get('/api/workspaces/status').catch((error: AxiosError) => {
        // If 401, let the interceptor handle it - don't retry here
        if (error.response?.status === 401) {
          throw error; // Re-throw to let interceptor handle
        }
        // For other errors, default to disabled
        console.warn('Failed to load workspace status, defaulting to disabled:', error);
        return { data: { enabled: false } };
      });

      const enabled = statusResponse.data?.enabled || false;
      setIsMultiWorkspaceEnabled(enabled);

      if (enabled) {
        // Load workspaces - catch errors gracefully
        const workspacesResponse = await api.get('/api/workspaces').catch((error: AxiosError) => {
          if (error.response?.status === 401) {
            throw error; // Re-throw 401 to let interceptor handle
          }
          console.warn('Failed to load workspaces:', error);
          return { data: [] };
        });

        const loadedWorkspaces = workspacesResponse.data || [];
        setWorkspaces(loadedWorkspaces);

        // Restore previously selected workspace from storage
        const storedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (storedWorkspaceId) {
          const storedWorkspace = loadedWorkspaces.find((w: Workspace) => w.id === storedWorkspaceId);
          if (storedWorkspace) {
            setCurrentWorkspaceState(storedWorkspace);
          } else if (loadedWorkspaces.length > 0) {
            // Stored workspace no longer exists, use first available
            setCurrentWorkspaceState(loadedWorkspaces[0]);
            localStorage.setItem(WORKSPACE_STORAGE_KEY, loadedWorkspaces[0].id);
          }
        } else if (loadedWorkspaces.length > 0) {
          // No stored selection, use first workspace
          setCurrentWorkspaceState(loadedWorkspaces[0]);
          localStorage.setItem(WORKSPACE_STORAGE_KEY, loadedWorkspaces[0].id);
        }
      } else {
        // Multi-workspace not enabled - clear state
        setWorkspaces([]);
        setCurrentWorkspaceState(null);
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      }
    } catch (error: any) {
      // Only log non-401 errors (401 will be handled by interceptor)
      if (error.response?.status !== 401) {
        console.error('Failed to load workspace data:', error);
      }
      setIsMultiWorkspaceEnabled(false);
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
      hasLoadedRef.current = false;
    }
  }, [isAuthenticated, user?.organizationId]);

  // Initial load - only when authenticated and user is available
  useEffect(() => {
    if (isAuthenticated && user?.organizationId && !hasLoadedRef.current) {
      loadWorkspaceData();
    } else if (!isAuthenticated) {
      // Reset when not authenticated
      setIsLoading(false);
      setIsMultiWorkspaceEnabled(false);
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      hasLoadedRef.current = false;
    }
  }, [isAuthenticated, user?.organizationId, loadWorkspaceData]);

  // Set current workspace and persist
  const setCurrentWorkspace = useCallback((workspace: Workspace | null) => {
    setCurrentWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  // Refresh workspaces list
  const refreshWorkspaces = useCallback(async () => {
    if (!isMultiWorkspaceEnabled) return;
    
    try {
      const response = await api.get('/api/workspaces');
      setWorkspaces(response.data || []);
    } catch (error: any) {
      // Don't log 401 errors - interceptor handles them
      if (error.response?.status !== 401) {
        console.error('Failed to refresh workspaces:', error);
      }
    }
  }, [isMultiWorkspaceEnabled]);

  // Create a new workspace
  const createWorkspace = useCallback(async (data: { name: string; description?: string }): Promise<Workspace> => {
    const response = await api.post('/api/workspaces', data);
    await refreshWorkspaces();
    return response.data;
  }, [refreshWorkspaces]);

  // Update a workspace
  const updateWorkspace = useCallback(async (id: string, data: Partial<Workspace>): Promise<Workspace> => {
    const response = await api.put(`/api/workspaces/${id}`, data);
    await refreshWorkspaces();
    
    // Update current workspace if it was modified
    if (currentWorkspace?.id === id) {
      setCurrentWorkspaceState(response.data);
    }
    
    return response.data;
  }, [currentWorkspace?.id, refreshWorkspaces]);

  // Delete (archive) a workspace
  const deleteWorkspace = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/api/workspaces/${id}`);
    await refreshWorkspaces();
    
    // If current workspace was deleted, switch to another
    if (currentWorkspace?.id === id) {
      const remaining = workspaces.filter(w => w.id !== id && w.status === 'active');
      setCurrentWorkspace(remaining.length > 0 ? remaining[0] : null);
    }
  }, [currentWorkspace?.id, workspaces, refreshWorkspaces, setCurrentWorkspace]);

  // Enable multi-workspace mode
  const enableMultiWorkspace = useCallback(async () => {
    await api.post('/api/workspaces/toggle', { enabled: true });
    await loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Disable multi-workspace mode
  const disableMultiWorkspace = useCallback(async () => {
    await api.post('/api/workspaces/toggle', { enabled: false });
    setIsMultiWorkspaceEnabled(false);
    setWorkspaces([]);
    setCurrentWorkspaceState(null);
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }, []);

  // Helper to get workspaceId filter param for API calls
  const getWorkspaceFilterParam = useCallback(() => {
    if (!isMultiWorkspaceEnabled || !currentWorkspace) {
      return undefined;
    }
    return currentWorkspace.id;
  }, [isMultiWorkspaceEnabled, currentWorkspace]);

  const value = useMemo(() => ({
    isMultiWorkspaceEnabled,
    isLoading,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    enableMultiWorkspace,
    disableMultiWorkspace,
    getWorkspaceFilterParam,
    canManageWorkspaces,
  }), [
    isMultiWorkspaceEnabled,
    isLoading,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    enableMultiWorkspace,
    disableMultiWorkspace,
    getWorkspaceFilterParam,
    canManageWorkspaces,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Default context value for when provider is not available
const defaultWorkspaceContext: WorkspaceContextType = {
  isMultiWorkspaceEnabled: false,
  isLoading: true,
  workspaces: [],
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  refreshWorkspaces: async () => {},
  createWorkspace: async () => { throw new Error('WorkspaceProvider not available'); },
  updateWorkspace: async () => { throw new Error('WorkspaceProvider not available'); },
  deleteWorkspace: async () => {},
  enableMultiWorkspace: async () => {},
  disableMultiWorkspace: async () => {},
  getWorkspaceFilterParam: () => undefined,
  canManageWorkspaces: false,
};

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  // Return default context instead of throwing - safer for lazy-loaded components
  if (context === undefined) {
    console.warn('useWorkspace called outside of WorkspaceProvider - using defaults');
    return defaultWorkspaceContext;
  }
  return context;
}

// Optional hook for components that just need the workspace ID for filtering
export function useCurrentWorkspaceId(): string | undefined {
  const { getWorkspaceFilterParam } = useWorkspace();
  return getWorkspaceFilterParam();
}
