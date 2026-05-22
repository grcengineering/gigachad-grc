import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import clsx from 'clsx';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';

// ============================================
// Types
// ============================================

interface DeclareIncidentModalProps {
  onClose: () => void;
  onComplete: (incidentId: string) => void;
}

const INCIDENT_TYPES = [
  {
    value: 'disaster',
    label: 'Disaster',
    description: 'Major event requiring full BC/DR activation',
  },
  {
    value: 'major_incident',
    label: 'Major Incident',
    description: 'Significant disruption requiring response',
  },
  { value: 'drill', label: 'Drill/Exercise', description: 'Planned exercise or test' },
  {
    value: 'near_miss',
    label: 'Near Miss',
    description: 'Event that could have caused disruption',
  },
];

const SEVERITY_LEVELS = [
  {
    value: 'critical',
    label: 'Critical',
    description: 'Severe impact, immediate action required',
    color: 'bg-red-500',
  },
  {
    value: 'major',
    label: 'Major',
    description: 'Significant impact, urgent response needed',
    color: 'bg-orange-500',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Notable impact, prompt response needed',
    color: 'bg-yellow-500',
  },
  {
    value: 'minor',
    label: 'Minor',
    description: 'Limited impact, standard response',
    color: 'bg-green-500',
  },
];

// ============================================
// Declare Incident Modal Component
// ============================================

export function DeclareIncidentModal({ onClose, onComplete }: DeclareIncidentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Incident title is required');
      return;
    }
    if (!incidentType) {
      setError('Please select an incident type');
      return;
    }
    if (!severity) {
      setError('Please select a severity level');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.post('/bcdr/incidents', {
        title,
        description: description || undefined,
        incidentType,
        severity,
      });
      onComplete(response.data.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to declare incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <span>Declare BC/DR Incident</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Declare Incident
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-surface-800 mb-2">
            Incident Title <span className="text-red-700">*</span>
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief title describing the incident..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-800 mb-2">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the incident situation..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-800 mb-2">
            Incident Type <span className="text-red-700">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setIncidentType(type.value)}
                className={clsx(
                  'p-3 rounded-md border-2 text-left transition-all',
                  incidentType === type.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-surface-300 bg-white hover:border-surface-400 dark:bg-surface-900'
                )}
              >
                <span className="text-sm font-medium text-surface-900">{type.label}</span>
                <p className="text-xs text-surface-600 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-800 mb-2">
            Severity Level <span className="text-red-700">*</span>
          </label>
          <div className="space-y-2">
            {SEVERITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setSeverity(level.value)}
                className={clsx(
                  'w-full p-3 rounded-md border-2 text-left transition-all flex items-center gap-3',
                  severity === level.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-surface-300 bg-white hover:border-surface-400 dark:bg-surface-900'
                )}
              >
                <div className={clsx('w-3 h-3 rounded-full', level.color)} />
                <div>
                  <span className="text-sm font-medium text-surface-900">{level.label}</span>
                  <p className="text-xs text-surface-600">{level.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
