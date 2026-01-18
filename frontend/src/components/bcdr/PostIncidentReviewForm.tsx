import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';

// ============================================
// Types
// ============================================

interface PostIncidentReviewFormProps {
  incidentId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface ImprovementAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
}

// ============================================
// Post Incident Review Form Component
// ============================================

export function PostIncidentReviewForm({
  incidentId,
  onComplete,
  onCancel,
}: PostIncidentReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rootCause, setRootCause] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [actualDowntimeMinutes, setActualDowntimeMinutes] = useState<number | ''>('');
  const [dataLossMinutes, setDataLossMinutes] = useState<number | ''>('');
  const [financialImpact, setFinancialImpact] = useState<number | ''>('');
  const [improvementActions, setImprovementActions] = useState<ImprovementAction[]>([]);

  const addImprovementAction = () => {
    setImprovementActions([
      ...improvementActions,
      {
        id: crypto.randomUUID(),
        description: '',
        owner: '',
        dueDate: '',
      },
    ]);
  };

  const updateImprovementAction = (id: string, field: keyof ImprovementAction, value: string) => {
    setImprovementActions(
      improvementActions.map((action) =>
        action.id === id ? { ...action, [field]: value } : action
      )
    );
  };

  const removeImprovementAction = (id: string) => {
    setImprovementActions(improvementActions.filter((action) => action.id !== id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/bcdr/incidents/${incidentId}/close`, {
        rootCause: rootCause || undefined,
        lessonsLearned: lessonsLearned || undefined,
        actualDowntimeMinutes: actualDowntimeMinutes || undefined,
        dataLossMinutes: dataLossMinutes || undefined,
        financialImpact: financialImpact || undefined,
        improvementActions: improvementActions.length > 0
          ? improvementActions.filter((a) => a.description.trim())
          : undefined,
      });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit post-incident review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Post-Incident Review</h3>
        <p className="text-sm text-slate-400">
          Document the root cause, lessons learned, and improvement actions from this incident.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Root Cause</label>
        <textarea
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          placeholder="What was the root cause of this incident?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Lessons Learned</label>
        <textarea
          value={lessonsLearned}
          onChange={(e) => setLessonsLearned(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          placeholder="What did we learn from this incident?"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Actual Downtime (minutes)
          </label>
          <input
            type="number"
            value={actualDowntimeMinutes}
            onChange={(e) => setActualDowntimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Data Loss (minutes)
          </label>
          <input
            type="number"
            value={dataLossMinutes}
            onChange={(e) => setDataLossMinutes(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Financial Impact ($)
          </label>
          <input
            type="number"
            value={financialImpact}
            onChange={(e) => setFinancialImpact(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            min="0"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-300">
            Improvement Actions
          </label>
          <button
            onClick={addImprovementAction}
            className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
          >
            <PlusIcon className="h-4 w-4" />
            Add Action
          </button>
        </div>

        <div className="space-y-3">
          {improvementActions.map((action) => (
            <div key={action.id} className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={action.description}
                    onChange={(e) => updateImprovementAction(action.id, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                    placeholder="Action description..."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={action.owner}
                      onChange={(e) => updateImprovementAction(action.id, 'owner', e.target.value)}
                      className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      placeholder="Owner"
                    />
                    <input
                      type="date"
                      value={action.dueDate}
                      onChange={(e) => updateImprovementAction(action.id, 'dueDate', e.target.value)}
                      className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeImprovementAction(action.id)}
                  className="p-1 text-slate-400 hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {improvementActions.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              No improvement actions added yet
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Close Incident with PIR'}
        </Button>
      </div>
    </div>
  );
}
