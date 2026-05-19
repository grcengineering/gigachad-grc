import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
  title?: string;
  message?: string;
}

/**
 * Modal to confirm navigation away from page with unsaved changes
 */
export default function UnsavedChangesModal({
  isOpen,
  onStay,
  onLeave,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes that will be lost if you leave this page.',
}: UnsavedChangesModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onStay}
      title={
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-amber-100 rounded-full">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-700" />
          </div>
          <span>{title}</span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onStay}>
            Stay on Page
          </Button>
          <Button variant="danger" onClick={onLeave}>
            Leave Without Saving
          </Button>
        </div>
      }
      size="md"
    >
      <p className="text-sm text-surface-700">{message}</p>
    </Dialog>
  );
}
