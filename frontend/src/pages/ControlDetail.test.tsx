import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test/utils';
import ControlDetail from './ControlDetail';

// React Router params: hard-code the control id for all tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'ctrl-1' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: undefined, pathname: '/controls/ctrl-1' }),
  };
});

// Permission gating — overridden per-suite below via the helper.
const hasPermissionMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@test.com',
      role: 'compliance_manager',
      organizationId: 'org-1',
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: () => false,
    hasPermission: hasPermissionMock,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Stub heavy side-panels & presence — we only care about the Framework Mappings card.
vi.mock('@/components/CommentsPanel', () => ({
  default: () => null,
}));
vi.mock('@/components/TasksPanel', () => ({
  default: () => null,
}));
vi.mock('@/components/EntityAuditHistory', () => ({
  default: () => null,
}));
vi.mock('@/components/RealTimePresence', () => ({
  RealTimePresence: () => null,
}));
vi.mock('@/components/controls/EvidenceCollectors', () => ({
  default: () => null,
}));

// Mock the modal — recorded props let us assert anchor wiring.
const modalSpy = vi.fn();
vi.mock('@/components/mappings/MappingEditorModal', () => ({
  MappingEditorModal: (props: Record<string, unknown>) => {
    modalSpy(props);
    return <div data-testid="mapping-editor-modal" />;
  },
}));

// API surface used by ControlDetail. Wrapped in vi.hoisted() so the constant is
// available when the hoisted vi.mock factories below evaluate (vitest hoists
// vi.mock above all top-level statements; plain `const` declarations are not).
const { sampleControl } = vi.hoisted(() => ({
  sampleControl: {
    id: 'ctrl-1',
    controlId: 'AC-001',
    title: 'Access Control Policy',
    description: 'Defines access control requirements',
    category: 'access_control',
    isCustom: false,
    tags: [],
    implementation: { id: 'impl-1', status: 'implemented' },
    mappings: [
      {
        id: 'map-1',
        frameworkId: 'fw-1',
        requirementId: 'req-1',
        framework: { id: 'fw-1', name: 'SOC 2' },
        requirement: { id: 'req-1', reference: 'CC6.1', title: 'Logical Access Controls' },
      },
      {
        id: 'map-2',
        frameworkId: 'fw-2',
        requirementId: 'req-2',
        framework: { id: 'fw-2', name: 'ISO 27001' },
        requirement: { id: 'req-2', reference: 'A.9.1', title: 'Access Control Policy' },
      },
    ],
    policyLinks: [],
  },
}));

vi.mock('@/lib/api', () => ({
  controlsApi: {
    get: vi.fn().mockResolvedValue({ data: sampleControl }),
    update: vi.fn().mockResolvedValue({ data: sampleControl }),
    delete: vi.fn().mockResolvedValue({}),
  },
  implementationsApi: {
    update: vi.fn().mockResolvedValue({ data: {} }),
  },
  usersApi: {
    list: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
  evidenceApi: {
    unlink: vi.fn().mockResolvedValue({}),
  },
  policiesApi: {
    list: vi.fn().mockResolvedValue({ data: { data: [] } }),
    unlinkFromControl: vi.fn().mockResolvedValue({}),
    linkToControls: vi.fn().mockResolvedValue({}),
  },
  mappingsApi: {
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('ControlDetail — Framework Mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermissionMock.mockReset();
  });

  it('renders the Framework Mappings section with chip rows', async () => {
    hasPermissionMock.mockReturnValue(false);
    render(<ControlDetail />);

    await waitFor(() => {
      expect(screen.getByText('Framework Mappings')).toBeInTheDocument();
    });

    expect(screen.getByText('SOC 2')).toBeInTheDocument();
    expect(screen.getByText(/CC6\.1.*Logical Access Controls/)).toBeInTheDocument();
    expect(screen.getByText('ISO 27001')).toBeInTheDocument();

    const list = screen.getByRole('list', { name: 'Framework mappings' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows the "Add mapping..." button when user has controls:update', async () => {
    hasPermissionMock.mockImplementation((p: string) => p === 'controls:update');
    render(<ControlDetail />);

    await waitFor(() => {
      expect(screen.getByText('Framework Mappings')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add mapping/i })).toBeInTheDocument();
  });

  it('hides the "Add mapping..." button without controls:update', async () => {
    hasPermissionMock.mockReturnValue(false);
    render(<ControlDetail />);

    await waitFor(() => {
      expect(screen.getByText('Framework Mappings')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /add mapping/i })).not.toBeInTheDocument();
  });

  it('still renders kebab (History only) when both mutation permissions are false', async () => {
    hasPermissionMock.mockReturnValue(false);
    render(<ControlDetail />);

    await waitFor(() => {
      expect(screen.getByText('SOC 2')).toBeInTheDocument();
    });

    // Kebab itself remains visible so viewers can open the History drawer.
    const triggers = screen.getAllByRole('button', { name: /mapping actions for/i });
    expect(triggers.length).toBeGreaterThan(0);
    fireEvent.click(triggers[0]);
    expect(screen.getByRole('menuitem', { name: /history/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('opens the modal in edit mode with anchor props derived from the mapping', async () => {
    hasPermissionMock.mockImplementation((p: string) => p === 'controls:update');
    render(<ControlDetail />);

    await waitFor(() => {
      expect(screen.getByText('SOC 2')).toBeInTheDocument();
    });

    const kebab = screen.getByRole('button', {
      name: 'Mapping actions for SOC 2/CC6.1',
    });
    fireEvent.click(kebab);

    const editItem = await screen.findByRole('menuitem', { name: 'Edit' });
    fireEvent.click(editItem);

    await waitFor(() => {
      expect(screen.getByTestId('mapping-editor-modal')).toBeInTheDocument();
    });

    const lastCall = modalSpy.mock.calls[modalSpy.mock.calls.length - 1][0];
    expect(lastCall).toMatchObject({
      open: true,
      mode: 'control-to-requirements',
      controlId: 'ctrl-1',
      requirementId: 'req-1',
      frameworkId: 'fw-1',
      editingMappingId: 'map-1',
    });
  });

  it('opens the modal in create mode with existingMappingIds populated', async () => {
    hasPermissionMock.mockImplementation((p: string) => p === 'controls:update');
    render(<ControlDetail />);

    await waitFor(() => {
      expect(screen.getByText('Framework Mappings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

    await waitFor(() => {
      expect(screen.getByTestId('mapping-editor-modal')).toBeInTheDocument();
    });

    const lastCall = modalSpy.mock.calls[modalSpy.mock.calls.length - 1][0];
    expect(lastCall).toMatchObject({
      open: true,
      mode: 'control-to-requirements',
      controlId: 'ctrl-1',
      editingMappingId: undefined,
    });
    expect(lastCall.frameworkId).toBeUndefined();
    expect(lastCall.existingMappingIds).toEqual(expect.arrayContaining(['req-1', 'req-2']));
  });

  it('confirming delete calls mappingsApi.delete and invalidates by-control / by-requirement queries', async () => {
    hasPermissionMock.mockImplementation((p: string) => p === 'controls:delete');

    const { mappingsApi } = await import('@/lib/api');

    // Spy on QueryClient.invalidateQueries via the rendered app.
    const { QueryClient } = await import('@tanstack/react-query');
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');

    render(<ControlDetail />);

    await waitFor(() => {
      expect(screen.getByText('SOC 2')).toBeInTheDocument();
    });

    const kebab = screen.getByRole('button', {
      name: 'Mapping actions for SOC 2/CC6.1',
    });
    fireEvent.click(kebab);

    const deleteItem = await screen.findByRole('menuitem', { name: 'Delete' });
    fireEvent.click(deleteItem);

    expect(screen.getByText(/delete this mapping/i)).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole('button', { name: 'Delete' });
    // The confirm button is the last "Delete" button (the menu item already closed).
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(mappingsApi.delete).toHaveBeenCalledWith('map-1');
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['mappings', 'by-control', 'ctrl-1'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['mappings', 'by-requirement', 'req-1'],
      });
    });

    invalidateSpy.mockRestore();
  });
});
