import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RiskDetail } from '../../lib/apiTypes';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

interface TreatmentFormData {
  treatmentPlan: string;
  treatmentNotes: string;
  targetResidualRisk: string;
  treatmentDueDate: string;
}

interface RiskTreatmentModalProps {
  risk: RiskDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TreatmentFormData) => void;
  isPending?: boolean;
}

const TREATMENT_PLANS = [
  { value: 'accept', label: 'Accept', description: 'Accept the risk as-is' },
  { value: 'mitigate', label: 'Mitigate', description: 'Implement controls to reduce risk' },
  { value: 'transfer', label: 'Transfer', description: 'Transfer risk to third party' },
  { value: 'avoid', label: 'Avoid', description: 'Eliminate the risk entirely' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

export default function RiskTreatmentModal({
  risk,
  isOpen,
  onClose,
  onSave,
  isPending = false,
}: RiskTreatmentModalProps) {
  const [formData, setFormData] = useState<TreatmentFormData>({
    treatmentPlan: risk.treatmentPlan || 'mitigate',
    treatmentNotes: risk.treatmentNotes || '',
    targetResidualRisk: (risk.residualRisk as string) || 'low',
    treatmentDueDate: risk.treatmentDueDate
      ? new Date(risk.treatmentDueDate).toISOString().split('T')[0]
      : '',
  });

  useEffect(() => {
    if (risk) {
      setFormData({
        treatmentPlan: risk.treatmentPlan || 'mitigate',
        treatmentNotes: risk.treatmentNotes || '',
        targetResidualRisk: (risk.residualRisk as string) || 'low',
        treatmentDueDate: risk.treatmentDueDate
          ? new Date(risk.treatmentDueDate).toISOString().split('T')[0]
          : '',
      });
    }
  }, [risk]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Treatment Plan</h2>
          <button onClick={onClose} className="text-surface-600 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Treatment Strategy</label>
            <div className="grid grid-cols-2 gap-3">
              {TREATMENT_PLANS.map((plan) => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, treatmentPlan: plan.value })}
                  className={`p-3 rounded-lg border text-left ${
                    formData.treatmentPlan === plan.value
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-surface-700 hover:border-surface-600'
                  }`}
                >
                  <div className="text-white font-medium">{plan.label}</div>
                  <div className="text-xs text-surface-600">{plan.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-1">Target Residual Risk</label>
            <SelectNative
              value={formData.targetResidualRisk}
              onChange={(e) => setFormData({ ...formData, targetResidualRisk: e.target.value })}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white"
            >
              {RISK_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-1">Treatment Due Date</label>
            <Input
              type="date"
              value={formData.treatmentDueDate}
              onChange={(e) => setFormData({ ...formData, treatmentDueDate: e.target.value })}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-1">Treatment Notes</label>
            <Textarea
              value={formData.treatmentNotes}
              onChange={(e) => setFormData({ ...formData, treatmentNotes: e.target.value })}
              rows={3}
              placeholder="Describe the treatment approach..."
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-surface-600 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Update Treatment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
