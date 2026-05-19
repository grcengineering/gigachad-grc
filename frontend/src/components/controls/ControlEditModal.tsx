import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ControlEditModalProps {
  control: {
    title: string;
    description: string;
    guidance: string;
    tags: string[];
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; guidance: string; tags: string[] }) => void;
  isPending?: boolean;
}

export default function ControlEditModal({
  control,
  isOpen,
  onClose,
  onSave,
  isPending = false,
}: ControlEditModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    guidance: '',
    tags: '',
  });

  useEffect(() => {
    if (control) {
      setForm({
        title: control.title || '',
        description: control.description || '',
        guidance: control.guidance || '',
        tags: (control.tags || []).join(', '),
      });
    }
  }, [control]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: form.title,
      description: form.description,
      guidance: form.guidance,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Edit Control</h2>
          <button onClick={onClose} className="text-surface-600 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Implementation Guidance
            </label>
            <textarea
              value={form.guidance}
              onChange={(e) => setForm({ ...form, guidance: e.target.value })}
              rows={4}
              className="input w-full"
              placeholder="Provide detailed implementation guidance..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input w-full"
              placeholder="e.g., security, compliance, access-control"
            />
            <p className="text-xs text-surface-500 mt-1">Comma-separated list of tags</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
