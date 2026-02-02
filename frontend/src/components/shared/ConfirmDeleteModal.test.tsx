import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

describe('ConfirmDeleteModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<ConfirmDeleteModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ConfirmDeleteModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('should display default title', () => {
      render(<ConfirmDeleteModal {...defaultProps} />);
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    it('should display custom title', () => {
      render(<ConfirmDeleteModal {...defaultProps} title="Delete User" />);
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    it('should display default message with item name', () => {
      render(<ConfirmDeleteModal {...defaultProps} itemName="Test Item" />);
      expect(
        screen.getByText(/Are you sure you want to delete "Test Item"/)
      ).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(
        <ConfirmDeleteModal
          {...defaultProps}
          message="Custom warning message"
        />
      );
      expect(screen.getByText('Custom warning message')).toBeInTheDocument();
    });

    it('should display item type in default message', () => {
      render(<ConfirmDeleteModal {...defaultProps} itemType="control" />);
      expect(
        screen.getByText(/Are you sure you want to delete this control/)
      ).toBeInTheDocument();
    });
  });

  describe('buttons', () => {
    it('should display default button text', () => {
      render(<ConfirmDeleteModal {...defaultProps} />);
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should display custom button text', () => {
      render(
        <ConfirmDeleteModal
          {...defaultProps}
          confirmButtonText="Remove"
          cancelButtonText="Go Back"
        />
      );
      expect(screen.getByText('Remove')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ConfirmDeleteModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      render(<ConfirmDeleteModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Delete'));
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(
        <ConfirmDeleteModal {...defaultProps} onClose={onClose} />
      );

      // Click the backdrop (the flex container)
      const backdrop = container.querySelector('.flex.min-h-screen');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      render(<ConfirmDeleteModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Confirm Delete'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should display loading indicator when isLoading is true', () => {
      render(<ConfirmDeleteModal {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should disable buttons when isLoading is true', () => {
      render(<ConfirmDeleteModal {...defaultProps} isLoading={true} />);
      
      const deleteButton = screen.getByText('Deleting...').closest('button');
      const cancelButton = screen.getByText('Cancel');
      
      expect(deleteButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should not close on backdrop click when loading', () => {
      const onClose = vi.fn();
      const { container } = render(
        <ConfirmDeleteModal {...defaultProps} onClose={onClose} isLoading={true} />
      );

      const backdrop = container.querySelector('.flex.min-h-screen');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('variants', () => {
    it('should apply danger variant styles by default', () => {
      const { container } = render(<ConfirmDeleteModal {...defaultProps} />);
      const icon = container.querySelector('.bg-red-100');
      expect(icon).toBeInTheDocument();
    });

    it('should apply warning variant styles', () => {
      const { container } = render(
        <ConfirmDeleteModal {...defaultProps} variant="warning" />
      );
      const icon = container.querySelector('.bg-yellow-100');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('async confirmation', () => {
    it('should handle async onConfirm', async () => {
      const onConfirm = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      render(<ConfirmDeleteModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });
});
