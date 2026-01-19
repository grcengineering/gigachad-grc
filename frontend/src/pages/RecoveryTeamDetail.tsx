import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  LinkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface RecoveryTeam {
  id: string;
  name: string;
  description: string;
  teamType: string;
  activationCriteria: string;
  assemblyLocation: string;
  communicationChannel: string;
  isActive: boolean;
  members: TeamMember[];
  planLinks: PlanLink[];
}

interface TeamMember {
  id: string;
  role: string;
  userId: string;
  userName: string;
  userEmail: string;
  externalName: string;
  externalEmail: string;
  externalPhone: string;
  responsibilities: string;
  isPrimary: boolean;
  alternateFor: string;
}

interface PlanLink {
  id: string;
  planId: string;
  planTitle: string;
  planType: string;
  roleInPlan: string;
}

const ROLE_OPTIONS = [
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'alternate_lead', label: 'Alternate Lead' },
  { value: 'technical_lead', label: 'Technical Lead' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'member', label: 'Member' },
];

const TEAM_TYPE_COLORS: Record<string, string> = {
  crisis_management: 'bg-red-500',
  it_recovery: 'bg-blue-500',
  business_recovery: 'bg-green-500',
  communications: 'bg-purple-500',
  executive: 'bg-orange-500',
};

// ============================================
// Recovery Team Detail Page Component
// ============================================

export default function RecoveryTeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<RecoveryTeam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showLinkPlan, setShowLinkPlan] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [plans, setPlans] = useState<{ id: string; title: string }[]>([]);

  // Add member form state
  const [memberRole, setMemberRole] = useState('member');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberExternalName, setMemberExternalName] = useState('');
  const [memberExternalEmail, setMemberExternalEmail] = useState('');
  const [memberExternalPhone, setMemberExternalPhone] = useState('');
  const [memberResponsibilities, setMemberResponsibilities] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Link plan form state
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [roleInPlan, setRoleInPlan] = useState('');
  const [isLinkingPlan, setIsLinkingPlan] = useState(false);

  useEffect(() => {
    if (id) {
      loadTeam();
      loadUsers();
      loadPlans();
    }
  }, [id]);

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/bcdr/recovery-teams/${id}`);
      setTeam(response.data);
    } catch (error) {
      console.error('Failed to load team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await api.get('/bcdr/plans');
      setPlans(response.data.data || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const handleAddMember = async () => {
    setIsAddingMember(true);
    try {
      await api.post(`/bcdr/recovery-teams/${id}/members`, {
        role: memberRole,
        userId: !isExternal && memberUserId ? memberUserId : undefined,
        externalName: isExternal ? memberExternalName : undefined,
        externalEmail: isExternal ? memberExternalEmail : undefined,
        externalPhone: isExternal ? memberExternalPhone : undefined,
        responsibilities: memberResponsibilities || undefined,
      });
      loadTeam();
      setShowAddMember(false);
      resetMemberForm();
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await api.delete(`/bcdr/recovery-teams/${id}/members/${memberId}`);
      loadTeam();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleLinkPlan = async () => {
    if (!selectedPlanId) return;

    setIsLinkingPlan(true);
    try {
      await api.post(`/bcdr/recovery-teams/${id}/link-plan`, {
        planId: selectedPlanId,
        roleInPlan: roleInPlan || undefined,
      });
      loadTeam();
      setShowLinkPlan(false);
      setSelectedPlanId('');
      setRoleInPlan('');
    } catch (error) {
      console.error('Failed to link plan:', error);
    } finally {
      setIsLinkingPlan(false);
    }
  };

  const handleUnlinkPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to unlink this plan?')) return;

    try {
      await api.delete(`/bcdr/recovery-teams/${id}/link-plan/${planId}`);
      loadTeam();
    } catch (error) {
      console.error('Failed to unlink plan:', error);
    }
  };

  const resetMemberForm = () => {
    setMemberRole('member');
    setMemberUserId('');
    setMemberExternalName('');
    setMemberExternalEmail('');
    setMemberExternalPhone('');
    setMemberResponsibilities('');
    setIsExternal(false);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-slate-400 mt-4">Loading team...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Team not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/bcdr/recovery-teams')}
            className="p-2 hover:bg-slate-700 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                TEAM_TYPE_COLORS[team.teamType] || 'bg-slate-600'
              )}
            >
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              <p className="text-slate-400 capitalize">{team.teamType.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        <span
          className={clsx(
            'px-3 py-1 rounded text-sm font-medium',
            team.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'
          )}
        >
          {team.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Team Info */}
      {(team.description || team.activationCriteria || team.assemblyLocation) && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          {team.description && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-400 mb-1">Description</h3>
              <p className="text-white">{team.description}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            {team.activationCriteria && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Activation Criteria</h3>
                <p className="text-white">{team.activationCriteria}</p>
              </div>
            )}
            {team.assemblyLocation && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Assembly Location</h3>
                <p className="text-white">{team.assemblyLocation}</p>
              </div>
            )}
            {team.communicationChannel && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Communication Channel</h3>
                <p className="text-white">{team.communicationChannel}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members Section */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-slate-400" />
            Team Members ({team.members.length})
          </h2>
          <Button variant="secondary" onClick={() => setShowAddMember(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Member
          </Button>
        </div>

        {team.members.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No members added yet</p>
        ) : (
          <div className="space-y-3">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {member.userName || member.externalName || 'Unknown'}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs',
                          member.role === 'team_lead'
                            ? 'bg-red-500/20 text-red-400'
                            : member.role === 'alternate_lead'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-slate-600 text-slate-300'
                        )}
                      >
                        {ROLE_OPTIONS.find((r) => r.value === member.role)?.label || member.role}
                      </span>
                      {!member.isPrimary && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          Alternate
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                      {(member.userEmail || member.externalEmail) && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="h-4 w-4" />
                          {member.userEmail || member.externalEmail}
                        </span>
                      )}
                      {member.externalPhone && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="h-4 w-4" />
                          {member.externalPhone}
                        </span>
                      )}
                    </div>
                    {member.responsibilities && (
                      <p className="text-sm text-slate-400 mt-1">{member.responsibilities}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-2 text-slate-400 hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Plans Section */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-slate-400" />
            Linked Plans ({team.planLinks.length})
          </h2>
          <Button variant="secondary" onClick={() => setShowLinkPlan(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Link Plan
          </Button>
        </div>

        {team.planLinks.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No plans linked yet</p>
        ) : (
          <div className="space-y-3">
            {team.planLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 bg-slate-700 rounded-lg"
              >
                <div>
                  <span className="text-white font-medium">{link.planTitle}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-400 capitalize">
                      {link.planType?.replace('_', ' ')}
                    </span>
                    {link.roleInPlan && (
                      <span className="text-sm text-slate-400">• {link.roleInPlan}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleUnlinkPlan(link.planId)}
                  className="p-2 text-slate-400 hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Add Team Member</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setIsExternal(false)}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-center transition-all',
                    !isExternal
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  Internal User
                </button>
                <button
                  onClick={() => setIsExternal(true)}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-center transition-all',
                    isExternal
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  External Contact
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {!isExternal ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">User</label>
                  <select
                    value={memberUserId}
                    onChange={(e) => setMemberUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={memberExternalName}
                      onChange={(e) => setMemberExternalName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={memberExternalEmail}
                      onChange={(e) => setMemberExternalEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={memberExternalPhone}
                      onChange={(e) => setMemberExternalPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Responsibilities
                </label>
                <textarea
                  value={memberResponsibilities}
                  onChange={(e) => setMemberResponsibilities(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowAddMember(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddMember} disabled={isAddingMember}>
                {isAddingMember ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link Plan Modal */}
      {showLinkPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Link to Plan</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  BC/DR Plan
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select plan...</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role in Plan (Optional)
                </label>
                <input
                  type="text"
                  value={roleInPlan}
                  onChange={(e) => setRoleInPlan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="e.g., Primary response team"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowLinkPlan(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleLinkPlan} disabled={isLinkingPlan}>
                {isLinkingPlan ? 'Linking...' : 'Link Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
