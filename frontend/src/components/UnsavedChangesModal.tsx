import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onStay} />

      {/* Modal */}
      <div className="relative bg-surface-900 border border-surface-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 bg-yellow-500/20 rounded-full">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-surface-100">{title}</h3>
            <p className="mt-2 text-sm text-surface-600">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onStay}>
            Stay on Page
          </Button>
          <Button variant="danger" onClick={onLeave}>
            Leave Without Saving
          </Button>
        </div>
      </div>
    </div>
  );
}
