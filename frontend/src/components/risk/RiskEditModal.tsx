import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RiskDetail } from '../../lib/apiTypes';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';
import { Dialog } from '@/components/ui/Dialog';

interface RiskEditModalProps {
  risk: RiskDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<RiskDetail>) => void;
  isPending?: boolean;
}

const RISK_CATEGORIES = [
  'strategic',
  'operational',
  'financial',
  'compliance',
  'reputational',
  'technology',
  'cybersecurity',
  'third_party',
  'environmental',
  'legal',
];

const REVIEW_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
];

export default function RiskEditModal({
  risk,
  isOpen,
  onClose,
  onSave,
  isPending = false,
}: RiskEditModalProps) {
  const [formData, setFormData] = useState({
    title: risk.title || '',
    description: risk.description || '',
    category: risk.category || 'operational',
    reviewFrequency: risk.reviewFrequency || 'quarterly',
  });

  useEffect(() => {
    if (risk) {
      setFormData({
        title: risk.title || '',
        description: risk.description || '',
        category: risk.category || 'operational',
        reviewFrequency: risk.reviewFrequency || 'quarterly',
      });
    }
  }, [risk]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <Dialog open onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Edit Risk</h2>
        <button onClick={onClose} className="text-surface-600 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-surface-600 mb-1">Title</label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-1">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-1">Category</label>
          <SelectNative
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-white"
          >
            {RISK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </SelectNative>
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-1">Review Frequency</label>
          <SelectNative
            value={formData.reviewFrequency}
            onChange={(e) => setFormData({ ...formData, reviewFrequency: e.target.value })}
            className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-white"
          >
            {REVIEW_FREQUENCIES.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </SelectNative>
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
