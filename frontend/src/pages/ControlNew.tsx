import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { controlsApi } from '@/lib/api';
import { CreateControlData, ControlCategory } from '@/lib/apiTypes';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';

// Categories must match backend ControlCategory enum exactly
const CATEGORY_OPTIONS: { value: ControlCategory; label: string }[] = [
  { value: 'access_control', label: 'Access Control' },
  { value: 'data_protection', label: 'Data Protection' },
  { value: 'network_security', label: 'Network Security' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'business_continuity', label: 'Business Continuity' },
  { value: 'change_management', label: 'Change Management' },
  { value: 'risk_management', label: 'Risk Management' },
  { value: 'vendor_management', label: 'Vendor Management' },
  { value: 'physical_security', label: 'Physical Security' },
  { value: 'human_resources', label: 'Human Resources' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
];

export default function ControlNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<CreateControlData>({
    controlId: '',
    title: '',
    description: '',
    category: 'access_control',
    tags: [],
  });
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateControlData) => {
      console.log('[ControlNew] Creating control with data:', JSON.stringify(data, null, 2));
      return controlsApi.create(data);
    },
    onSuccess: (response) => {
      console.log('[ControlNew] Control created successfully:', response.data);
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast.success('Control created successfully');
      navigate(`/controls/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('[ControlNew] Error creating control:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      const message = error.response?.data?.message || error?.message || 'Failed to create control';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.controlId.trim()) {
      newErrors.controlId = 'Control ID is required';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const data: CreateControlData = {
      ...formData,
      tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    createMutation.mutate(data);
  };

  const handleChange = (field: keyof CreateControlData, value: string) => {
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
          to="/controls"
          className="inline-flex items-center text-sm text-surface-400 hover:text-surface-100 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Controls
        </Link>
        <h1 className="text-2xl font-bold text-surface-100">Create New Control</h1>
        <p className="text-surface-400 mt-1">Add a new control to your compliance program</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Control ID */}
        <div>
          <label htmlFor="controlId" className="block text-sm font-medium text-surface-300 mb-1">
            Control ID <span className="text-red-400">*</span>
          </label>
          <input
            id="controlId"
            type="text"
            value={formData.controlId}
            onChange={(e) => handleChange('controlId', e.target.value)}
            placeholder="e.g., AC-001, SOC2-CC6.1"
            className={`input ${errors.controlId ? 'border-red-500' : ''}`}
          />
          {errors.controlId && (
            <p className="mt-1 text-sm text-red-400">{errors.controlId}</p>
          )}
          <p className="mt-1 text-xs text-surface-500">
            A unique identifier for this control (e.g., AC-001, SOC2-CC6.1)
          </p>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-surface-300 mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter control title"
            className={`input ${errors.title ? 'border-red-500' : ''}`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-400">{errors.title}</p>
          )}
        </div>

        {/* Category */}
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

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-surface-300 mb-1">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the control objective and requirements"
            rows={4}
            className={`input ${errors.description ? 'border-red-500' : ''}`}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-400">{errors.description}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-surface-300 mb-1">
            Tags
          </label>
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Enter tags separated by commas"
            className="input"
          />
          <p className="mt-1 text-xs text-surface-500">
            Separate multiple tags with commas (e.g., SOC2, ISO27001, GDPR)
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/controls')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Control'}
          </Button>
        </div>
      </form>
    </div>
  );
}

