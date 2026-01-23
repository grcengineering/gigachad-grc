import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { risksApi, riskTasksApi, RiskWorkflowTask } from '../lib/api';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ArrowRightIcon,
  PlayIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

type QueueTab = 'tasks' | 'assessments' | 'treatments' | 'approvals' | 'reviews';

export default function RiskQueue() {
  const [activeTab, setActiveTab] = useState<QueueTab>('tasks');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get current user ID from localStorage
  const userId = localStorage.getItem('userId') || '';

  // Fetch user's assigned tasks
  const { data: myTasksData } = useQuery({
    queryKey: ['risk-tasks', 'my-tasks'],
    queryFn: () => riskTasksApi.getMyTasks(),
  });

  // Fetch user's task stats
  const { data: taskStats } = useQuery({
    queryKey: ['risk-tasks', 'my-stats'],
    queryFn: () => riskTasksApi.getMyStats(),
  });

  // Task mutations
  const startTaskMutation = useMutation({
    mutationFn: ({ taskId, riskId }: { taskId: string; riskId: string }) => 
      riskTasksApi.start(taskId).then(res => ({ ...res, riskId })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risk-tasks'] });
      toast.success('Task started');
      // Navigate to the risk detail page with tasks tab
      navigate(`/risks/${data.riskId}?tab=tasks`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start task');
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (taskId: string) => riskTasksApi.complete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-tasks'] });
      toast.success('Task completed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete task');
    },
  });

  // Fetch risks where user is assigned as assessor (pending assessment)
  const { data: assessmentQueue } = useQuery({
    queryKey: ['risk-queue', 'assessments', userId],
    queryFn: async () => {
      const response = await risksApi.list({
        status: 'risk_analysis_in_progress',
        limit: 50,
      });
      return response.data;
    },
  });

  // Fetch risks where user is risk owner (pending treatment)
  const { data: treatmentQueue } = useQuery({
    queryKey: ['risk-queue', 'treatments', userId],
    queryFn: async () => {
      const response = await risksApi.list({
        status: 'treatment_decision_review',
        limit: 50,
      });
      return response.data;
    },
  });

  // Fetch risks pending executive approval
  const { data: approvalQueue } = useQuery({
    queryKey: ['risk-queue', 'approvals', userId],
    queryFn: async () => {
      const response = await risksApi.list({
        status: 'executive_approval',
        limit: 50,
      });
      return response.data;
    },
  });

  // Fetch risks pending GRC review
  const { data: reviewQueue } = useQuery({
    queryKey: ['risk-queue', 'reviews', userId],
    queryFn: async () => {
      const response = await risksApi.list({
        status: 'grc_approval',
        limit: 50,
      });
      return response.data;
    },
  });

  const myTasks = myTasksData?.data?.tasks || [];
  const stats = taskStats?.data || { pending: 0, inProgress: 0, overdue: 0, completedThisWeek: 0, total: 0 };

  const tabs = [
    {
      key: 'tasks' as QueueTab,
      label: 'My Tasks',
      count: stats.total,
      icon: ClipboardDocumentListIcon,
      color: 'text-brand-400',
    },
    {
      key: 'assessments' as QueueTab,
      label: 'My Assessments',
      count: assessmentQueue?.risks?.length || 0,
      icon: ClockIcon,
      color: 'text-amber-400',
    },
    {
      key: 'treatments' as QueueTab,
      label: 'Treatment Decisions',
      count: treatmentQueue?.risks?.length || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-orange-400',
    },
    {
      key: 'approvals' as QueueTab,
      label: 'Executive Approvals',
      count: approvalQueue?.risks?.length || 0,
      icon: UserIcon,
      color: 'text-purple-400',
    },
    {
      key: 'reviews' as QueueTab,
      label: 'GRC Reviews',
      count: reviewQueue?.risks?.length || 0,
      icon: CheckCircleIcon,
      color: 'text-cyan-400',
    },
  ];

  const getActiveQueue = () => {
    switch (activeTab) {
      case 'assessments':
        return assessmentQueue?.risks || [];
      case 'treatments':
        return treatmentQueue?.risks || [];
      case 'approvals':
        return approvalQueue?.risks || [];
      case 'reviews':
        return reviewQueue?.risks || [];
      default:
        return [];
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-emerald-500';
      default:
        return 'bg-surface-500';
    }
  };

  const getActionText = () => {
    switch (activeTab) {
      case 'assessments':
        return 'Complete Assessment';
      case 'treatments':
        return 'Make Decision';
      case 'approvals':
        return 'Review & Approve';
      case 'reviews':
        return 'Review Assessment';
      default:
        return 'View';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">My Risk Queue</h1>
        <p className="text-surface-400 mt-1">Tasks and actions awaiting your attention</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`p-4 rounded-xl border transition-colors text-left ${
              activeTab === tab.key
                ? 'bg-brand-500/20 border-brand-500'
                : 'bg-surface-800 border-surface-700 hover:border-surface-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeTab === tab.key ? 'bg-brand-500/30' : 'bg-surface-700'}`}>
                <tab.icon className={`w-5 h-5 ${tab.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tab.count}</p>
                <p className="text-sm text-surface-400">{tab.label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Queue List */}
      <div className="bg-surface-800 rounded-xl border border-surface-700">
        <div className="p-4 border-b border-surface-700">
          <h2 className="text-lg font-medium text-white">
            {tabs.find(t => t.key === activeTab)?.label}
          </h2>
          {activeTab === 'tasks' && stats.overdue > 0 && (
            <p className="text-red-400 text-sm mt-1">
              {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="divide-y divide-surface-700">
          {/* Tasks Tab Content */}
          {activeTab === 'tasks' && (
            <>
              {myTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-surface-400">No tasks assigned to you</p>
                  <p className="text-surface-500 text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                myTasks.map((task: RiskWorkflowTask) => {
                  const isOverdue = task.dueDate && isPast(new Date(task.dueDate));
                  return (
                    <div 
                      key={task.id} 
                      className={`p-4 hover:bg-surface-700/50 transition-colors ${
                        isOverdue ? 'bg-red-900/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <div className={`p-2 rounded-lg ${
                          task.status === 'in_progress' ? 'bg-blue-500/20' : 'bg-amber-500/20'
                        }`}>
                          {task.status === 'in_progress' ? (
                            <ClockIcon className="w-5 h-5 text-blue-400" />
                          ) : (
                            <ClipboardDocumentListIcon className="w-5 h-5 text-amber-400" />
                          )}
                        </div>

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-brand-400 font-mono text-sm">
                              {task.risk?.riskId}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              task.status === 'in_progress' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                              task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {task.priority}
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-white font-medium mt-1">{task.title}</p>
                          <p className="text-surface-400 text-sm truncate">
                            Risk: {task.risk?.title}
                          </p>
                          
                          {/* Meta Info */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                            <span>Type: {task.taskType.replace('_', ' ')}</span>
                            {task.dueDate && (
                              <span className={isOverdue ? 'text-red-400 font-medium' : ''}>
                                Due: {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                              </span>
                            )}
                            <span>Assigned: {format(new Date(task.assignedAt), 'MMM d')}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => startTaskMutation.mutate({ taskId: task.id, riskId: task.riskId })}
                              disabled={startTaskMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                            >
                              <PlayIcon className="w-4 h-4" />
                              Start
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => completeTaskMutation.mutate(task.id)}
                              disabled={completeTaskMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Complete
                            </button>
                          )}
                          <Link
                            to={`/risks/${task.riskId}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-surface-700 text-white rounded-lg hover:bg-surface-600 text-sm"
                          >
                            View Risk
                            <ArrowRightIcon className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* Other Tabs - Risk-based Queue */}
          {activeTab !== 'tasks' && (
            <>
              {getActiveQueue().length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-surface-400">No items in this queue</p>
                  <p className="text-surface-500 text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                getActiveQueue().map((risk: any) => (
                  <div key={risk.id} className="p-4 hover:bg-surface-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Risk Level Indicator */}
                      <div className={`w-3 h-3 rounded-full ${getRiskLevelColor(risk.inherentRisk)}`} />

                      {/* Risk Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-brand-400 font-mono text-sm">{risk.riskId}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskLevelColor(risk.inherentRisk)} text-white`}>
                            {risk.inherentRisk}
                          </span>
                        </div>
                        <p className="text-white font-medium mt-1 truncate">{risk.title}</p>
                        <p className="text-surface-400 text-sm truncate">{risk.description}</p>
                        
                        {/* Meta Info */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                          <span>Category: {risk.category}</span>
                          <span>Created: {new Date(risk.createdAt).toLocaleDateString()}</span>
                          {risk.treatmentDueDate && (
                            <span className="text-amber-400">
                              Due: {new Date(risk.treatmentDueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Link
                        to={`/risks/${risk.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shrink-0"
                      >
                        {getActionText()}
                        <ArrowRightIcon className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-medium text-white mb-3">Queue Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-amber-400 font-bold">1</span>
            </div>
            <p className="text-surface-400">
              <strong className="text-surface-200">Assessments:</strong> Complete risk analysis including likelihood, impact, and recommended treatment.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <span className="text-orange-400 font-bold">2</span>
            </div>
            <p className="text-surface-400">
              <strong className="text-surface-200">Treatments:</strong> Decide how to handle the risk - mitigate, accept, transfer, or avoid.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <span className="text-purple-400 font-bold">3</span>
            </div>
            <p className="text-surface-400">
              <strong className="text-surface-200">Approvals:</strong> Executive review required for high-risk accept/transfer/avoid decisions.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
              <span className="text-cyan-400 font-bold">4</span>
            </div>
            <p className="text-surface-400">
              <strong className="text-surface-200">Reviews:</strong> GRC team validates assessments before treatment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



