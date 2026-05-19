import { useState, useEffect } from 'react';
import { PencilIcon, ClockIcon } from '@heroicons/react/24/outline';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

interface User {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Implementation {
  id: string;
  status: string;
  ownerId?: string;
  owner?: User;
  testingFrequency?: string;
  effectivenessScore?: number;
  implementationNotes?: string;
  lastTestedAt?: string;
  nextTestDue?: string;
}

interface ControlImplementationCardProps {
  implementation?: Implementation;
  users: User[];
  onStatusChange: (status: string) => void;
  onSave: (data: {
    ownerId?: string;
    testingFrequency?: string;
    effectivenessScore?: number;
    implementationNotes?: string;
  }) => void;
  isUpdating?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-surface-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
  { value: 'implemented', label: 'Implemented', color: 'bg-emerald-500' },
  { value: 'not_applicable', label: 'Not Applicable', color: 'bg-gray-500' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
];

export default function ControlImplementationCard({
  implementation,
  users,
  onStatusChange,
  onSave,
  isUpdating = false,
}: ControlImplementationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    ownerId: '',
    testingFrequency: '',
    effectivenessScore: '',
    implementationNotes: '',
  });

  useEffect(() => {
    if (implementation) {
      setForm({
        ownerId: implementation.ownerId || '',
        testingFrequency: implementation.testingFrequency || '',
        effectivenessScore: implementation.effectivenessScore?.toString() || '',
        implementationNotes: implementation.implementationNotes || '',
      });
    }
  }, [implementation]);

  const handleSave = () => {
    onSave({
      ownerId: form.ownerId || undefined,
      testingFrequency: form.testingFrequency || undefined,
      effectivenessScore: form.effectivenessScore
        ? parseInt(form.effectivenessScore, 10)
        : undefined,
      implementationNotes: form.implementationNotes || undefined,
    });
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getUserName = (user?: User) => {
    if (!user) return 'Unassigned';
    return (
      user.displayName ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.email ||
      'Unknown'
    );
  };

  return (
    <div className="bg-surface-800 rounded-lg border border-surface-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Implementation Status</h3>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-surface-600 hover:text-white">
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Status Selector */}
      <div className="mb-6">
        <label className="block text-sm text-surface-600 mb-2">Status</label>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              disabled={isUpdating}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                implementation?.status === option.value
                  ? `${option.color} text-white`
                  : 'bg-surface-700 text-surface-700 hover:bg-surface-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-surface-600 mb-1">Owner</label>
            <select
              value={form.ownerId}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              className="input w-full"
            >
              <option value="">Select owner...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {getUserName(user)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-1">Testing Frequency</label>
            <select
              value={form.testingFrequency}
              onChange={(e) => setForm({ ...form, testingFrequency: e.target.value })}
              className="input w-full"
            >
              <option value="">Select frequency...</option>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-1">
              Effectiveness Score (0-100)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.effectivenessScore}
              onChange={(e) => setForm({ ...form, effectivenessScore: e.target.value })}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-1">Implementation Notes</label>
            <Textarea
              value={form.implementationNotes}
              onChange={(e) => setForm({ ...form, implementationNotes: e.target.value })}
              rows={3}
              className="input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isUpdating} className="btn-primary text-sm">
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-surface-600">Owner</p>
              <p className="text-surface-100">{getUserName(implementation?.owner)}</p>
            </div>
            <div>
              <p className="text-xs text-surface-600">Testing Frequency</p>
              <p className="text-surface-100 capitalize">
                {implementation?.testingFrequency?.replace('_', ' ') || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-600">Effectiveness</p>
              <p className="text-surface-100">
                {implementation?.effectivenessScore !== undefined
                  ? `${implementation.effectivenessScore}%`
                  : 'Not assessed'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-600">Last Tested</p>
              <p className="text-surface-100">{formatDate(implementation?.lastTestedAt)}</p>
            </div>
          </div>

          {implementation?.nextTestDue && (
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <ClockIcon className="w-4 h-4" />
              <span>Next test due: {formatDate(implementation.nextTestDue)}</span>
            </div>
          )}

          {implementation?.implementationNotes && (
            <div>
              <p className="text-xs text-surface-600 mb-1">Notes</p>
              <p className="text-surface-200 text-sm">{implementation.implementationNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
