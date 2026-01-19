import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { PostIncidentReviewForm } from '@/components/bcdr/PostIncidentReviewForm';
import { api } from '@/lib/api';
import clsx from 'clsx';
import { format } from 'date-fns';

// ============================================
// Types
// ============================================

interface BCDRIncident {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  declaredAt: string;
  declaredByName: string;
  recoveryStartedAt: string;
  operationalAt: string;
  resolvedAt: string;
  closedAt: string;
  closedByName: string;
  activatedPlans: string[];
  activatedTeams: string[];
  actualDowntimeMinutes: number;
  dataLossMinutes: number;
  financialImpact: number;
  rootCause: string;
  lessonsLearned: string;
  improvementActions: any[];
  timeline: TimelineEntry[];
}

interface TimelineEntry {
  id: string;
  timestamp: string;
  entryType: string;
  description: string;
  createdByName: string;
  metadata: any;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  major: 'bg-orange-500',
  moderate: 'bg-yellow-500',
  minor: 'bg-green-500',
};

const STATUS_OPTIONS = ['active', 'recovering', 'resolved'];

const ENTRY_TYPE_ICONS: Record<string, typeof ExclamationTriangleIcon> = {
  status_change: ClockIcon,
  plan_activated: DocumentTextIcon,
  team_activated: UserGroupIcon,
  note: DocumentTextIcon,
  action_taken: CheckCircleIcon,
};

// ============================================
// BC/DR Incident Detail Page Component
// ============================================

export default function BCDRIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<BCDRIncident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<{ id: string; title: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showActivatePlan, setShowActivatePlan] = useState(false);
  const [showActivateTeam, setShowActivateTeam] = useState(false);
  const [showCloseIncident, setShowCloseIncident] = useState(false);

  // Form state
  const [noteDescription, setNoteDescription] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadIncident();
      loadPlans();
      loadTeams();
    }
  }, [id]);

  const loadIncident = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/bcdr/incidents/${id}`);
      setIncident(response.data);
    } catch (error) {
      console.error('Failed to load incident:', error);
    } finally {
      setIsLoading(false);
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

  const loadTeams = async () => {
    try {
      const response = await api.get('/bcdr/recovery-teams');
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsSubmitting(true);
    try {
      await api.put(`/bcdr/incidents/${id}/status`, { status: newStatus });
      loadIncident();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteDescription.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post(`/bcdr/incidents/${id}/timeline`, {
        entryType: 'note',
        description: noteDescription,
      });
      loadIncident();
      setShowAddNote(false);
      setNoteDescription('');
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivatePlan = async () => {
    if (!selectedPlanId) return;

    setIsSubmitting(true);
    try {
      await api.post(`/bcdr/incidents/${id}/activate-plan`, { planId: selectedPlanId });
      loadIncident();
      setShowActivatePlan(false);
      setSelectedPlanId('');
    } catch (error) {
      console.error('Failed to activate plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateTeam = async () => {
    if (!selectedTeamId) return;

    setIsSubmitting(true);
    try {
      await api.post(`/bcdr/incidents/${id}/activate-team`, { teamId: selectedTeamId });
      loadIncident();
      setShowActivateTeam(false);
      setSelectedTeamId('');
    } catch (error) {
      console.error('Failed to activate team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-slate-400 mt-4">Loading incident...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Incident not found</p>
      </div>
    );
  }

  const isActive = ['active', 'recovering'].includes(incident.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/bcdr/incidents')}
            className="p-2 hover:bg-slate-700 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                SEVERITY_COLORS[incident.severity] || 'bg-slate-600'
              )}
            >
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{incident.title}</h1>
                <span className="text-slate-400">#{incident.incidentId}</span>
              </div>
              <p className="text-slate-400 capitalize">
                {incident.severity} • {incident.incidentType.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isActive && (
            <>
              <select
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                disabled={isSubmitting}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
              {incident.status === 'resolved' && (
                <Button variant="primary" onClick={() => setShowCloseIncident(true)}>
                  Close with PIR
                </Button>
              )}
            </>
          )}
          <span
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium capitalize',
              incident.status === 'active'
                ? 'bg-red-500/20 text-red-400'
                : incident.status === 'recovering'
                ? 'bg-orange-500/20 text-orange-400'
                : incident.status === 'resolved'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-slate-600 text-slate-400'
            )}
          >
            {incident.status}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      {isActive && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowActivatePlan(true)}>
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            Activate Plan
          </Button>
          <Button variant="secondary" onClick={() => setShowActivateTeam(true)}>
            <UserGroupIcon className="h-4 w-4 mr-1" />
            Activate Team
          </Button>
          <Button variant="secondary" onClick={() => setShowAddNote(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          {incident.description && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-medium text-white mb-3">Description</h3>
              <p className="text-slate-300 whitespace-pre-wrap">{incident.description}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-medium text-white mb-4">Timeline</h3>

            <div className="space-y-4">
              {incident.timeline.map((entry, index) => {
                const Icon = ENTRY_TYPE_ICONS[entry.entryType] || DocumentTextIcon;
                return (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                        <Icon className="h-4 w-4 text-slate-400" />
                      </div>
                      {index < incident.timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-700 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                          {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                        </span>
                        {entry.createdByName && (
                          <span className="text-sm text-slate-400">{entry.createdByName}</span>
                        )}
                      </div>
                      <p className="text-white mt-1">{entry.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Post-Incident Review */}
          {incident.status === 'closed' && incident.rootCause && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-medium text-white mb-4">Post-Incident Review</h3>

              {incident.rootCause && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-1">Root Cause</h4>
                  <p className="text-white">{incident.rootCause}</p>
                </div>
              )}

              {incident.lessonsLearned && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-1">Lessons Learned</h4>
                  <p className="text-white">{incident.lessonsLearned}</p>
                </div>
              )}

              {incident.improvementActions && incident.improvementActions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Improvement Actions</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {incident.improvementActions.map((action: any, index: number) => (
                      <li key={index}>{action.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Close with PIR Form */}
          {showCloseIncident && (
            <PostIncidentReviewForm
              incidentId={incident.id}
              onComplete={() => {
                setShowCloseIncident(false);
                loadIncident();
              }}
              onCancel={() => setShowCloseIncident(false)}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-medium text-white mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Declared</dt>
                <dd className="text-white">
                  {format(new Date(incident.declaredAt), 'MMM d, yyyy h:mm a')}
                </dd>
              </div>
              {incident.declaredByName && (
                <div>
                  <dt className="text-slate-400">Declared By</dt>
                  <dd className="text-white">{incident.declaredByName}</dd>
                </div>
              )}
              {incident.recoveryStartedAt && (
                <div>
                  <dt className="text-slate-400">Recovery Started</dt>
                  <dd className="text-white">
                    {format(new Date(incident.recoveryStartedAt), 'MMM d, yyyy h:mm a')}
                  </dd>
                </div>
              )}
              {incident.resolvedAt && (
                <div>
                  <dt className="text-slate-400">Resolved</dt>
                  <dd className="text-white">
                    {format(new Date(incident.resolvedAt), 'MMM d, yyyy h:mm a')}
                  </dd>
                </div>
              )}
              {incident.closedAt && (
                <div>
                  <dt className="text-slate-400">Closed</dt>
                  <dd className="text-white">
                    {format(new Date(incident.closedAt), 'MMM d, yyyy h:mm a')}
                  </dd>
                </div>
              )}
              {incident.actualDowntimeMinutes !== null && incident.actualDowntimeMinutes !== undefined && (
                <div>
                  <dt className="text-slate-400">Actual Downtime</dt>
                  <dd className="text-white">{incident.actualDowntimeMinutes} minutes</dd>
                </div>
              )}
              {incident.financialImpact !== null && incident.financialImpact !== undefined && (
                <div>
                  <dt className="text-slate-400">Financial Impact</dt>
                  <dd className="text-white">${incident.financialImpact.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Activated Plans */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-slate-400" />
              Activated Plans ({incident.activatedPlans?.length || 0})
            </h3>
            {incident.activatedPlans?.length > 0 ? (
              <ul className="space-y-2">
                {incident.activatedPlans.map((planId) => {
                  const plan = plans.find((p) => p.id === planId);
                  return (
                    <li key={planId} className="text-slate-300">
                      {plan?.title || planId}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">No plans activated</p>
            )}
          </div>

          {/* Activated Teams */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5 text-slate-400" />
              Activated Teams ({incident.activatedTeams?.length || 0})
            </h3>
            {incident.activatedTeams?.length > 0 ? (
              <ul className="space-y-2">
                {incident.activatedTeams.map((teamId) => {
                  const team = teams.find((t) => t.id === teamId);
                  return (
                    <li key={teamId} className="text-slate-300">
                      {team?.name || teamId}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">No teams activated</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Add Timeline Entry</h2>
            <textarea
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="Describe the action taken or update..."
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setShowAddNote(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddNote} disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Plan Modal */}
      {showActivatePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Activate Plan</h2>
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
            <div className="flex items-center justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setShowActivatePlan(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleActivatePlan} disabled={isSubmitting}>
                {isSubmitting ? 'Activating...' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Team Modal */}
      {showActivateTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Activate Team</h2>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">Select team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setShowActivateTeam(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleActivateTeam} disabled={isSubmitting}>
                {isSubmitting ? 'Activating...' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
