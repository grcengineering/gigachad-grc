import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test/utils';
import MappingGaps from './MappingGaps';

// Default auth: full access.
const hasPermissionMock = vi.fn((perm: string) => perm === 'frameworks:view');

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'admin@test.com', role: 'admin' },
    isAuthenticated: true,
    hasPermission: (perm: string) => hasPermissionMock(perm),
  }),
}));

const findGapsMock = vi.fn();
const listFrameworksMock = vi.fn();

vi.mock('@/lib/api', () => ({
  frameworksApi: {
    list: () => listFrameworksMock().then((data: unknown) => ({ data })),
  },
  mappingsApi: {
    findGaps: (params?: { frameworkId?: string; type?: string }) =>
      findGapsMock(params).then((data: unknown) => ({ data })),
  },
}));

const exportDataMock = vi.fn();
vi.mock('@/lib/export', () => ({
  exportData: (opts: unknown) => exportDataMock(opts),
}));

// Mock dynamic imports for PDF export.
const jsPdfSave = vi.fn();
const jsPdfCtor = vi.fn().mockImplementation(() => ({
  setFillColor: vi.fn(),
  rect: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  addImage: vi.fn(),
  save: jsPdfSave,
}));
const html2canvasFn = vi.fn().mockResolvedValue({
  width: 800,
  height: 600,
  toDataURL: () => 'data:image/png;base64,xxx',
});
vi.mock('jspdf', () => ({ jsPDF: jsPdfCtor }));
vi.mock('html2canvas', () => ({ default: html2canvasFn }));

describe('MappingGaps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermissionMock.mockImplementation((perm: string) => perm === 'frameworks:view');
    listFrameworksMock.mockResolvedValue([
      { id: 'fw-1', name: 'SOC 2', type: 'regulatory' },
      { id: 'fw-2', name: 'ISO 27001', type: 'regulatory' },
    ]);
    findGapsMock.mockResolvedValue([
      {
        id: 'req:r1:no-controls',
        type: 'no-controls',
        framework: { id: 'fw-1', name: 'SOC 2' },
        requirement: { id: 'r1', reference: 'CC1.1', title: 'Control Environment' },
        summary: 'Requirement has no mapped controls',
      },
      {
        id: 'req:r2:supporting-only',
        type: 'supporting-only',
        framework: { id: 'fw-1', name: 'SOC 2' },
        requirement: { id: 'r2', reference: 'CC2.1', title: 'Communication' },
        summary: 'Requirement is covered only by supporting controls',
      },
      {
        id: 'ctrl:c1:unused-controls',
        type: 'unused-controls',
        control: { id: 'c1', controlId: 'AC-001', title: 'Access Control Policy' },
        summary: 'Control is not mapped to any requirement',
      },
    ]);
  });

  it('renders header and the four tabs', async () => {
    render(<MappingGaps />);
    expect(screen.getByText('Mapping Gap Analysis')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All gap types' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Requirements with no controls' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', {
        name: 'Requirements with only supporting controls',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Controls not mapped to anything' })
    ).toBeInTheDocument();
    await waitFor(() => expect(findGapsMock).toHaveBeenCalled());
  });

  it('shows Type/Framework/Reference columns on All tab and renders rows', async () => {
    render(<MappingGaps />);
    await waitFor(() => expect(screen.getByText('CC1.1')).toBeInTheDocument());
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['Type', 'Framework', 'Reference', 'Requirement/Control', 'Title']);
    expect(screen.getByText('AC-001')).toBeInTheDocument();
  });

  it('switches to unused-controls tab: shows Control ID column, hides Framework, disables framework selector', async () => {
    render(<MappingGaps />);
    await waitFor(() => expect(findGapsMock).toHaveBeenCalled());
    findGapsMock.mockClear();

    fireEvent.click(screen.getByRole('tab', { name: 'Controls not mapped to anything' }));

    await waitFor(() =>
      expect(findGapsMock).toHaveBeenCalledWith({
        frameworkId: undefined,
        type: 'unused-controls',
      })
    );
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['Control ID', 'Title']);
    expect(screen.getByLabelText('Filter by framework')).toBeDisabled();
  });

  it('refetches with frameworkId when framework filter changes', async () => {
    render(<MappingGaps />);
    // Wait for both queries to fire and the framework options to render.
    await waitFor(() => expect(listFrameworksMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('option', { name: 'SOC 2' })).toBeInTheDocument());
    findGapsMock.mockClear();

    const select = screen.getByLabelText('Filter by framework') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'fw-1' } });
    expect(select.value).toBe('fw-1');

    await waitFor(() =>
      expect(findGapsMock).toHaveBeenCalledWith({
        frameworkId: 'fw-1',
        type: undefined,
      })
    );
  });

  it('renders empty state when API returns []', async () => {
    findGapsMock.mockResolvedValueOnce([]);
    render(<MappingGaps />);
    await waitFor(() => expect(screen.getByText('No mapping gaps')).toBeInTheDocument());
  });

  it('gates on hasPermission: shows Not authorized and does NOT call the API', async () => {
    hasPermissionMock.mockReturnValue(false);
    render(<MappingGaps />);
    expect(screen.getByText('Not authorized')).toBeInTheDocument();
    expect(findGapsMock).not.toHaveBeenCalled();
    expect(listFrameworksMock).not.toHaveBeenCalled();
  });

  it('exports CSV with correct columns for the active tab', async () => {
    render(<MappingGaps />);
    await waitFor(() => expect(screen.getByText('CC1.1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Export to CSV/i }));

    await waitFor(() => expect(exportDataMock).toHaveBeenCalled());
    const call = exportDataMock.mock.calls[0][0];
    expect(call.format).toBe('csv');
    expect(call.filename).toMatch(/^mapping-gaps-all-\d{4}-\d{2}-\d{2}$/);
    expect(call.columns.map((c: { header: string }) => c.header)).toEqual([
      'Type',
      'Framework',
      'Reference',
      'Requirement/Control',
      'Title',
    ]);
    expect(call.data).toHaveLength(3);
  });

  it('exports CSV with unused-controls columns when on that tab', async () => {
    render(<MappingGaps />);
    await waitFor(() => expect(findGapsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: 'Controls not mapped to anything' }));
    await waitFor(() => expect(screen.getByText('AC-001')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Export to CSV/i }));

    await waitFor(() => expect(exportDataMock).toHaveBeenCalled());
    const call = exportDataMock.mock.calls[0][0];
    expect(call.columns.map((c: { header: string }) => c.header)).toEqual(['Control ID', 'Title']);
    expect(call.filename).toMatch(/^mapping-gaps-unused-controls-\d{4}-\d{2}-\d{2}$/);
  });

  it('triggers dynamic imports of jspdf and html2canvas on PDF export', async () => {
    render(<MappingGaps />);
    await waitFor(() => expect(screen.getByText('CC1.1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Export to PDF/i }));

    await waitFor(() => {
      expect(html2canvasFn).toHaveBeenCalled();
      expect(jsPdfCtor).toHaveBeenCalled();
      expect(jsPdfSave).toHaveBeenCalled();
    });
  });
});
