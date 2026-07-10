import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { riskConfigApi } from '../lib/api';
import {
  ChartBarIcon,
  TagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Input, Select } from '@/components/ui';

type ConfigTab = 'scoring' | 'categories' | 'workflow' | 'appetite';

interface LikelihoodScaleItem {
  value: string;
  label: string;
  description: string;
  weight: number;
}

interface ImpactScaleItem {
  value: string;
  label: string;
  description: string;
  weight: number;
}

interface RiskCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface RiskAppetite {
  category: string;
  level: string;
  description?: string;
}

interface WorkflowSettings {
  requireAssessment?: boolean;
  requireGrcReview?: boolean;
  autoAssignOwner?: boolean;
  executiveApprovalThreshold?: string;
  defaultReviewFrequency?: string;
  autoCloseAccepted?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnDueDate?: boolean;
  dueDateReminderDays?: number;
}

interface RiskConfiguration {
  id: string;
  organizationId: string;
  methodology: string;
  likelihoodScale: LikelihoodScaleItem[];
  impactScale: ImpactScaleItem[];
  categories: RiskCategory[];
  riskLevelThresholds: { low: number; medium: number; high: number; critical: number };
  workflowSettings: WorkflowSettings;
  riskAppetite: RiskAppetite[];
}

export default function RiskConfiguration() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('scoring');
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: config, isLoading, error } = useQuery<RiskConfiguration>({
    queryKey: ['risk-config'],
    queryFn: async () => {
      const response = await riskConfigApi.get();
      return response.data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<RiskConfiguration>) => {
      const response = await riskConfigApi.update(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-config'] });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await riskConfigApi.reset();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-config'] });
    },
  });

  const tabs = [
    { key: 'scoring' as ConfigTab, label: 'Scoring Methodology', icon: ChartBarIcon },
    { key: 'categories' as ConfigTab, label: 'Risk Categories', icon: TagIcon },
    { key: 'workflow' as ConfigTab, label: 'Workflow Settings', icon: ClockIcon },
    { key: 'appetite' as ConfigTab, label: 'Risk Appetite', icon: ExclamationTriangleIcon },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-600">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">Risk Configuration</h1>
          <p className="text-surface-600 mt-1">Configure risk management settings and methodology</p>
        </div>
        <div className="flex items-center gap-3">
          {updateMutation.isPending && (
            <span className="text-brand-700 text-sm flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Saving...
            </span>
          )}
          <button
            onClick={() => {
              if (confirm('Reset all settings to defaults?')) {
                resetMutation.mutate();
              }
            }}
            disabled={resetMutation.isPending}
            className="px-4 py-2 bg-surface-200 text-surface-700 rounded-lg hover:bg-surface-300 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-300 pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-surface-600 hover:text-surface-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-surface-200 p-6">
        {activeTab === 'scoring' && config && (
          <ScoringMethodology
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'categories' && config && (
          <RiskCategories
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'workflow' && config && (
          <WorkflowSettingsTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'appetite' && config && (
          <RiskAppetiteTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
      </div>
    </div>
  );
}

function ScoringMethodology({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [methodology, setMethodology] = useState<string>(config.methodology || 'qualitative');

  useEffect(() => {
    if (config.methodology) setMethodology(config.methodology);
  }, [config.methodology]);

  const handleMethodologyChange = (value: string) => {
    if (value === methodology) return;
    setMethodology(value);
    onUpdate({ methodology: value });
  };

  const options = [
    { value: 'qualitative', label: 'Qualitative', description: 'Likelihood × Impact matrix (standard 5×5)' },
    { value: 'quantitative', label: 'Quantitative', description: 'Annual Loss Expectancy (ALE) calculation' },
    { value: 'hybrid', label: 'Hybrid', description: 'Both qualitative and quantitative scoring' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-surface-900 mb-4">Scoring Methodology</h3>
        <div className="flex gap-4">
          {options.map((opt) => {
            const selected = methodology === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => handleMethodologyChange(opt.value)}
                className={`flex-1 text-left p-4 rounded-lg border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 ${
                  selected
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50'
                }`}
              >
                <p className={`font-medium ${selected ? 'text-brand-800' : 'text-surface-900'}`}>
                  {opt.label}
                </p>
                <p className="text-surface-600 text-sm mt-1">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-surface-900 font-medium mb-3">Likelihood Scale</h4>
          <div className="space-y-2">
            {config.likelihoodScale.map((level) => (
              <div key={level.value} className="flex items-center gap-3 p-3 bg-surface-50 border border-surface-200 rounded-lg">
                <span className="w-6 h-6 rounded bg-surface-300 flex items-center justify-center text-surface-900 text-sm font-medium">
                  {level.weight}
                </span>
                <div className="flex-1">
                  <p className="text-surface-900 text-sm">{level.label}</p>
                  <p className="text-surface-600 text-xs">{level.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-surface-900 font-medium mb-3">Impact Scale</h4>
          <div className="space-y-2">
            {config.impactScale.map((level) => (
              <div key={level.value} className="flex items-center gap-3 p-3 bg-surface-50 border border-surface-200 rounded-lg">
                <span className="w-6 h-6 rounded bg-surface-300 flex items-center justify-center text-surface-900 text-sm font-medium">
                  {level.weight}
                </span>
                <div className="flex-1">
                  <p className="text-surface-900 text-sm">{level.label}</p>
                  <p className="text-surface-600 text-xs">{level.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-surface-900 font-medium mb-3">Risk Level Matrix</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-surface-600 text-left"></th>
                {config.impactScale.map(i => (
                  <th key={i.value} className="p-2 text-center text-surface-600">{i.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...config.likelihoodScale].reverse().map((likelihood) => (
                <tr key={likelihood.value}>
                  <td className="p-2 text-surface-600">{likelihood.label}</td>
                  {config.impactScale.map(impact => {
                    const score = likelihood.weight * impact.weight;
                    let color = 'bg-emerald-500/50';
                    if (score >= config.riskLevelThresholds.critical) color = 'bg-red-500/50';
                    else if (score >= config.riskLevelThresholds.high) color = 'bg-orange-500/50';
                    else if (score >= config.riskLevelThresholds.medium) color = 'bg-amber-500/50';
                    else if (score >= config.riskLevelThresholds.low) color = 'bg-emerald-500/50';
                    return (
                      <td key={impact.value} className={`p-2 text-center ${color} text-surface-900`}>
                        {score}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RiskCategories({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [categories, setCategories] = useState<RiskCategory[]>(config.categories);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' });

  useEffect(() => {
    setCategories(config.categories);
  }, [config.categories]);

  const handleAddCategory = () => {
    if (newCategory.name) {
      const updated = [...categories, { ...newCategory, id: `cat-${Date.now()}` }];
      setCategories(updated);
      onUpdate({ categories: updated });
      setNewCategory({ name: '', description: '', color: '#6366f1' });
    }
  };

  const handleRemoveCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    onUpdate({ categories: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-surface-900 mb-4">Risk Categories</h3>
        <p className="text-surface-600 text-sm mb-4">Define the categories used to classify risks in your organization.</p>
      </div>

      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-4 p-4 bg-surface-50 border border-surface-200 rounded-lg">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: cat.color }}
            />
            <div className="flex-1">
              <p className="text-surface-900 font-medium">{cat.name}</p>
              <p className="text-surface-600 text-sm">{cat.description}</p>
            </div>
            <button
              onClick={() => handleRemoveCategory(cat.id)}
              className="text-surface-600 hover:text-red-600 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-surface-300">
        <h4 className="text-surface-900 font-medium mb-3">Add Category</h4>
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Category name"
            value={newCategory.name}
            onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
            className="flex-1"
          />
          <Input
            type="text"
            placeholder="Description"
            value={newCategory.description}
            onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
            className="flex-1"
          />
          <input
            type="color"
            value={newCategory.color}
            onChange={e => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
            className="w-12 h-10 rounded cursor-pointer"
          />
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowSettingsTab({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [settings, setSettings] = useState<WorkflowSettings>(config.workflowSettings);

  useEffect(() => {
    setSettings(config.workflowSettings);
  }, [config.workflowSettings]);

  const handleChange = (key: keyof WorkflowSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onUpdate({ workflowSettings: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-surface-900 mb-4">Workflow Settings</h3>
        <p className="text-surface-600 text-sm mb-4">Configure how risks flow through the assessment and treatment process.</p>
      </div>

      <div className="space-y-4">
        <h4 className="text-surface-900 font-medium">Assessment Workflow</h4>
        
        <label className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-lg">
          <div>
            <p className="text-surface-900">Require Formal Assessment</p>
            <p className="text-surface-600 text-sm">All risks must go through assessment phase</p>
          </div>
          <input
            type="checkbox"
            checked={settings.requireAssessment ?? true}
            onChange={e => handleChange('requireAssessment', e.target.checked)}
            className="rounded border-surface-400"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-lg">
          <div>
            <p className="text-surface-900">Require GRC Review</p>
            <p className="text-surface-600 text-sm">Assessments must be reviewed by GRC team</p>
          </div>
          <input
            type="checkbox"
            checked={settings.requireGrcReview ?? true}
            onChange={e => handleChange('requireGrcReview', e.target.checked)}
            className="rounded border-surface-400"
          />
        </label>

        <div className="p-4 bg-surface-50 border border-surface-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-surface-900">Executive Approval Threshold</p>
          </div>
          <p className="text-surface-600 text-sm mb-3">Risk level that requires executive approval for accept/transfer/avoid</p>
          <Select
            value={settings.executiveApprovalThreshold ?? 'high'}
            onChange={(v) => handleChange('executiveApprovalThreshold', v)}
            options={[
              { value: 'critical', label: 'Critical only' },
              { value: 'high', label: 'High and above' },
              { value: 'medium', label: 'Medium and above' },
              { value: 'none', label: 'No approval required' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-surface-300">
        <h4 className="text-surface-900 font-medium">Review Settings</h4>

        <div className="p-4 bg-surface-50 border border-surface-200 rounded-lg">
          <p className="text-surface-900 mb-2">Default Review Frequency</p>
          <Select
            value={settings.defaultReviewFrequency ?? 'quarterly'}
            onChange={(v) => handleChange('defaultReviewFrequency', v)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'semi_annually', label: 'Semi-Annually' },
              { value: 'annually', label: 'Annually' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-surface-300">
        <h4 className="text-surface-900 font-medium">Notifications</h4>
        
        <label className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-lg">
          <div>
            <p className="text-surface-900">Notify on Status Change</p>
            <p className="text-surface-600 text-sm">Send notifications when risk status changes</p>
          </div>
          <input
            type="checkbox"
            checked={settings.notifyOnStatusChange ?? true}
            onChange={e => handleChange('notifyOnStatusChange', e.target.checked)}
            className="rounded border-surface-400"
          />
        </label>

        <div className="p-4 bg-surface-50 border border-surface-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-surface-900">Due Date Reminder</p>
          </div>
          <p className="text-surface-600 text-sm mb-3">Days before due date to send reminder</p>
          <Input
            type="number"
            value={settings.dueDateReminderDays ?? 7}
            onChange={e => handleChange('dueDateReminderDays', parseInt(e.target.value))}
            min="1"
            max="30"
          />
        </div>
      </div>
    </div>
  );
}

function RiskAppetiteTab({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [appetite, setAppetite] = useState<RiskAppetite[]>(config.riskAppetite);

  useEffect(() => {
    setAppetite(config.riskAppetite);
  }, [config.riskAppetite]);

  const handleLevelChange = (category: string, level: string) => {
    const updated = appetite.map(a => 
      a.category === category ? { ...a, level } : a
    );
    setAppetite(updated);
    onUpdate({ riskAppetite: updated });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-surface-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-surface-900 mb-4">Risk Appetite</h3>
        <p className="text-surface-600 text-sm mb-4">
          Define your organization's risk appetite for each category. This determines acceptable risk levels 
          and influences treatment decisions.
        </p>
      </div>

      <div className="space-y-4">
        {appetite.map(item => (
          <div key={item.category} className="p-4 bg-surface-50 border border-surface-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getLevelColor(item.level)}`} />
                <p className="text-surface-900 font-medium">{item.category}</p>
              </div>
              <div className="w-48">
                <Select
                  value={item.level}
                  onChange={(v) => handleLevelChange(item.category, v)}
                  size="sm"
                  options={[
                    { value: 'low', label: 'Low Appetite' },
                    { value: 'medium', label: 'Medium Appetite' },
                    { value: 'high', label: 'High Appetite' },
                  ]}
                />
              </div>
            </div>
            <p className="text-surface-600 text-sm">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="p-4 bg-surface-50 border border-surface-200 rounded-lg">
        <h4 className="text-surface-900 font-medium mb-3">Appetite Legend</h4>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-surface-700 text-sm">Low - Minimal risk tolerance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-surface-700 text-sm">Medium - Moderate risk tolerance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-surface-700 text-sm">High - Aggressive risk tolerance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
