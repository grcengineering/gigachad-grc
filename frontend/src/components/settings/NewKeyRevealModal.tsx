import toast from 'react-hot-toast';
import { ClipboardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { type ApiKeyWithSecret } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface NewKeyRevealModalProps {
  keyData: ApiKeyWithSecret;
  onClose: () => void;
}

export default function NewKeyRevealModal({ keyData, onClose }: NewKeyRevealModalProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
          <span>API Key Created</span>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose} variant="primary">
            I&rsquo;ve Saved This Key
          </Button>
        </div>
      }
    >
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
        <p className="text-amber-800 text-sm">
          Save this key now. You won&rsquo;t be able to see it again!
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-surface-600 mb-1">Name</label>
          <p className="text-surface-900">{keyData.name}</p>
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-1">API Key</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-surface-100 border border-surface-200 px-3 py-2 rounded text-brand-700 font-mono text-sm overflow-x-auto">
              {keyData.key}
            </code>
            <Button
              onClick={() => copyToClipboard(keyData.key)}
              size="icon"
              title="Copy to clipboard"
              variant="secondary"
            >
              <ClipboardIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
