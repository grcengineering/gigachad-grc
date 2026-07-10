import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { vendorsApi } from '../lib/api';
import { Button, Input, Select, Textarea } from '@/components/ui';

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

const CATEGORY_OPTIONS = [
  { value: 'software_vendor', label: 'Software Vendor' },
  { value: 'cloud_provider', label: 'Cloud Provider' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'hardware_vendor', label: 'Hardware Vendor' },
  { value: 'consultant', label: 'Consultant' },
];

const TIER_OPTIONS = [
  { value: 'tier_1', label: 'Tier 1 (Critical)' },
  { value: 'tier_2', label: 'Tier 2 (High)' },
  { value: 'tier_3', label: 'Tier 3 (Medium)' },
  { value: 'tier_4', label: 'Tier 4 (Low)' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending_onboarding', label: 'Pending Onboarding' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'terminated', label: 'Terminated' },
];

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchVendor = useCallback(async () => {
    try {
      const response = await vendorsApi.get(id!);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchVendor();
    } else {
      setLoading(false);
      setEditing(true);
    }
  }, [id, fetchVendor]);

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
        <div className="text-surface-600">Loading vendor...</div>
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
            className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-surface-900">
              {id === 'new' ? 'New Vendor' : vendor?.name || 'Vendor Details'}
            </h1>
            {vendor?.vendorId && (
              <p className="mt-1 text-surface-600">{vendor.vendorId}</p>
            )}
          </div>
        </div>

        {id !== 'new' && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditing(!editing)}
              leftIcon={<PencilIcon className="w-5 h-5" />}
            >
              {editing ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              leftIcon={<TrashIcon className="w-5 h-5" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
            >
              Delete
            </Button>
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
      <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Vendor Name *
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Legal Name
              </label>
              <Input
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Category *
              </label>
              <Select
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={CATEGORY_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Tier *
              </label>
              <Select
                value={formData.tier}
                onChange={(value) => setFormData({ ...formData, tier: value })}
                options={TIER_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Status *
              </label>
              <Select
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value })}
                options={STATUS_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Website
              </label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Contact Name
              </label>
              <Input
                value={formData.primaryContact}
                onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={formData.primaryContactEmail}
                onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={formData.primaryContactPhone}
                onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Description and Notes */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Notes
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Vendor
        </Button>
      </div>
    </form>
  );
}

function VendorView({ vendor }: { vendor: Vendor }) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white border border-surface-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-surface-900 mb-4">Basic Information</h3>
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
        <div className="bg-white border border-surface-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-900 mb-4">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoField label="Name" value={vendor.primaryContact} />
            <InfoField label="Email" value={vendor.primaryContactEmail} />
            <InfoField label="Phone" value={vendor.primaryContactPhone} />
          </div>
        </div>
      )}

      {/* Description */}
      {vendor.description && (
        <div className="bg-white border border-surface-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-900 mb-4">Description</h3>
          <p className="text-surface-700">{vendor.description}</p>
        </div>
      )}

      {/* Notes */}
      {vendor.notes && (
        <div className="bg-white border border-surface-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-900 mb-4">Notes</h3>
          <p className="text-surface-700 whitespace-pre-wrap">{vendor.notes}</p>
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
      <dt className="text-sm font-medium text-surface-600 mb-1">{label}</dt>
      <dd className={`text-sm text-surface-900 ${capitalize ? 'capitalize' : ''}`}>
        {link ? (
          <a
            href={value.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:text-brand-800"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
