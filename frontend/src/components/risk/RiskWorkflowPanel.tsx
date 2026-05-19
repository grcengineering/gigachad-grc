import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { risksApi } from '../../lib/api';
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  User,
  FileText,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Send,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  TrendingUp,
  Edit2,
} from 'lucide-react';

// Workflow Status Constants (used for validation/reference)
const _INTAKE_STATUSES = [
  'risk_identified',
  'not_a_risk',
  'actual_risk',
  'risk_analysis_in_progress',
  'risk_analyzed',
];
const _ASSESSMENT_STATUSES = ['risk_assessor_analysis', 'grc_approval', 'grc_revision', 'done'];
const _TREATMENT_STATUSES = [
  'treatment_decision_review',
  'identify_executive_approver',
  'executive_approval',
  'risk_mitigation_in_progress',
  'risk_mitigation_complete',
  'risk_accept',
  'risk_transfer',
  'risk_avoid',
  'risk_auto_accept',
];
// Export for use in other components
export {
  _INTAKE_STATUSES as INTAKE_STATUSES,
  _ASSESSMENT_STATUSES as ASSESSMENT_STATUSES,
  _TREATMENT_STATUSES as TREATMENT_STATUSES,
};

interface RiskWorkflowPanelProps {
  risk: any;
  onUpdate: () => void;
}

export default function RiskWorkflowPanel({ risk, onUpdate }: RiskWorkflowPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Determine current workflow stage
  const getWorkflowStage = () => {
    if (risk.status === 'not_a_risk') return 'closed';
    if (['risk_identified', 'actual_risk'].includes(risk.status)) return 'intake';
    if (
      risk.status === 'risk_analysis_in_progress' ||
      (risk.assessment && risk.assessment.status !== 'done')
    ) {
      return 'assessment';
    }
    if (risk.treatment) return 'treatment';
    return 'intake';
  };

  const stage = getWorkflowStage();

  // Get status display info
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      // Intake
      risk_identified: {
        label: 'Risk Identified',
        color: 'text-purple-600 bg-purple-500/20',
        icon: AlertTriangle,
      },
      not_a_risk: {
        label: 'Not a Risk',
        color: 'text-surface-600 bg-surface-500/20',
        icon: XCircle,
      },
      actual_risk: {
        label: 'Validated Risk',
        color: 'text-blue-600 bg-blue-500/20',
        icon: CheckCircle,
      },
      risk_analysis_in_progress: {
        label: 'Analysis In Progress',
        color: 'text-cyan-600 bg-cyan-500/20',
        icon: Clock,
      },
      risk_analyzed: {
        label: 'Risk Analyzed',
        color: 'text-indigo-600 bg-indigo-500/20',
        icon: FileText,
      },
      // Assessment
      risk_assessor_analysis: {
        label: 'Awaiting Assessment',
        color: 'text-amber-600 bg-amber-500/20',
        icon: User,
      },
      grc_approval: {
        label: 'GRC Approval',
        color: 'text-orange-600 bg-orange-500/20',
        icon: UserCheck,
      },
      grc_revision: {
        label: 'GRC Revision',
        color: 'text-yellow-600 bg-yellow-500/20',
        icon: FileText,
      },
      done: {
        label: 'Assessment Complete',
        color: 'text-emerald-600 bg-emerald-500/20',
        icon: CheckCircle,
      },
      // Treatment
      treatment_decision_review: {
        label: 'Treatment Decision',
        color: 'text-amber-600 bg-amber-500/20',
        icon: Shield,
      },
      identify_executive_approver: {
        label: 'Assign Approver',
        color: 'text-orange-600 bg-orange-500/20',
        icon: User,
      },
      executive_approval: {
        label: 'Executive Approval',
        color: 'text-purple-600 bg-purple-500/20',
        icon: UserCheck,
      },
      risk_mitigation_in_progress: {
        label: 'Mitigation In Progress',
        color: 'text-blue-600 bg-blue-500/20',
        icon: TrendingUp,
      },
      risk_mitigation_complete: {
        label: 'Mitigation Complete',
        color: 'text-emerald-600 bg-emerald-500/20',
        icon: CheckCircle,
      },
      risk_accept: {
        label: 'Risk Accepted',
        color: 'text-blue-600 bg-blue-500/20',
        icon: ThumbsUp,
      },
      risk_transfer: {
        label: 'Risk Transferred',
        color: 'text-cyan-600 bg-cyan-500/20',
        icon: ArrowRight,
      },
      risk_avoid: {
        label: 'Risk Avoided',
        color: 'text-emerald-600 bg-emerald-500/20',
        icon: Shield,
      },
      risk_auto_accept: {
        label: 'Auto Accepted',
        color: 'text-surface-600 bg-surface-500/20',
        icon: CheckCircle,
      },
    };
    return (
      statusMap[status] || {
        label: status.replace(/_/g, ' '),
        color: 'text-surface-600 bg-surface-500/20',
        icon: Clock,
      }
    );
  };

  const currentStatus = risk.treatment?.status || risk.assessment?.status || risk.status;
  const statusInfo = getStatusInfo(currentStatus);

  // Determine available actions based on current status
  const getAvailableActions = () => {
    const actions: { key: string; label: string; icon: any; color: string; description: string }[] =
      [];

    switch (risk.status) {
      case 'risk_identified':
        actions.push({
          key: 'validate',
          label: 'Validate Risk',
          icon: CheckCircle,
          color: 'bg-brand-500 hover:bg-brand-600',
          description: 'GRC SME validates this is a real risk',
        });
        actions.push({
          key: 'reject',
          label: 'Not a Risk',
          icon: XCircle,
          color: 'bg-surface-600 hover:bg-surface-500',
          description: 'Mark as not a valid risk',
        });
        break;

      case 'actual_risk':
        actions.push({
          key: 'start_assessment',
          label: 'Start Assessment',
          icon: Play,
          color: 'bg-brand-500 hover:bg-brand-600',
          description: 'Assign a Risk Assessor and begin analysis',
        });
        break;
    }

    // Assessment phase actions
    if (risk.assessment) {
      switch (risk.assessment.status) {
        case 'risk_assessor_analysis':
          actions.push({
            key: 'submit_assessment',
            label: 'Submit Assessment',
            icon: Send,
            color: 'bg-brand-500 hover:bg-brand-600',
            description: 'Complete and submit the risk assessment form',
          });
          break;

        case 'grc_approval':
          actions.push({
            key: 'approve_assessment',
            label: 'Approve Assessment',
            icon: ThumbsUp,
            color: 'bg-emerald-500 hover:bg-emerald-600',
            description: 'Approve the assessment and proceed to treatment',
          });
          actions.push({
            key: 'request_revision',
            label: 'Request Revision',
            icon: ThumbsDown,
            color: 'bg-amber-500 hover:bg-amber-600',
            description: 'Send back to assessor for changes',
          });
          break;

        case 'grc_revision':
          actions.push({
            key: 'complete_revision',
            label: 'Complete Revision',
            icon: Send,
            color: 'bg-brand-500 hover:bg-brand-600',
            description: 'Submit revised assessment',
          });
          break;
      }
    }

    // Treatment phase actions
    if (risk.treatment) {
      switch (risk.treatment.status) {
        case 'treatment_decision_review':
          actions.push({
            key: 'submit_treatment',
            label: 'Submit Treatment Decision',
            icon: Shield,
            color: 'bg-brand-500 hover:bg-brand-600',
            description: 'Choose how to treat this risk',
          });
          break;

        case 'identify_executive_approver':
          actions.push({
            key: 'assign_approver',
            label: 'Assign Executive Approver',
            icon: User,
            color: 'bg-brand-500 hover:bg-brand-600',
            description: 'Identify the executive who will approve this decision',
          });
          break;

        case 'executive_approval':
          actions.push({
            key: 'executive_approve',
            label: 'Approve',
            icon: ThumbsUp,
            color: 'bg-emerald-500 hover:bg-emerald-600',
            description: 'Approve the treatment decision',
          });
          actions.push({
            key: 'executive_deny',
            label: 'Deny',
            icon: ThumbsDown,
            color: 'bg-red-500 hover:bg-red-600',
            description: 'Deny and return to Risk Owner',
          });
          break;

        case 'risk_mitigation_in_progress':
          actions.push({
            key: 'update_mitigation',
            label: 'Update Progress',
            icon: TrendingUp,
            color: 'bg-brand-500 hover:bg-brand-600',
            description: 'Update mitigation status and progress',
          });
          break;
      }
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-surface-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusInfo.color}`}>
            <statusInfo.icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">Workflow Status</h3>
            <p className="text-sm text-surface-600">{statusInfo.label}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-surface-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-surface-600" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-surface-700">
          {/* Workflow Progress */}
          <div className="p-4 border-b border-surface-700">
            <h4 className="text-sm font-medium text-surface-600 mb-3">Workflow Progress</h4>
            <WorkflowProgressBar
              stage={stage}
              intakeStatus={risk.status}
              assessmentStatus={risk.assessment?.status}
              treatmentStatus={risk.treatment?.status}
            />
          </div>

          {/* Available Actions */}
          {actions.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-surface-600 mb-3">Available Actions</h4>
              <div className="space-y-2">
                {actions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => setActiveModal(action.key)}
                    className={`w-full p-3 rounded-lg text-white flex items-center gap-3 transition-colors ${action.color}`}
                  >
                    <action.icon className="w-5 h-5" />
                    <div className="text-left flex-1">
                      <p className="font-medium">{action.label}</p>
                      <p className="text-sm opacity-80">{action.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Role Assignments */}
          <div className="p-4 border-t border-surface-700">
            <h4 className="text-sm font-medium text-surface-600 mb-3">Assigned Roles</h4>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                label="Reporter"
                userId={risk.reporterId}
                onEdit={() => setActiveModal('assign_reporter')}
                editable={true}
              />
              <RoleCard
                label="GRC SME"
                userId={risk.grcSmeId}
                onEdit={() => setActiveModal('assign_grc_sme')}
                editable={true}
              />
              <RoleCard
                label="Risk Assessor"
                userId={risk.riskAssessorId || risk.assessment?.riskAssessorId}
                onEdit={() => setActiveModal('assign_assessor')}
                editable={risk.status === 'actual_risk' || risk.status === 'risk_identified'}
              />
              <RoleCard
                label="Risk Owner"
                userId={risk.riskOwnerId || risk.treatment?.riskOwnerId}
                onEdit={() => setActiveModal('assign_owner')}
                editable={!!risk.assessment}
              />
              {risk.treatment && (
                <RoleCard
                  label="Executive Approver"
                  userId={risk.treatment.executiveApproverId}
                  onEdit={() => setActiveModal('assign_approver')}
                  editable={risk.treatment?.status === 'identify_executive_approver'}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'validate' && (
        <ValidateRiskModal
          riskId={risk.id}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
          approve={true}
        />
      )}
      {activeModal === 'reject' && (
        <ValidateRiskModal
          riskId={risk.id}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
          approve={false}
        />
      )}
      {activeModal === 'start_assessment' && (
        <StartAssessmentModal
          riskId={risk.id}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'submit_assessment' && (
        <SubmitAssessmentModal
          riskId={risk.id}
          assessment={risk.assessment}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'approve_assessment' && (
        <ReviewAssessmentModal
          riskId={risk.id}
          approve={true}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'request_revision' && (
        <ReviewAssessmentModal
          riskId={risk.id}
          approve={false}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'complete_revision' && (
        <CompleteRevisionModal
          riskId={risk.id}
          assessment={risk.assessment}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'submit_treatment' && (
        <TreatmentDecisionModal
          riskId={risk.id}
          inherentRisk={risk.inherentRisk}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'assign_approver' && (
        <AssignApproverModal
          riskId={risk.id}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'executive_approve' && (
        <ExecutiveApprovalModal
          riskId={risk.id}
          approve={true}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'executive_deny' && (
        <ExecutiveApprovalModal
          riskId={risk.id}
          approve={false}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'update_mitigation' && (
        <MitigationUpdateModal
          riskId={risk.id}
          treatment={risk.treatment}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'assign_reporter' && (
        <AssignRoleModal
          riskId={risk.id}
          roleType="reporter"
          roleLabel="Reporter"
          currentUserId={risk.reporterId}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'assign_grc_sme' && (
        <AssignRoleModal
          riskId={risk.id}
          roleType="grcSme"
          roleLabel="GRC SME"
          currentUserId={risk.grcSmeId}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'assign_assessor' && (
        <AssignRoleModal
          riskId={risk.id}
          roleType="riskAssessor"
          roleLabel="Risk Assessor"
          currentUserId={risk.riskAssessorId || risk.assessment?.riskAssessorId}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'assign_owner' && (
        <AssignRoleModal
          riskId={risk.id}
          roleType="riskOwner"
          roleLabel="Risk Owner"
          currentUserId={risk.riskOwnerId || risk.treatment?.riskOwnerId}
          onClose={() => setActiveModal(null)}
          onSuccess={onUpdate}
        />
      )}
    </div>
  );
}

// Workflow Progress Bar Component
function WorkflowProgressBar({
  stage,
  intakeStatus,
  assessmentStatus: _assessmentStatus,
  treatmentStatus,
}: {
  stage: string;
  intakeStatus: string;
  assessmentStatus?: string;
  treatmentStatus?: string;
}) {
  void _assessmentStatus; // Currently unused but kept for future use
  const stages = [
    { key: 'intake', label: 'Intake', statuses: ['risk_identified', 'actual_risk'] },
    {
      key: 'assessment',
      label: 'Assessment',
      statuses: ['risk_analysis_in_progress', 'risk_analyzed'],
    },
    { key: 'treatment', label: 'Treatment', statuses: [] },
    { key: 'complete', label: 'Complete', statuses: [] },
  ];

  const getStageState = (stageKey: string) => {
    if (intakeStatus === 'not_a_risk') {
      return stageKey === 'intake' ? 'complete' : 'inactive';
    }

    const stageIndex = stages.findIndex((s) => s.key === stageKey);
    const currentIndex = stages.findIndex((s) => s.key === stage);

    if (stageKey === 'complete') {
      const isFinal = [
        'risk_mitigation_complete',
        'risk_accept',
        'risk_transfer',
        'risk_avoid',
        'risk_auto_accept',
      ].includes(treatmentStatus || '');
      return isFinal ? 'complete' : 'inactive';
    }

    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'active';
    return 'inactive';
  };

  return (
    <div className="flex items-center w-full">
      {stages.map((s, index) => (
        <div key={s.key} className="flex items-center flex-1">
          {/* Stage circle and label */}
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                getStageState(s.key) === 'complete'
                  ? 'bg-emerald-500 text-white'
                  : getStageState(s.key) === 'active'
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-700 text-surface-600'
              }`}
            >
              {getStageState(s.key) === 'complete' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-xs mt-1 whitespace-nowrap ${
                getStageState(s.key) === 'active' ? 'text-white' : 'text-surface-600'
              }`}
            >
              {s.label}
            </span>
          </div>
          {/* Connector line */}
          {index < stages.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-3 min-w-[40px] ${
                getStageState(stages[index + 1].key) !== 'inactive'
                  ? 'bg-emerald-500'
                  : 'bg-surface-600'
              }`}
              style={{ marginTop: '-20px' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Role Card Component
function RoleCard({
  label,
  userId,
  onEdit,
  editable = false,
}: {
  label: string;
  userId?: string;
  onEdit?: () => void;
  editable?: boolean;
}) {
  return (
    <div
      className={`p-2 bg-surface-700/50 rounded-lg flex items-center justify-between ${
        editable ? 'hover:bg-surface-700 cursor-pointer' : ''
      }`}
      onClick={editable ? onEdit : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-surface-600">{label}</p>
        <p className="text-sm text-white truncate">
          {userId ? userId.substring(0, 8) + '...' : 'Not assigned'}
        </p>
      </div>
      {editable && (
        <Edit2 className="w-3.5 h-3.5 text-surface-500 hover:text-surface-700 shrink-0 ml-2" />
      )}
    </div>
  );
}

// Modal Components

// Reusable User Picker Component
function UserPicker({
  label,
  selectedUserId,
  onSelect,
  required = false,
  allowUnassign = false,
  description,
}: {
  label: string;
  selectedUserId: string;
  onSelect: (userId: string) => void;
  required?: boolean;
  allowUnassign?: boolean;
  description?: string;
}) {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch users for selection
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/users?limit=100');
      if (!response.ok) return { users: [] };
      return response.json();
    },
  });

  const users = usersData?.users || [];
  const filteredUsers = users.filter(
    (user: any) =>
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = users.find((u: any) => u.id === selectedUserId);

  return (
    <div>
      <label className="block text-sm text-surface-600 mb-2">
        {label} {required && '*'}
      </label>

      {/* Selected user display / toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-left flex items-center justify-between hover:bg-surface-600 transition-colors"
      >
        {selectedUser ? (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium">
              {(selectedUser.firstName?.[0] || selectedUser.email?.[0] || '?').toUpperCase()}
            </div>
            <span className="text-white">
              {selectedUser.firstName && selectedUser.lastName
                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                : selectedUser.email}
            </span>
          </div>
        ) : (
          <span className="text-surface-600">Select a user...</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-surface-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {description && <p className="text-xs text-surface-500 mt-1">{description}</p>}

      {/* Expandable user list */}
      {isExpanded && (
        <div className="mt-2 border border-surface-600 rounded-lg bg-surface-750 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-surface-600">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-1.5 bg-surface-700 border border-surface-600 rounded text-white text-sm"
            />
          </div>

          {/* User list */}
          <div className="max-h-48 overflow-y-auto">
            {allowUnassign && (
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  setIsExpanded(false);
                }}
                className={`w-full flex items-center gap-3 p-2 hover:bg-surface-600 ${
                  selectedUserId === '' ? 'bg-brand-500/20' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-surface-600 flex items-center justify-center">
                  <User className="w-3 h-3 text-surface-600" />
                </div>
                <span className="text-surface-700 text-sm">None (skip for now)</span>
              </button>
            )}

            {filteredUsers.length === 0 && search && (
              <p className="text-center text-surface-500 py-4 text-sm">No users found</p>
            )}

            {filteredUsers.map((user: any) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelect(user.id);
                  setIsExpanded(false);
                }}
                className={`w-full flex items-center gap-3 p-2 hover:bg-surface-600 ${
                  selectedUserId === user.id ? 'bg-brand-500/20' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium">
                  {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-white text-sm truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </p>
                  <p className="text-xs text-surface-600 truncate">{user.email}</p>
                </div>
              </button>
            ))}

            {/* Fallback manual input if no users loaded */}
            {users.length === 0 && (
              <div className="p-2">
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => onSelect(e.target.value)}
                  placeholder="Enter user ID manually..."
                  className="w-full px-3 py-1.5 bg-surface-700 border border-surface-600 rounded text-white text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ValidateRiskModal({
  riskId,
  approve,
  onClose,
  onSuccess,
}: {
  riskId: string;
  approve: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [riskAssessorId, setRiskAssessorId] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.validateRisk(riskId, {
        approved: approve,
        reason: reason || undefined,
        riskAssessorId: approve ? riskAssessorId || undefined : undefined,
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">
            {approve ? 'Validate Risk' : 'Reject Risk'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {approve && (
            <UserPicker
              label="Risk Assessor"
              selectedUserId={riskAssessorId}
              onSelect={setRiskAssessorId}
              allowUnassign={true}
              description="Optionally assign who will perform the risk assessment"
            />
          )}
          <div>
            <label className="block text-sm text-surface-600 mb-2">
              {approve ? 'Notes (optional)' : 'Reason for rejection *'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={!approve}
              rows={3}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder={approve ? 'Add any notes...' : 'Explain why this is not a valid risk...'}
            />
          </div>
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (!approve && !reason)}
            className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
              approve ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {mutation.isPending ? 'Processing...' : approve ? 'Validate' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StartAssessmentModal({
  riskId,
  onClose,
  onSuccess,
}: {
  riskId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [riskAssessorId, setRiskAssessorId] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.startAssessment(riskId, riskAssessorId);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Start Risk Assessment</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <UserPicker
            label="Risk Assessor"
            selectedUserId={riskAssessorId}
            onSelect={setRiskAssessorId}
            required={true}
            description="The SME who will analyze and assess this risk"
          />
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !riskAssessorId}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Starting...' : 'Start Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitAssessmentModal({
  riskId,
  assessment,
  onClose,
  onSuccess,
}: {
  riskId: string;
  assessment?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    threatDescription: assessment?.threatDescription || '',
    affectedAssets: assessment?.affectedAssets?.join(', ') || '',
    existingControls: assessment?.existingControls?.join(', ') || '',
    vulnerabilities: assessment?.vulnerabilities || '',
    likelihoodScore: assessment?.likelihoodScore || 'possible',
    likelihoodRationale: assessment?.likelihoodRationale || '',
    impactScore: assessment?.impactScore || 'moderate',
    impactRationale: assessment?.impactRationale || '',
    recommendedOwnerId: assessment?.recommendedOwnerId || '',
    assessmentNotes: assessment?.assessmentNotes || '',
    treatmentRecommendation: assessment?.treatmentRecommendation || '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.submitAssessment(riskId, {
        ...formData,
        affectedAssets: formData.affectedAssets
          ? formData.affectedAssets.split(',').map((s: string) => s.trim())
          : [],
        existingControls: formData.existingControls
          ? formData.existingControls.split(',').map((s: string) => s.trim())
          : [],
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center sticky top-0 bg-surface-800">
          <h3 className="text-lg font-medium text-white">Risk Assessment Form</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Threat Description *</label>
            <textarea
              value={formData.threatDescription}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, threatDescription: e.target.value }))
              }
              required
              rows={3}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Describe the threat scenario..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-600 mb-2">Affected Assets</label>
              <input
                type="text"
                value={formData.affectedAssets}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, affectedAssets: e.target.value }))
                }
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Comma-separated list"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-600 mb-2">Existing Controls</label>
              <input
                type="text"
                value={formData.existingControls}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, existingControls: e.target.value }))
                }
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Comma-separated list"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-2">Vulnerabilities</label>
            <textarea
              value={formData.vulnerabilities}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, vulnerabilities: e.target.value }))
              }
              rows={2}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Describe any vulnerabilities..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-600 mb-2">Likelihood Score *</label>
              <select
                value={formData.likelihoodScore}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, likelihoodScore: e.target.value }))
                }
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="rare">Rare</option>
                <option value="unlikely">Unlikely</option>
                <option value="possible">Possible</option>
                <option value="likely">Likely</option>
                <option value="almost_certain">Almost Certain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-surface-600 mb-2">Impact Score *</label>
              <select
                value={formData.impactScore}
                onChange={(e) => setFormData((prev) => ({ ...prev, impactScore: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="negligible">Negligible</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-600 mb-2">Likelihood Rationale *</label>
              <textarea
                value={formData.likelihoodRationale}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, likelihoodRationale: e.target.value }))
                }
                required
                rows={2}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Why this likelihood score?"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-600 mb-2">Impact Rationale *</label>
              <textarea
                value={formData.impactRationale}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, impactRationale: e.target.value }))
                }
                required
                rows={2}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Why this impact score?"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <UserPicker
              label="Recommended Risk Owner"
              selectedUserId={formData.recommendedOwnerId}
              onSelect={(id) => setFormData((prev) => ({ ...prev, recommendedOwnerId: id }))}
              required={true}
              description="Who should own this risk going forward"
            />
            <div>
              <label className="block text-sm text-surface-600 mb-2">
                Treatment Recommendation
              </label>
              <select
                value={formData.treatmentRecommendation}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, treatmentRecommendation: e.target.value }))
                }
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Select...</option>
                <option value="mitigate">Mitigate</option>
                <option value="accept">Accept</option>
                <option value="transfer">Transfer</option>
                <option value="avoid">Avoid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-2">Assessment Notes</label>
            <textarea
              value={formData.assessmentNotes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, assessmentNotes: e.target.value }))
              }
              rows={2}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Any additional notes..."
            />
          </div>
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3 sticky bottom-0 bg-surface-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              !formData.threatDescription ||
              !formData.likelihoodRationale ||
              !formData.impactRationale ||
              !formData.recommendedOwnerId
            }
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewAssessmentModal({
  riskId,
  approve,
  onClose,
  onSuccess,
}: {
  riskId: string;
  approve: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [declinedReason, setDeclinedReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.reviewAssessment(riskId, {
        approved: approve,
        notes: notes || undefined,
        declinedReason: !approve ? declinedReason : undefined,
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">
            {approve ? 'Approve Assessment' : 'Request Revision'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {approve ? (
            <div>
              <label className="block text-sm text-surface-600 mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Add any notes..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-surface-600 mb-2">Reason for Revision *</label>
              <textarea
                value={declinedReason}
                onChange={(e) => setDeclinedReason(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Explain what needs to be revised..."
              />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (!approve && !declinedReason)}
            className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
              approve ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {mutation.isPending ? 'Processing...' : approve ? 'Approve' : 'Request Revision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteRevisionModal({
  riskId,
  assessment,
  onClose,
  onSuccess,
}: {
  riskId: string;
  assessment?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    likelihoodScore: assessment?.likelihoodScore || '',
    likelihoodRationale: assessment?.likelihoodRationale || '',
    impactScore: assessment?.impactScore || '',
    impactRationale: assessment?.impactRationale || '',
    recommendedOwnerId: assessment?.recommendedOwnerId || '',
    assessmentNotes: assessment?.assessmentNotes || '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.completeRevision(riskId, formData);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Complete Revision</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-surface-600 text-sm">
            Update the fields that need revision. Leave blank to keep existing values.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-600 mb-2">Likelihood Score</label>
              <select
                value={formData.likelihoodScore}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, likelihoodScore: e.target.value }))
                }
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Keep existing</option>
                <option value="rare">Rare</option>
                <option value="unlikely">Unlikely</option>
                <option value="possible">Possible</option>
                <option value="likely">Likely</option>
                <option value="almost_certain">Almost Certain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-surface-600 mb-2">Impact Score</label>
              <select
                value={formData.impactScore}
                onChange={(e) => setFormData((prev) => ({ ...prev, impactScore: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Keep existing</option>
                <option value="negligible">Negligible</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-2">Assessment Notes</label>
            <textarea
              value={formData.assessmentNotes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, assessmentNotes: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Updated notes..."
            />
          </div>
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Submitting...' : 'Complete Revision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TreatmentDecisionModal({
  riskId,
  inherentRisk,
  onClose,
  onSuccess,
}: {
  riskId: string;
  inherentRisk?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    decision: 'mitigate' as 'accept' | 'mitigate' | 'transfer' | 'avoid',
    justification: '',
    mitigationDescription: '',
    mitigationTargetDate: '',
    transferTo: '',
    transferCost: '',
    avoidStrategy: '',
    acceptanceRationale: '',
    acceptanceExpiresAt: '',
  });

  const needsExecutiveApproval =
    ['very_high', 'high'].includes(inherentRisk || '') && formData.decision !== 'mitigate';

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.submitTreatmentDecision(riskId, {
        decision: formData.decision,
        justification: formData.justification,
        mitigationDescription: formData.mitigationDescription || undefined,
        mitigationTargetDate: formData.mitigationTargetDate || undefined,
        transferTo: formData.transferTo || undefined,
        transferCost: formData.transferCost ? parseFloat(formData.transferCost) : undefined,
        avoidStrategy: formData.avoidStrategy || undefined,
        acceptanceRationale: formData.acceptanceRationale || undefined,
        acceptanceExpiresAt: formData.acceptanceExpiresAt || undefined,
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Treatment Decision</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Treatment Strategy *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'mitigate', label: 'Mitigate', desc: 'Implement controls' },
                { value: 'accept', label: 'Accept', desc: 'Accept the risk' },
                { value: 'transfer', label: 'Transfer', desc: 'Insurance/3rd party' },
                { value: 'avoid', label: 'Avoid', desc: 'Eliminate risk' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, decision: opt.value as any }))}
                  className={`p-3 rounded-lg text-left ${
                    formData.decision === opt.value
                      ? 'bg-brand-500/20 border border-brand-500'
                      : 'bg-surface-700 border border-surface-600'
                  }`}
                >
                  <p className="text-white font-medium">{opt.label}</p>
                  <p className="text-surface-600 text-xs">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {needsExecutiveApproval && (
            <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <p className="text-amber-600 text-sm">
                ⚠️ This decision requires Executive Approval due to the risk level.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm text-surface-600 mb-2">Justification *</label>
            <textarea
              value={formData.justification}
              onChange={(e) => setFormData((prev) => ({ ...prev, justification: e.target.value }))}
              required
              rows={3}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Explain why this treatment strategy..."
            />
          </div>

          {/* Mitigation fields */}
          {formData.decision === 'mitigate' && (
            <>
              <div>
                <label className="block text-sm text-surface-600 mb-2">
                  Mitigation Description
                </label>
                <textarea
                  value={formData.mitigationDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mitigationDescription: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="Describe the mitigation plan..."
                />
              </div>
              <div>
                <label className="block text-sm text-surface-600 mb-2">Target Date</label>
                <input
                  type="date"
                  value={formData.mitigationTargetDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mitigationTargetDate: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>
            </>
          )}

          {/* Transfer fields */}
          {formData.decision === 'transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-600 mb-2">Transfer To</label>
                <input
                  type="text"
                  value={formData.transferTo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, transferTo: e.target.value }))}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="Insurance provider..."
                />
              </div>
              <div>
                <label className="block text-sm text-surface-600 mb-2">Cost ($)</label>
                <input
                  type="number"
                  value={formData.transferCost}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, transferCost: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Avoid fields */}
          {formData.decision === 'avoid' && (
            <div>
              <label className="block text-sm text-surface-600 mb-2">Avoidance Strategy</label>
              <textarea
                value={formData.avoidStrategy}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, avoidStrategy: e.target.value }))
                }
                rows={2}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="How will the risk be avoided..."
              />
            </div>
          )}

          {/* Accept fields */}
          {formData.decision === 'accept' && (
            <>
              <div>
                <label className="block text-sm text-surface-600 mb-2">Acceptance Rationale</label>
                <textarea
                  value={formData.acceptanceRationale}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, acceptanceRationale: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="Why is accepting appropriate..."
                />
              </div>
              <div>
                <label className="block text-sm text-surface-600 mb-2">Acceptance Expires</label>
                <input
                  type="date"
                  value={formData.acceptanceExpiresAt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, acceptanceExpiresAt: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !formData.justification}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Decision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignApproverModal({
  riskId,
  onClose,
  onSuccess,
}: {
  riskId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [executiveApproverId, setExecutiveApproverId] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.assignExecutiveApprover(riskId, executiveApproverId);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Assign Executive Approver</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-surface-600 text-sm">
            Identify the department lead or executive who should approve this treatment decision.
          </p>
          <UserPicker
            label="Executive Approver"
            selectedUserId={executiveApproverId}
            onSelect={setExecutiveApproverId}
            required={true}
            description="The executive who will approve this treatment decision"
          />
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !executiveApproverId}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Assigning...' : 'Assign Approver'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExecutiveApprovalModal({
  riskId,
  approve,
  onClose,
  onSuccess,
}: {
  riskId: string;
  approve: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [deniedReason, setDeniedReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.submitExecutiveApproval(riskId, {
        approved: approve,
        notes: notes || undefined,
        deniedReason: !approve ? deniedReason : undefined,
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">
            {approve ? 'Approve Treatment' : 'Deny Treatment'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {approve ? (
            <div>
              <label className="block text-sm text-surface-600 mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Add any notes..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-surface-600 mb-2">Reason for Denial *</label>
              <textarea
                value={deniedReason}
                onChange={(e) => setDeniedReason(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Explain why this decision is denied..."
              />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (!approve && !deniedReason)}
            className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
              approve ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {mutation.isPending ? 'Processing...' : approve ? 'Approve' : 'Deny'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MitigationUpdateModal({
  riskId,
  treatment,
  onClose,
  onSuccess,
}: {
  riskId: string;
  treatment?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    status: treatment?.mitigationStatus || 'on_track',
    progress: treatment?.mitigationProgress || 0,
    notes: '',
    newTargetDate: '',
    delayReason: '',
    cancellationReason: '',
    residualLikelihood: '',
    residualImpact: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await risksApi.updateMitigationStatus(riskId, {
        status: formData.status as any,
        progress: formData.progress,
        notes: formData.notes || undefined,
        newTargetDate: formData.newTargetDate || undefined,
        delayReason: formData.delayReason || undefined,
        cancellationReason: formData.cancellationReason || undefined,
        residualLikelihood: formData.residualLikelihood || undefined,
        residualImpact: formData.residualImpact || undefined,
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Update Mitigation Status</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
            >
              <option value="on_track">On Track</option>
              <option value="delayed">Delayed</option>
              <option value="cancelled">Cancelled</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-2">
              Progress: {formData.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, progress: parseInt(e.target.value) }))
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Update notes..."
            />
          </div>

          {formData.status === 'delayed' && (
            <>
              <div>
                <label className="block text-sm text-surface-600 mb-2">New Target Date</label>
                <input
                  type="date"
                  value={formData.newTargetDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, newTargetDate: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-600 mb-2">Delay Reason</label>
                <textarea
                  value={formData.delayReason}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, delayReason: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="Why is it delayed..."
                />
              </div>
            </>
          )}

          {formData.status === 'cancelled' && (
            <div>
              <label className="block text-sm text-surface-600 mb-2">Cancellation Reason *</label>
              <textarea
                value={formData.cancellationReason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cancellationReason: e.target.value }))
                }
                required
                rows={2}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Why is mitigation cancelled..."
              />
            </div>
          )}

          {formData.status === 'done' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-600 mb-2">Residual Likelihood</label>
                <select
                  value={formData.residualLikelihood}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, residualLikelihood: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                >
                  <option value="">Select...</option>
                  <option value="rare">Rare</option>
                  <option value="unlikely">Unlikely</option>
                  <option value="possible">Possible</option>
                  <option value="likely">Likely</option>
                  <option value="almost_certain">Almost Certain</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-surface-600 mb-2">Residual Impact</label>
                <select
                  value={formData.residualImpact}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, residualImpact: e.target.value }))
                  }
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                >
                  <option value="">Select...</option>
                  <option value="negligible">Negligible</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              (formData.status === 'cancelled' && !formData.cancellationReason)
            }
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignRoleModal({
  riskId,
  roleType,
  roleLabel,
  currentUserId,
  onClose,
  onSuccess,
}: {
  riskId: string;
  roleType: 'reporter' | 'grcSme' | 'riskAssessor' | 'riskOwner';
  roleLabel: string;
  currentUserId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [userId, setUserId] = useState(currentUserId || '');
  const [search, setSearch] = useState('');

  // Fetch users for selection
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/users?limit=100');
      if (!response.ok) return { users: [] };
      return response.json();
    },
  });

  const users = usersData?.users || [];
  const filteredUsers = users.filter(
    (user: any) =>
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async () => {
      // Map roleType to the corresponding field in the update API
      const fieldMap: Record<string, string> = {
        reporter: 'reporterId',
        grcSme: 'grcSmeId',
        riskAssessor: 'riskAssessorId',
        riskOwner: 'riskOwnerId',
      };

      await risksApi.update(riskId, {
        [fieldMap[roleType]]: userId || null,
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Assign {roleLabel}</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm text-surface-600 mb-2">Search Users</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
            />
          </div>

          {/* User List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {/* Option to unassign */}
            <label
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                userId === ''
                  ? 'bg-brand-500/20 border border-brand-500'
                  : 'bg-surface-700 hover:bg-surface-600'
              }`}
            >
              <input
                type="radio"
                name="user"
                value=""
                checked={userId === ''}
                onChange={() => setUserId('')}
                className="sr-only"
              />
              <div className="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center">
                <User className="w-4 h-4 text-surface-600" />
              </div>
              <div>
                <p className="text-white">Unassigned</p>
                <p className="text-sm text-surface-600">Remove assignment</p>
              </div>
            </label>

            {filteredUsers.length === 0 && search && (
              <p className="text-center text-surface-500 py-4">No users found</p>
            )}

            {filteredUsers.map((user: any) => (
              <label
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                  userId === user.id
                    ? 'bg-brand-500/20 border border-brand-500'
                    : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                <input
                  type="radio"
                  name="user"
                  value={user.id}
                  checked={userId === user.id}
                  onChange={(e) => setUserId(e.target.value)}
                  className="sr-only"
                />
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-medium">
                  {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </p>
                  <p className="text-sm text-surface-600 truncate">{user.email}</p>
                </div>
              </label>
            ))}

            {/* Manual ID input if no users found */}
            {users.length === 0 && (
              <div>
                <label className="block text-sm text-surface-600 mb-2">
                  Or enter User ID directly:
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID..."
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
