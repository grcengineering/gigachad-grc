import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Button, Input, Textarea, Select } from '@/components/ui';

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
      <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Vendor ID *
              </label>
              <Input
                type="text"
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Assessment Type *
              </label>
              <Select
                value={formData.assessmentType || ''}
                onChange={(value) => setFormData({ ...formData, assessmentType: value })}
                options={[
                  { value: 'security_review', label: 'Security Review' },
                  { value: 'privacy_assessment', label: 'Privacy Assessment' },
                  { value: 'compliance_audit', label: 'Compliance Audit' },
                  { value: 'vendor_questionnaire', label: 'Vendor Questionnaire' },
                  { value: 'on_site_audit', label: 'On-site Audit' },
                  { value: 'penetration_test', label: 'Penetration Test' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Status *
              </label>
              <Select
                value={formData.status || ''}
                onChange={(value) => setFormData({ ...formData, status: value })}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Assessor
              </label>
              <Input
                type="text"
                value={formData.assessor || ''}
                onChange={(e) => setFormData({ ...formData, assessor: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Due Date
              </label>
              <Input
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Completed Date
              </label>
              <Input
                type="date"
                value={formData.completedAt || ''}
                onChange={(e) => setFormData({ ...formData, completedAt: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Scores */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Assessment Scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Overall Score (0-100)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.overallScore || ''}
                onChange={(e) => setFormData({ ...formData, overallScore: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Security Score (0-100)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.securityScore || ''}
                onChange={(e) => setFormData({ ...formData, securityScore: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Privacy Score (0-100)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.privacyScore || ''}
                onChange={(e) => setFormData({ ...formData, privacyScore: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Compliance Score (0-100)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.complianceScore || ''}
                onChange={(e) => setFormData({ ...formData, complianceScore: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>
        </div>

        {/* Findings */}
        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">
            Findings
          </label>
          <Textarea
            value={formData.findings || ''}
            onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
            rows={4}
            placeholder="Document any findings, issues, or concerns discovered during the assessment..."
          />
        </div>

        {/* Recommendations */}
        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">
            Recommendations
          </label>
          <Textarea
            value={formData.recommendations || ''}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            rows={4}
            placeholder="Provide recommendations for improvement or remediation..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Assessment
        </Button>
      </div>
    </form>
  );
}

function AssessmentView({ assessment, onEdit, onDelete }: { assessment: Assessment; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-surface-900 capitalize">
              {assessment.assessmentType.replace('_', ' ')}
            </h2>
            <p className="mt-1 text-surface-600">{assessment.vendor.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-surface-600 mb-1">Vendor</dt>
              <dd className="text-sm text-surface-900">{assessment.vendor.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-600 mb-1">Type</dt>
              <dd className="text-sm text-surface-900 capitalize">
                {assessment.assessmentType.replace('_', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-surface-600 mb-1">Status</dt>
              <dd>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                  assessment.status === 'completed' ? 'bg-green-500/20 text-emerald-700' :
                  assessment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600' :
                  assessment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                  'bg-surface-200 text-surface-600'
                }`}>
                  {assessment.status.replace('_', ' ')}
                </span>
              </dd>
            </div>
            {assessment.assessor && (
              <div>
                <dt className="text-sm font-medium text-surface-600 mb-1">Assessor</dt>
                <dd className="text-sm text-surface-900">{assessment.assessor}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <h3 className="text-lg font-medium text-surface-900 mb-4">Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assessment.dueDate && (
              <div>
                <dt className="text-sm font-medium text-surface-600 mb-1">Due Date</dt>
                <dd className="text-sm text-surface-900">
                  {new Date(assessment.dueDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {assessment.completedAt && (
              <div>
                <dt className="text-sm font-medium text-surface-600 mb-1">Completed</dt>
                <dd className="text-sm text-surface-900">
                  {new Date(assessment.completedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* Scores */}
        {(assessment.overallScore || assessment.securityScore || assessment.privacyScore || assessment.complianceScore) && (
          <div>
            <h3 className="text-lg font-medium text-surface-900 mb-4">Assessment Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessment.overallScore !== null && assessment.overallScore !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-surface-600 mb-2">Overall Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-900">{assessment.overallScore}</span>
                    <div className="flex-1 h-3 bg-surface-200 rounded-full overflow-hidden">
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
                  <dt className="text-sm font-medium text-surface-600 mb-2">Security Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-900">{assessment.securityScore}</span>
                    <div className="flex-1 h-3 bg-surface-200 rounded-full overflow-hidden">
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
                  <dt className="text-sm font-medium text-surface-600 mb-2">Privacy Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-900">{assessment.privacyScore}</span>
                    <div className="flex-1 h-3 bg-surface-200 rounded-full overflow-hidden">
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
                  <dt className="text-sm font-medium text-surface-600 mb-2">Compliance Score</dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-surface-900">{assessment.complianceScore}</span>
                    <div className="flex-1 h-3 bg-surface-200 rounded-full overflow-hidden">
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
            <h3 className="text-lg font-medium text-surface-900 mb-4">Findings</h3>
            <div className="text-sm text-surface-700 whitespace-pre-wrap">{assessment.findings}</div>
          </div>
        )}

        {/* Recommendations */}
        {assessment.recommendations && (
          <div>
            <h3 className="text-lg font-medium text-surface-900 mb-4">Recommendations</h3>
            <div className="text-sm text-surface-700 whitespace-pre-wrap">{assessment.recommendations}</div>
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

  const fetchAssessment = useCallback(async () => {
    try {
      const response = await fetch(`/api/assessments/${id}`);
      const data = await response.json();
      setAssessment(data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchAssessment();
    } else {
      setEditing(true);
      setLoading(false);
    }
  }, [id, fetchAssessment]);

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
        <div className="text-surface-600">Loading assessment...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/assessments')}
          className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-surface-900">
            {id === 'new' ? 'New Assessment' : 'Assessment Details'}
          </h1>
          {assessment && (
            <p className="mt-1 text-surface-600">
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
