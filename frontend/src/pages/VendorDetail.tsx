import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { vendorsApi } from '../lib/api';

interface Vendor {
  id: string;
  organizationId: string;
  vendorId: string;
  name: string;
  legalName?: string;
  category: string;
  tier: string;
  status: string;
  description?: string;
  website?: string;
  primaryContact?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  inherentRiskScore?: string;
  residualRiskScore?: string;
  dataClassification?: string;
  hasDataAccess: boolean;
  accessLevel?: string;
  businessOwner?: string;
  serviceDescription?: string;
  criticality: string;
  annualSpend?: number;
  certifications: string[];
  complianceStatus: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  reviewFrequency: string;
  country?: string;
  region?: string;
  dataLocation?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchVendor();
    } else {
      setLoading(false);
      setEditing(true);
    }
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await vendorsApi.get(id!);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<Vendor>) => {
    try {
      const response = id === 'new'
        ? await vendorsApi.create(formData)
        : await vendorsApi.update(id!, formData);

      const data = response.data;
      if (id === 'new') {
        navigate(`/vendors/${data.id}`);
      } else {
        setVendor(data);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      await vendorsApi.delete(id!);
      navigate('/vendors');
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading vendor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-surface-100">
              {id === 'new' ? 'New Vendor' : vendor?.name || 'Vendor Details'}
            </h1>
            {vendor?.vendorId && (
              <p className="mt-1 text-surface-400">{vendor.vendorId}</p>
            )}
          </div>
        </div>

        {id !== 'new' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-2 px-4 py-2 text-surface-300 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      {editing ? (
        <VendorForm
          vendor={vendor}
          onSave={handleSave}
          onCancel={() => id === 'new' ? navigate('/vendors') : setEditing(false)}
        />
      ) : (
        <VendorView vendor={vendor!} />
      )}
    </div>
  );
}

function VendorForm({
  vendor,
  onSave,
  onCancel
}: {
  vendor: Vendor | null;
  onSave: (data: Partial<Vendor>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    organizationId: vendor?.organizationId || localStorage.getItem('organizationId') || '',
    vendorId: vendor?.vendorId || `VND-${Date.now()}`,
    name: vendor?.name || '',
    legalName: vendor?.legalName || '',
    category: vendor?.category || 'software_vendor',
    tier: vendor?.tier || 'tier_3',
    status: vendor?.status || 'active',
    description: vendor?.description || '',
    website: vendor?.website || '',
    primaryContact: vendor?.primaryContact || '',
    primaryContactEmail: vendor?.primaryContactEmail || '',
    primaryContactPhone: vendor?.primaryContactPhone || '',
    notes: vendor?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Vendor Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Legal Name
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="software_vendor">Software Vendor</option>
                <option value="cloud_provider">Cloud Provider</option>
                <option value="professional_services">Professional Services</option>
                <option value="hardware_vendor">Hardware Vendor</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Tier *
              </label>
              <select
                required
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="tier_1">Tier 1 (Critical)</option>
                <option value="tier_2">Tier 2 (High)</option>
                <option value="tier_3">Tier 3 (Medium)</option>
                <option value="tier_4">Tier 4 (Low)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending_onboarding">Pending Onboarding</option>
                <option value="offboarding">Offboarding</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.primaryContact}
                onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.primaryContactEmail}
                onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.primaryContactPhone}
                onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Description and Notes */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-surface-300 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          Save Vendor
        </button>
      </div>
    </form>
  );
}

function VendorView({ vendor }: { vendor: Vendor }) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoField label="Vendor Name" value={vendor.name} />
          <InfoField label="Legal Name" value={vendor.legalName} />
          <InfoField label="Category" value={vendor.category.replace('_', ' ')} capitalize />
          <InfoField label="Tier" value={vendor.tier.replace('_', ' ')} capitalize />
          <InfoField label="Status" value={vendor.status} capitalize />
          <InfoField label="Website" value={vendor.website} link />
        </div>
      </div>

      {/* Contact Information */}
      {(vendor.primaryContact || vendor.primaryContactEmail || vendor.primaryContactPhone) && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-100 mb-4">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoField label="Name" value={vendor.primaryContact} />
            <InfoField label="Email" value={vendor.primaryContactEmail} />
            <InfoField label="Phone" value={vendor.primaryContactPhone} />
          </div>
        </div>
      )}

      {/* Description */}
      {vendor.description && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-100 mb-4">Description</h3>
          <p className="text-surface-300">{vendor.description}</p>
        </div>
      )}

      {/* Notes */}
      {vendor.notes && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-100 mb-4">Notes</h3>
          <p className="text-surface-300 whitespace-pre-wrap">{vendor.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoField({
  label,
  value,
  capitalize,
  link
}: {
  label: string;
  value?: string | number | null;
  capitalize?: boolean;
  link?: boolean;
}) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-sm font-medium text-surface-400 mb-1">{label}</dt>
      <dd className={`text-sm text-surface-100 ${capitalize ? 'capitalize' : ''}`}>
        {link ? (
          <a
            href={value.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-surface-100 mb-2">Delete Vendor</h3>
            <p className="text-surface-400 mb-6">
              Are you sure you want to delete "{vendor?.name}"? This action cannot be undone.
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
                    await vendorsApi.delete(id!);
                    navigate('/vendors');
                  } catch (error) {
                    console.error('Error deleting vendor:', error);
                    alert('Failed to delete vendor');
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
