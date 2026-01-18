import { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface DeclareIncidentModalProps {
  onClose: () => void;
  onComplete: (incidentId: string) => void;
}

const INCIDENT_TYPES = [
  { value: 'disaster', label: 'Disaster', description: 'Major event requiring full BC/DR activation' },
  { value: 'major_incident', label: 'Major Incident', description: 'Significant disruption requiring response' },
  { value: 'drill', label: 'Drill/Exercise', description: 'Planned exercise or test' },
  { value: 'near_miss', label: 'Near Miss', description: 'Event that could have caused disruption' },
];

const SEVERITY_LEVELS = [
  { value: 'critical', label: 'Critical', description: 'Severe impact, immediate action required', color: 'bg-red-500' },
  { value: 'major', label: 'Major', description: 'Significant impact, urgent response needed', color: 'bg-orange-500' },
  { value: 'moderate', label: 'Moderate', description: 'Notable impact, prompt response needed', color: 'bg-yellow-500' },
  { value: 'minor', label: 'Minor', description: 'Limited impact, standard response', color: 'bg-green-500' },
];

// ============================================
// Declare Incident Modal Component
// ============================================

export function DeclareIncidentModal({
  onClose,
  onComplete,
}: DeclareIncidentModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Declare BC/DR Incident</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Incident Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="Brief title describing the incident..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="Describe the incident situation..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Incident Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setIncidentType(type.value)}
                  className={clsx(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    incidentType === type.value
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                  )}
                >
                  <span className="text-sm font-medium text-white">{type.label}</span>
                  <p className="text-xs text-slate-400 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Severity Level <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSeverity(level.value)}
                  className={clsx(
                    'w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3',
                    severity === level.value
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                  )}
                >
                  <div className={clsx('w-3 h-3 rounded-full', level.color)} />
                  <div>
                    <span className="text-sm font-medium text-white">{level.label}</span>
                    <p className="text-xs text-slate-400">{level.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Declaring...' : 'Declare Incident'}
          </Button>
        </div>
      </div>
    </div>
  );
}
