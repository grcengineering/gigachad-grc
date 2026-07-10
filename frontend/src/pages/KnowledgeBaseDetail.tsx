import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { knowledgeBaseApi } from '@/lib/api';
import { Button, Badge, Dialog, Input, Select, Textarea } from '@/components/ui';

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  question?: string;
  answer: string;
  tags: string[];
  framework?: string;
  status: string;
  isPublic: boolean;
  usageCount?: number;
  createdAt?: string;
}

const CATEGORIES = ['security', 'privacy', 'compliance', 'technical', 'operational'];
const STATUSES = ['draft', 'pending', 'approved', 'archived'];

const CATEGORY_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat,
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
}));

const STATUS_OPTIONS = STATUSES.map((status) => ({
  value: status,
  label: status.charAt(0).toUpperCase() + status.slice(1),
}));

type EntryStatus = 'approved' | 'pending' | 'archived' | 'draft' | string;

function statusBadgeVariant(status: EntryStatus): 'success' | 'warning' | 'neutral' | 'info' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'archived') return 'neutral';
  return 'info';
}

export default function KnowledgeBaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(id === 'new');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<Partial<KnowledgeEntry>>({
    title: '',
    category: 'security',
    question: '',
    answer: '',
    tags: [],
    framework: '',
    status: 'draft',
    isPublic: false,
  });
  const [tagInput, setTagInput] = useState('');

  const { data: entry, isLoading } = useQuery({
    queryKey: ['knowledge-base', id],
    queryFn: async () => {
      const response = await knowledgeBaseApi.get(id!);
      return response.data;
    },
    enabled: id !== 'new',
  });

  useEffect(() => {
    if (entry && !editing) {
      setFormData(entry);
    }
  }, [entry, editing]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgeEntry>) => {
      const payload = { ...data, organizationId: '8924f0c1-7bb1-4be8-84ee-ad8725c712bf' };
      const response = await knowledgeBaseApi.create(payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      navigate(`/knowledge-base/${data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgeEntry>) => {
      const response = await knowledgeBaseApi.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', id] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await knowledgeBaseApi.delete(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      navigate('/knowledge-base');
    },
  });

  const handleSave = async () => {
    if (!formData.title || !formData.answer || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }
    if (id === 'new') {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) || [] }));
  };

  if (isLoading && id !== 'new') {
    return <div className="flex items-center justify-center h-64"><div className="text-surface-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/knowledge-base')} className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-surface-900">
            {id === 'new' ? 'New Knowledge Base Entry' : editing ? 'Edit Entry' : entry?.title || 'Entry'}
          </h1>
        </div>
        {!editing && id !== 'new' && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)} leftIcon={<PencilIcon className="w-5 h-5" />}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} leftIcon={<TrashIcon className="w-5 h-5" />}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Title <span className="text-red-600">*</span></label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Data Encryption at Rest"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">Category <span className="text-red-600">*</span></label>
              <Select
                value={formData.category || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">Framework</label>
              <Input
                value={formData.framework || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, framework: e.target.value }))}
                placeholder="e.g., SOC2, ISO 27001"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Question</label>
            <Input
              value={formData.question || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="e.g., Does your platform encrypt data at rest?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Answer <span className="text-red-600">*</span></label>
            <Textarea
              value={formData.answer}
              onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
              rows={6}
              placeholder="Provide a detailed answer..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                placeholder="Add a tag and press Enter"
                className="flex-1"
              />
              <Button type="button" onClick={handleAddTag}>Add</Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="neutral" capitalize={false} className="gap-1">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-600 transition-colors">
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">Status</label>
              <Select
                value={formData.status || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isPublic} onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-4 h-4 rounded border-surface-300 bg-surface-100 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-surface-700">Make publicly visible</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-surface-200">
            <Button
              variant="secondary"
              onClick={() => { if (id === 'new') { navigate('/knowledge-base'); } else { setEditing(false); setFormData(entry || {}); }}}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : entry ? (
        <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{entry.category}</Badge>
            {entry.framework && <Badge variant="neutral" capitalize={false}>{entry.framework}</Badge>}
            <Badge variant={statusBadgeVariant(entry.status)}>{entry.status}</Badge>
            {entry.isPublic && <Badge variant="info">Public</Badge>}
            {entry.usageCount !== undefined && <Badge variant="neutral" capitalize={false}>Used {entry.usageCount} times</Badge>}
          </div>
          {entry.question && <div><h3 className="text-sm font-medium text-surface-600 mb-2">Question</h3><p className="text-surface-900">{entry.question}</p></div>}
          <div><h3 className="text-sm font-medium text-surface-600 mb-2">Answer</h3><div className="text-surface-900 whitespace-pre-wrap">{entry.answer}</div></div>
          {entry.tags && entry.tags.length > 0 && (
            <div><h3 className="text-sm font-medium text-surface-600 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag: string, index: number) => <Badge key={index} variant="neutral" capitalize={false}>{tag}</Badge>)}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Knowledge Base Entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-surface-600">Are you sure you want to delete "{entry?.title}"? This action cannot be undone.</p>
      </Dialog>
    </div>
  );
}
