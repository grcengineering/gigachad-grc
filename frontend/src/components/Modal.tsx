/**
 * Legacy Modal API. Thin wrapper over the design-system Dialog primitive
 * so existing callsites (5 of them) keep working with `isOpen` / `size`
 * naming. New code should import `Dialog` from @/components/ui directly.
 */
import { ReactNode } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Kept for API compatibility — Dialog renders a close button by default. */
  showCloseButton?: boolean;
  /** Kept for API compatibility — Dialog handles ESC via HeadlessUI. */
  closeOnEscape?: boolean;
  /** Kept for API compatibility — Dialog closes on overlay click by default. */
  closeOnOverlayClick?: boolean;
  className?: string;
}

// Legacy 'full' size maps to Dialog's largest 'xl'.
const sizeMap: Record<NonNullable<ModalProps['size']>, 'sm' | 'md' | 'lg' | 'xl'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  full: 'xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={sizeMap[size]}
      className={className}
    >
      {children}
    </Dialog>
  );
}

/** Footer slot helper for Modal — equivalent to using <Dialog footer={...}>. */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ?? 'flex justify-end gap-3 pt-4'}>{children}</div>;
}

// Confirmation Modal for delete operations
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-surface-700 mb-6">{message}</p>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          isLoading={isLoading}
          loadingText="Processing..."
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default Modal;
