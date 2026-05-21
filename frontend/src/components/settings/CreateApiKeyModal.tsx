import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiKeysApi, type ApiKeyWithSecret } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface CreateApiKeyModalProps {
  availableScopes: string[];
  onClose: () => void;
  onCreated: (key: ApiKeyWithSecret) => void;
}

export default function CreateApiKeyModal({
  availableScopes,
  onClose,
  onCreated,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopes, setScopes] = useState<string[]>(['all']);

  const createMutation = useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: (response) => {
      onCreated(response.data);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      scopes,
    });
  };

  const toggleScope = (scope: string) => {
    if (scope === 'all') {
      setScopes(['all']);
    } else {
      const newScopes = scopes.includes(scope)
        ? scopes.filter((s) => s !== scope)
        : [...scopes.filter((s) => s !== 'all'), scope];
      setScopes(newScopes.length === 0 ? ['all'] : newScopes);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create API Key"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-api-key-form"
            disabled={createMutation.isPending}
            isLoading={createMutation.isPending}
            variant="primary"
          >
            Create Key
          </Button>
        </div>
      }
    >
      <form id="create-api-key-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production API Key"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">
            Description (optional)
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Used for CI/CD pipeline"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Scopes</label>
          <div className="space-y-2">
            {availableScopes.map((scope) => (
              <label key={scope} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-surface-700 text-sm">{scope}</span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
