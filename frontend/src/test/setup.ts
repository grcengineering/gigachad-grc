import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock WorkspaceContext hooks
vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    isMultiWorkspaceEnabled: false,
    isLoading: false,
    workspaces: [],
    currentWorkspace: null,
    setCurrentWorkspace: vi.fn(),
    refreshWorkspaces: vi.fn().mockResolvedValue(undefined),
    createWorkspace: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
    updateWorkspace: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
    enableMultiWorkspace: vi.fn().mockResolvedValue(undefined),
    disableMultiWorkspace: vi.fn().mockResolvedValue(undefined),
    getWorkspaceFilterParam: () => undefined,
    canManageWorkspaces: true,
  }),
  useCurrentWorkspaceId: () => undefined,
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AuthContext hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com', role: 'admin', organizationId: 'org-1' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockResolvedValue(undefined),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock ModuleContext hooks
vi.mock('@/contexts/ModuleContext', () => ({
  useModules: () => ({
    modules: {
      controls: { enabled: true, visible: true },
      frameworks: { enabled: true, visible: true },
      risks: { enabled: true, visible: true },
      policies: { enabled: true, visible: true },
      evidence: { enabled: true, visible: true },
      vendors: { enabled: true, visible: true },
      trust: { enabled: true, visible: true },
      audits: { enabled: true, visible: true },
      assets: { enabled: true, visible: true },
      bcdr: { enabled: true, visible: true },
      awareness: { enabled: true, visible: true },
    },
    isModuleEnabled: () => true,
    isModuleVisible: () => true,
    isLoading: false,
    error: null,
    updateModule: vi.fn().mockResolvedValue(undefined),
    refreshModules: vi.fn().mockResolvedValue(undefined),
  }),
  ModuleProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock IntersectionObserver / ResizeObserver.
// These are invoked with `new`, so the mock implementation must be a class
// (vitest 4 rejects mockReturnValue / arrow-function implementations for
// mocks constructed with `new` — arrow functions are not constructors).
const mockIntersectionObserver = vi.fn(function () {
  return {
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
    takeRecords: () => [],
  };
});
window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;

const mockResizeObserver = vi.fn(function () {
  return {
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  };
});
window.ResizeObserver = mockResizeObserver as unknown as typeof ResizeObserver;
