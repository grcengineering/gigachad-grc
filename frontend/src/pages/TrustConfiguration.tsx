import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ClockIcon, 
  UserGroupIcon, 
  BookOpenIcon,
  GlobeAltIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { trustConfigApi, TrustConfiguration as TrustConfigType } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type TabId = 'sla' | 'assignment' | 'kb' | 'trust-center' | 'ai';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'sla', label: 'SLA Settings', icon: ClockIcon },
  { id: 'assignment', label: 'Assignment', icon: UserGroupIcon },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpenIcon },
  { id: 'trust-center', label: 'Trust Center', icon: GlobeAltIcon },
  { id: 'ai', label: 'AI Features', icon: SparklesIcon },
];

export default function TrustConfiguration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = user?.organizationId;
  const [activeTab, setActiveTab] = useState<TabId>('sla');

  const { data: config, isLoading } = useQuery({
    queryKey: ['trust-config', organizationId],
    queryFn: async () => {
      const response = await trustConfigApi.get(organizationId!);
      return response.data;
    },
    enabled: !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TrustConfigType>) => {
      if (!organizationId) throw new Error('Not signed in');
      const response = await trustConfigApi.update(data, organizationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-config'] });
      toast.success('Configuration saved successfully');
    },
    onError: () => {
      toast.error('Failed to save configuration');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Not signed in');
      const response = await trustConfigApi.reset(organizationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-config'] });
      toast.success('Configuration reset to defaults');
    },
    onError: () => {
      toast.error('Failed to reset configuration');
    },
  });

  if (!organizationId) {
    return (
      <EmptyState
        variant="warning"
        title="Sign in required"
        description="You need to be signed in to view or change Trust Configuration."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-700 rounded w-48 mb-4" />
          <div className="h-64 bg-surface-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Trust Configuration</h1>
          <p className="mt-1 text-surface-400">
            Configure SLAs, assignments, and features for the Trust module
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => resetMutation.mutate()}
            isLoading={resetMutation.isPending}
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-700">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        {activeTab === 'sla' && config && (
          <SlaSettingsTab 
            config={config} 
            onUpdate={(slaSettings) => {
              updateMutation.mutate({ slaSettings });
            }}
            isUpdating={updateMutation.isPending}
          />
        )}
        {activeTab === 'assignment' && config && (
          <AssignmentSettingsTab 
            config={config}
            onUpdate={(assignmentSettings) => {
              updateMutation.mutate({ assignmentSettings });
            }}
            isUpdating={updateMutation.isPending}
          />
        )}
        {activeTab === 'kb' && config && (
          <KbSettingsTab 
            config={config}
            onUpdate={(kbSettings) => {
              updateMutation.mutate({ kbSettings });
            }}
            isUpdating={updateMutation.isPending}
          />
        )}
        {activeTab === 'trust-center' && config && (
          <TrustCenterSettingsTab 
            config={config}
            onUpdate={(trustCenterSettings) => {
              updateMutation.mutate({ trustCenterSettings });
            }}
            isUpdating={updateMutation.isPending}
          />
        )}
        {activeTab === 'ai' && config && (
          <AiSettingsTab 
            config={config}
            onUpdate={(aiSettings) => {
              updateMutation.mutate({ aiSettings });
            }}
            isUpdating={updateMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

// SLA Settings Tab
function SlaSettingsTab({ 
  config, 
  onUpdate, 
  isUpdating 
}: { 
  config: TrustConfigType; 
  onUpdate: (settings: TrustConfigType['slaSettings']) => void;
  isUpdating: boolean;
}) {
  const [settings, setSettings] = useState(config.slaSettings);
  const priorities = ['urgent', 'high', 'medium', 'low'] as const;

  const handleChange = (priority: keyof typeof settings, field: 'targetHours' | 'warningHours', value: number) => {
    setSettings(prev => ({
      ...prev,
      [priority]: { ...prev[priority], [field]: value }
    }));
  };

  const formatHoursToLabel = (hours: number): string => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${days}d ${remainingHours}h`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-100 mb-2">SLA Targets by Priority</h3>
        <p className="text-sm text-surface-400">
          Define target response times for questionnaires based on priority level. 
          The warning threshold triggers "At Risk" status.
        </p>
      </div>

      <div className="space-y-4">
        {priorities.map((priority) => (
          <div key={priority} className="bg-surface-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <span className={clsx(
                'px-3 py-1 text-sm font-medium rounded-full capitalize',
                priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-surface-700 text-surface-300'
              )}>
                {priority}
              </span>
              <span className="text-xs text-surface-500">
                Current: {formatHoursToLabel(settings[priority].targetHours)} target, {formatHoursToLabel(settings[priority].warningHours)} warning
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Target Time (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings[priority].targetHours}
                  onChange={(e) => handleChange(priority, 'targetHours', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Warning Threshold (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max={settings[priority].targetHours - 1}
                  value={settings[priority].warningHours}
                  onChange={(e) => handleChange(priority, 'warningHours', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Visual SLA Bar */}
            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                <span>0h</span>
                <div className="flex-1" />
                <span>{formatHoursToLabel(settings[priority].targetHours)}</span>
              </div>
              <div className="h-3 bg-surface-700 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500/60 h-full"
                  style={{ width: `${(settings[priority].warningHours / settings[priority].targetHours) * 100}%` }}
                  title="On Track zone"
                />
                <div 
                  className="bg-amber-500/60 h-full"
                  style={{ width: `${((settings[priority].targetHours - settings[priority].warningHours) / settings[priority].targetHours) * 100}%` }}
                  title="At Risk zone"
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  On Track
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  At Risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Breached (past target)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => onUpdate(settings)}
          isLoading={isUpdating}
          leftIcon={<CheckIcon className="w-4 h-4" />}
        >
          Save SLA Settings
        </Button>
      </div>
    </div>
  );
}

// Assignment Settings Tab
function AssignmentSettingsTab({ 
  config, 
  onUpdate, 
  isUpdating 
}: { 
  config: TrustConfigType; 
  onUpdate: (settings: TrustConfigType['assignmentSettings']) => void;
  isUpdating: boolean;
}) {
  const [settings, setSettings] = useState(config.assignmentSettings);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-100 mb-2">Assignment Settings</h3>
        <p className="text-sm text-surface-400">
          Configure how questionnaires and questions are assigned to team members.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enableAutoAssignment}
            onChange={(e) => setSettings(prev => ({ ...prev, enableAutoAssignment: e.target.checked }))}
            className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
          />
          <div>
            <p className="font-medium text-surface-100">Enable Auto-Assignment</p>
            <p className="text-sm text-surface-400">
              Automatically assign new questionnaires to team members based on workload
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => onUpdate(settings)}
          isLoading={isUpdating}
          leftIcon={<CheckIcon className="w-4 h-4" />}
        >
          Save Assignment Settings
        </Button>
      </div>
    </div>
  );
}

// Knowledge Base Settings Tab
function KbSettingsTab({ 
  config, 
  onUpdate, 
  isUpdating 
}: { 
  config: TrustConfigType; 
  onUpdate: (settings: TrustConfigType['kbSettings']) => void;
  isUpdating: boolean;
}) {
  const [settings, setSettings] = useState(config.kbSettings);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-100 mb-2">Knowledge Base Settings</h3>
        <p className="text-sm text-surface-400">
          Configure how the knowledge base works for answer suggestions and quality control.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={settings.requireApprovalForNewEntries}
            onChange={(e) => setSettings(prev => ({ ...prev, requireApprovalForNewEntries: e.target.checked }))}
            className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
          />
          <div>
            <p className="font-medium text-surface-100">Require Approval for New Entries</p>
            <p className="text-sm text-surface-400">
              New knowledge base entries must be approved before they can be used
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoSuggestFromKB}
            onChange={(e) => setSettings(prev => ({ ...prev, autoSuggestFromKB: e.target.checked }))}
            className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
          />
          <div>
            <p className="font-medium text-surface-100">Auto-Suggest from Knowledge Base</p>
            <p className="text-sm text-surface-400">
              Automatically show relevant KB entries when answering questions
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={settings.trackUsageMetrics}
            onChange={(e) => setSettings(prev => ({ ...prev, trackUsageMetrics: e.target.checked }))}
            className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
          />
          <div>
            <p className="font-medium text-surface-100">Track Usage Metrics</p>
            <p className="text-sm text-surface-400">
              Track how often KB entries are used to identify popular answers
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => onUpdate(settings)}
          isLoading={isUpdating}
          leftIcon={<CheckIcon className="w-4 h-4" />}
        >
          Save KB Settings
        </Button>
      </div>
    </div>
  );
}

// Trust Center Settings Tab
function TrustCenterSettingsTab({ 
  config, 
  onUpdate, 
  isUpdating 
}: { 
  config: TrustConfigType; 
  onUpdate: (settings: TrustConfigType['trustCenterSettings']) => void;
  isUpdating: boolean;
}) {
  const [settings, setSettings] = useState(config.trustCenterSettings);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-100 mb-2">Trust Center Settings</h3>
        <p className="text-sm text-surface-400">
          Configure your public-facing trust center portal.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
            className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
          />
          <div>
            <p className="font-medium text-surface-100">Enable Trust Center</p>
            <p className="text-sm text-surface-400">
              Make your trust center publicly accessible
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={settings.allowAnonymousAccess}
            onChange={(e) => setSettings(prev => ({ ...prev, allowAnonymousAccess: e.target.checked }))}
            className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
          />
          <div>
            <p className="font-medium text-surface-100">Allow Anonymous Access</p>
            <p className="text-sm text-surface-400">
              Allow visitors to view the trust center without logging in
            </p>
          </div>
        </label>

        <div className="p-4 bg-surface-800 rounded-lg">
          <label className="block text-sm font-medium text-surface-400 mb-2">
            Custom Domain (optional)
          </label>
          <input
            type="text"
            value={settings.customDomain || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, customDomain: e.target.value || null }))}
            placeholder="trust.yourcompany.com"
            className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
          />
          <p className="text-xs text-surface-500 mt-1">
            Point a CNAME record to your trust center URL
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => onUpdate(settings)}
          isLoading={isUpdating}
          leftIcon={<CheckIcon className="w-4 h-4" />}
        >
          Save Trust Center Settings
        </Button>
      </div>
    </div>
  );
}

// AI Settings Tab
function AiSettingsTab({ 
  config, 
  onUpdate, 
  isUpdating 
}: { 
  config: TrustConfigType; 
  onUpdate: (settings: TrustConfigType['aiSettings']) => void;
  isUpdating: boolean;
}) {
  const [settings, setSettings] = useState(config.aiSettings);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-100 mb-2">AI Features</h3>
        <p className="text-sm text-surface-400">
          Enable optional AI-powered features to assist trust analysts.
        </p>
      </div>

      {!settings.enabled && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200 font-medium">AI Features Disabled</p>
            <p className="text-xs text-amber-300/80 mt-1">
              Enable AI to unlock auto-categorization and answer suggestions. 
              Requires AI provider configuration in system settings.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
            className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
          />
          <div>
            <p className="font-medium text-surface-100">Enable AI Features</p>
            <p className="text-sm text-surface-400">
              Turn on AI-powered assistance for the Trust module
            </p>
          </div>
        </label>

        {settings.enabled && (
          <>
            <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoCategorizationEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, autoCategorizationEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
              />
              <div>
                <p className="font-medium text-surface-100">Auto-Categorization</p>
                <p className="text-sm text-surface-400">
                  Automatically categorize incoming questions (Security, Privacy, Compliance, etc.)
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-surface-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={settings.answerSuggestionsEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, answerSuggestionsEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
              />
              <div>
                <p className="font-medium text-surface-100">AI Answer Suggestions</p>
                <p className="text-sm text-surface-400">
                  Generate draft answers using AI based on your knowledge base
                </p>
              </div>
            </label>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => onUpdate(settings)}
          isLoading={isUpdating}
          leftIcon={<CheckIcon className="w-4 h-4" />}
        >
          Save AI Settings
        </Button>
      </div>
    </div>
  );
}

