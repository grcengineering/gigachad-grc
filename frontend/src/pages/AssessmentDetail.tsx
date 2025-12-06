import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface Assessment {
  id: string;
  vendorId: string;
  assessmentType: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  overallScore?: number;
  securityScore?: number;
  privacyScore?: number;
  complianceScore?: number;
  findings?: string;
  recommendations?: string;
  assessor?: string;
  vendor: {
    id: string;
    name: string;
  };
}

interface AssessmentFormProps {
  assessment: Assessment | null;
  onSave: (data: Partial<Assessment>) => Promise<void>;
  onCancel: () => void;
}

function AssessmentForm({ assessment, onSave, onCancel }: AssessmentFormProps) {
  const [formData, setFormData] = useState<Partial<Assessment>>({
    vendorId: assessment?.vendorId || '',
    assessmentType: assessment?.assessmentType || 'security_review',
    status: assessment?.status || 'pending',
    dueDate: assessment?.dueDate ? new Date(assessment.dueDate).toISOString().split('T')[0] : '',
    completedAt: assessment?.completedAt ? new Date(assessment.completedAt).toISOString().split('T')[0] : '',
    overallScore: assessment?.overallScore,
    securityScore: assessment?.securityScore,
    privacyScore: assessment?.privacyScore,
    complianceScore: assessment?.complianceScore,
    findings: assessment?.findings || '',
    recommendations: assessment?.recommendations || '',
    assessor: assessment?.assessor || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Vendor ID *
              </label>
              <input
                type="text"
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Assessment Type *
              </label>
              <select
                value={formData.assessmentType}
                onChange={(e) => setFormData({ ...formData, assessmentType: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              >
                <option value="security_review">Security Review</option>
                <option value="privacy_assessment">Privacy Assessment</option>
                <option value="compliance_audit">Compliance Audit</option>
                <option value="vendor_questionnaire">Vendor Questionnaire</option>
                <option value="on_site_audit">On-site Audit</option>
                <option value="penetration_test">Penetration Test</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Assessor
              </label>
              <input
                type="text"
                value={formData.assessor || ''}
                onChange={(e) => setFormData({ ...formData, assessor: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Completed Date
              </label>
              <input
                type="date"
                value={formData.completedAt || ''}
                onChange={(e) => setFormData({ ...formData, completedAt: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Scores */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Assessment Scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Overall Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.overallScore || ''}
                onChange={(e) => setFormData({ ...formData, overallScore: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Security Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.securityScore || ''}
                onChange={(e) => setFormData({ ...formData, securityScore: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Privacy Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.privacyScore || ''}
                onChange={(e) => setFormData({ ...formData, privacyScore: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Compliance Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.complianceScore || ''}
                onChange={(e) => setFormData({ ...formData, complianceScore: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Findings */}
        <div>
          <label className="block text-sm font-medium text-surface-400 mb-1">
            Findings
          </label>
          <textarea
            value={formData.findings || ''}
            onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
            placeholder="Document any findings, issues, or concerns discovered during the assessment..."
          />
        </div>

        {/* Recommendations */}
        <div>
          <label className="block text-sm font-medium text-surface-400 mb-1">
            Recommendations
          </label>
          <textarea
            value={formData.recommendations || ''}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
            placeholder="Provide recommendations for improvement or remediation..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-surface-300 hover:text-surface-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          Save Assessment
        </button>
      </div>
    </form>
  );
}

function AssessmentView({ assessment, onEdit, onDelete }: { assessment: Assessment; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-surface-100 capitalize">
              {assessment.assessmentType.replace('_', ' ')}
            </h2>
            <p className="mt-1 text-surface-400">{assessment.vendor.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-surface-400 mb-1">Vendor</dt>
              <dd className="text-sm text-surface-100">{assessment.vendor.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-400 mb-1">Type</dt>
              <dd className="text-sm text-surface-100 capitalize">
                {assessment.assessmentType.replace('_', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-400 mb-1">Status</dt>
              <dd>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                  assessment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  assessment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                  assessment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-surface-700 text-surface-400'
                }`}>
                  {assessment.status.replace('_', ' ')}
                </span>
              </dd>
            </div>
            {assessment.assessor && (
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Assessor</dt>
                <dd className="text-sm text-surface-100">{assessment.assessor}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assessment.dueDate && (
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Due Date</dt>
                <dd className="text-sm text-surface-100">
                  {new Date(assessment.dueDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {assessment.completedAt && (
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Completed</dt>
                <dd className="text-sm text-surface-100">
                  {new Date(assessment.completedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* Scores */}
        {(assessment.overallScore || assessment.securityScore || assessment.privacyScore || assessment.complianceScore) && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Assessment Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessment.overallScore !== null && assessment.overallScore !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-2">Overall Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-100">{assessment.overallScore}</span>
                    <div className="flex-1 h-3 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          assessment.overallScore >= 80 ? 'bg-green-500' :
                          assessment.overallScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${assessment.overallScore}%` }}
                      />
                    </div>
                  </dd>
                </div>
              )}
              {assessment.securityScore !== null && assessment.securityScore !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-2">Security Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-100">{assessment.securityScore}</span>
                    <div className="flex-1 h-3 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          assessment.securityScore >= 80 ? 'bg-green-500' :
                          assessment.securityScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${assessment.securityScore}%` }}
                      />
                    </div>
                  </dd>
                </div>
              )}
              {assessment.privacyScore !== null && assessment.privacyScore !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-2">Privacy Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-100">{assessment.privacyScore}</span>
                    <div className="flex-1 h-3 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          assessment.privacyScore >= 80 ? 'bg-green-500' :
                          assessment.privacyScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${assessment.privacyScore}%` }}
                      />
                    </div>
                  </dd>
                </div>
              )}
              {assessment.complianceScore !== null && assessment.complianceScore !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-2">Compliance Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-100">{assessment.complianceScore}</span>
                    <div className="flex-1 h-3 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          assessment.complianceScore >= 80 ? 'bg-green-500' :
                          assessment.complianceScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${assessment.complianceScore}%` }}
                      />
                    </div>
                  </dd>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Findings */}
        {assessment.findings && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Findings</h3>
            <div className="text-sm text-surface-300 whitespace-pre-wrap">{assessment.findings}</div>
          </div>
        )}

        {/* Recommendations */}
        {assessment.recommendations && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Recommendations</h3>
            <div className="text-sm text-surface-300 whitespace-pre-wrap">{assessment.recommendations}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchAssessment();
    } else {
      setEditing(true);
      setLoading(false);
    }
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/assessments/${id}`);
      const data = await response.json();
      setAssessment(data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<Assessment>) => {
    try {
      const url = id === 'new'
        ? '/api/assessments'
        : `/api/assessments/${id}`;
      const method = id === 'new' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'system', // TODO: Get from auth context
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (id === 'new') {
          navigate(`/assessments/${data.id}`);
        } else {
          setAssessment(data);
          setEditing(false);
        }
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this assessment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/assessments/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'system', // TODO: Get from auth context
        },
      });

      if (response.ok) {
        navigate('/assessments');
      }
    } catch (error) {
      console.error('Error deleting assessment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading assessment...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/assessments')}
          className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-surface-100">
            {id === 'new' ? 'New Assessment' : 'Assessment Details'}
          </h1>
          {assessment && (
            <p className="mt-1 text-surface-400">
              {assessment.vendor.name} - {assessment.assessmentType.replace('_', ' ')}
            </p>
          )}
        </div>
      </div>

      {editing || id === 'new' ? (
        <AssessmentForm
          assessment={assessment}
          onSave={handleSave}
          onCancel={() => {
            if (id === 'new') {
              navigate('/assessments');
            } else {
              setEditing(false);
            }
          }}
        />
      ) : assessment ? (
        <AssessmentView
          assessment={assessment}
          onEdit={() => setEditing(true)}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}
