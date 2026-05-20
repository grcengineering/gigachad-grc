import { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { api } from '@/lib/api';
import clsx from 'clsx';
import { Textarea } from '@/components/ui/Textarea';

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
  {
    value: 'annual_review',
    label: 'Annual Review',
    description: 'Scheduled yearly plan review and attestation',
  },
  {
    value: 'post_update',
    label: 'Post-Update',
    description: 'Attestation after significant plan changes',
  },
  {
    value: 'post_incident',
    label: 'Post-Incident',
    description: 'Attestation after the plan was activated',
  },
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
        <label className="block text-sm font-medium text-slate-300 mb-2">Attestation Type</label>
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
              {selectedType === type.value && <CheckCircleIcon className="h-5 w-5 text-cyan-600" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Message to Plan Owner (Optional)
        </label>
        <Textarea
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
        {message && <p className="text-sm text-slate-300 mt-2 italic">"{message}"</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Your Response</label>
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
            <CheckCircleIcon
              className={clsx(
                'h-8 w-8 mx-auto mb-2',
                submitAction === 'attested' ? 'text-green-600' : 'text-slate-400'
              )}
            />
            <span
              className={clsx(
                'font-medium',
                submitAction === 'attested' ? 'text-green-600' : 'text-white'
              )}
            >
              I Attest
            </span>
            <p className="text-xs text-slate-400 mt-1">The plan is accurate and current</p>
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
            <XCircleIcon
              className={clsx(
                'h-8 w-8 mx-auto mb-2',
                submitAction === 'declined' ? 'text-red-600' : 'text-slate-400'
              )}
            />
            <span
              className={clsx(
                'font-medium',
                submitAction === 'declined' ? 'text-red-600' : 'text-white'
              )}
            >
              Decline
            </span>
            <p className="text-xs text-slate-400 mt-1">The plan needs updates</p>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Comments</label>
        <Textarea
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
            Reason for Declining <span className="text-red-600">*</span>
          </label>
          <Textarea
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
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-lg">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-brand-700" />
          </div>
          <span>{mode === 'request' ? 'Request Attestation' : 'Plan Attestation'}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={mode === 'request' ? handleRequestAttestation : handleSubmitAttestation}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {mode === 'request'
              ? 'Send Request'
              : submitAction === 'attested'
                ? 'Submit Attestation'
                : 'Submit Response'}
          </Button>
        </div>
      }
    >
      {mode === 'request' ? renderRequestMode() : renderSubmitMode()}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </Dialog>
  );
}
