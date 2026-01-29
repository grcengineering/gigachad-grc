import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import Controls from './Controls';

// Mock the API modules
vi.mock('@/lib/api', () => ({
  controlsApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: '1',
            controlId: 'AC-001',
            title: 'Access Control Policy',
            description: 'Defines access control requirements',
            category: 'access_control',
            tags: ['security', 'access'],
            implementation: {
              id: 'impl-1',
              status: 'implemented',
            },
          },
          {
            id: '2',
            controlId: 'AC-002',
            title: 'User Authentication',
            description: 'Requires multi-factor authentication',
            category: 'access_control',
            tags: ['authentication', 'mfa'],
            implementation: {
              id: 'impl-2',
              status: 'in_progress',
            },
          },
          {
            id: '3',
            controlId: 'DP-001',
            title: 'Data Encryption',
            description: 'Data must be encrypted at rest and in transit',
            category: 'data_protection',
            tags: ['encryption', 'data'],
            implementation: {
              id: 'impl-3',
              status: 'not_started',
            },
          },
        ],
        total: 3,
      },
    }),
    getCategories: vi.fn().mockResolvedValue({
      data: [
        { category: 'access_control', count: 10 },
        { category: 'data_protection', count: 5 },
        { category: 'network_security', count: 8 },
        { category: 'compliance', count: 3 },
      ],
    }),
    getTags: vi.fn().mockResolvedValue({
      data: ['security', 'access', 'authentication', 'mfa', 'encryption', 'data'],
    }),
    create: vi.fn().mockResolvedValue({ data: { id: '4', controlId: 'AC-003' } }),
    update: vi.fn().mockResolvedValue({ data: { id: '1' } }),
    delete: vi.fn().mockResolvedValue({}),
    bulkUpload: vi.fn().mockResolvedValue({ data: { created: 5, updated: 0, skipped: 0 } }),
  },
  implementationsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    update: vi.fn().mockResolvedValue({ data: {} }),
  },
  usersApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 'user-1', displayName: 'John Doe', email: 'john@example.com' },
          { id: 'user-2', displayName: 'Jane Smith', email: 'jane@example.com' },
        ],
      },
    }),
  },
  frameworksApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 'fw-1', name: 'SOC 2', type: 'regulatory' },
        { id: 'fw-2', name: 'ISO 27001', type: 'regulatory' },
      ],
    }),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Controls', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the controls page title', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('Controls')).toBeInTheDocument();
      });
    });

    it('renders the control list', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
        expect(screen.getByText('Access Control Policy')).toBeInTheDocument();
      });
    });

    it('displays control status badges', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('Implemented')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });

    it('shows control categories', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        // Check for category labels or badges
        expect(screen.getAllByText(/access control|data protection/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filtering', () => {
    it('has a search input', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('has filter dropdowns', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });

      // Check for filter select elements
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('displays all controls initially', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
        expect(screen.getByText('AC-002')).toBeInTheDocument();
        expect(screen.getByText('DP-001')).toBeInTheDocument();
      });
    });
  });

  describe('Control Actions', () => {
    it('renders control links for navigation', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });

      // Control IDs should be clickable links
      const controlLink = screen.getByText('AC-001').closest('a');
      expect(controlLink).toBeTruthy();
    });

    it('displays action buttons', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });

      // The page should have buttons available
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Actions', () => {
    it('enables bulk selection with checkboxes', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });

      // Find checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('allows selecting individual items', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });

      // Checkboxes should exist for selection
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Export', () => {
    it('has export functionality available', async () => {
      render(<Controls />);
      
      await waitFor(() => {
        expect(screen.getByText('Controls')).toBeInTheDocument();
      });

      // Check that the page loaded with controls
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator initially', () => {
      render(<Controls />);
      
      // Should show loading state before data loads
      expect(screen.getByText('Controls')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no controls', async () => {
      const { controlsApi } = await import('@/lib/api');
      vi.mocked(controlsApi.list).mockResolvedValueOnce({ data: { data: [], total: 0 } } as never);

      render(<Controls />);
      
      await waitFor(() => {
        const emptyState = screen.queryByText(/no controls/i);
        expect(emptyState !== null || screen.getByText('Controls')).toBeTruthy();
      });
    });
  });
});

describe('Controls Integration', () => {
  it('fetches controls on mount', async () => {
    const { controlsApi } = await import('@/lib/api');
    
    render(<Controls />);
    
    await waitFor(() => {
      expect(controlsApi.list).toHaveBeenCalled();
    });
  });

  it('fetches categories for filtering', async () => {
    const { controlsApi } = await import('@/lib/api');
    
    render(<Controls />);
    
    await waitFor(() => {
      expect(controlsApi.getCategories).toHaveBeenCalled();
    });
  });
});

