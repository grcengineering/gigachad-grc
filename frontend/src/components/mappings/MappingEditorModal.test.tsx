import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@/test/utils';

import { MappingEditorModal } from './MappingEditorModal';

// Mock react-hot-toast so we can assert on the error toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock the modular API modules used by the modal
vi.mock('@/lib/api/controls.api', () => ({
  controlsApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/lib/api/frameworks.api', () => ({
  frameworksApi: {
    list: vi.fn(),
    requirements: {
      list: vi.fn(),
    },
    mappings: {
      bulkCreate: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import toast from 'react-hot-toast';
import { controlsApi } from '@/lib/api/controls.api';
import { frameworksApi } from '@/lib/api/frameworks.api';

const FRAMEWORK_ID = 'fw-1';
const REQUIREMENT_ID = 'req-1';
const CONTROL_ID = 'ctrl-1';

const CONTROL_A = {
  id: 'c-a',
  controlId: 'AC-001',
  title: 'Access Control Policy',
  description: '',
  category: 'access_control',
  organizationId: 'org-1',
  createdAt: '',
  updatedAt: '',
};

const CONTROL_B = {
  id: 'c-b',
  controlId: 'AC-002',
  title: 'User Authentication',
  description: '',
  category: 'access_control',
  organizationId: 'org-1',
  createdAt: '',
  updatedAt: '',
};

const REQ_A = {
  id: 'r-a',
  frameworkId: FRAMEWORK_ID,
  reference: 'CC1.1',
  title: 'Control Environment',
  description: '',
  isCategory: false,
  order: 1,
};

const REQ_B = {
  id: 'r-b',
  frameworkId: FRAMEWORK_ID,
  reference: 'CC1.2',
  title: 'Communication',
  description: '',
  isCategory: false,
  order: 2,
};

describe('MappingEditorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(controlsApi.list).mockResolvedValue([CONTROL_A, CONTROL_B] as never);
    vi.mocked(frameworksApi.list).mockResolvedValue([
      { id: FRAMEWORK_ID, name: 'SOC 2', type: 'regulatory', isActive: true } as never,
    ]);
    vi.mocked(frameworksApi.requirements.list).mockResolvedValue([REQ_A, REQ_B] as never);
    vi.mocked(frameworksApi.mappings.bulkCreate).mockResolvedValue([
      { success: true, mapping: { id: 'm-new-1' } },
    ] as never);
    vi.mocked(frameworksApi.mappings.update).mockResolvedValue({ id: 'm-existing' } as never);
  });

  describe('Rendering', () => {
    it('renders with create title when not in edit mode', () => {
      render(
        <MappingEditorModal
          open
          onClose={vi.fn()}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          onSaved={vi.fn()}
        />
      );
      expect(screen.getByRole('heading', { name: 'Add mappings' })).toBeInTheDocument();
    });

    it('renders with edit title when editingMappingId is set', () => {
      render(
        <MappingEditorModal
          open
          onClose={vi.fn()}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          editingMappingId="m-existing"
          onSaved={vi.fn()}
        />
      );
      expect(screen.getByRole('heading', { name: 'Edit mapping' })).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <MappingEditorModal
          open={false}
          onClose={vi.fn()}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          onSaved={vi.fn()}
        />
      );
      expect(screen.queryByRole('heading', { name: 'Add mappings' })).not.toBeInTheDocument();
    });

    it('invokes onClose when Cancel is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <MappingEditorModal
          open
          onClose={onClose}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          onSaved={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Stage transitions', () => {
    it('moves forward search -> multi-select -> per-row-form, and Back rewinds', async () => {
      const user = userEvent.setup();
      render(
        <MappingEditorModal
          open
          onClose={vi.fn()}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          onSaved={vi.fn()}
        />
      );

      // Stage 1: search. Click Next.
      await user.click(screen.getByRole('button', { name: 'Next' }));

      // Stage 2: multi-select shows the controls list.
      await waitFor(() => {
        expect(screen.getByText('AC-001')).toBeInTheDocument();
      });
      const list = screen.getByRole('list', { name: /candidate controls/i });
      const firstCheckbox = within(list).getAllByRole('checkbox')[0];
      await user.click(firstCheckbox);
      await user.click(screen.getByRole('button', { name: 'Next' }));

      // Stage 3: per-row-form shows the Save button and a mapping-type select.
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /mapping type for/i })).toBeInTheDocument();

      // Back -> multi-select again
      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(screen.getByRole('list', { name: /candidate controls/i })).toBeInTheDocument();

      // Back again -> search
      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(screen.getByPlaceholderText(/filter controls by id/i)).toBeInTheDocument();
    });
  });

  describe('Create mode save', () => {
    it('calls bulkCreate with correct payload shape for requirement-to-controls', async () => {
      const onSaved = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(
        <MappingEditorModal
          open
          onClose={onClose}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          onSaved={onSaved}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(screen.getByText('AC-001')).toBeInTheDocument());
      const list = screen.getByRole('list', { name: /candidate controls/i });
      await user.click(within(list).getAllByRole('checkbox')[0]);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(frameworksApi.mappings.bulkCreate).toHaveBeenCalledTimes(1);
      });
      expect(frameworksApi.mappings.bulkCreate).toHaveBeenCalledWith({
        mappings: [
          {
            frameworkId: FRAMEWORK_ID,
            requirementId: REQUIREMENT_ID,
            controlId: CONTROL_A.id,
            mappingType: 'primary',
            notes: undefined,
          },
        ],
      });
      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith(['m-new-1']);
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edit mode', () => {
    it('pre-populates a single row and calls update on Save', async () => {
      const onSaved = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(
        <MappingEditorModal
          open
          onClose={onClose}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          editingMappingId="m-existing"
          onSaved={onSaved}
        />
      );

      // Should land directly on per-row-form with one row.
      const select = await screen.findByRole('combobox', { name: /mapping type for/i });
      expect(select).toBeInTheDocument();

      await user.selectOptions(select, 'supporting');
      const notes = screen.getByRole('textbox', { name: /notes for/i });
      await user.type(notes, 'Some note');

      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(frameworksApi.mappings.update).toHaveBeenCalledWith('m-existing', {
          mappingType: 'supporting',
          notes: 'Some note',
        });
      });
      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith(['m-existing']);
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Error handling', () => {
    it('shows an error toast when bulkCreate rejects', async () => {
      vi.mocked(frameworksApi.mappings.bulkCreate).mockRejectedValueOnce(new Error('boom'));
      const user = userEvent.setup();

      render(
        <MappingEditorModal
          open
          onClose={vi.fn()}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          onSaved={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(screen.getByText('AC-001')).toBeInTheDocument());
      const list = screen.getByRole('list', { name: /candidate controls/i });
      await user.click(within(list).getAllByRole('checkbox')[0]);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('boom');
      });
      expect(screen.getByRole('alert')).toHaveTextContent('boom');
    });
  });

  describe('Validation gating', () => {
    it('disables Next on multi-select until at least one item is checked', async () => {
      const user = userEvent.setup();
      render(
        <MappingEditorModal
          open
          onClose={vi.fn()}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[]}
          onSaved={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(screen.getByText('AC-001')).toBeInTheDocument());
      const nextBtn = screen.getByRole('button', { name: 'Next' });
      expect(nextBtn).toBeDisabled();
      const list = screen.getByRole('list', { name: /candidate controls/i });
      await user.click(within(list).getAllByRole('checkbox')[0]);
      expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
    });

    it('disables Next on search stage in control mode until framework is picked', async () => {
      render(
        <MappingEditorModal
          open
          onClose={vi.fn()}
          mode="control-to-requirements"
          controlId={CONTROL_ID}
          existingMappingIds={[]}
          onSaved={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });
  });

  describe('existingMappingIds', () => {
    it('hides already-mapped candidates from the picker', async () => {
      const user = userEvent.setup();
      render(
        <MappingEditorModal
          open
          onClose={vi.fn()}
          mode="requirement-to-controls"
          requirementId={REQUIREMENT_ID}
          frameworkId={FRAMEWORK_ID}
          existingMappingIds={[CONTROL_A.id]}
          onSaved={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(screen.getByText('AC-002')).toBeInTheDocument());
      expect(screen.queryByText('AC-001')).not.toBeInTheDocument();
    });
  });
});
