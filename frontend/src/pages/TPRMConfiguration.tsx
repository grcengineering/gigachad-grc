import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tprmConfigApi, TprmConfiguration, TprmConfigReferenceData, VendorCategoryConfig, TprmFeatureSettings } from '../lib/api';
import {
  ClockIcon,
  TagIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type ConfigTab = 'tiers' | 'categories' | 'assessments' | 'contracts' | 'features';

export default function TPRMConfiguration() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('tiers');
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: config, isLoading, error } = useQuery<TprmConfiguration>({
    queryKey: ['tprm-config'],
    queryFn: async () => {
      const response = await tprmConfigApi.get();
      return response.data;
    },
  });

  // Fetch reference data
  const { data: referenceData } = useQuery<TprmConfigReferenceData>({
    queryKey: ['tprm-config-reference'],
    queryFn: async () => {
      const response = await tprmConfigApi.getReference();
      return response.data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TprmConfiguration>) => {
      const response = await tprmConfigApi.update(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tprm-config'] });
      toast.success('Configuration saved');
    },
    onError: () => {
      toast.error('Failed to save configuration');
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await tprmConfigApi.reset();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tprm-config'] });
      toast.success('Configuration reset to defaults');
    },
    onError: () => {
      toast.error('Failed to reset configuration');
    },
  });

  const tabs = [
    { key: 'tiers' as ConfigTab, label: 'Tier Review Schedule', icon: ClockIcon },
    { key: 'categories' as ConfigTab, label: 'Vendor Categories', icon: TagIcon },
    { key: 'assessments' as ConfigTab, label: 'Assessment Settings', icon: DocumentTextIcon },
    { key: 'contracts' as ConfigTab, label: 'Contract Settings', icon: ShieldCheckIcon },
    { key: 'features' as ConfigTab, label: 'Feature Settings', icon: AdjustmentsHorizontalIcon },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <Cog6ToothIcon className="w-8 h-8 text-brand-400" />
            Third-Party Risk Management Configuration
          </h1>
          <p className="text-surface-400 mt-1">
            Configure vendor tiers, review schedules, categories, and assessment settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updateMutation.isPending && (
            <span className="text-brand-400 text-sm flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Saving...
            </span>
          )}
          <button
            onClick={() => {
              if (confirm('Reset all TPRM settings to defaults?')) {
                resetMutation.mutate();
              }
            }}
            disabled={resetMutation.isPending}
            className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-700 pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-400 hover:text-surface-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        {activeTab === 'tiers' && config && referenceData && (
          <TierFrequencyTab
            config={config}
            referenceData={referenceData}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'categories' && config && (
          <VendorCategoriesTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'assessments' && config && (
          <AssessmentSettingsTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'contracts' && config && (
          <ContractSettingsTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'features' && config && (
          <FeatureSettingsTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Tier Frequency Configuration Tab
// ============================================

/**
 * Parse a frequency string and return months
 */
function parseFrequencyToMonths(frequency: string): number {
  const predefined: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semi_annual: 6,
    annual: 12,
    biennial: 24,
  };
  
  if (predefined[frequency]) return predefined[frequency];
  
  if (frequency.startsWith('custom_')) {
    const months = parseInt(frequency.replace('custom_', ''), 10);
    if (!isNaN(months) && months > 0) return months;
  }
  
  return 12;
}

/**
 * Format a frequency for display
 */
function formatFrequencyLabel(frequency: string): string {
  const predefined: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual',
    annual: 'Annual',
    biennial: 'Bi-Annual',
  };
  
  if (predefined[frequency]) return predefined[frequency];
  
  if (frequency.startsWith('custom_')) {
    const months = parseInt(frequency.replace('custom_', ''), 10);
    if (!isNaN(months) && months > 0) {
      if (months === 1) return '1 Month';
      if (months < 12) return `${months} Months`;
      if (months === 12) return '1 Year';
      if (months % 12 === 0) return `${months / 12} Years`;
      return `${months} Months`;
    }
  }
  
  return frequency;
}

/**
 * Check if a frequency value is custom
 */
function isCustomFrequency(frequency: string): boolean {
  return frequency.startsWith('custom_');
}

function TierFrequencyTab({
  config,
  referenceData,
  onUpdate,
}: {
  config: TprmConfiguration;
  referenceData: TprmConfigReferenceData;
  onUpdate: (data: Partial<TprmConfiguration>) => void;
}) {
  const [tierMapping, setTierMapping] = useState(config.tierFrequencyMapping);
  const [customMonths, setCustomMonths] = useState<Record<string, number>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTierMapping(config.tierFrequencyMapping);
    // Initialize custom months from existing custom values
    const initCustom: Record<string, number> = {};
    const initShowCustom: Record<string, boolean> = {};
    Object.entries(config.tierFrequencyMapping).forEach(([tier, freq]) => {
      if (isCustomFrequency(freq)) {
        initCustom[tier] = parseFrequencyToMonths(freq);
        initShowCustom[tier] = true;
      }
    });
    setCustomMonths(initCustom);
    setShowCustomInput(initShowCustom);
  }, [config.tierFrequencyMapping]);

  const handleFrequencyChange = (tier: string, frequency: string) => {
    if (frequency === 'custom') {
      // Show custom input
      setShowCustomInput(prev => ({ ...prev, [tier]: true }));
      // Set default custom value of 6 months
      const defaultMonths = customMonths[tier] || 6;
      setCustomMonths(prev => ({ ...prev, [tier]: defaultMonths }));
      const customValue = `custom_${defaultMonths}`;
      const updated = { ...tierMapping, [tier]: customValue };
      setTierMapping(updated);
      onUpdate({ tierFrequencyMapping: updated });
    } else {
      setShowCustomInput(prev => ({ ...prev, [tier]: false }));
      const updated = { ...tierMapping, [tier]: frequency };
      setTierMapping(updated);
      onUpdate({ tierFrequencyMapping: updated });
    }
  };

  const handleCustomMonthsChange = (tier: string, months: number) => {
    if (months < 1) months = 1;
    if (months > 60) months = 60; // Max 5 years
    setCustomMonths(prev => ({ ...prev, [tier]: months }));
    const customValue = `custom_${months}`;
    const updated = { ...tierMapping, [tier]: customValue };
    setTierMapping(updated);
    onUpdate({ tierFrequencyMapping: updated });
  };

  const tiers = [
    { key: 'tier_1', label: 'Tier 1 (Critical)', description: 'Critical vendors with highest risk exposure', color: 'red' },
    { key: 'tier_2', label: 'Tier 2 (Important)', description: 'Important vendors requiring regular oversight', color: 'orange' },
    { key: 'tier_3', label: 'Tier 3 (Standard)', description: 'Standard vendors with moderate risk', color: 'yellow' },
    { key: 'tier_4', label: 'Tier 4 (Low Risk)', description: 'Low-risk vendors with minimal exposure', color: 'green' },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-500/20 border-red-500/30 text-red-400';
      case 'orange': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'yellow': return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
      case 'green': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
      default: return 'bg-surface-700 border-surface-600 text-surface-300';
    }
  };

  // Get current dropdown value - map custom_X to 'custom' for the select
  const getSelectValue = (tier: string): string => {
    const freq = tierMapping[tier as keyof typeof tierMapping];
    if (isCustomFrequency(freq)) return 'custom';
    return freq;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">Tier-Based Review Schedule</h3>
        <p className="text-surface-400 text-sm">
          Configure how often vendors in each tier should be reviewed. Choose from predefined intervals 
          or set a custom schedule in months. When a vendor's tier changes, their review schedule will 
          automatically update based on these settings.
        </p>
      </div>

      <div className="space-y-4">
        {tiers.map(tier => (
          <div
            key={tier.key}
            className={`p-4 rounded-lg border ${getColorClasses(tier.color)}`}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium">{tier.label}</p>
                <p className="text-sm opacity-75">{tier.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-surface-400">Review every:</label>
                <select
                  value={getSelectValue(tier.key)}
                  onChange={e => handleFrequencyChange(tier.key, e.target.value)}
                  className="px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white min-w-[180px]"
                >
                  {referenceData.frequencyOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value === 'custom' ? 'Custom...' : `${opt.label} (${opt.months} month${opt.months > 1 ? 's' : ''})`}
                    </option>
                  ))}
                  {/* Fallback if API doesn't return custom option */}
                  {!referenceData.frequencyOptions.find(o => o.value === 'custom') && (
                    <option value="custom">Custom...</option>
                  )}
                </select>
                
                {showCustomInput[tier.key] && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={customMonths[tier.key] || 6}
                      onChange={e => handleCustomMonthsChange(tier.key, parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-center"
                    />
                    <span className="text-sm text-surface-300">months</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="p-4 bg-surface-700/50 rounded-lg">
        <h4 className="text-white font-medium mb-3">Review Schedule Summary</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {tiers.map(tier => {
            const freq = tierMapping[tier.key as keyof typeof tierMapping];
            const months = parseFrequencyToMonths(freq);
            return (
              <div key={tier.key} className="text-center p-3 bg-surface-800 rounded-lg">
                <p className="text-surface-400 text-xs mb-1">{tier.label}</p>
                <p className="text-white font-medium">{formatFrequencyLabel(freq)}</p>
                <p className="text-surface-500 text-xs mt-1">({months} month{months !== 1 ? 's' : ''})</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Vendor Categories Tab
// ============================================

function VendorCategoriesTab({
  config,
  onUpdate,
}: {
  config: TprmConfiguration;
  onUpdate: (data: Partial<TprmConfiguration>) => void;
}) {
  const [categories, setCategories] = useState<VendorCategoryConfig[]>(config.vendorCategories);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' });

  useEffect(() => {
    setCategories(config.vendorCategories);
  }, [config.vendorCategories]);

  const handleAddCategory = () => {
    if (newCategory.name) {
      const updated = [...categories, { ...newCategory, id: `cat-${Date.now()}` }];
      setCategories(updated);
      onUpdate({ vendorCategories: updated });
      setNewCategory({ name: '', description: '', color: '#6366f1' });
    }
  };

  const handleRemoveCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    onUpdate({ vendorCategories: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">Vendor Categories</h3>
        <p className="text-surface-400 text-sm">
          Define categories to classify your vendors. Categories help organize and filter vendors.
        </p>
      </div>

      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-4 p-4 bg-surface-700/50 rounded-lg">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: cat.color }}
            />
            <div className="flex-1">
              <p className="text-white font-medium">{cat.name}</p>
              <p className="text-surface-400 text-sm">{cat.description}</p>
            </div>
            <button
              onClick={() => handleRemoveCategory(cat.id)}
              className="text-surface-400 hover:text-red-400 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-surface-700">
        <h4 className="text-white font-medium mb-3">Add Category</h4>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Category name"
            value={newCategory.name}
            onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
            className="flex-1 px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder:text-surface-500"
          />
          <input
            type="text"
            placeholder="Description"
            value={newCategory.description}
            onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
            className="flex-1 px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder:text-surface-500"
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

// ============================================
// Assessment Settings Tab
// ============================================

function AssessmentSettingsTab({
  config,
  onUpdate,
}: {
  config: TprmConfiguration;
  onUpdate: (data: Partial<TprmConfiguration>) => void;
}) {
  const [settings, setSettings] = useState(config.assessmentSettings);

  useEffect(() => {
    setSettings(config.assessmentSettings);
  }, [config.assessmentSettings]);

  const handleChange = (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onUpdate({ assessmentSettings: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">Assessment Settings</h3>
        <p className="text-surface-400 text-sm">
          Configure vendor assessment workflow and automation settings.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center justify-between p-4 bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-white">Require Document Upload</p>
            <p className="text-surface-400 text-sm">Require vendors to upload documents for assessments</p>
          </div>
          <input
            type="checkbox"
            checked={settings.requireDocumentUpload ?? false}
            onChange={e => handleChange('requireDocumentUpload', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-white">Auto-Create Assessment on New Vendor</p>
            <p className="text-surface-400 text-sm">Automatically create an initial assessment when adding a new vendor</p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoCreateAssessmentOnNewVendor ?? false}
            onChange={e => handleChange('autoCreateAssessmentOnNewVendor', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-white">Enable AI Analysis</p>
            <p className="text-surface-400 text-sm">Allow AI-assisted analysis of SOC 2 reports and other vendor documents</p>
          </div>
          <input
            type="checkbox"
            checked={settings.enableAIAnalysis ?? true}
            onChange={e => handleChange('enableAIAnalysis', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-white">Notify on Overdue Review</p>
            <p className="text-surface-400 text-sm">Send notifications when vendor reviews become overdue</p>
          </div>
          <input
            type="checkbox"
            checked={settings.notifyOnOverdueReview ?? true}
            onChange={e => handleChange('notifyOnOverdueReview', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <div className="p-4 bg-surface-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white">Overdue Reminder Days</p>
              <p className="text-surface-400 text-sm">Days before a review is due to send reminders</p>
            </div>
          </div>
          <input
            type="number"
            value={settings.overdueReminderDays ?? 7}
            onChange={e => handleChange('overdueReminderDays', parseInt(e.target.value))}
            min="1"
            max="90"
            className="w-24 px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
          />
        </div>

        <div className="p-4 bg-surface-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white">Default Assessment Type</p>
              <p className="text-surface-400 text-sm">Default assessment type for new assessments</p>
            </div>
          </div>
          <select
            value={settings.defaultAssessmentType ?? 'standard'}
            onChange={e => handleChange('defaultAssessmentType', e.target.value)}
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
          >
            <option value="standard">Standard Assessment</option>
            <option value="questionnaire">Questionnaire-Based</option>
            <option value="soc2_review">SOC 2 Review</option>
            <option value="security_review">Security Review</option>
            <option value="privacy_review">Privacy Review</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Contract Settings Tab
// ============================================

function ContractSettingsTab({
  config,
  onUpdate,
}: {
  config: TprmConfiguration;
  onUpdate: (data: Partial<TprmConfiguration>) => void;
}) {
  const [settings, setSettings] = useState(config.contractSettings);
  const [warningDays, setWarningDays] = useState(
    (config.contractSettings.expirationWarningDays || [90, 60, 30, 14, 7]).join(', ')
  );

  useEffect(() => {
    setSettings(config.contractSettings);
    setWarningDays((config.contractSettings.expirationWarningDays || [90, 60, 30, 14, 7]).join(', '));
  }, [config.contractSettings]);

  const handleChange = (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onUpdate({ contractSettings: updated });
  };

  const handleWarningDaysChange = (value: string) => {
    setWarningDays(value);
    const days = value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0);
    if (days.length > 0) {
      handleChange('expirationWarningDays', days.sort((a, b) => b - a));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">Contract Settings</h3>
        <p className="text-surface-400 text-sm">
          Configure contract management and expiration notification settings.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-surface-700/50 rounded-lg">
          <div className="mb-2">
            <p className="text-white">Expiration Warning Days</p>
            <p className="text-surface-400 text-sm">
              Days before contract expiration to send warnings (comma-separated)
            </p>
          </div>
          <input
            type="text"
            value={warningDays}
            onChange={e => handleWarningDaysChange(e.target.value)}
            placeholder="90, 60, 30, 14, 7"
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder:text-surface-500"
          />
          <p className="text-surface-500 text-xs mt-2">
            Current: {(settings.expirationWarningDays || []).join(', ')} days before expiration
          </p>
        </div>

        <label className="flex items-center justify-between p-4 bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-white">Require Security Addendum</p>
            <p className="text-surface-400 text-sm">
              Flag contracts that don't have a security addendum attached
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.requireSecurityAddendum ?? false}
            onChange={e => handleChange('requireSecurityAddendum', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-white">Auto-Renewal Notification</p>
            <p className="text-surface-400 text-sm">
              Send notification when contracts with auto-renewal clauses are about to renew
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoRenewNotification ?? true}
            onChange={e => handleChange('autoRenewNotification', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>
      </div>
    </div>
  );
}

// ============================================
// Feature Settings Tab
// ============================================

function FeatureSettingsTab({
  config,
  onUpdate,
}: {
  config: TprmConfiguration;
  onUpdate: (data: Partial<TprmConfiguration>) => void;
}) {
  const [settings, setSettings] = useState<TprmFeatureSettings>(config.featureSettings || {});

  useEffect(() => {
    setSettings(config.featureSettings || {});
  }, [config.featureSettings]);

  const handleChange = (key: keyof TprmFeatureSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onUpdate({ featureSettings: updated });
  };

  const features = [
    {
      key: 'enableSecurityScanning' as const,
      label: 'Security Scanning',
      description: 'Enable automated security scanning of vendor websites to assess SSL, headers, DNS security, and compliance indicators.',
      warning: 'Disabling this will hide the security scan panel from vendor detail pages. Existing scan data will be preserved.',
    },
    {
      key: 'enableRiskAssessmentWizard' as const,
      label: 'Risk Assessment Wizard',
      description: 'Enable the guided risk assessment wizard for evaluating vendor risk factors.',
      warning: 'Disabling this will hide the risk assessment wizard. Existing assessments will be preserved.',
    },
    {
      key: 'enableSubdomainSpider' as const,
      label: 'Subdomain Spider',
      description: 'Enable subdomain discovery and page crawling within security scans.',
      warning: 'Disabling this will hide subdomain data from scan results. Existing subdomain data will be preserved.',
    },
    {
      key: 'enableVendorPortal' as const,
      label: 'Vendor Portal',
      description: 'Enable the external vendor portal for vendors to submit questionnaires and documents.',
      warning: 'Disabling this will prevent vendors from accessing their portal. Portal data will be preserved.',
    },
    {
      key: 'enableContractManagement' as const,
      label: 'Contract Management',
      description: 'Enable contract tracking, expiration alerts, and document management for vendor contracts.',
      warning: 'Disabling this will hide contract features. Existing contracts will be preserved.',
    },
    {
      key: 'enableQuestionnaireAutomation' as const,
      label: 'Questionnaire Automation',
      description: 'Enable automated questionnaire workflows and reminders for vendor assessments.',
      warning: 'Disabling this will stop automated questionnaire workflows. Questionnaire data will be preserved.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">Feature Settings</h3>
        <p className="text-surface-400 text-sm">
          Enable or disable TPRM features for your organization. Disabling a feature hides it from the UI 
          but <span className="text-brand-400 font-medium">preserves all existing data</span>. If you re-enable a feature, 
          all previous data will still be available.
        </p>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-blue-400 text-sm">
          <strong>Note:</strong> Feature toggles only affect UI visibility. No data is deleted when a feature is disabled. 
          This allows administrators to temporarily hide features without losing historical data.
        </p>
      </div>

      <div className="space-y-4">
        {features.map(feature => (
          <div key={feature.key} className="p-4 bg-surface-700/50 rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-white font-medium">{feature.label}</p>
                  {settings[feature.key] === false && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-surface-400 text-sm mb-2">{feature.description}</p>
                {settings[feature.key] === false && (
                  <p className="text-surface-500 text-xs italic">{feature.warning}</p>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[feature.key] ?? true}
                  onChange={e => handleChange(feature.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}