import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test/utils';
import FrameworkDetail from './FrameworkDetail';

// useParams: return a deterministic framework id
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'fw-1' }),
  };
});

// Permission gating helper — re-bound per test via setMockedAuth(...)
const auth = vi.hoisted(() => ({
  state: { hasPermission: (_p: string) => true as boolean },
}));
const setMockedAuth = (perms: Record<string, boolean>) => {
  auth.state.hasPermission = (p: string) => !!perms[p];
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      email: 'test@test.com',
      role: 'admin',
      organizationId: 'org-1',
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    hasPermission: (p: string) => auth.state.hasPermission(p),
    hasRole: () => true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Replace the modal with a tiny inspectable stub so we can assert anchor props.
vi.mock('@/components/mappings/MappingEditorModal', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    props.open ? (
      <div
        data-testid="mapping-editor-modal"
        data-mode={String(props.mode ?? '')}
        data-requirement-id={String(props.requirementId ?? '')}
        data-framework-id={String(props.frameworkId ?? '')}
        data-control-id={String(props.controlId ?? '')}
        data-editing-mapping-id={String(props.editingMappingId ?? '')}
        data-existing-mapping-ids={JSON.stringify(props.existingMappingIds ?? [])}
        data-default-mapping-type={String(props.defaultMappingType ?? '')}
        data-default-notes={String(props.defaultNotes ?? '')}
      />
    ) : null,
}));

// Minimal sibling panel stubs so the detail panel renders cleanly.
vi.mock('@/components/CommentsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="comments-panel" />,
}));
vi.mock('@/components/TasksPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="tasks-panel" />,
}));

const fixtures = vi.hoisted(() => {
  const sampleRequirement = {
    id: 'req-1',
    reference: '1.1',
    title: 'Access Control',
    description: 'Access control requirement',
    isCategory: false,
    status: 'partial',
    children: [],
    mappings: [],
  };
  const sampleMappings = [
    {
      id: 'map-1',
      controlId: 'ctrl-1',
      mappingType: 'primary',
      notes: 'Primary mapping notes',
      control: {
        id: 'ctrl-1',
        controlId: 'AC-001',
        title: 'Access Control Policy',
      },
    },
    {
      id: 'map-2',
      controlId: 'ctrl-2',
      mappingType: 'supporting',
      notes: null,
      control: { id: 'ctrl-2', controlId: 'AC-002', title: 'MFA Required' },
    },
  ];
  return { sampleRequirement, sampleMappings };
});

vi.mock('@/lib/api', () => ({
  frameworksApi: {
    get: vi.fn().mockResolvedValue({
      data: { id: 'fw-1', name: 'SOC 2', type: 'regulatory', version: '2017' },
    }),
    getReadiness: vi.fn().mockResolvedValue({
      data: { score: 75, total: 4, compliant: 3 },
    }),
    getRequirementTree: vi.fn().mockResolvedValue({
      data: [fixtures.sampleRequirement],
    }),
    getRequirement: vi.fn().mockResolvedValue({
      data: fixtures.sampleRequirement,
    }),
    updateRequirement: vi.fn().mockResolvedValue({ data: fixtures.sampleRequirement }),
    createRequirement: vi.fn().mockResolvedValue({ data: fixtures.sampleRequirement }),
    bulkUploadRequirements: vi.fn().mockResolvedValue({ data: { count: 0 } }),
  },
  mappingsApi: {
    byRequirement: vi.fn().mockResolvedValue({ data: fixtures.sampleMappings }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
  usersApi: {
    list: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

const openRequirementPanel = async () => {
  render(<FrameworkDetail />);
  // Wait for the requirement row to render, then click it to open the panel.
  const requirementTitle = await screen.findByText('Access Control');
  fireEvent.click(requirementTitle);
  // Confirm the detail panel rendered.
  await screen.findByText('Requirement Details');
};

describe('FrameworkDetail — Mapped Controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockedAuth({ 'controls:update': true, 'controls:delete': true });
  });

  it('renders mapped control chips in the requirement detail panel', async () => {
    await openRequirementPanel();
    await waitFor(() => {
      expect(screen.getByText('AC-001')).toBeInTheDocument();
      expect(screen.getByText('AC-002')).toBeInTheDocument();
    });
    const list = screen.getByRole('list', { name: /mapped controls/i });
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(2);
  });

  it('shows the "Add mapping" button when the user has controls:update', async () => {
    setMockedAuth({ 'controls:update': true, 'controls:delete': false });
    await openRequirementPanel();
    expect(await screen.findByRole('button', { name: /add mapping/i })).toBeInTheDocument();
  });

  it('hides the "Add mapping" button when the user lacks controls:update', async () => {
    setMockedAuth({ 'controls:update': false, 'controls:delete': true });
    await openRequirementPanel();
    await screen.findByText('AC-001');
    expect(screen.queryByRole('button', { name: /add mapping/i })).not.toBeInTheDocument();
  });

  it('does not render kebab triggers when both mapping permissions are false', async () => {
    setMockedAuth({ 'controls:update': false, 'controls:delete': false });
    await openRequirementPanel();
    await screen.findByText('AC-001');
    expect(screen.queryByRole('button', { name: /mapping actions/i })).not.toBeInTheDocument();
  });

  it('opens the MappingEditorModal in edit mode with anchor props', async () => {
    setMockedAuth({ 'controls:update': true, 'controls:delete': true });
    await openRequirementPanel();
    await screen.findByText('AC-001');

    const trigger = screen.getByRole('button', {
      name: /mapping actions for ac-001/i,
    });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByRole('menu');
    const editItem = screen.getByRole('menuitem', { name: /^edit$/i });
    expect(menu).toContainElement(editItem);
    fireEvent.click(editItem);

    const modal = await screen.findByTestId('mapping-editor-modal');
    expect(modal).toHaveAttribute('data-mode', 'requirement-to-controls');
    expect(modal).toHaveAttribute('data-requirement-id', 'req-1');
    expect(modal).toHaveAttribute('data-framework-id', 'fw-1');
    expect(modal).toHaveAttribute('data-control-id', 'ctrl-1');
    expect(modal).toHaveAttribute('data-editing-mapping-id', 'map-1');
  });

  it('opens the modal in create mode with existing mapping IDs from the "Add mapping" button', async () => {
    await openRequirementPanel();
    const addBtn = await screen.findByRole('button', { name: /add mapping/i });
    fireEvent.click(addBtn);
    const modal = await screen.findByTestId('mapping-editor-modal');
    expect(modal).toHaveAttribute('data-mode', 'requirement-to-controls');
    expect(modal).toHaveAttribute('data-editing-mapping-id', '');
    const existing = JSON.parse(modal.getAttribute('data-existing-mapping-ids') || '[]');
    expect(existing).toEqual(expect.arrayContaining(['ctrl-1', 'ctrl-2']));
  });

  it('shows an inline confirm and calls mappingsApi.delete on confirm', async () => {
    const { mappingsApi } = await import('@/lib/api');
    await openRequirementPanel();
    await screen.findByText('AC-001');

    const trigger = screen.getByRole('button', {
      name: /mapping actions for ac-001/i,
    });
    fireEvent.click(trigger);
    const deleteItem = screen.getByRole('menuitem', { name: /^delete$/i });
    fireEvent.click(deleteItem);

    expect(await screen.findByText(/remove this mapping\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^confirm$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mappingsApi.delete).toHaveBeenCalledWith('map-1');
    });
  });

  it('shows Edit, Copy to framework…, and Delete in that order when both permissions are present', async () => {
    setMockedAuth({ 'controls:update': true, 'controls:delete': true });
    await openRequirementPanel();
    await screen.findByText('AC-001');

    const trigger = screen.getByRole('button', {
      name: /mapping actions for ac-001/i,
    });
    fireEvent.click(trigger);

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(/^edit$/i);
    expect(items[1]).toHaveTextContent(/copy to framework/i);
    expect(items[2]).toHaveTextContent(/^delete$/i);
  });

  it('shows Edit + Copy but not Delete when delete permission is absent', async () => {
    setMockedAuth({ 'controls:update': true, 'controls:delete': false });
    await openRequirementPanel();
    await screen.findByText('AC-001');

    fireEvent.click(screen.getByRole('button', { name: /mapping actions for ac-001/i }));
    expect(screen.getByRole('menuitem', { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /copy to framework/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('hides Edit and Copy when edit permission is absent (Delete-only menu)', async () => {
    setMockedAuth({ 'controls:update': false, 'controls:delete': true });
    await openRequirementPanel();
    await screen.findByText('AC-001');

    fireEvent.click(screen.getByRole('button', { name: /mapping actions for ac-001/i }));
    expect(screen.queryByRole('menuitem', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /copy to framework/i })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('opens MappingEditorModal in copy mode with defaults seeded from the source mapping', async () => {
    setMockedAuth({ 'controls:update': true, 'controls:delete': true });
    await openRequirementPanel();
    await screen.findByText('AC-001');

    fireEvent.click(screen.getByRole('button', { name: /mapping actions for ac-001/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /copy to framework/i }));

    const modal = await screen.findByTestId('mapping-editor-modal');
    expect(modal).toHaveAttribute('data-mode', 'control-to-requirements');
    expect(modal).toHaveAttribute('data-control-id', 'ctrl-1');
    expect(modal).toHaveAttribute('data-default-mapping-type', 'primary');
    expect(modal).toHaveAttribute('data-default-notes', 'Primary mapping notes');
    // Edit-mode props should be absent for copy.
    expect(modal).toHaveAttribute('data-editing-mapping-id', '');
    // existingMappingIds is an empty array (copy lets target framework decide).
    expect(modal.getAttribute('data-existing-mapping-ids')).toBe('[]');
  });

  it('invalidates the by-requirement and by-control query keys after delete', async () => {
    // Spy on QueryClient via the rendered component's internal client. The
    // simplest assertion is that mappingsApi.byRequirement is re-called once
    // invalidation fires — react-query refetches active queries on invalidate.
    const { mappingsApi } = await import('@/lib/api');
    await openRequirementPanel();
    await screen.findByText('AC-001');

    const callsBefore = vi.mocked(mappingsApi.byRequirement).mock.calls.length;

    const trigger = screen.getByRole('button', {
      name: /mapping actions for ac-001/i,
    });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(mappingsApi.delete).toHaveBeenCalledWith('map-1');
    });

    // After delete, react-query invalidates and refetches active queries.
    await waitFor(() => {
      expect(vi.mocked(mappingsApi.byRequirement).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
