import { useState } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface PlanAttestationModalProps {
  mode: 'request' | 'submit';
  planId: string;
  planName: string;
  attestationId?: string;
  attestationType?: string;
  message?: string;
  onClose: () => void;
  onComplete: () => void;
}

const ATTESTATION_TYPES = [
  { value: 'annual_review', label: 'Annual Review', description: 'Scheduled yearly plan review and attestation' },
  { value: 'post_update', label: 'Post-Update', description: 'Attestation after significant plan changes' },
  { value: 'post_incident', label: 'Post-Incident', description: 'Attestation after the plan was activated' },
];

// ============================================
// Plan Attestation Modal Component
// ============================================

export function PlanAttestationModal({
  mode,
  planId,
  planName,
  attestationId,
  attestationType,
  message,
  onClose,
  onComplete,
}: PlanAttestationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request mode state
  const [selectedType, setSelectedType] = useState('annual_review');
  const [requestMessage, setRequestMessage] = useState('');

  // Submit mode state
  const [submitAction, setSubmitAction] = useState<'attested' | 'declined' | null>(null);
  const [comments, setComments] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  const handleRequestAttestation = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/bcdr/plans/${planId}/attestations/request`, {
        attestationType: selectedType,
        message: requestMessage || undefined,
      });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request attestation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAttestation = async () => {
    if (!submitAction) {
      setError('Please select whether to attest or decline');
      return;
    }

    if (submitAction === 'declined' && !declineReason.trim()) {
      setError('Please provide a reason for declining');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/bcdr/attestations/${attestationId}/submit`, {
        status: submitAction,
        comments: comments || undefined,
        declineReason: submitAction === 'declined' ? declineReason : undefined,
      });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit attestation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRequestMode = () => (
    <div className="space-y-6">
      <p className="text-slate-400">
        Request an attestation from the plan owner to confirm the plan is accurate and current.
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Attestation Type
        </label>
        <div className="space-y-2">
          {ATTESTATION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={clsx(
                'w-full p-4 rounded-lg border-2 text-left transition-all flex justify-between items-center',
                selectedType === type.value
                  ? 'border-cyan-500 bg-cyan-500/20'
                  : 'border-slate-600 bg-slate-700 hover:border-slate-500'
              )}
            >
              <div>
                <span className="text-white font-medium">{type.label}</span>
                <p className="text-sm text-slate-400">{type.description}</p>
              </div>
              {selectedType === type.value && (
                <CheckCircleIcon className="h-5 w-5 text-cyan-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Message to Plan Owner (Optional)
        </label>
        <textarea
          value={requestMessage}
          onChange={(e) => setRequestMessage(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          placeholder="Add a message for the plan owner..."
        />
      </div>
    </div>
  );

  const renderSubmitMode = () => (
    <div className="space-y-6">
      <div className="bg-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Attestation Details</h4>
        <p className="text-white font-medium">{planName}</p>
        <p className="text-sm text-slate-400 capitalize mt-1">
          Type: {attestationType?.replace('_', ' ')}
        </p>
        {message && (
          <p className="text-sm text-slate-300 mt-2 italic">"{message}"</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Your Response
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSubmitAction('attested')}
            className={clsx(
              'p-4 rounded-lg border-2 text-center transition-all',
              submitAction === 'attested'
                ? 'border-green-500 bg-green-500/20'
                : 'border-slate-600 bg-slate-700 hover:border-slate-500'
            )}
          >
            <CheckCircleIcon className={clsx(
              'h-8 w-8 mx-auto mb-2',
              submitAction === 'attested' ? 'text-green-400' : 'text-slate-400'
            )} />
            <span className={clsx(
              'font-medium',
              submitAction === 'attested' ? 'text-green-400' : 'text-white'
            )}>
              I Attest
            </span>
            <p className="text-xs text-slate-400 mt-1">
              The plan is accurate and current
            </p>
          </button>

          <button
            onClick={() => setSubmitAction('declined')}
            className={clsx(
              'p-4 rounded-lg border-2 text-center transition-all',
              submitAction === 'declined'
                ? 'border-red-500 bg-red-500/20'
                : 'border-slate-600 bg-slate-700 hover:border-slate-500'
            )}
          >
            <XCircleIcon className={clsx(
              'h-8 w-8 mx-auto mb-2',
              submitAction === 'declined' ? 'text-red-400' : 'text-slate-400'
            )} />
            <span className={clsx(
              'font-medium',
              submitAction === 'declined' ? 'text-red-400' : 'text-white'
            )}>
              Decline
            </span>
            <p className="text-xs text-slate-400 mt-1">
              The plan needs updates
            </p>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Comments
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          placeholder="Add any comments..."
        />
      </div>

      {submitAction === 'declined' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Reason for Declining <span className="text-red-400">*</span>
          </label>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            placeholder="Explain what needs to be updated..."
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {mode === 'request' ? 'Request Attestation' : 'Plan Attestation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {mode === 'request' ? renderRequestMode() : renderSubmitMode()}

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={mode === 'request' ? handleRequestAttestation : handleSubmitAttestation}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Submitting...'
              : mode === 'request'
              ? 'Send Request'
              : submitAction === 'attested'
              ? 'Submit Attestation'
              : 'Submit Response'}
          </Button>
        </div>
      </div>
    </div>
  );
}
