import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { riskTasksApi, usersApi, CreateRiskWorkflowTaskData } from '../../lib/api';
import { User } from '../../lib/apiTypes';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface CreateTaskModalProps {
  riskId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const taskTypes = [
  { value: 'custom', label: 'Custom Task', description: 'A custom task for any purpose' },
  { value: 'validate', label: 'Validate Risk', description: 'Review and validate the submitted risk' },
  { value: 'assess', label: 'Risk Assessment', description: 'Analyze and assess the risk' },
  { value: 'review_assessment', label: 'GRC Review', description: 'Review the submitted assessment' },
  { value: 'treatment_decision', label: 'Treatment Decision', description: 'Decide on treatment approach' },
  { value: 'executive_approval', label: 'Executive Approval', description: 'Executive sign-off required' },
  { value: 'mitigation_update', label: 'Mitigation Update', description: 'Provide progress update' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'text-gray-500' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'critical', label: 'Critical', color: 'text-red-500' },
];

const workflowStages = [
  { value: 'intake', label: 'Intake' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'treatment', label: 'Treatment' },
];

export default function CreateTaskModal({ riskId, onClose, onSuccess }: CreateTaskModalProps) {
  const [formData, setFormData] = useState<CreateRiskWorkflowTaskData>({
    taskType: 'custom',
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium',
    dueDate: '',
    notes: '',
    workflowStage: 'intake',
  });
  
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => usersApi.list({ limit: 100 }),
  });

  const users = usersData?.data?.data || [];
  const filteredUsers = users.filter((u: { firstName: string; lastName: string; email: string }) => 
    userSearch === '' || 
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = users.find((u: { id: string }) => u.id === formData.assigneeId);

  const createMutation = useMutation({
    mutationFn: (data: CreateRiskWorkflowTaskData) => riskTasksApi.create(riskId, data),
    onSuccess: () => {
      toast.success('Task created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!formData.assigneeId) {
      toast.error('Please select an assignee');
      return;
    }

    createMutation.mutate(formData);
  };

  const selectUser = (userId: string) => {
    setFormData(prev => ({ ...prev, assigneeId: userId }));
    setShowUserDropdown(false);
    setUserSearch('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Create Workflow Task
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Task Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Type
              </label>
              <select
                value={formData.taskType}
                onChange={(e) => setFormData(prev => ({ ...prev, taskType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {taskTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {taskTypes.find(t => t.value === formData.taskType)?.description}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add more details about this task..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Assignee */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignee <span className="text-red-500">*</span>
              </label>
              
              {selectedUser ? (
                <div className="flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-gray-100">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </span>
                    <span className="text-sm text-gray-500">({selectedUser.email})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, assigneeId: '' }))}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="Search for a user..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  
                  {showUserDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No users found</div>
                      ) : (
                        filteredUsers.slice(0, 10).map((user: User) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => selectUser(user.id)}
                            className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-gray-100">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-sm text-gray-500">({user.email})</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Priority & Stage Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {priorities.map(p => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Workflow Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Workflow Stage
                </label>
                <select
                  value={formData.workflowStage || 'intake'}
                  onChange={(e) => setFormData(prev => ({ ...prev, workflowStage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {workflowStages.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !formData.title.trim() || !formData.assigneeId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckIcon className="h-4 w-4" />
                )}
                Create Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
