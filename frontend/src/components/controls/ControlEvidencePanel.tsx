import { Link } from 'react-router-dom';
import { DocumentTextIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Evidence {
  id: string;
  filename: string;
  type?: string;
  uploadedAt?: string;
}

interface ControlEvidencePanelProps {
  evidence: Evidence[];
  controlId: string;
  onUnlink: (evidenceId: string) => void;
  isUnlinking?: boolean;
}

export default function ControlEvidencePanel({
  evidence,
  controlId,
  onUnlink,
  isUnlinking = false,
}: ControlEvidencePanelProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg border border-surface-200 p-6 dark:bg-surface-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Evidence</h3>
        <Link
          to={`/evidence/upload?controlId=${controlId}`}
          className="text-sm flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Upload
        </Link>
      </div>

      {evidence.length === 0 ? (
        <div className="text-center py-8 text-surface-600">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No evidence linked to this control</p>
          <Link
            to={`/evidence/upload?controlId=${controlId}`}
            className="text-primary-400 hover:text-primary-300 mt-2 inline-block"
          >
            Upload evidence
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg dark:bg-surface-900"
            >
              <Link
                to={`/evidence/${item.id}`}
                className="flex items-center gap-3 text-surface-900 hover:text-primary-400"
              >
                <DocumentTextIcon className="w-5 h-5 text-surface-600" />
                <div>
                  <p className="font-medium">{item.filename}</p>
                  <p className="text-xs text-surface-500">
                    {item.type} • Uploaded {formatDate(item.uploadedAt)}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => onUnlink(item.id)}
                disabled={isUnlinking}
                className="p-1.5 text-surface-600 hover:text-red-600 hover:bg-red-500/10 rounded"
                title="Unlink evidence"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
