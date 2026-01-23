import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { riskTasksApi, RiskWorkflowTask } from '../../lib/api';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlayIcon,
  UserIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import CreateTaskModal from './CreateTaskModal';

interface RiskTasksPanelProps {
  riskId: string;
  onTaskAction?: () => void;
}

const taskTypeLabels: Record<string, string> = {
  validate: 'Validate Risk',
  assess: 'Risk Assessment',
  review_assessment: 'GRC Review',
  treatment_decision: 'Treatment Decision',
  executive_approval: 'Executive Approval',
  mitigation_update: 'Mitigation Update',
  custom: 'Custom Task',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  reassigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <ClockIcon className="h-5 w-5 text-blue-500" />;
    case 'cancelled':
      return <XCircleIcon className="h-5 w-5 text-gray-500" />;
    default:
      return <ClipboardDocumentListIcon className="h-5 w-5 text-amber-500" />;
  }
};

export default function RiskTasksPanel({ riskId, onTaskAction }: RiskTasksPanelProps) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_selectedTask, _setSelectedTask] = useState<RiskWorkflowTask | null>(null);

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['risk-tasks', riskId],
    queryFn: () => riskTasksApi.getForRisk(riskId),
  });

  const startMutation = useMutation({
    mutationFn: (taskId: string) => riskTasksApi.start(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-tasks', riskId] });
      toast.success('Task started');
      onTaskAction?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start task');
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data?: { completionNotes?: string } }) =>
      riskTasksApi.complete(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-tasks', riskId] });
      toast.success('Task completed');
      onTaskAction?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete task');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      riskTasksApi.cancel(taskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-tasks', riskId] });
      toast.success('Task cancelled');
      onTaskAction?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel task');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400">
        Failed to load tasks
      </div>
    );
  }

  const tasksList = tasks?.data || [];
  const activeTasks = tasksList.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasksList.filter(t => t.status === 'completed' || t.status === 'cancelled');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Workflow Tasks
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <PlusIcon className="h-4 w-4" />
          Add Task
        </button>
      </div>

      {/* Active Tasks */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ClockIcon className="h-4 w-4" />
          Active Tasks ({activeTasks.length})
        </h4>
        
        {activeTasks.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            No active tasks for this risk.
          </p>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStart={() => startMutation.mutate(task.id)}
                onComplete={() => completeMutation.mutate({ taskId: task.id })}
                onCancel={(reason) => cancelMutation.mutate({ taskId: task.id, reason })}
                isLoading={startMutation.isPending || completeMutation.isPending || cancelMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            Completed ({completedTasks.length})
          </h4>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <CompletedTaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          riskId={riskId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['risk-tasks', riskId] });
            onTaskAction?.();
          }}
        />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: RiskWorkflowTask;
  onStart: () => void;
  onComplete: () => void;
  onCancel: (reason: string) => void;
  isLoading: boolean;
}

function TaskCard({ task, onStart, onComplete, onCancel, isLoading }: TaskCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const currentUserId = localStorage.getItem('userId');
  const isAssignedToMe = task.assigneeId === currentUserId;

  return (
    <div className={`p-4 rounded-lg border ${
      isOverdue 
        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' 
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}>
      <div className="flex items-start gap-3">
        <StatusIcon status={task.status} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="font-medium text-gray-900 dark:text-gray-100">
              {task.title}
            </h5>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            {task.isAutoCreated && (
              <span className="text-xs text-gray-400">auto</span>
            )}
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
            </span>
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                <ClockIcon className="h-3 w-3" />
                Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </span>
            )}
            <span>
              Type: {taskTypeLabels[task.taskType] || task.taskType}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isAssignedToMe && (
          <div className="flex items-center gap-2">
            {task.status === 'pending' && (
              <button
                onClick={onStart}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <PlayIcon className="h-3 w-3" />
                Start
              </button>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={onComplete}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
              >
                <CheckCircleIcon className="h-3 w-3" />
                Complete
              </button>
            )}
            {(task.status === 'pending' || task.status === 'in_progress') && (
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <XCircleIcon className="h-3 w-3" />
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cancellation reason
          </label>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Why are you cancelling this task?"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                onCancel(cancelReason);
                setShowCancelDialog(false);
              }}
              disabled={!cancelReason.trim()}
              className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
            >
              Confirm Cancel
            </button>
            <button
              onClick={() => setShowCancelDialog(false)}
              className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletedTaskRow({ task }: { task: RiskWorkflowTask }) {
  return (
    <div className="flex items-center gap-3 p-2 text-sm">
      <StatusIcon status={task.status} />
      <span className="flex-1 text-gray-600 dark:text-gray-400">
        {task.title}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
        {task.status}
      </span>
      {task.completedAt && (
        <span className="text-xs text-gray-500">
          {format(new Date(task.completedAt), 'MMM d, yyyy')}
        </span>
      )}
    </div>
  );
}
