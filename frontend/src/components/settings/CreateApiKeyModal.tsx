import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiKeysApi, type ApiKeyWithSecret } from '@/lib/api';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-900 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-surface-100 mb-4">Create API Key</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="e.g., Production API Key"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
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
                    className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-surface-700 text-sm">{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
