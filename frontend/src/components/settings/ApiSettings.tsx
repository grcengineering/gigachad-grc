import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi, type ApiKey, type ApiKeyWithSecret } from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import CreateApiKeyModal from './CreateApiKeyModal';
import NewKeyRevealModal from './NewKeyRevealModal';

import { Button } from '@/components/ui/Button';

export default function ApiSettings() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<ApiKeyWithSecret | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState<string | null>(null);

  const { data: keysResponse, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.list(),
    select: (res) => res.data,
  });

  const { data: scopesResponse } = useQuery({
    queryKey: ['api-scopes'],
    queryFn: () => apiKeysApi.getScopes(),
    select: (res) => res.data,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setConfirmingRevoke(null);
      toast.success('API key revoked');
    },
    onError: () => toast.error('Failed to revoke API key'),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.regenerate(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKey(response.data);
      setConfirmingRegenerate(null);
      setShowNewKeyModal(true);
      toast.success('API key regenerated');
    },
    onError: () => toast.error('Failed to regenerate API key'),
  });

  const handleKeyCreated = (key: ApiKeyWithSecret) => {
    queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    setNewKey(key);
    setShowCreateModal(false);
    setShowNewKeyModal(true);
    toast.success('API key created');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const keys = keysResponse?.keys || [];
  const availableScopes = scopesResponse?.scopes || [
    'all',
    'controls:read',
    'controls:write',
    'evidence:read',
    'evidence:write',
  ];

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">API Keys</h2>
          <p className="text-surface-600 text-sm mt-1">Manage API keys for programmatic access</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Generate New Key
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-surface-600">
          <p>No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key: ApiKey) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-4 bg-white/50 rounded-lg dark:bg-surface-900/50"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-surface-900 font-medium">{key.name}</p>
                  {!key.isActive && (
                    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-600 rounded">
                      Revoked
                    </span>
                  )}
                </div>
                <p className="text-surface-500 text-sm font-mono">grc_{key.keyPrefix}••••••••</p>
                <p className="text-surface-600 text-xs mt-1">
                  Created {formatDate(key.createdAt)} • Last used {formatDate(key.lastUsedAt)}
                </p>
                {key.scopes.length > 0 && (
                  <p className="text-surface-500 text-xs mt-1">Scopes: {key.scopes.join(', ')}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {key.isActive ? (
                  <>
                    {confirmingRegenerate === key.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-surface-600 text-sm">Regenerate?</span>
                        <Button
                          className="text-sm"
                          onClick={() => regenerateMutation.mutate(key.id)}
                          disabled={regenerateMutation.isPending}
                          variant="primary"
                        >
                          Yes
                        </Button>
                        <Button
                          className="text-sm"
                          onClick={() => setConfirmingRegenerate(null)}
                          variant="secondary"
                        >
                          No
                        </Button>
                      </div>
                    ) : confirmingRevoke === key.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-surface-600 text-sm">Revoke?</span>
                        <Button
                          className="text-sm"
                          onClick={() => revokeMutation.mutate(key.id)}
                          disabled={revokeMutation.isPending}
                          variant="danger"
                        >
                          Yes
                        </Button>
                        <Button
                          className="text-sm"
                          onClick={() => setConfirmingRevoke(null)}
                          variant="secondary"
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          className="text-sm"
                          onClick={() => setConfirmingRegenerate(key.id)}
                          variant="secondary"
                        >
                          Regenerate
                        </Button>
                        <Button
                          className="text-sm"
                          onClick={() => setConfirmingRevoke(key.id)}
                          variant="danger"
                        >
                          Revoke
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-surface-500 text-sm">Inactive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-600 font-medium">API Key Security</p>
            <p className="text-surface-600 text-sm mt-1">
              API keys grant access to your organization's data based on their scopes. Keep them
              secure and rotate them regularly.
            </p>
          </div>
        </div>
      </div>
      {/* Create Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          availableScopes={availableScopes}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleKeyCreated}
        />
      )}
      {/* New Key Reveal Modal */}
      {showNewKeyModal && newKey && (
        <NewKeyRevealModal
          keyData={newKey}
          onClose={() => {
            setShowNewKeyModal(false);
            setNewKey(null);
          }}
        />
      )}
    </div>
  );
}
