import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon, PencilIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { Button, Badge, Dialog, Input, Select, Textarea } from '@/components/ui';

interface Contract {
  id: string;
  vendorId: string;
  contractType: string;
  title: string;
  description?: string;
  contractValue?: number;
  currency?: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  autoRenew: boolean;
  status: string;
  storagePath?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  requiresSoc2: boolean;
  requiresIso27001: boolean;
  requiresHipaa: boolean;
  requiresGdpr: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  vendor: {
    id: string;
    name: string;
  };
}

interface ContractFormProps {
  contract: Contract | null;
  onSave: (data: Partial<Contract>) => Promise<void>;
  onCancel: () => void;
}

const CONTRACT_TYPE_OPTIONS = [
  { value: 'msa', label: 'MSA' },
  { value: 'nda', label: 'NDA' },
  { value: 'sow', label: 'SOW' },
  { value: 'dpa', label: 'DPA' },
  { value: 'sla', label: 'SLA' },
  { value: 'other', label: 'Other' },
];

const CONTRACT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
  { value: 'terminated', label: 'Terminated' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
];

function statusBadgeVariant(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'expired') return 'danger';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function ContractForm({ contract, onSave, onCancel }: ContractFormProps) {
  const [formData, setFormData] = useState<Partial<Contract>>({
    vendorId: contract?.vendorId || '',
    contractType: contract?.contractType || 'msa',
    title: contract?.title || '',
    description: contract?.description || '',
    contractValue: contract?.contractValue,
    currency: contract?.currency || 'USD',
    startDate: contract?.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
    endDate: contract?.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
    renewalDate: contract?.renewalDate ? new Date(contract.renewalDate).toISOString().split('T')[0] : '',
    autoRenew: contract?.autoRenew ?? false,
    status: contract?.status || 'active',
    requiresSoc2: contract?.requiresSoc2 ?? false,
    requiresIso27001: contract?.requiresIso27001 ?? false,
    requiresHipaa: contract?.requiresHipaa ?? false,
    requiresGdpr: contract?.requiresGdpr ?? false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Contract Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Contract Type *
              </label>
              <Select
                value={formData.contractType || ''}
                onChange={(value) => setFormData({ ...formData, contractType: value })}
                options={CONTRACT_TYPE_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Status *
              </label>
              <Select
                value={formData.status || ''}
                onChange={(value) => setFormData({ ...formData, status: value })}
                options={CONTRACT_STATUS_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Vendor ID *
              </label>
              <Input
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">
            Description
          </label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        {/* Financial Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Financial Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Contract Value
              </label>
              <Input
                type="number"
                value={formData.contractValue || ''}
                onChange={(e) => setFormData({ ...formData, contractValue: parseFloat(e.target.value) || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Currency
              </label>
              <Select
                value={formData.currency || 'USD'}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                options={CURRENCY_OPTIONS}
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Important Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Start Date *
              </label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                End Date *
              </label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Renewal Date
              </label>
              <Input
                type="date"
                value={formData.renewalDate || ''}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoRenew}
                onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                className="w-4 h-4 bg-surface-100 border-surface-300 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">Auto-renew contract</span>
            </label>
          </div>
        </div>

        {/* Compliance Requirements */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Compliance Requirements</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresSoc2}
                onChange={(e) => setFormData({ ...formData, requiresSoc2: e.target.checked })}
                className="w-4 h-4 bg-surface-100 border-surface-300 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">SOC 2 Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresIso27001}
                onChange={(e) => setFormData({ ...formData, requiresIso27001: e.target.checked })}
                className="w-4 h-4 bg-surface-100 border-surface-300 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">ISO 27001 Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresHipaa}
                onChange={(e) => setFormData({ ...formData, requiresHipaa: e.target.checked })}
                className="w-4 h-4 bg-surface-100 border-surface-300 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">HIPAA Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresGdpr}
                onChange={(e) => setFormData({ ...formData, requiresGdpr: e.target.checked })}
                className="w-4 h-4 bg-surface-100 border-surface-300 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">GDPR Required</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Contract
        </Button>
      </div>
    </form>
  );
}

function ContractView({ contract, onEdit, onDelete }: { contract: Contract; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-surface-900">{contract.title}</h2>
            <p className="mt-1 text-surface-600">{contract.vendor.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-surface-600 mb-1">Contract Type</dt>
              <dd className="text-sm text-surface-900 uppercase">{contract.contractType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-600 mb-1">Status</dt>
              <dd>
                <Badge variant={statusBadgeVariant(contract.status)}>{contract.status}</Badge>
              </dd>
            </div>
            {contract.description && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-surface-600 mb-1">Description</dt>
                <dd className="text-sm text-surface-900">{contract.description}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Financial Information */}
        {contract.contractValue && (
          <div>
            <h3 className="text-lg font-medium text-surface-900 mb-4">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-surface-600 mb-1">Contract Value</dt>
                <dd className="text-sm text-surface-900">
                  {contract.currency} {contract.contractValue.toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        )}

        {/* Important Dates */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Important Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-surface-600 mb-1">Start Date</dt>
              <dd className="text-sm text-surface-900">
                {new Date(contract.startDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-600 mb-1">End Date</dt>
              <dd className="text-sm text-surface-900">
                {new Date(contract.endDate).toLocaleDateString()}
              </dd>
            </div>
            {contract.renewalDate && (
              <div>
                <dt className="text-sm font-medium text-surface-600 mb-1">Renewal Date</dt>
                <dd className="text-sm text-surface-900">
                  {new Date(contract.renewalDate).toLocaleDateString()}
                </dd>
              </div>
            )}
          </div>
          <div className="mt-4">
            <span className="text-sm text-surface-600">
              Auto-renew: <span className="text-surface-900">{contract.autoRenew ? 'Yes' : 'No'}</span>
            </span>
          </div>
        </div>

        {/* Compliance Requirements */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Compliance Requirements</h3>
          <div className="flex flex-wrap gap-2">
            {contract.requiresSoc2 && <Badge variant="brand" capitalize={false}>SOC 2</Badge>}
            {contract.requiresIso27001 && <Badge variant="brand" capitalize={false}>ISO 27001</Badge>}
            {contract.requiresHipaa && <Badge variant="brand" capitalize={false}>HIPAA</Badge>}
            {contract.requiresGdpr && <Badge variant="brand" capitalize={false}>GDPR</Badge>}
            {!contract.requiresSoc2 && !contract.requiresIso27001 && !contract.requiresHipaa && !contract.requiresGdpr && (
              <span className="text-sm text-surface-500">No compliance requirements specified</span>
            )}
          </div>
        </div>

        {/* Document */}
        {contract.storagePath && (
          <div>
            <h3 className="text-lg font-medium text-surface-900 mb-4">Contract Document</h3>
            <div className="flex items-center gap-3">
              <DocumentArrowDownIcon className="w-5 h-5 text-surface-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-900">{contract.filename}</p>
                <p className="text-xs text-surface-500">
                  {contract.size ? `${(contract.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                </p>
              </div>
              <Button variant="link" size="sm">
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      const response = await fetch(`/api/contracts/${id}`);
      const data = await response.json();
      setContract(data);
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchContract();
    } else {
      setEditing(true);
      setLoading(false);
    }
  }, [id, fetchContract]);

  const handleSave = async (formData: Partial<Contract>) => {
    try {
      const url = id === 'new'
        ? '/api/contracts'
        : `/api/contracts/${id}`;
      const method = id === 'new' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'system', // TODO: Get from auth context
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (id === 'new') {
          navigate(`/contracts/${data.id}`);
        } else {
          setContract(data);
          setEditing(false);
        }
      }
    } catch (error) {
      console.error('Error saving contract:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract?')) {
      return;
    }

    try {
      const response = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'system', // TODO: Get from auth context
        },
      });

      if (response.ok) {
        navigate('/contracts');
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-600">Loading contract...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-surface-900">
            {id === 'new' ? 'New Contract' : 'Contract Details'}
          </h1>
          {contract && (
            <p className="mt-1 text-surface-600">
              {contract.vendor.name} - {contract.contractType.toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {editing || id === 'new' ? (
        <ContractForm
          contract={contract}
          onSave={handleSave}
          onCancel={() => {
            if (id === 'new') {
              navigate('/contracts');
            } else {
              setEditing(false);
            }
          }}
        />
      ) : contract ? (
        <ContractView
          contract={contract}
          onEdit={() => setEditing(true)}
          onDelete={handleDelete}
        />
      ) : null}
      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Contract"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await fetch(`/api/contracts/${id}`, { method: 'DELETE', headers: { 'x-user-id': 'system' } });
                  navigate('/contracts');
                } catch (error) {
                  console.error('Error deleting contract:', error);
                  alert('Failed to delete contract');
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-surface-600">
          Are you sure you want to delete this contract? This action cannot be undone.
        </p>
      </Dialog>

    </div>
  );
}
