import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TrashIcon,
  PencilIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { contractsApi } from '../lib/api';
import toast from 'react-hot-toast';

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
    renewalDate: contract?.renewalDate
      ? new Date(contract.renewalDate).toISOString().split('T')[0]
      : '',
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
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Contract Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Contract Type *
              </label>
              <select
                value={formData.contractType}
                onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              >
                <option value="msa">MSA</option>
                <option value="nda">NDA</option>
                <option value="sow">SOW</option>
                <option value="dpa">DPA</option>
                <option value="sla">SLA</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">Vendor ID *</label>
              <input
                type="text"
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-surface-400 mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Financial Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Financial Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Contract Value
              </label>
              <input
                type="number"
                value={formData.contractValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contractValue: parseFloat(e.target.value) || undefined,
                  })
                }
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Important Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Renewal Date
              </label>
              <input
                type="date"
                value={formData.renewalDate || ''}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoRenew}
                onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                className="w-4 h-4 bg-surface-800 border-surface-700 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-300">Auto-renew contract</span>
            </label>
          </div>
        </div>

        {/* Compliance Requirements */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Compliance Requirements</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresSoc2}
                onChange={(e) => setFormData({ ...formData, requiresSoc2: e.target.checked })}
                className="w-4 h-4 bg-surface-800 border-surface-700 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-300">SOC 2 Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresIso27001}
                onChange={(e) => setFormData({ ...formData, requiresIso27001: e.target.checked })}
                className="w-4 h-4 bg-surface-800 border-surface-700 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-300">ISO 27001 Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresHipaa}
                onChange={(e) => setFormData({ ...formData, requiresHipaa: e.target.checked })}
                className="w-4 h-4 bg-surface-800 border-surface-700 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-300">HIPAA Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresGdpr}
                onChange={(e) => setFormData({ ...formData, requiresGdpr: e.target.checked })}
                className="w-4 h-4 bg-surface-800 border-surface-700 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-300">GDPR Required</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-surface-300 hover:text-surface-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          Save Contract
        </button>
      </div>
    </form>
  );
}

function ContractView({
  contract,
  onEdit,
  onDelete,
}: {
  contract: Contract;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-surface-100">{contract.title}</h2>
            <p className="mt-1 text-surface-400">{contract.vendor.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-surface-400 mb-1">Contract Type</dt>
              <dd className="text-sm text-surface-100 uppercase">{contract.contractType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-400 mb-1">Status</dt>
              <dd>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    contract.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : contract.status === 'expired'
                        ? 'bg-red-500/20 text-red-400'
                        : contract.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-surface-700 text-surface-400'
                  }`}
                >
                  {contract.status}
                </span>
              </dd>
            </div>
            {contract.description && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-surface-400 mb-1">Description</dt>
                <dd className="text-sm text-surface-100">{contract.description}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Financial Information */}
        {contract.contractValue && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Contract Value</dt>
                <dd className="text-sm text-surface-100">
                  {contract.currency} {contract.contractValue.toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        )}

        {/* Important Dates */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Important Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-surface-400 mb-1">Start Date</dt>
              <dd className="text-sm text-surface-100">
                {new Date(contract.startDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-400 mb-1">End Date</dt>
              <dd className="text-sm text-surface-100">
                {new Date(contract.endDate).toLocaleDateString()}
              </dd>
            </div>
            {contract.renewalDate && (
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Renewal Date</dt>
                <dd className="text-sm text-surface-100">
                  {new Date(contract.renewalDate).toLocaleDateString()}
                </dd>
              </div>
            )}
          </div>
          <div className="mt-4">
            <span className="text-sm text-surface-400">
              Auto-renew:{' '}
              <span className="text-surface-100">{contract.autoRenew ? 'Yes' : 'No'}</span>
            </span>
          </div>
        </div>

        {/* Compliance Requirements */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Compliance Requirements</h3>
          <div className="flex flex-wrap gap-2">
            {contract.requiresSoc2 && (
              <span className="px-3 py-1 bg-brand-600/20 text-brand-400 text-sm rounded-full">
                SOC 2
              </span>
            )}
            {contract.requiresIso27001 && (
              <span className="px-3 py-1 bg-brand-600/20 text-brand-400 text-sm rounded-full">
                ISO 27001
              </span>
            )}
            {contract.requiresHipaa && (
              <span className="px-3 py-1 bg-brand-600/20 text-brand-400 text-sm rounded-full">
                HIPAA
              </span>
            )}
            {contract.requiresGdpr && (
              <span className="px-3 py-1 bg-brand-600/20 text-brand-400 text-sm rounded-full">
                GDPR
              </span>
            )}
            {!contract.requiresSoc2 &&
              !contract.requiresIso27001 &&
              !contract.requiresHipaa &&
              !contract.requiresGdpr && (
                <span className="text-sm text-surface-500">
                  No compliance requirements specified
                </span>
              )}
          </div>
        </div>

        {/* Document */}
        {contract.storagePath && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Contract Document</h3>
            <div className="flex items-center gap-3">
              <DocumentArrowDownIcon className="w-5 h-5 text-surface-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-100">{contract.filename}</p>
                <p className="text-xs text-surface-500">
                  {contract.size
                    ? `${(contract.size / 1024 / 1024).toFixed(2)} MB`
                    : 'Unknown size'}
                </p>
              </div>
              <button className="px-3 py-1 text-sm text-brand-400 hover:text-brand-300 transition-colors">
                Download
              </button>
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

  useEffect(() => {
    if (id && id !== 'new') {
      fetchContract();
    } else {
      setEditing(true);
      setLoading(false);
    }
  }, [id]);

  const fetchContract = async () => {
    try {
      if (!id) {
        return;
      }
      const response = await contractsApi.get(id);
      setContract(response.data as unknown as Contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<Contract>) => {
    try {
      if (id === 'new') {
        const response = await contractsApi.create(formData as any);
        navigate(`/contracts/${response.data.id}`);
      } else if (id) {
        const response = await contractsApi.update(id, formData as any);
        setContract(response.data as unknown as Contract);
        setEditing(false);
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
      await contractsApi.delete(id!);
      navigate('/contracts');
    } catch (error) {
      console.error('Error deleting contract:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading contract...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-surface-100">
            {id === 'new' ? 'New Contract' : 'Contract Details'}
          </h1>
          {contract && (
            <p className="mt-1 text-surface-400">
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
        <ContractView contract={contract} onEdit={() => setEditing(true)} onDelete={handleDelete} />
      ) : null}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-surface-100 mb-2">Delete Contract</h3>
            <p className="text-surface-400 mb-6">
              Are you sure you want to delete this contract? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-surface-800 text-surface-100 rounded-lg hover:bg-surface-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (id) {
                      await contractsApi.delete(id);
                    }
                    toast.success('Contract deleted successfully');
                    navigate('/contracts');
                  } catch (error) {
                    console.error('Error deleting contract:', error);
                    toast.error('Failed to delete contract');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
