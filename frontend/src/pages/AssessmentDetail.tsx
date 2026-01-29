import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { assessmentsApi, vendorsApi } from '../lib/api';
import { VendorAssessment, Vendor } from '../lib/apiTypes';

interface AssessmentFormProps {
  assessment: VendorAssessment | null;
  onSave: (data: Partial<VendorAssessment>) => Promise<void>;
  onCancel: () => void;
}

function AssessmentForm({ assessment, onSave, onCancel }: AssessmentFormProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [formData, setFormData] = useState<Partial<VendorAssessment>>({
    vendorId: assessment?.vendorId || '',
    assessmentType: assessment?.assessmentType || 'initial_onboarding',
    status: assessment?.status || 'pending',
    dueDate: assessment?.dueDate ? new Date(assessment.dueDate).toISOString().split('T')[0] : '',
    completedAt: assessment?.completedAt ? new Date(assessment.completedAt).toISOString().split('T')[0] : '',
    inherentRiskScore: assessment?.inherentRiskScore || '',
    residualRiskScore: assessment?.residualRiskScore || '',
    overallScore: assessment?.overallScore,
    securityRisk: assessment?.securityRisk || '',
    complianceRisk: assessment?.complianceRisk || '',
    operationalRisk: assessment?.operationalRisk || '',
    financialRisk: assessment?.financialRisk || '',
    outcome: assessment?.outcome || '',
    outcomeNotes: assessment?.outcomeNotes || '',
    findings: typeof assessment?.findings === 'string' ? assessment.findings : '',
    recommendations: assessment?.recommendations || '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await vendorsApi.list();
      setVendors(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

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
                Vendor *
              </label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                required
              >
                <option value="">Select a vendor...</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
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
                <option value="initial_onboarding">Initial Onboarding</option>
                <option value="annual_review">Annual Review</option>
                <option value="continuous_monitoring">Continuous Monitoring</option>
                <option value="incident_triggered">Incident Triggered</option>
                <option value="contract_renewal">Contract Renewal</option>
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
                Inherent Risk
              </label>
              <select
                value={formData.inherentRiskScore || ''}
                onChange={(e) => setFormData({ ...formData, inherentRiskScore: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select risk level...</option>
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
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

        {/* Risk Assessment */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Risk Assessment</h3>
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
                Residual Risk
              </label>
              <select
                value={formData.residualRiskScore || ''}
                onChange={(e) => setFormData({ ...formData, residualRiskScore: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select risk level...</option>
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Security Risk
              </label>
              <select
                value={formData.securityRisk || ''}
                onChange={(e) => setFormData({ ...formData, securityRisk: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select risk level...</option>
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Compliance Risk
              </label>
              <select
                value={formData.complianceRisk || ''}
                onChange={(e) => setFormData({ ...formData, complianceRisk: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select risk level...</option>
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Operational Risk
              </label>
              <select
                value={formData.operationalRisk || ''}
                onChange={(e) => setFormData({ ...formData, operationalRisk: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select risk level...</option>
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Financial Risk
              </label>
              <select
                value={formData.financialRisk || ''}
                onChange={(e) => setFormData({ ...formData, financialRisk: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select risk level...</option>
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Outcome */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Assessment Outcome</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Outcome
              </label>
              <select
                value={formData.outcome || ''}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select outcome...</option>
                <option value="approved">Approved</option>
                <option value="approved_with_conditions">Approved with Conditions</option>
                <option value="rejected">Rejected</option>
                <option value="requires_remediation">Requires Remediation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Outcome Notes
              </label>
              <input
                type="text"
                value={formData.outcomeNotes || ''}
                onChange={(e) => setFormData({ ...formData, outcomeNotes: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                placeholder="Additional notes about the outcome..."
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
            value={typeof formData.findings === 'string' ? formData.findings : ''}
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

function AssessmentView({ assessment, onEdit, onDelete }: { assessment: VendorAssessment; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-surface-100 capitalize">
              {assessment.assessmentType.replace('_', ' ')}
            </h2>
            <p className="mt-1 text-surface-400">{assessment.vendor?.name}</p>
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
              <dd className="text-sm text-surface-100">{assessment.vendor?.name}</dd>
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
            {assessment.inherentRiskScore && (
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Inherent Risk</dt>
                <dd className="text-sm text-surface-100 capitalize">{assessment.inherentRiskScore.replace('_', ' ')}</dd>
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

        {/* Risk Assessment */}
        {(assessment.overallScore || assessment.securityRisk || assessment.complianceRisk || assessment.operationalRisk || assessment.residualRiskScore) && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Risk Assessment</h3>
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
              {assessment.residualRiskScore && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Residual Risk</dt>
                  <dd className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    assessment.residualRiskScore === 'critical' ? 'bg-red-500/20 text-red-400' :
                    assessment.residualRiskScore === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    assessment.residualRiskScore === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    assessment.residualRiskScore === 'low' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {assessment.residualRiskScore.replace('_', ' ')}
                  </dd>
                </div>
              )}
              {assessment.securityRisk && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Security Risk</dt>
                  <dd className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    assessment.securityRisk === 'critical' ? 'bg-red-500/20 text-red-400' :
                    assessment.securityRisk === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    assessment.securityRisk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    assessment.securityRisk === 'low' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {assessment.securityRisk.replace('_', ' ')}
                  </dd>
                </div>
              )}
              {assessment.complianceRisk && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Compliance Risk</dt>
                  <dd className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    assessment.complianceRisk === 'critical' ? 'bg-red-500/20 text-red-400' :
                    assessment.complianceRisk === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    assessment.complianceRisk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    assessment.complianceRisk === 'low' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {assessment.complianceRisk.replace('_', ' ')}
                  </dd>
                </div>
              )}
              {assessment.operationalRisk && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Operational Risk</dt>
                  <dd className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    assessment.operationalRisk === 'critical' ? 'bg-red-500/20 text-red-400' :
                    assessment.operationalRisk === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    assessment.operationalRisk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    assessment.operationalRisk === 'low' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {assessment.operationalRisk.replace('_', ' ')}
                  </dd>
                </div>
              )}
              {assessment.financialRisk && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Financial Risk</dt>
                  <dd className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    assessment.financialRisk === 'critical' ? 'bg-red-500/20 text-red-400' :
                    assessment.financialRisk === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    assessment.financialRisk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    assessment.financialRisk === 'low' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {assessment.financialRisk.replace('_', ' ')}
                  </dd>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Outcome */}
        {(assessment.outcome || assessment.outcomeNotes) && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Outcome</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessment.outcome && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Decision</dt>
                  <dd className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    assessment.outcome === 'approved' ? 'bg-green-500/20 text-green-400' :
                    assessment.outcome === 'approved_with_conditions' ? 'bg-yellow-500/20 text-yellow-400' :
                    assessment.outcome === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {assessment.outcome.replace(/_/g, ' ')}
                  </dd>
                </div>
              )}
              {assessment.outcomeNotes && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Notes</dt>
                  <dd className="text-sm text-surface-100">{assessment.outcomeNotes}</dd>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Findings */}
        {assessment.findings && (
          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Findings</h3>
            <div className="text-sm text-surface-300 whitespace-pre-wrap">
              {typeof assessment.findings === 'string' 
                ? assessment.findings 
                : JSON.stringify(assessment.findings, null, 2)}
            </div>
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
  const [assessment, setAssessment] = useState<VendorAssessment | null>(null);
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
      const response = await assessmentsApi.get(id!);
      setAssessment(response.data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<VendorAssessment>) => {
    try {
      // Get organizationId from localStorage with fallback to default org
      const organizationId = localStorage.getItem('organizationId') || '8924f0c1-7bb1-4be8-84ee-ad8725c712bf';
      
      // Clean up form data - remove empty strings and undefined values for optional fields
      const cleanedData: Record<string, unknown> = {
        organizationId,
        vendorId: formData.vendorId,
        assessmentType: formData.assessmentType,
        status: formData.status || 'pending',
      };
      
      // Add optional fields only if they have values
      if (formData.dueDate) cleanedData.dueDate = formData.dueDate;
      if (formData.completedAt) cleanedData.completedAt = formData.completedAt;
      if (formData.inherentRiskScore) cleanedData.inherentRiskScore = formData.inherentRiskScore;
      if (formData.residualRiskScore) cleanedData.residualRiskScore = formData.residualRiskScore;
      if (formData.overallScore !== undefined && formData.overallScore !== null) cleanedData.overallScore = formData.overallScore;
      if (formData.securityRisk) cleanedData.securityRisk = formData.securityRisk;
      if (formData.complianceRisk) cleanedData.complianceRisk = formData.complianceRisk;
      if (formData.operationalRisk) cleanedData.operationalRisk = formData.operationalRisk;
      if (formData.financialRisk) cleanedData.financialRisk = formData.financialRisk;
      if (formData.outcome) cleanedData.outcome = formData.outcome;
      if (formData.outcomeNotes) cleanedData.outcomeNotes = formData.outcomeNotes;
      if (formData.findings) cleanedData.findings = formData.findings;
      if (formData.recommendations) cleanedData.recommendations = formData.recommendations;

      if (id === 'new') {
        const response = await assessmentsApi.create(cleanedData);
        navigate(`/assessments/${response.data.id}`);
      } else {
        const response = await assessmentsApi.update(id!, cleanedData);
        setAssessment(response.data);
        setEditing(false);
      }
    } catch (error: unknown) {
      console.error('Error saving assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save assessment: ${errorMessage}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this assessment?')) {
      return;
    }

    try {
      await assessmentsApi.delete(id!);
      navigate('/assessments');
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
              {assessment.vendor?.name} - {assessment.assessmentType?.replace('_', ' ')}
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
