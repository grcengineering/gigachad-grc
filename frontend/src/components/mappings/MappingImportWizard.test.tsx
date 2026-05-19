import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within, fireEvent } from '@/test/utils';

import { MappingImportWizard } from './MappingImportWizard';
import type { ImportResult } from '@/lib/apiTypes';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  mappingsApi: {
    bulkImport: vi.fn(),
  },
}));

vi.mock('@/lib/api/frameworks.api', () => ({
  frameworksApi: {
    list: vi.fn(),
  },
}));

import { mappingsApi } from '@/lib/api';
import { frameworksApi } from '@/lib/api/frameworks.api';

const FRAMEWORK_ID = 'fw-1';

const DRY_RUN_RESULT: ImportResult = {
  totalRows: 3,
  successful: 1,
  duplicates: 1,
  errors: [
    {
      row: 4,
      message: 'Unknown framework code',
      originalValues: {
        framework_code: 'unknown:1',
        requirement_ref: 'CC1.1',
        control_code: 'AC-001',
        mapping_type: 'primary',
      },
    },
  ],
  rows: [
    {
      row: 2,
      status: 'will_create',
      originalValues: {
        framework_code: 'soc2:2017',
        requirement_ref: 'CC1.1',
        control_code: 'AC-001',
        mapping_type: 'primary',
        notes: 'Initial mapping',
      },
      resolvedIds: {
        frameworkId: 'fw-1',
        requirementId: 'req-1',
        controlId: 'ctrl-1',
      },
    },
    {
      row: 3,
      status: 'duplicate',
      originalValues: {
        framework_code: 'soc2:2017',
        requirement_ref: 'CC1.2',
        control_code: 'AC-002',
        mapping_type: 'supporting',
      },
    },
    {
      row: 4,
      status: 'error',
      errorMessage: 'Unknown framework code',
      originalValues: {
        framework_code: 'unknown:1',
        requirement_ref: 'CC1.1',
        control_code: 'AC-001',
        mapping_type: 'primary',
      },
    },
  ],
  dryRun: true,
  sourceStorageKey: null,
};

const COMMIT_RESULT: ImportResult = {
  ...DRY_RUN_RESULT,
  dryRun: false,
  sourceStorageKey: 'imports/mappings/org-1/2026/05/17/abc-mappings.csv',
};

function selectFile(name = 'mappings.csv') {
  const file = new File(['framework_code\n'], name, { type: 'text/csv' });
  const input = screen.getByLabelText(/mapping import file/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('MappingImportWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mappingsApi.bulkImport).mockImplementation(async (_file: File, dryRun: boolean) => {
      return dryRun ? DRY_RUN_RESULT : COMMIT_RESULT;
    });
    vi.mocked(frameworksApi.list).mockResolvedValue([
      { id: FRAMEWORK_ID, name: 'SOC 2', version: '2017', type: 'regulatory', isActive: true },
    ] as never);
  });

  it('opens at the upload stage with Validate disabled until a file is chosen', () => {
    render(
      <MappingImportWizard open onClose={vi.fn()} frameworkId={FRAMEWORK_ID} onComplete={vi.fn()} />
    );

    expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'upload');
    expect(screen.getByRole('button', { name: /validate/i })).toBeDisabled();
  });

  it('does not render the framework selector when frameworkId is supplied', () => {
    render(
      <MappingImportWizard open onClose={vi.fn()} frameworkId={FRAMEWORK_ID} onComplete={vi.fn()} />
    );
    expect(screen.queryByLabelText(/framework \(optional\)/i)).not.toBeInTheDocument();
  });

  it('renders the framework selector when frameworkId is absent', async () => {
    render(<MappingImportWizard open onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByLabelText(/framework \(optional\)/i)).toBeInTheDocument();
    // Validate stays disabled until both file and framework are picked
    expect(screen.getByRole('button', { name: /validate/i })).toBeDisabled();

    selectFile();
    // Still disabled — no framework picked
    expect(screen.getByRole('button', { name: /validate/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /SOC 2/i })).toBeInTheDocument();
    });
    await userEvent.selectOptions(screen.getByLabelText(/framework \(optional\)/i), FRAMEWORK_ID);
    expect(screen.getByRole('button', { name: /validate/i })).not.toBeDisabled();
  });

  it('enables Validate after a file is selected and advances to preview after dry-run', async () => {
    const user = userEvent.setup();
    render(
      <MappingImportWizard open onClose={vi.fn()} frameworkId={FRAMEWORK_ID} onComplete={vi.fn()} />
    );

    selectFile();
    expect(screen.getByRole('button', { name: /validate/i })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'preview');
    });
    expect(mappingsApi.bulkImport).toHaveBeenCalledWith(expect.any(File), true);
  });

  it('renders preview rows with the correct status colour for each outcome', async () => {
    const user = userEvent.setup();
    render(
      <MappingImportWizard open onClose={vi.fn()} frameworkId={FRAMEWORK_ID} onComplete={vi.fn()} />
    );

    selectFile();
    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByTestId('preview-row-2')).toBeInTheDocument();
    });
    expect(screen.getByTestId('preview-row-2')).toHaveAttribute('data-status', 'will_create');
    expect(screen.getByTestId('preview-row-3')).toHaveAttribute('data-status', 'duplicate');
    expect(screen.getByTestId('preview-row-4')).toHaveAttribute('data-status', 'error');

    const willCreatePill = within(screen.getByTestId('preview-row-2')).getByText(/will create/i);
    expect(willCreatePill.className).toMatch(/text-green-700/);
    const duplicatePill = within(screen.getByTestId('preview-row-3')).getByText(/duplicate/i);
    expect(duplicatePill.className).toMatch(/text-yellow-700/);
    const errorPill = within(screen.getByTestId('preview-row-4')).getByText(/^error$/i);
    expect(errorPill.className).toMatch(/text-red-700/);
  });

  it('calls bulkImport in commit mode (dryRun=false) when Confirm import is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MappingImportWizard open onClose={vi.fn()} frameworkId={FRAMEWORK_ID} onComplete={vi.fn()} />
    );

    selectFile();
    await user.click(screen.getByRole('button', { name: /validate/i }));
    await waitFor(() => {
      expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'preview');
    });

    await user.click(screen.getByRole('button', { name: /confirm import/i }));

    await waitFor(() => {
      expect(mappingsApi.bulkImport).toHaveBeenLastCalledWith(expect.any(File), false);
    });
  });

  it('shows the result stage with the correct counts after commit', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <MappingImportWizard
        open
        onClose={vi.fn()}
        frameworkId={FRAMEWORK_ID}
        onComplete={onComplete}
      />
    );

    selectFile();
    await user.click(screen.getByRole('button', { name: /validate/i }));
    await waitFor(() =>
      expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'preview')
    );
    await user.click(screen.getByRole('button', { name: /confirm import/i }));

    await waitFor(() =>
      expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'result')
    );

    // Summary tiles: total / created / duplicates / errors
    const stageNode = screen.getByTestId('wizard-content');
    expect(within(stageNode).getByText('Total rows')).toBeInTheDocument();
    expect(within(stageNode).getByText('Created')).toBeInTheDocument();
    expect(within(stageNode).getByText('Duplicates')).toBeInTheDocument();
    // "Errors" appears as both a tile label and the error panel heading
    expect(within(stageNode).getAllByText('Errors').length).toBeGreaterThanOrEqual(1);

    // Find counts via their tile siblings
    const createdTile = within(stageNode).getByText('Created').parentElement;
    expect(createdTile).toHaveTextContent('1');
    const duplicatesTile = within(stageNode).getByText('Duplicates').parentElement;
    expect(duplicatesTile).toHaveTextContent('1');

    // Error list rendered
    expect(within(stageNode).getByText(/unknown framework code/i)).toBeInTheDocument();
  });

  it('calls onComplete with the result and onClose when Done is clicked', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onClose = vi.fn();
    render(
      <MappingImportWizard
        open
        onClose={onClose}
        frameworkId={FRAMEWORK_ID}
        onComplete={onComplete}
      />
    );

    selectFile();
    await user.click(screen.getByRole('button', { name: /validate/i }));
    await waitFor(() =>
      expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'preview')
    );
    await user.click(screen.getByRole('button', { name: /confirm import/i }));
    await waitFor(() =>
      expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'result')
    );

    await user.click(screen.getByRole('button', { name: /done/i }));

    expect(onComplete).toHaveBeenCalledWith(COMMIT_RESULT);
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces error responses from dry-run as a visible alert', async () => {
    vi.mocked(mappingsApi.bulkImport).mockRejectedValueOnce({
      response: { data: { message: 'Unsupported file type' } },
    });
    const user = userEvent.setup();

    render(
      <MappingImportWizard open onClose={vi.fn()} frameworkId={FRAMEWORK_ID} onComplete={vi.fn()} />
    );

    selectFile();
    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/unsupported file type/i);
    });
    // Should remain on the upload stage
    expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'upload');
  });

  it('Back from preview preserves the selected file', async () => {
    const user = userEvent.setup();
    render(
      <MappingImportWizard open onClose={vi.fn()} frameworkId={FRAMEWORK_ID} onComplete={vi.fn()} />
    );

    const file = selectFile('preserved.csv');
    await user.click(screen.getByRole('button', { name: /validate/i }));
    await waitFor(() =>
      expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'preview')
    );

    await user.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByTestId('wizard-content')).toHaveAttribute('data-stage', 'upload');

    // The filename should still be displayed and Validate remains enabled
    expect(screen.getByText(file.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate/i })).not.toBeDisabled();
  });

  it('does not render when open is false', () => {
    render(
      <MappingImportWizard
        open={false}
        onClose={vi.fn()}
        frameworkId={FRAMEWORK_ID}
        onComplete={vi.fn()}
      />
    );
    expect(screen.queryByTestId('wizard-content')).not.toBeInTheDocument();
  });
});
