import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  TagIcon,
  ClockIcon,
  XMarkIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { answerTemplatesApi, AnswerTemplate, CreateAnswerTemplateData } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';
import { Dialog } from '@/components/ui/Dialog';

const CATEGORIES = [
  { value: 'security', label: 'Security', color: 'bg-red-500/20 text-red-600' },
  { value: 'privacy', label: 'Privacy', color: 'bg-purple-500/20 text-purple-600' },
  { value: 'compliance', label: 'Compliance', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'legal', label: 'Legal', color: 'bg-amber-500/20 text-amber-600' },
  { value: 'technical', label: 'Technical', color: 'bg-green-500/20 text-green-600' },
  { value: 'general', label: 'General', color: 'bg-surface-500/20 text-surface-600' },
];

export default function AnswerTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = user?.organizationId;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnswerTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AnswerTemplate | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['answer-templates', organizationId, categoryFilter, showArchived, searchQuery],
    queryFn: async () => {
      const response = await answerTemplatesApi.list({
        organizationId: organizationId!,
        category: categoryFilter || undefined,
        status: showArchived ? 'archived' : 'active',
        search: searchQuery || undefined,
      });
      return response.data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAnswerTemplateData) => {
      const response = await answerTemplatesApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-templates'] });
      toast.success('Template created successfully');
      setShowModal(false);
      setEditingTemplate(null);
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await answerTemplatesApi.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-templates'] });
      toast.success('Template updated successfully');
      setShowModal(false);
      setEditingTemplate(null);
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await answerTemplatesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-templates'] });
      toast.success('Template deleted');
      setSelectedTemplate(null);
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await answerTemplatesApi.archive(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-templates'] });
      toast.success('Template archived');
    },
  });

  const getCategoryStyle = (category?: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.color || 'bg-surface-200 text-surface-700';
  };

  if (!organizationId) {
    return (
      <EmptyState
        variant="warning"
        title="Sign in required"
        description="You need to be signed in to view or manage answer templates."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Answer Templates</h1>
          <p className="mt-1 text-surface-600">
            Create and manage reusable answer templates for questionnaires
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowModal(true);
          }}
          leftIcon={<PlusIcon className="w-5 h-5" />}
        >
          New Template
        </Button>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-600" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:border-brand-500 dark:bg-surface-900"
          />
        </div>

        <SelectNative
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:border-brand-500 dark:bg-surface-900"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </SelectNative>

        <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-surface-300 text-brand-500"
          />
          Show Archived
        </label>
      </div>
      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-surface-200 rounded-xl p-5 animate-pulse dark:bg-surface-900"
            >
              <div className="h-5 bg-surface-200 rounded w-3/4 mb-3" />
              <div className="h-16 bg-white rounded mb-3 dark:bg-surface-900" />
              <div className="h-4 bg-surface-200 rounded w-1/2" />
            </div>
          ))
        ) : templates?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <DocumentDuplicateIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-600">No templates found</p>
            <p className="text-sm text-surface-500 mt-1">
              Create your first template to get started
            </p>
          </div>
        ) : (
          templates?.map((template) => (
            <div
              key={template.id}
              className={clsx(
                'bg-white border rounded-xl p-5 cursor-pointer transition-all hover:border-surface-300 dark:bg-surface-900',
                selectedTemplate?.id === template.id
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-surface-200'
              )}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-surface-900 truncate flex-1">{template.title}</h3>
                <span
                  className={clsx(
                    'px-2 py-0.5 text-xs rounded-full ml-2',
                    getCategoryStyle(template.category)
                  )}
                >
                  {template.category || 'General'}
                </span>
              </div>

              <p className="text-sm text-surface-600 line-clamp-3 mb-4">{template.content}</p>

              <div className="flex items-center justify-between text-xs text-surface-500">
                <div className="flex items-center gap-3">
                  {template.variables.length > 0 && (
                    <span className="flex items-center gap-1">
                      <CodeBracketIcon className="w-3.5 h-3.5" />
                      {template.variables.length} vars
                    </span>
                  )}
                  {template.usageCount > 0 && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      Used {template.usageCount}x
                    </span>
                  )}
                </div>
                {template.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <TagIcon className="w-3.5 h-3.5" />
                    {template.tags.length}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {/* Template Detail Panel */}
      {selectedTemplate && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-surface-200 shadow-xl z-40 overflow-y-auto dark:bg-surface-900">
          <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between dark:bg-surface-900">
            <h2 className="text-lg font-semibold text-surface-900">Template Details</h2>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="p-2 text-surface-600 hover:text-surface-800 rounded-lg hover:bg-white dark:bg-surface-900 dark:hover:bg-surface-800"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-surface-900">{selectedTemplate.title}</h3>
                <span
                  className={clsx(
                    'px-2 py-1 text-xs rounded-full',
                    getCategoryStyle(selectedTemplate.category)
                  )}
                >
                  {selectedTemplate.category || 'General'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-2">Content</label>
              <div className="bg-white rounded-lg p-4 text-sm text-surface-800 whitespace-pre-wrap font-mono dark:bg-surface-900">
                {selectedTemplate.content}
              </div>
            </div>

            {selectedTemplate.variables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-2">
                  Variables ({selectedTemplate.variables.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((v, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-brand-500/20 text-brand-400 text-xs rounded font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedTemplate.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-surface-200 text-surface-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-surface-500">Usage Count</label>
                <p className="text-surface-800">{selectedTemplate.usageCount}</p>
              </div>
              <div>
                <label className="text-surface-500">Last Used</label>
                <p className="text-surface-800">
                  {selectedTemplate.lastUsedAt
                    ? new Date(selectedTemplate.lastUsedAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-surface-200">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTemplate(selectedTemplate);
                  setShowModal(true);
                }}
                leftIcon={<PencilIcon className="w-4 h-4" />}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => archiveMutation.mutate(selectedTemplate.id)}
                leftIcon={<ArchiveBoxIcon className="w-4 h-4" />}
              >
                Archive
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this template?')) {
                    deleteMutation.mutate(selectedTemplate.id);
                  }
                }}
                leftIcon={<TrashIcon className="w-4 h-4" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Create/Edit Modal */}
      {showModal && (
        <TemplateModal
          template={editingTemplate}
          organizationId={organizationId}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={(data) => {
            if (editingTemplate) {
              updateMutation.mutate({ id: editingTemplate.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Template Create/Edit Modal
function TemplateModal({
  template,
  organizationId,
  onClose,
  onSave,
  isLoading,
}: {
  template: AnswerTemplate | null;
  organizationId: string;
  onClose: () => void;
  onSave: (data: CreateAnswerTemplateData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: template?.title || '',
    content: template?.content || '',
    category: template?.category || '',
    tags: template?.tags?.join(', ') || '',
  });

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const detectedVariables = extractVariables(formData.content);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      organizationId,
      title: formData.title,
      content: formData.content,
      category: formData.category || undefined,
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      variables: detectedVariables,
    });
  };

  return (
    <Dialog open onClose={onClose}>
      <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between dark:bg-surface-900">
        <h2 className="text-lg font-semibold text-surface-900">
          {template ? 'Edit Template' : 'Create Template'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-surface-600 hover:text-surface-800 rounded-lg hover:bg-white dark:bg-surface-900 dark:hover:bg-surface-800"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">
            Title <span className="text-red-600">*</span>
          </label>
          <Input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:border-brand-500 dark:bg-surface-900"
            placeholder="e.g., SOC 2 Compliance Response"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">Category</label>
          <SelectNative
            value={formData.category}
            onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:border-brand-500 dark:bg-surface-900"
          >
            <option value="">Select category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectNative>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">
            Content <span className="text-red-600">*</span>
          </label>
          <p className="text-xs text-surface-500 mb-2">
            Use {'{{variable_name}}'} for placeholders that will be replaced when using the
            template.
          </p>
          <Textarea
            required
            value={formData.content}
            onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
            rows={8}
            className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:border-brand-500 font-mono text-sm dark:bg-surface-900"
            placeholder="Enter template content...

Example:
{{company_name}} maintains SOC 2 Type II compliance. Our last audit was completed on {{audit_date}} by {{auditor_name}}."
          />
        </div>

        {detectedVariables.length > 0 && (
          <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg">
            <label className="block text-sm font-medium text-brand-400 mb-2">
              Detected Variables ({detectedVariables.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {detectedVariables.map((v, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-brand-500/20 text-brand-300 text-xs rounded font-mono"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">Tags</label>
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
            className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:border-brand-500 dark:bg-surface-900"
            placeholder="encryption, data-protection, audit (comma-separated)"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
