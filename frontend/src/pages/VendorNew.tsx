import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';

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
  { value: 'pending_onboarding', label: 'Pending Onboarding' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'terminated', label: 'Terminated' },
];

interface VendorFormData {
  name: string;
  category: string;
  tier: string;
  status: string;
  website: string;
  primaryContact: string;
  primaryContactEmail: string;
  description: string;
}

export default function VendorNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    category: 'software_vendor',
    tier: 'tier_3',
    status: 'pending_onboarding',
    website: '',
    primaryContact: '',
    primaryContactEmail: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: VendorFormData) => vendorsApi.create(data as any),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor created successfully');
      navigate(`/vendors/${response.data.id}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create vendor';
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Vendor name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContactEmail)) {
      newErrors.primaryContactEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (field: keyof VendorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          to="/vendors"
          className="inline-flex items-center text-sm text-surface-400 hover:text-surface-100 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Vendors
        </Link>
        <h1 className="text-2xl font-bold text-surface-100">Add New Vendor</h1>
        <p className="text-surface-400 mt-1">Register a new third-party vendor</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Vendor Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-surface-300 mb-1">
            Vendor Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Acme Corp"
            className={`input ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Category and Tier */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-surface-300 mb-1">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="input"
            >
              {CATEGORY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tier" className="block text-sm font-medium text-surface-300 mb-1">
              Vendor Tier
            </label>
            <select
              id="tier"
              value={formData.tier}
              onChange={(e) => handleChange('tier', e.target.value)}
              className="input"
            >
              {TIER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-surface-300 mb-1">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="input"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-surface-300 mb-1">
            Website
          </label>
          <input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://example.com"
            className="input"
          />
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryContact" className="block text-sm font-medium text-surface-300 mb-1">
              Primary Contact
            </label>
            <input
              id="primaryContact"
              type="text"
              value={formData.primaryContact}
              onChange={(e) => handleChange('primaryContact', e.target.value)}
              placeholder="Contact name"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="primaryContactEmail" className="block text-sm font-medium text-surface-300 mb-1">
              Primary Email
            </label>
            <input
              id="primaryContactEmail"
              type="email"
              value={formData.primaryContactEmail}
              onChange={(e) => handleChange('primaryContactEmail', e.target.value)}
              placeholder="contact@example.com"
              className={`input ${errors.primaryContactEmail ? 'border-red-500' : ''}`}
            />
            {errors.primaryContactEmail && (
              <p className="mt-1 text-sm text-red-400">{errors.primaryContactEmail}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-surface-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the vendor and services they provide"
            rows={4}
            className="input"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/vendors')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Add Vendor'}
          </Button>
        </div>
      </form>
    </div>
  );
}
