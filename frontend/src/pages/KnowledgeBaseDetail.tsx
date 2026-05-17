import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { knowledgeBaseApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';
import toast from 'react-hot-toast';

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

export default function KnowledgeBaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      setFormData(entry as any);
    }
  }, [entry, editing]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgeEntry>) => {
      // Organization ID must come from the authenticated user. Previously
      // this fell back to a hardcoded UUID, routing unauthenticated writes
      // into a random tenant. handleSave guards against null user before
      // calling .mutate, so this assertion is a defensive backstop.
      if (!user?.organizationId) {
        throw new Error('Cannot create knowledge-base entry: not signed in');
      }
      const payload = { ...data, organizationId: user.organizationId };
      const response = await knowledgeBaseApi.create(payload as any);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Entry created successfully');
      navigate(`/knowledge-base/${data.id}`);
    },
    onError: () => {
      toast.error('Failed to create entry');
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
      toast.success('Entry updated successfully');
      setEditing(false);
    },
    onError: () => {
      toast.error('Failed to update entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await knowledgeBaseApi.delete(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Entry deleted successfully');
      navigate('/knowledge-base');
    },
    onError: () => {
      toast.error('Failed to delete entry');
    },
  });

  const handleSave = async () => {
    if (!formData.title || !formData.answer || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (id === 'new') {
      if (!user?.organizationId) {
        toast.error('Cannot save entry: not signed in');
        return;
      }
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
    return (
      <div className="space-y-6">
        <SkeletonDetailHeader />
        <SkeletonDetailSection title />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/knowledge-base')} className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-surface-100">
            {id === 'new' ? 'New Knowledge Base Entry' : editing ? 'Edit Entry' : entry?.title || 'Entry'}
          </h1>
        </div>
        {!editing && id !== 'new' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)} leftIcon={<PencilIcon className="w-5 h-5" />}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} leftIcon={<TrashIcon className="w-5 h-5" />}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">Title <span className="text-red-400">*</span></label>
            <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} 
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" 
              placeholder="e.g., Data Encryption at Rest" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">Category <span className="text-red-400">*</span></label>
              <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} 
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500">
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">Framework</label>
              <input type="text" value={formData.framework || ''} onChange={(e) => setFormData(prev => ({ ...prev, framework: e.target.value }))} 
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" 
                placeholder="e.g., SOC2, ISO 27001" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">Question</label>
            <input type="text" value={formData.question || ''} onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))} 
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" 
              placeholder="e.g., Does your platform encrypt data at rest?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">Answer <span className="text-red-400">*</span></label>
            <textarea value={formData.answer} onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))} rows={6}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" 
              placeholder="Provide a detailed answer..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" 
                placeholder="Add a tag and press Enter" />
              <button type="button" onClick={handleAddTag} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Add</button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-400 transition-colors">
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))} 
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500">
                {STATUSES.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isPublic} onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))} 
                  className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-surface-300">Make publicly visible</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-surface-800">
            <Button 
              variant="secondary"
              onClick={() => { if (id === 'new') { navigate('/knowledge-base'); } else { setEditing(false); setFormData((entry as any) || {}); }}} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      ) : entry ? (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded capitalize">{entry.category}</span>
            {entry.framework && <span className="px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded">{typeof entry.framework === 'string' ? entry.framework : entry.framework.name}</span>}
            <span className={`px-2 py-1 text-xs rounded capitalize ${entry.status === 'approved' ? 'bg-green-500/20 text-green-400' : entry.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : entry.status === 'archived' ? 'bg-surface-500/20 text-surface-400' : 'bg-blue-500/20 text-blue-400'}`}>{entry.status}</span>
            {entry.isPublic && <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">Public</span>}
            {entry.usageCount !== undefined && <span className="px-2 py-1 text-xs bg-surface-700 text-surface-400 rounded">Used {entry.usageCount} times</span>}
          </div>
          {entry.question && <div><h3 className="text-sm font-medium text-surface-400 mb-2">Question</h3><p className="text-surface-100">{entry.question}</p></div>}
          <div><h3 className="text-sm font-medium text-surface-400 mb-2">Answer</h3><div className="text-surface-100 whitespace-pre-wrap">{entry.answer}</div></div>
          {entry.tags && entry.tags.length > 0 && (
            <div><h3 className="text-sm font-medium text-surface-400 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag: string, index: number) => <span key={index} className="px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded">{tag}</span>)}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-surface-100 mb-2">Delete Knowledge Base Entry</h3>
            <p className="text-surface-400 mb-6">Are you sure you want to delete "{entry?.title}"? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => deleteMutation.mutate()} isLoading={deleteMutation.isPending}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
