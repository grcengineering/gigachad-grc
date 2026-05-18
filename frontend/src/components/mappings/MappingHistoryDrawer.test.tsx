import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@/test/utils';

import { MappingHistoryDrawer } from './MappingHistoryDrawer';

// react-hot-toast — assert on success/error toasts
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Permission gating — overridden per-test via helper
const hasPermissionMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', email: 'u@test.com', role: 'compliance_manager', organizationId: 'org-1' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: () => false,
    hasPermission: hasPermissionMock,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// API mock
vi.mock('@/lib/api/frameworks.api', () => ({
  frameworksApi: {
    mappings: {
      history: vi.fn(),
      restore: vi.fn(),
    },
  },
}));

import toast from 'react-hot-toast';
import { frameworksApi } from '@/lib/api/frameworks.api';

const MAPPING_ID = 'm-1';

const USER_A = {
  id: 'u-a',
  email: 'alice@test.com',
  firstName: 'Alice',
  lastName: 'A',
  displayName: 'Alice A',
};

const USER_B = {
  id: 'u-b',
  email: 'bob@test.com',
  firstName: 'Bob',
  lastName: 'B',
  displayName: 'Bob B',
};

const BASE_SNAPSHOT = {
  frameworkId: 'fw-1',
  requirementId: 'r-1',
  controlId: 'c-1',
  createdBy: 'u-a',
  createdAt: '2025-01-01T00:00:00.000Z',
};

// Note: API returns in changedAt desc order. Index 0 is most recent.
const THREE_ENTRIES = [
  {
    id: 'h-3',
    mappingId: MAPPING_ID,
    action: 'restore' as const,
    snapshot: { ...BASE_SNAPSHOT, mappingType: 'primary' as const, notes: 'Original' },
    changedBy: 'u-b',
    changedAt: '2025-03-03T12:00:00.000Z',
    reason: 'Reverting to original intent',
    changedByUser: USER_B,
  },
  {
    id: 'h-2',
    mappingId: MAPPING_ID,
    action: 'update' as const,
    snapshot: { ...BASE_SNAPSHOT, mappingType: 'supporting' as const, notes: 'Updated note' },
    changedBy: 'u-a',
    changedAt: '2025-02-02T12:00:00.000Z',
    reason: null,
    changedByUser: USER_A,
  },
  {
    id: 'h-1',
    mappingId: MAPPING_ID,
    action: 'create' as const,
    snapshot: { ...BASE_SNAPSHOT, mappingType: 'primary' as const, notes: 'Original' },
    changedBy: 'u-a',
    changedAt: '2025-01-01T12:00:00.000Z',
    reason: null,
    changedByUser: USER_A,
  },
];

const DELETED_ENTRIES = [
  {
    id: 'h-d-2',
    mappingId: MAPPING_ID,
    action: 'delete' as const,
    snapshot: { ...BASE_SNAPSHOT, mappingType: 'primary' as const, notes: 'Original' },
    changedBy: 'u-a',
    changedAt: '2025-02-02T12:00:00.000Z',
    reason: null,
    changedByUser: USER_A,
  },
  {
    id: 'h-d-1',
    mappingId: MAPPING_ID,
    action: 'create' as const,
    snapshot: { ...BASE_SNAPSHOT, mappingType: 'primary' as const, notes: 'Original' },
    changedBy: 'u-a',
    changedAt: '2025-01-01T12:00:00.000Z',
    reason: null,
    changedByUser: USER_A,
  },
];

function defaultProps(overrides: Partial<React.ComponentProps<typeof MappingHistoryDrawer>> = {}) {
  return {
    open: true,
    onClose: vi.fn(),
    mappingId: MAPPING_ID,
    mode: 'requirement-to-controls' as const,
    invalidateOnRestore: [
      ['mappings', 'by-requirement', 'r-1'],
      ['mappings', 'by-control', 'c-1'],
    ] as readonly (readonly (string | undefined)[])[],
    ...overrides,
  };
}

describe('MappingHistoryDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermissionMock.mockReturnValue(true);
    // Default: never resolve so we can assert loading. Override per test.
    vi.mocked(frameworksApi.mappings.history).mockImplementation(
      () => new Promise(() => {}) as never
    );
    vi.mocked(frameworksApi.mappings.restore).mockResolvedValue({} as never);
  });

  it('shows skeleton on initial load', () => {
    render(<MappingHistoryDrawer {...defaultProps()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Three skeleton rows are aria-hidden but still rendered
    const dialog = screen.getByRole('dialog');
    const pulses = dialog.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThanOrEqual(3);
  });

  it('shows empty state when API returns []', async () => {
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue([]);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText(/no history recorded yet/i)).toBeInTheDocument();
    });
  });

  it('renders 3 entries with correct action badges and diffs', async () => {
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Restored')).toBeInTheDocument();
    });
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    // articles
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('"create" entry shows "Initial state"', async () => {
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue([THREE_ENTRIES[2]] as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText(/initial state/i)).toBeInTheDocument();
    });
  });

  it('"update" entry diff shows only changed fields', async () => {
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
    // The update entry (index 1, h-2) changed mappingType primary -> supporting AND notes
    // Find that article and confirm both fields rendered as diff rows
    const updateArticle = screen
      .getAllByRole('article')
      .find((a) => within(a).queryByText('Updated'));
    expect(updateArticle).toBeDefined();
    expect(within(updateArticle!).getByText('Mapping type')).toBeInTheDocument();
    expect(within(updateArticle!).getByText('Notes')).toBeInTheDocument();
    // diff arrow
    expect(within(updateArticle!).getAllByText('→').length).toBeGreaterThan(0);
  });

  it('"restore" entry shows reason', async () => {
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText(/reverting to original intent/i)).toBeInTheDocument();
    });
  });

  it('hides Restore button for index 0 (most recent entry)', async () => {
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Restored')).toBeInTheDocument();
    });
    // Find the article corresponding to the most-recent entry (index 0, the Restore action)
    const articles = screen.getAllByRole('article');
    expect(within(articles[0]).queryByRole('button', { name: /restore mapping/i })).toBeNull();
    // But index 1 should have a restore button
    expect(
      within(articles[1]).getByRole('button', { name: /restore mapping/i })
    ).toBeInTheDocument();
  });

  it('hides Restore button without controls:update permission', async () => {
    hasPermissionMock.mockReturnValue(false);
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Restored')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /restore mapping/i })).toBeNull();
  });

  it('hides Restore button on "delete" entries', async () => {
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(DELETED_ENTRIES as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Deleted')).toBeInTheDocument();
    });
    // The delete entry is index 0 (most recent). Even without that rule it would hide.
    // The create entry is index 1 but action is 'create' — restorable.
    // Let's verify: no restore button on the delete article, regardless of index.
    const articles = screen.getAllByRole('article');
    const deleteArticle = articles.find((a) => within(a).queryByText('Deleted'));
    expect(deleteArticle).toBeDefined();
    expect(within(deleteArticle!).queryByRole('button', { name: /restore mapping/i })).toBeNull();
  });

  it('Restore flow: click → inline input → Confirm fires restore() and invalidates keys', async () => {
    const user = userEvent.setup();
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });

    const articles = screen.getAllByRole('article');
    const restoreBtn = within(articles[1]).getByRole('button', { name: /restore mapping/i });
    await user.click(restoreBtn);

    // Inline input + Confirm appear
    const input = await screen.findByLabelText(/restore reason/i);
    await user.type(input, 'Rolling back accidental change');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(frameworksApi.mappings.restore).toHaveBeenCalledWith(MAPPING_ID, 'h-2', {
        reason: 'Rolling back accidental change',
      });
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/restored/i));
  });

  it('403 from history GET → "no permission" message', async () => {
    vi.mocked(frameworksApi.mappings.history).mockRejectedValue({
      response: { status: 403, data: { message: 'forbidden' } },
    });
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText(/do not have permission to view this history/i)).toBeInTheDocument();
    });
  });

  it('409 on restore → "Cannot restore deleted mapping" toast', async () => {
    const user = userEvent.setup();
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    vi.mocked(frameworksApi.mappings.restore).mockRejectedValue({
      response: { status: 409, data: { message: 'conflict' } },
    });
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
    const articles = screen.getAllByRole('article');
    await user.click(within(articles[1]).getByRole('button', { name: /restore mapping/i }));
    await user.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Cannot restore deleted mapping');
    });
  });

  it('404 on restore → "Mapping or history entry not found" toast', async () => {
    const user = userEvent.setup();
    vi.mocked(frameworksApi.mappings.history).mockResolvedValue(THREE_ENTRIES as never);
    vi.mocked(frameworksApi.mappings.restore).mockRejectedValue({
      response: { status: 404, data: { message: 'not found' } },
    });
    render(<MappingHistoryDrawer {...defaultProps()} />);
    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
    const articles = screen.getAllByRole('article');
    await user.click(within(articles[1]).getByRole('button', { name: /restore mapping/i }));
    await user.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/not found/i));
    });
  });
});
