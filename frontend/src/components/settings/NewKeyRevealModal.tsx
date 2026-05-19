import toast from 'react-hot-toast';
import { ClipboardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { type ApiKeyWithSecret } from '@/lib/api';

import { Button } from '@/components/ui/Button';

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
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="bg-surface-900 rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-surface-100">API Key Created</h3>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
          <p className="text-amber-600 text-sm">
            Save this key now. You won't be able to see it again!
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-surface-600 mb-1">Name</label>
            <p className="text-surface-100">{keyData.name}</p>
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-1">API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface-800 px-3 py-2 rounded text-green-600 font-mono text-sm overflow-x-auto">
                {keyData.key}
              </code>
              <Button
                onClick={() => copyToClipboard(keyData.key)}
                className="p-2"
                title="Copy to clipboard"
                variant="secondary"
              >
                <ClipboardIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="primary">
            I've Saved This Key
          </Button>
        </div>
      </div>
    </div>
  );
}
