import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  CheckIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button, Badge, Input, Select, Textarea } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';

interface TasksPanelProps {
  entityType: string;
  entityId: string;
}

interface StatusOption {
  value: string;
  label: string;
  variant: BadgeVariant;
}

interface PriorityOption {
  value: string;
  label: string;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'open', label: 'Open', variant: 'info' },
  { value: 'in_progress', label: 'In Progress', variant: 'warning' },
  { value: 'completed', label: 'Completed', variant: 'success' },
  { value: 'cancelled', label: 'Cancelled', variant: 'neutral' },
];

const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'low', label: 'Low', color: 'text-emerald-700' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-700' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
];

const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }));
const PRIORITY_SELECT_OPTIONS = PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }));

export default function TasksPanel({ entityType, entityId }: TasksPanelProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: '',
    dueDate: '',
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', entityType, entityId],
    queryFn: () => tasksApi.list({ entityType, entityId }).then((res) => res.data),
    enabled: !!entityId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((res) => res.data.users ?? []),
  });

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((user: any) => ({ value: user.id, label: user.displayName })),
  ];

  const createMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create({ entityType, entityId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', entityType, entityId] });
      setIsCreating(false);
      setNewTask({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
      toast.success('Task created');
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', entityType, entityId] });
      setEditingTask(null);
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', entityType, entityId] });
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    createMutation.mutate({
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      priority: newTask.priority,
      assigneeId: newTask.assigneeId || undefined,
      dueDate: newTask.dueDate || undefined,
    });
  };

  const openTasks = tasks.filter((t: any) => t.status === 'open' || t.status === 'in_progress');
  const completedTasks = tasks.filter(
    (t: any) => t.status === 'completed' || t.status === 'cancelled'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-5 h-5 text-surface-600" />
          <h3 className="text-sm font-semibold text-surface-900">
            Tasks ({openTasks.length} open)
          </h3>
        </div>
        {!isCreating && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            leftIcon={<PlusIcon className="w-3 h-3" />}
          >
            Add Task
          </Button>
        )}
      </div>

      {/* Create Task Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <Input
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            autoFocus
          />
          <Textarea
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Description (optional)"
            className="h-16 min-h-0"
          />
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={newTask.priority}
              onChange={(value) => setNewTask({ ...newTask, priority: value })}
              options={PRIORITY_SELECT_OPTIONS}
              size="sm"
            />
            <Select
              value={newTask.assigneeId}
              onChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
              options={assigneeOptions}
              size="sm"
            />
            <Input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              inputSize="sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!newTask.title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="text-center py-4 text-surface-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-4 text-surface-500 text-sm">
          No tasks yet. Create one to track work items.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Open Tasks */}
          {openTasks.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              users={users}
              isEditing={editingTask === task.id}
              onEdit={() => setEditingTask(task.id)}
              onCancelEdit={() => setEditingTask(null)}
              onUpdate={(data) => updateMutation.mutate({ id: task.id, ...data })}
              onDelete={() => deleteMutation.mutate(task.id)}
              isUpdating={updateMutation.isPending}
            />
          ))}

          {/* Completed Tasks (collapsed) */}
          {completedTasks.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-surface-500 cursor-pointer hover:text-surface-700">
                {completedTasks.length} completed task(s)
              </summary>
              <div className="mt-2 space-y-2 opacity-60">
                {completedTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    isEditing={false}
                    onEdit={() => {}}
                    onCancelEdit={() => {}}
                    onUpdate={() => {}}
                    onDelete={() => deleteMutation.mutate(task.id)}
                    isUpdating={false}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  users,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  task: any;
  users: any[];
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId || '',
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
  });

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === task.status) || STATUS_OPTIONS[0];
  const priorityConfig =
    PRIORITY_OPTIONS.find((p) => p.value === task.priority) || PRIORITY_OPTIONS[1];

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((user: any) => ({ value: user.id, label: user.displayName })),
  ];

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  if (isEditing) {
    return (
      <div className="card p-3 space-y-2">
        <Input
          value={editData.title}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          inputSize="sm"
        />
        <Textarea
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          placeholder="Description"
          className="h-16 min-h-0 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={editData.status}
            onChange={(value) => setEditData({ ...editData, status: value })}
            options={STATUS_SELECT_OPTIONS}
            size="sm"
          />
          <Select
            value={editData.priority}
            onChange={(value) => setEditData({ ...editData, priority: value })}
            options={PRIORITY_SELECT_OPTIONS}
            size="sm"
          />
          <Select
            value={editData.assigneeId}
            onChange={(value) => setEditData({ ...editData, assigneeId: value })}
            options={assigneeOptions}
            size="sm"
          />
          <Input
            type="date"
            value={editData.dueDate}
            onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
            inputSize="sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancelEdit}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onUpdate({
                ...editData,
                assigneeId: editData.assigneeId || null,
                dueDate: editData.dueDate || null,
              })
            }
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'card p-3 cursor-pointer hover:bg-surface-100 transition-colors',
        task.status === 'completed' && 'opacity-60'
      )}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={statusConfig.variant} size="sm">
              {statusConfig.label}
            </Badge>
            <span className={clsx('text-xs', priorityConfig.color)}>
              <FlagIcon className="w-3 h-3 inline" /> {priorityConfig.label}
            </span>
          </div>
          <p
            className={clsx(
              'text-sm font-medium text-surface-800',
              task.status === 'completed' && 'line-through'
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-surface-500 mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
            {task.assignee && (
              <span className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                {task.assignee.displayName}
              </span>
            )}
            {task.dueDate && (
              <span className={clsx('flex items-center gap-1', isOverdue && 'text-red-600')}>
                <CalendarIcon className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {task.status !== 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ status: 'completed' });
              }}
              className="p-1 rounded text-surface-500 hover:text-emerald-700 hover:bg-surface-200 transition-colors"
              title="Mark complete"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-surface-500 hover:text-red-600 hover:bg-surface-200 transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
