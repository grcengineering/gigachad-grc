import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  UserIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';

interface DRTest {
  id: string;
  test_id: string;
  name: string;
  description: string;
  test_type: string;
  status: string;
  result: string | null;
  scheduled_date: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  target_rto_minutes: number | null;
  actual_recovery_time_minutes: number | null;
  coordinator_id: string;
  coordinator_name: string;
  coordinator_email: string;
  bcdr_plan_id: string;
  plan_title: string;
  plan_id: string;
  objectives: string;
  scope: string;
  lessons_learned: string;
  created_at: string;
  updated_at: string;
  findings: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    remediation_required: boolean;
    remediation_status: string;
    remediation_due_date: string | null;
    assigned_to_name: string | null;
  }>;
  participants: Array<{
    id: string;
    user_name: string;
    role: string;
    attended: boolean;
  }>;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: 'bg-surface-600 text-surface-300' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
  { value: 'postponed', label: 'Postponed', color: 'bg-orange-500/20 text-orange-400' },
];

const RESULT_OPTIONS = [
  { value: 'passed', label: 'Passed', color: 'text-green-400', icon: CheckCircleIcon },
  { value: 'passed_with_issues', label: 'Passed with Issues', color: 'text-yellow-400', icon: ExclamationTriangleIcon },
  { value: 'failed', label: 'Failed', color: 'text-red-400', icon: XCircleIcon },
  { value: 'incomplete', label: 'Incomplete', color: 'text-surface-400', icon: ExclamationTriangleIcon },
];

const TEST_TYPES = [
  { value: 'tabletop', label: 'Tabletop Exercise' },
  { value: 'walkthrough', label: 'Walkthrough' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'parallel', label: 'Parallel Test' },
  { value: 'full_interruption', label: 'Full Interruption' },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-blue-500/20 text-blue-400',
};

export default function DRTestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNewTest = id === 'new';
  const [showEditModal, setShowEditModal] = useState(isNewTest);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'participants'>('overview');
  
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    test_type: 'tabletop',
    status: 'planned',
    objectives: '',
    scope: '',
    scheduled_date: new Date().toISOString().split('T')[0],
  });

  const [completeForm, setCompleteForm] = useState({
    result: 'passed',
    actual_recovery_time_minutes: 0,
    lessons_learned: '',
  });

  const { data: test, isLoading, error } = useQuery<DRTest>({
    queryKey: ['dr-test', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/tests/${id}`);
      return res.data;
    },
    enabled: !!id && !isNewTest,
  });

  // Create mutation for new tests
  const createMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await api.post('/api/bcdr/tests', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dr-tests'] });
      toast.success('DR test created successfully');
      navigate(`/bcdr/tests/${data.id}`);
    },
    onError: (err: Error) => {
      console.error('Failed to create DR test:', err);
      toast.error('Failed to create DR test');
    },
  });

  useEffect(() => {
    if (test) {
      setEditForm({
        name: test.name || '',
        description: test.description || '',
        test_type: test.test_type || 'tabletop',
        status: test.status || 'planned',
        objectives: test.objectives || '',
        scope: test.scope || '',
        scheduled_date: test.scheduled_date || '',
      });
    }
  }, [test]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await api.patch(`/api/bcdr/tests/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dr-test', id] });
      queryClient.invalidateQueries({ queryKey: ['dr-tests'] });
      setShowEditModal(false);
      toast.success('DR test updated successfully');
    },
    onError: () => {
      toast.error('Failed to update DR test');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (data: typeof completeForm) => {
      const res = await api.post(`/api/bcdr/tests/${id}/complete`, {
        ...data,
        status: 'completed',
        actual_end_at: new Date().toISOString(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dr-test', id] });
      queryClient.invalidateQueries({ queryKey: ['dr-tests'] });
      setShowCompleteModal(false);
      toast.success('DR test completed');
    },
    onError: () => {
      toast.error('Failed to complete DR test');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/bcdr/tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dr-tests'] });
      toast.success('DR test deleted');
      navigate('/bcdr/tests');
    },
    onError: () => {
      toast.error('Failed to delete DR test');
    },
  });

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const getResultConfig = (result: string) => {
    return RESULT_OPTIONS.find(r => r.value === result);
  };

  const getTestTypeLabel = (type: string) => {
    return TEST_TYPES.find(t => t.value === type)?.label || type;
  };

  if (isLoading && !isNewTest) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonDetailHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonDetailSection /></div>
          <div><SkeletonDetailSection /></div>
        </div>
      </div>
    );
  }

  if (!isNewTest && (error || !test)) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-semibold text-surface-100 mb-2">DR Test Not Found</h2>
          <p className="text-surface-400 mb-4">The requested test could not be loaded.</p>
          <Button onClick={() => navigate('/bcdr/tests')}>Back to Tests</Button>
        </div>
      </div>
    );
  }

  // For new tests, show the create form
  if (isNewTest) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/tests')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Schedule New DR Test</h1>
            <p className="text-surface-400 mt-1">Create a new disaster recovery test</p>
          </div>
        </div>

        <div className="card p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(editForm);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Test Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Q1 2026 Disaster Recovery Test"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Test Type</label>
                <select
                  value={editForm.test_type}
                  onChange={(e) => setEditForm({ ...editForm, test_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {TEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Scheduled Date</label>
                <input
                  type="date"
                  value={editForm.scheduled_date}
                  onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the test purpose and scope..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Objectives</label>
              <textarea
                value={editForm.objectives}
                onChange={(e) => setEditForm({ ...editForm, objectives: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="What are the key objectives of this test?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Scope</label>
              <textarea
                value={editForm.scope}
                onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Define the scope and systems involved..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/bcdr/tests')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !editForm.name}
              >
                {createMutation.isPending ? 'Creating...' : 'Schedule Test'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // TypeScript guard - test is guaranteed to exist at this point
  if (!test) return null;

  const statusConfig = getStatusConfig(test.status);
  const resultConfig = test.result ? getResultConfig(test.result) : null;
  const ResultIcon = resultConfig?.icon;
  const rtoMet = test.target_rto_minutes && test.actual_recovery_time_minutes 
    ? test.actual_recovery_time_minutes <= test.target_rto_minutes 
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/tests')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BeakerIcon className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-surface-100">{test.name}</h1>
                <p className="text-surface-400 text-sm">{test.test_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={clsx(
                "px-3 py-1 rounded-full text-sm font-medium",
                statusConfig.color
              )}>
                {statusConfig.label}
              </span>
              {resultConfig && ResultIcon && (
                <span className={clsx("flex items-center gap-1", resultConfig.color)}>
                  <ResultIcon className="w-5 h-5" />
                  {resultConfig.label}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-surface-700 text-surface-300">
                {getTestTypeLabel(test.test_type)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {test.status !== 'completed' && test.status !== 'cancelled' && (
            <Button variant="success" onClick={() => setShowCompleteModal(true)}>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Complete Test
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-700">
        <nav className="flex gap-6">
          {(['overview', 'findings', 'participants'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize",
                activeTab === tab
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-surface-400 hover:text-surface-200"
              )}
            >
              {tab}
              {tab === 'findings' && test.findings?.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                  {test.findings.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Description</h3>
              <p className="text-surface-300">{test.description || 'No description provided.'}</p>
            </div>

            {/* Recovery Metrics */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Recovery Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <p className="text-surface-400 text-sm">Target RTO</p>
                  <p className="text-2xl font-bold text-surface-100">
                    {test.target_rto_minutes ? `${test.target_rto_minutes}m` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <p className="text-surface-400 text-sm">Actual Recovery Time</p>
                  <p className={clsx(
                    "text-2xl font-bold",
                    rtoMet === true ? "text-green-400" : 
                    rtoMet === false ? "text-red-400" : 
                    "text-surface-100"
                  )}>
                    {test.actual_recovery_time_minutes ? `${test.actual_recovery_time_minutes}m` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <p className="text-surface-400 text-sm">RTO Met</p>
                  <p className={clsx(
                    "text-2xl font-bold",
                    rtoMet === true ? "text-green-400" : 
                    rtoMet === false ? "text-red-400" : 
                    "text-surface-100"
                  )}>
                    {rtoMet === null ? 'N/A' : rtoMet ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            {test.objectives && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Objectives</h3>
                <p className="text-surface-300 whitespace-pre-wrap">{test.objectives}</p>
              </div>
            )}

            {test.lessons_learned && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Lessons Learned</h3>
                <p className="text-surface-300 whitespace-pre-wrap">{test.lessons_learned}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-surface-400 text-sm">Coordinator</p>
                  <p className="text-surface-100">{test.coordinator_name || '-'}</p>
                </div>
                {test.plan_title && (
                  <div>
                    <p className="text-surface-400 text-sm">BC/DR Plan</p>
                    <Link 
                      to={`/bcdr/plans/${test.bcdr_plan_id}`}
                      className="text-brand-400 hover:text-brand-300"
                    >
                      {test.plan_title}
                    </Link>
                  </div>
                )}
                <div>
                  <p className="text-surface-400 text-sm">Scheduled Date</p>
                  <p className="text-surface-100">
                    {test.scheduled_date 
                      ? new Date(test.scheduled_date).toLocaleString() 
                      : '-'}
                  </p>
                </div>
                {test.actual_start_at && (
                  <div>
                    <p className="text-surface-400 text-sm">Actual Start</p>
                    <p className="text-surface-100">
                      {new Date(test.actual_start_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {test.actual_end_at && (
                  <div>
                    <p className="text-surface-400 text-sm">Actual End</p>
                    <p className="text-surface-100">
                      {new Date(test.actual_end_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-400">Findings</span>
                  <span className={clsx(
                    test.findings?.length > 0 ? "text-yellow-400" : "text-surface-100"
                  )}>
                    {test.findings?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Participants</span>
                  <span className="text-surface-100">{test.participants?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'findings' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-100">Test Findings</h3>
            <Button variant="secondary" size="sm">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Finding
            </Button>
          </div>
          {test.findings && test.findings.length > 0 ? (
            <div className="space-y-3">
              {test.findings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-4 rounded-lg bg-surface-800/50 border border-surface-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-surface-100 font-medium">{finding.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-xs font-medium capitalize",
                        SEVERITY_COLORS[finding.severity] || 'bg-surface-700 text-surface-300'
                      )}>
                        {finding.severity}
                      </span>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-xs font-medium capitalize",
                        finding.remediation_status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                        finding.remediation_status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-surface-700 text-surface-300'
                      )}>
                        {finding.remediation_status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-surface-400 text-sm mb-3">{finding.description}</p>
                  <div className="flex items-center gap-4 text-sm text-surface-500">
                    {finding.assigned_to_name && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-4 h-4" />
                        {finding.assigned_to_name}
                      </span>
                    )}
                    {finding.remediation_due_date && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        Due: {new Date(finding.remediation_due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-surface-400 text-center py-8">No findings recorded</p>
          )}
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-100">Test Participants</h3>
            <Button variant="secondary" size="sm">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Participant
            </Button>
          </div>
          {test.participants && test.participants.length > 0 ? (
            <div className="space-y-2">
              {test.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-surface-400" />
                    </div>
                    <div>
                      <p className="text-surface-100 font-medium">{participant.user_name}</p>
                      <p className="text-surface-400 text-sm">{participant.role}</p>
                    </div>
                  </div>
                  <span className={clsx(
                    "px-2 py-1 rounded text-xs font-medium",
                    participant.attended 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-surface-700 text-surface-400"
                  )}>
                    {participant.attended ? 'Attended' : 'Not Attended'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-surface-400 text-center py-8">No participants added</p>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Edit DR Test</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(editForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Test Type</label>
                  <select
                    value={editForm.test_type}
                    onChange={(e) => setEditForm(prev => ({ ...prev, test_type: e.target.value }))}
                    className="input w-full"
                  >
                    {TEST_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="input w-full"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Objectives</label>
                <textarea
                  value={editForm.objectives}
                  onChange={(e) => setEditForm(prev => ({ ...prev, objectives: e.target.value }))}
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Scope</label>
                <textarea
                  value={editForm.scope}
                  onChange={(e) => setEditForm(prev => ({ ...prev, scope: e.target.value }))}
                  rows={2}
                  className="input w-full"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
                <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Test Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg">
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Complete DR Test</h2>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeMutation.mutate(completeForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Result *</label>
                <select
                  value={completeForm.result}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, result: e.target.value }))}
                  className="input w-full"
                >
                  {RESULT_OPTIONS.map(result => (
                    <option key={result.value} value={result.value}>{result.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Actual Recovery Time (minutes)
                </label>
                <input
                  type="number"
                  value={completeForm.actual_recovery_time_minutes}
                  onChange={(e) => setCompleteForm(prev => ({ 
                    ...prev, 
                    actual_recovery_time_minutes: parseInt(e.target.value) || 0 
                  }))}
                  min="0"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Lessons Learned</label>
                <textarea
                  value={completeForm.lessons_learned}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, lessons_learned: e.target.value }))}
                  rows={4}
                  className="input w-full"
                  placeholder="Document key takeaways from this test..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
                <Button variant="secondary" type="button" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={completeMutation.isPending}>
                  {completeMutation.isPending ? 'Completing...' : 'Complete Test'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete DR Test</h3>
            <p className="text-surface-400 mb-6">
              Are you sure you want to delete "{test.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

