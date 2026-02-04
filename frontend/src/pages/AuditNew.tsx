import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auditsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';

const AUDIT_TYPE_OPTIONS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'surveillance', label: 'Surveillance' },
  { value: 'certification', label: 'Certification' },
];

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'fieldwork', label: 'Fieldwork' },
  { value: 'testing', label: 'Testing' },
  { value: 'reporting', label: 'Reporting' },
];

const FRAMEWORK_OPTIONS = [
  { value: 'SOC2', label: 'SOC 2' },
  { value: 'ISO27001', label: 'ISO 27001' },
  { value: 'HIPAA', label: 'HIPAA' },
  { value: 'GDPR', label: 'GDPR' },
  { value: 'PCI-DSS', label: 'PCI DSS' },
  { value: 'NIST', label: 'NIST' },
];

interface AuditFormData {
  name: string;
  auditType: string;
  status: string;
  framework?: string;
  isExternal: boolean;
  plannedStartDate?: string;
  plannedEndDate?: string;
  description?: string;
}

export default function AuditNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AuditFormData>({
    name: '',
    auditType: 'internal',
    status: 'planning',
    framework: '',
    isExternal: false,
    plannedStartDate: '',
    plannedEndDate: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: AuditFormData) => {
      if (import.meta.env.DEV) {
        console.log('[AuditNew] Sending create request with data:', data);
      }
      return auditsApi.create(data as any);
    },
    onSuccess: (response) => {
      if (import.meta.env.DEV) {
        console.log('[AuditNew] Create SUCCESS - full response:', response);
        console.log('[AuditNew] response.data:', response.data);
        console.log('[AuditNew] response.data.id:', response.data?.id);
      }
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast.success('Audit created successfully');
      navigate(`/audits/${response.data.id}`);
    },
    onError: (error: any) => {
      // Log as simple strings to ensure visibility
      console.error('[AuditNew] ERROR TYPE:', error?.constructor?.name || 'unknown');
      console.error('[AuditNew] ERROR MSG:', String(error?.message || 'no message'));
      console.error('[AuditNew] ERROR CODE:', String(error?.code || 'no code'));
      console.error('[AuditNew] RESPONSE STATUS:', String(error?.response?.status || 'no status'));
      console.error(
        '[AuditNew] RESPONSE DATA MSG:',
        String(error?.response?.data?.message || 'no data msg')
      );
      const message = error.response?.data?.message || error?.message || 'Failed to create audit';
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Audit name is required';
    }
    if (!formData.auditType) {
      newErrors.auditType = 'Audit type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Transform empty strings to undefined for optional date fields
    const dataToSend = {
      ...formData,
      plannedStartDate: formData.plannedStartDate || undefined,
      plannedEndDate: formData.plannedEndDate || undefined,
      framework: formData.framework || undefined,
      description: formData.description || undefined,
    };

    createMutation.mutate(dataToSend);
  };

  const handleChange = (field: keyof AuditFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          to="/audits"
          className="inline-flex items-center text-sm text-surface-400 hover:text-surface-100 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Audits
        </Link>
        <h1 className="text-2xl font-bold text-surface-100">Create New Audit</h1>
        <p className="text-surface-400 mt-1">Start a new compliance audit</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Audit Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-surface-300 mb-1">
            Audit Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., SOC 2 Type II 2025"
            className={`input ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
        </div>

        {/* Audit Type */}
        <div>
          <label htmlFor="auditType" className="block text-sm font-medium text-surface-300 mb-1">
            Audit Type <span className="text-red-400">*</span>
          </label>
          <select
            id="auditType"
            value={formData.auditType}
            onChange={(e) => {
              handleChange('auditType', e.target.value);
              handleChange(
                'isExternal',
                e.target.value === 'external' || e.target.value === 'certification'
              );
            }}
            className="input"
          >
            {AUDIT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-surface-300 mb-1">
            Initial Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Framework */}
        <div>
          <label htmlFor="framework" className="block text-sm font-medium text-surface-300 mb-1">
            Framework
          </label>
          <select
            id="framework"
            value={formData.framework}
            onChange={(e) => handleChange('framework', e.target.value)}
            className="input"
          >
            <option value="">Select a framework (optional)</option>
            {FRAMEWORK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Planned Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="plannedStartDate"
              className="block text-sm font-medium text-surface-300 mb-1"
            >
              Planned Start Date
            </label>
            <input
              id="plannedStartDate"
              type="date"
              value={formData.plannedStartDate}
              onChange={(e) => handleChange('plannedStartDate', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label
              htmlFor="plannedEndDate"
              className="block text-sm font-medium text-surface-300 mb-1"
            >
              Planned End Date
            </label>
            <input
              id="plannedEndDate"
              type="date"
              value={formData.plannedEndDate}
              onChange={(e) => handleChange('plannedEndDate', e.target.value)}
              className="input"
            />
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
            placeholder="Describe the scope and objectives of this audit"
            rows={4}
            className="input"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-700">
          <Button type="button" variant="secondary" onClick={() => navigate('/audits')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Audit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
