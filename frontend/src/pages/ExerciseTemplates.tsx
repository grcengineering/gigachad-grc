import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { ExerciseTemplatePreview } from '@/components/bcdr/ExerciseTemplatePreview';
import { api } from '@/lib/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// ============================================
// Types
// ============================================

interface ExerciseTemplate {
  id: string;
  templateId: string;
  title: string;
  description: string;
  category: string;
  scenarioType: string;
  scenarioNarrative: string;
  discussionQuestions: any[];
  injects?: any[];
  expectedDecisions?: string[];
  facilitatorNotes?: string;
  estimatedDuration?: number;
  participantRoles?: any[];
  tags: string[];
  isGlobal: boolean;
  usageCount: number;
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'vendor_outage', label: 'Vendor Outage' },
  { value: 'natural_disaster', label: 'Natural Disaster' },
  { value: 'pandemic', label: 'Pandemic' },
  { value: 'data_breach', label: 'Data Breach' },
];

const CATEGORY_COLORS: Record<string, string> = {
  ransomware: 'bg-red-500',
  natural_disaster: 'bg-orange-500',
  vendor_outage: 'bg-yellow-500',
  data_breach: 'bg-purple-500',
  pandemic: 'bg-blue-500',
  infrastructure: 'bg-cyan-500',
};

// ============================================
// Exercise Templates Page Component
// ============================================

export default function ExerciseTemplates() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewTemplate = id === 'new';

  const [templates, setTemplates] = useState<ExerciseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ExerciseTemplate | null>(null);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'ransomware',
    scenarioType: 'tabletop',
    scenarioNarrative: '',
    estimatedDuration: 60,
    facilitatorNotes: '',
  });

  useEffect(() => {
    if (!isNewTemplate) {
      loadTemplates();
      loadCategories();
    }
  }, [search, category, isNewTemplate]);

  const handleCreateTemplate = async () => {
    if (!createForm.title.trim()) {
      toast.error('Please enter a template title');
      return;
    }
    setIsCreating(true);
    try {
      await api.post('/api/bcdr/exercise-templates', {
        ...createForm,
        templateId: `tpl-${Date.now()}`,
        discussionQuestions: [],
        injects: [],
        expectedDecisions: [],
        participantRoles: [],
        tags: [],
      });
      toast.success('Template created successfully');
      navigate(`/bcdr/exercise-templates`);
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    } finally {
      setIsCreating(false);
    }
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      params.append('includeGlobal', 'true');

      const response = await api.get(`/bcdr/exercise-templates?${params.toString()}`);
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/bcdr/exercise-templates/categories');
      const data = response.data;
      // Handle both array response and { data: [] } response format
      setCategories(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const handleCloneTemplate = async (templateId: string) => {
    try {
      const response = await api.post(`/bcdr/exercise-templates/${templateId}/clone`);
      // Navigate to create a new DR test using this template
      navigate(`/bcdr/tests/new?templateId=${response.data.id}`);
    } catch (error) {
      console.error('Failed to clone template:', error);
    }
  };

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Create form for new templates
  if (isNewTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/exercise-templates')}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Exercise Template</h1>
            <p className="text-slate-400 mt-1">
              Create a custom tabletop exercise scenario template
            </p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Template Title *</label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g., Ransomware Attack Scenario"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {CATEGORY_OPTIONS.filter(opt => opt.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Duration (minutes)</label>
              <input
                type="number"
                value={createForm.estimatedDuration}
                onChange={(e) => setCreateForm({ ...createForm, estimatedDuration: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Brief description of the exercise template..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Narrative</label>
            <textarea
              value={createForm.scenarioNarrative}
              onChange={(e) => setCreateForm({ ...createForm, scenarioNarrative: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Describe the scenario in detail for participants..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Facilitator Notes</label>
            <textarea
              value={createForm.facilitatorNotes}
              onChange={(e) => setCreateForm({ ...createForm, facilitatorNotes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Notes for the exercise facilitator..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => navigate('/bcdr/exercise-templates')}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTemplate}
              disabled={isCreating || !createForm.title.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Exercise Template Library</h1>
          <p className="text-slate-400 mt-1">
            Pre-built tabletop exercise scenarios for DR testing
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/bcdr/exercise-templates/new')}>
          Create Custom Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-slate-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Stats */}
      {safeCategories.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {safeCategories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setCategory(cat.category === category ? '' : cat.category)}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                cat.category === category
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              )}
            >
              <div
                className={clsx(
                  'w-2 h-2 rounded-full',
                  CATEGORY_COLORS[cat.category] || 'bg-slate-500'
                )}
              />
              <span className="capitalize">{cat.category.replace('_', ' ')}</span>
              <span className="text-slate-400">({cat.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-400 mt-4">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <DocumentDuplicateIcon className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="text-slate-400 mt-4">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer group"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-3 h-3 rounded-full',
                      CATEGORY_COLORS[template.category] || 'bg-slate-500'
                    )}
                  />
                  <span className="text-sm text-slate-400 capitalize">
                    {template.category.replace('_', ' ')}
                  </span>
                </div>
                {template.isGlobal && (
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                    Global
                  </span>
                )}
              </div>

              <h3 className="text-lg font-medium text-white mb-2 group-hover:text-cyan-400 transition-colors">
                {template.title}
              </h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                {template.description}
              </p>

              <div className="flex items-center gap-4 text-sm text-slate-400">
                {template.estimatedDuration && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{template.estimatedDuration}m</span>
                  </div>
                )}
                {template.participantRoles && (
                  <div className="flex items-center gap-1">
                    <UserGroupIcon className="h-4 w-4" />
                    <span>{template.participantRoles.length} roles</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>{template.usageCount} uses</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {template.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <ExerciseTemplatePreview
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUseTemplate={() => {
            handleCloneTemplate(selectedTemplate.id);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}
