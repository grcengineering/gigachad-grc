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

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

interface TasksPanelProps {
  entityType: string;
  entityId: string;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'text-blue-600 bg-blue-400/10' },
  { value: 'in_progress', label: 'In Progress', color: 'text-yellow-600 bg-yellow-400/10' },
  { value: 'completed', label: 'Completed', color: 'text-green-600 bg-green-400/10' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-surface-600 bg-surface-400/10' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
];

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
    queryFn: () => usersApi.list().then((res) => res.data?.data || []),
  });

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
            onClick={() => setIsCreating(true)}
            className="text-xs px-2 py-1"
            variant="outline"
          >
            <PlusIcon className="w-3 h-3 mr-1" />
            Add Task
          </Button>
        )}
      </div>
      {/* Create Task Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <Input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            className="input w-full"
            autoFocus
          />
          <Textarea
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Description (optional)"
            className="input w-full h-16"
          />
          <div className="grid grid-cols-3 gap-2">
            <SelectNative
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="input text-sm"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectNative>
            <SelectNative
              value={newTask.assigneeId}
              onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
              className="input text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </SelectNative>
            <Input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              className="input text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-sm"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newTask.title.trim() || createMutation.isPending}
              className="text-sm"
              variant="primary"
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

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  if (isEditing) {
    return (
      <div className="card p-3 space-y-2">
        <Input
          type="text"
          value={editData.title}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          className="input w-full text-sm"
        />
        <Textarea
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="input w-full h-16 text-sm"
          placeholder="Description"
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectNative
            value={editData.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            className="input text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={editData.priority}
            onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
            className="input text-sm"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={editData.assigneeId}
            onChange={(e) => setEditData({ ...editData, assigneeId: e.target.value })}
            className="input text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </SelectNative>
          <Input
            type="date"
            value={editData.dueDate}
            onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
            className="input text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancelEdit} className="text-xs" variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={() =>
              onUpdate({
                ...editData,
                assigneeId: editData.assigneeId || null,
                dueDate: editData.dueDate || null,
              })
            }
            disabled={isUpdating}
            className="text-xs"
            variant="primary"
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
        'card p-3 cursor-pointer hover:bg-white transition-colors',
        task.status === 'completed' && 'opacity-60'
      )}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('text-xs', statusConfig.color)}>{statusConfig.label}</span>
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
              className="p-1 rounded text-surface-500 hover:text-green-600 hover:bg-surface-200 transition-colors"
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
