import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  entityType: string;
  entityId: string;
  dueDate?: string;
  assignee?: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface ActionItemsWidgetProps {
  limit?: number;
  showCreateButton?: boolean;
  entityType?: string;
  entityId?: string;
}

const priorityColors: Record<string, string> = {
  critical: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-green-500 bg-green-500/10',
};

const statusIcons: Record<string, React.ElementType> = {
  pending: ClockIcon,
  in_progress: ClockIcon,
  completed: CheckCircleIcon,
  blocked: ExclamationTriangleIcon,
};

export function ActionItemsWidget({
  limit = 5,
  showCreateButton = true,
  entityType,
  entityId,
}: ActionItemsWidgetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch tasks (my tasks or entity tasks)
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', entityType, entityId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (entityType && entityId) {
        params.entityType = entityType;
        params.entityId = entityId;
      }
      const response = await api.get('/api/tasks/my', { params });
      return response.data as Task[];
    },
    staleTime: 60 * 1000, // 1 minute - prevent excessive refetching
    refetchOnWindowFocus: false,
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const markComplete = (taskId: string) => {
    updateMutation.mutate({ id: taskId, status: 'completed' });
  };

  const displayedTasks = tasks?.slice(0, limit) || [];
  const pendingCount = tasks?.filter((t) => t.status !== 'completed').length || 0;

  const getEntityLink = (type: string, id: string) => {
    switch (type) {
      case 'control':
        return `/controls/${id}`;
      case 'risk':
        return `/risks/${id}`;
      case 'evidence':
        return `/evidence/${id}`;
      case 'policy':
        return `/policies/${id}`;
      default:
        return '#';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-surface-200 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-200 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-surface-200 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200">
        <div>
          <h3 className="text-lg font-semibold text-surface-900">Action Items</h3>
          {pendingCount > 0 && (
            <p className="text-sm text-surface-600">
              {pendingCount} pending task{pendingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {showCreateButton && (
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            View All
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tasks list */}
      <div className="divide-y divide-surface-200">
        {displayedTasks.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-surface-700 font-medium">All caught up!</p>
            <p className="text-surface-600 text-sm mt-1">No pending action items</p>
          </div>
        ) : (
          displayedTasks.map((task) => {
            const StatusIcon = statusIcons[task.status] || ClockIcon;
            const isOverdue = task.dueDate && getDaysUntilDue(task.dueDate) < 0;
            const isDueSoon = task.dueDate && getDaysUntilDue(task.dueDate) <= 3 && !isOverdue;

            return (
              <div key={task.id} className="p-4 hover:bg-surface-200/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Checkbox / Status */}
                  <button
                    onClick={() => markComplete(task.id)}
                    disabled={task.status === 'completed'}
                    className={`
                      flex-shrink-0 mt-0.5 p-1 rounded-md transition-colors
                      ${
                        task.status === 'completed'
                          ? 'text-green-500 cursor-default'
                          : 'text-surface-600 hover:text-green-500 hover:bg-green-500/10'
                      }
                    `}
                    aria-label={task.status === 'completed' ? 'Completed' : 'Mark as complete'}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => navigate(getEntityLink(task.entityType, task.entityId))}
                        className={`
                          text-left font-medium truncate
                          ${
                            task.status === 'completed'
                              ? 'text-surface-600 line-through'
                              : 'text-surface-900 hover:text-blue-600'
                          }
                        `}
                      >
                        {task.title}
                      </button>
                      <span
                        className={`
                        flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
                        ${priorityColors[task.priority] || priorityColors.medium}
                      `}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-surface-600 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-600">
                      {task.dueDate && (
                        <span
                          className={`
                          flex items-center gap-1
                          ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-yellow-500' : ''}
                        `}
                        >
                          <ClockIcon className="h-3.5 w-3.5" />
                          {isOverdue
                            ? `Overdue by ${Math.abs(getDaysUntilDue(task.dueDate))} days`
                            : isDueSoon
                              ? `Due in ${getDaysUntilDue(task.dueDate)} days`
                              : new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="capitalize">{task.entityType}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show more link if there are more tasks */}
      {tasks && tasks.length > limit && (
        <div className="p-4 border-t border-surface-200">
          <button
            onClick={() => navigate('/tasks')}
            className="text-sm text-blue-600 hover:text-blue-700 w-full text-center"
          >
            View all {tasks.length} tasks
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionItemsWidget;
