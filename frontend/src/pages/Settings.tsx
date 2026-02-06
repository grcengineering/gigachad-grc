import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationsConfigApi,
  customDashboardsApi,
  employeeComplianceApi,
  apiKeysApi,
  type ApiKey,
  type ApiKeyWithSecret,
} from '@/lib/api';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  Squares2X2Icon,
  PhotoIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import DemoDataSettings from '@/components/DemoDataSettings';
import { ModuleGuard } from '@/contexts/ModuleContext';
import DisabledModulePage from './DisabledModulePage';
import { ModuleSettings } from '@/components/settings/ModuleSettings';
import SystemHealthBanner from '@/components/SystemHealthBanner';
import ProductionReadiness from '@/components/ProductionReadiness';

interface SettingsProps {
  section:
    | 'organization'
    | 'communications'
    | 'api'
    | 'dashboard-templates'
    | 'employee-compliance'
    | 'ai'
    | 'modules';
}

const SECTION_TITLES: Record<string, { title: string; description: string }> = {
  organization: { title: 'Organization Settings', description: 'Manage your organization details' },
  communications: {
    title: 'Communications',
    description: 'Configure email and Slack notifications',
  },
  api: { title: 'API Keys', description: 'Manage API keys for programmatic access' },
  'dashboard-templates': {
    title: 'Dashboard Templates',
    description: 'Create and manage dashboard templates for your organization',
  },
  'employee-compliance': {
    title: 'Employee Compliance Settings',
    description:
      'Configure scoring weights, thresholds, and requirements for employee compliance tracking',
  },
  ai: {
    title: 'AI Configuration',
    description: 'Configure AI providers and features for intelligent automation',
  },
  modules: {
    title: 'Module Configuration',
    description: 'Enable or disable platform modules for this organization',
  },
};

export default function Settings({ section }: SettingsProps) {
  const { user, isLoading } = useAuth();

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Wait for auth to load before making redirect decision
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading...</div>
      </div>
    );
  }

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const { title, description } = SECTION_TITLES[section] || SECTION_TITLES.organization;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">{title}</h1>
        <p className="text-surface-400 mt-1">{description}</p>
      </div>

      {/* Content */}
      <div className="max-w-4xl">
        {section === 'organization' && <OrganizationSettings />}
        {section === 'communications' && <CommunicationsSettings />}
        {section === 'api' && <ApiSettings />}
        {section === 'dashboard-templates' && <DashboardTemplatesSettings />}
        {section === 'employee-compliance' && <EmployeeComplianceSettings />}
        {section === 'modules' && <ModuleSettings />}
        {section === 'ai' && (
          <ModuleGuard module="ai" fallback={<DisabledModulePage moduleId="ai" />}>
            <AISettings />
          </ModuleGuard>
        )}
      </div>
    </div>
  );
}

// Organization settings storage key
const ORG_SETTINGS_KEY = 'grc-org-settings';

interface OrgSettings {
  organizationName: string;
  description: string;
  primaryEmail: string;
  timezone: string;
  industry: string;
}

const DEFAULT_ORG_SETTINGS: OrgSettings = {
  organizationName: 'Default Organization',
  description: "Your organization's GRC platform",
  primaryEmail: '',
  timezone: 'UTC',
  industry: '',
};

/**
 * SECURITY: Sanitize URLs to prevent XSS via javascript:, data:, or vbscript: protocols
 * Only allows http, https, or relative paths for user-provided URLs
 */
function sanitizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '/logo.png';
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Allow data: URLs only for images (from file uploads)
  if (lower.startsWith('data:image/')) {
    return trimmed;
  }

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (lower.startsWith(protocol)) {
      return '/logo.png';
    }
  }

  // Block data: URLs that aren't images
  if (lower.startsWith('data:')) {
    return '/logo.png';
  }

  // Allow http, https, or relative paths
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/')) {
    return trimmed;
  }

  // If no protocol and no dangerous pattern, assume it's a relative path
  if (!lower.includes(':')) {
    return trimmed;
  }

  // Block unknown protocols
  return '/logo.png';
}

function OrganizationSettings() {
  const { branding, updateBranding } = useBranding();
  const [platformName, setPlatformName] = useState(branding.platformName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SECURITY: Compute sanitized URL to prevent XSS through img src
  const safeLogoUrl = useCallback(() => {
    return sanitizeImageUrl(logoPreview || logoUrl);
  }, [logoPreview, logoUrl]);

  // Organization settings state
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(() => {
    const stored = localStorage.getItem(ORG_SETTINGS_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_ORG_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_ORG_SETTINGS;
      }
    }
    return DEFAULT_ORG_SETTINGS;
  });

  // Update local state when branding changes
  useEffect(() => {
    setPlatformName(branding.platformName);
    setLogoUrl(branding.logoUrl);
  }, [branding]);

  // Handle organization settings save
  const handleSaveOrganization = async () => {
    setIsSavingOrg(true);
    try {
      localStorage.setItem(ORG_SETTINGS_KEY, JSON.stringify(orgSettings));
      toast.success('Organization settings saved');
    } catch {
      toast.error('Failed to save organization settings');
    } finally {
      setIsSavingOrg(false);
    }
  };

  // Update organization setting field
  const updateOrgSetting = (field: keyof OrgSettings, value: string) => {
    setOrgSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
      }
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setLogoPreview(dataUrl);
        setLogoUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await updateBranding({
        platformName,
        logoUrl,
      });
      toast.success('Branding settings saved');
      setLogoPreview(null);
    } catch {
      toast.error('Failed to save branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetLogo = () => {
    setLogoUrl('/logo.png');
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportOrganizationData = async () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Helper to fetch JSON from existing org-scoped APIs
      const fetchJson = async (url: string) => {
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        }
        return res.json();
      };

      const [risks, evidence, controls, vendors, audits, auditLogs] = await Promise.all([
        // Full risk data
        fetchJson('/api/risks/full?page=1&limit=1000'),
        // Evidence metadata (no file blobs)
        fetchJson('/api/evidence?limit=1000'),
        // Controls list
        fetchJson('/api/controls?limit=1000'),
        // Vendors & related TPRM data
        fetchJson('/api/vendors?page=1&limit=1000'),
        // Audit records
        fetchJson('/api/audits?page=1&limit=1000'),
        // Recent audit log entries (activity trail)
        fetchJson('/api/audit-logs?page=1&limit=1000'),
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        meta: {
          version: 1,
          description:
            'Organization-level export for offboarding. Includes risks, controls, evidence metadata, vendors, audits, and recent audit logs. Evidence files remain in object storage and can be exported separately.',
        },
        risks,
        controls,
        evidence,
        vendors,
        audits,
        auditLogs,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organization-export-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Organization export started. JSON file downloaded.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export organization data. Please try again or contact support.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Branding */}
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">Platform Branding</h2>
          <p className="text-surface-400 text-sm mt-1">
            Customize the look and name of your GRC platform
          </p>
        </div>

        <div className="space-y-4">
          {/* Platform Name */}
          <div>
            <label className="label">Platform Name</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="input mt-1"
              placeholder="GigaChad GRC"
            />
            <p className="text-surface-500 text-xs mt-1">
              This name appears in the sidebar, login page, and throughout the platform
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="label">Platform Logo</label>
            <div className="mt-2 flex items-start gap-4">
              {/* Current Logo Preview */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-lg border border-surface-700 bg-surface-800 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={safeLogoUrl()}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <PhotoIcon className="w-8 h-8 text-surface-500" />
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary text-sm"
                  >
                    <PhotoIcon className="w-4 h-4 mr-1" />
                    Upload Image
                  </button>
                  {logoUrl !== '/logo.png' && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="btn-ghost text-sm text-surface-400 hover:text-surface-200"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
                <p className="text-surface-500 text-xs">
                  Recommended: Square image, at least 128x128 pixels. PNG or SVG with transparent
                  background works best.
                </p>

                {/* URL Input (optional) */}
                <div className="pt-2">
                  <label className="text-surface-400 text-xs">Or enter image URL:</label>
                  <input
                    type="url"
                    value={logoUrl.startsWith('data:') ? '' : logoUrl}
                    onChange={(e) => {
                      // SECURITY: Sanitize URL to prevent XSS via javascript: or other dangerous protocols
                      const sanitizedUrl = sanitizeImageUrl(e.target.value || '/logo.png');
                      setLogoUrl(sanitizedUrl);
                      setLogoPreview(null);
                    }}
                    className="input mt-1 text-sm"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button className="btn-primary" onClick={handleSaveBranding} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* Organization Settings */}
      <div className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-100">Organization Details</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Organization Name</label>
            <input
              type="text"
              value={orgSettings.organizationName}
              onChange={(e) => updateOrgSetting('organizationName', e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={orgSettings.description}
              onChange={(e) => updateOrgSetting('description', e.target.value)}
              className="input mt-1"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Primary Contact Email</label>
              <input
                type="email"
                value={orgSettings.primaryEmail}
                onChange={(e) => updateOrgSetting('primaryEmail', e.target.value)}
                className="input mt-1"
                placeholder="admin@company.com"
              />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                value={orgSettings.timezone}
                onChange={(e) => updateOrgSetting('timezone', e.target.value)}
                className="input mt-1"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Industry</label>
            <select
              value={orgSettings.industry}
              onChange={(e) => updateOrgSetting('industry', e.target.value)}
              className="input mt-1"
            >
              <option value="">Select industry...</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance & Banking</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="government">Government</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button className="btn-primary" onClick={handleSaveOrganization} disabled={isSavingOrg}>
            {isSavingOrg ? 'Saving...' : 'Save Organization'}
          </button>
        </div>
      </div>

      {/* Multi-Workspace Mode */}
      <MultiWorkspaceSettings />

      {/* Data Portability & Offboarding */}
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">
              Data Portability & Offboarding
            </h2>
            <p className="text-surface-400 text-sm mt-1">
              Export a structured JSON snapshot of your organization&apos;s data to support vendor
              offboarding or migration to another system. Includes risks, controls, evidence
              metadata, vendors, audits, and recent activity logs.
            </p>
          </div>
          <ExclamationCircleIcon
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1"
            title="Export includes JSON metadata only; evidence files remain in your object storage."
            aria-label="Data export warning"
          />
        </div>

        <div className="bg-surface-800/60 rounded-lg p-4 space-y-2 text-sm text-surface-400">
          <p className="font-medium text-surface-200">What&apos;s included</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Risk register data (using the full export endpoint)</li>
            <li>Controls and implementations</li>
            <li>Evidence metadata (file paths and metadata, not binary files)</li>
            <li>Vendors and audit records</li>
            <li>Recent audit log entries for traceability</li>
          </ul>
          <p className="text-xs text-surface-500 pt-1">
            Evidence files themselves remain in your configured object storage (e.g., RustFS/S3).
            Those can be exported separately at the storage layer if you need a full archive.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button
            type="button"
            onClick={handleExportOrganizationData}
            className="btn-primary"
            disabled={isExporting}
          >
            {isExporting ? 'Preparing Export…' : 'Export Organization Data (JSON)'}
          </button>
        </div>
      </div>

      {/* Demo Data Settings */}
      <DemoDataSettings />

      {/* System Health & Production Readiness */}
      <div className="space-y-4 pt-4 border-t border-surface-800">
        <h2 className="text-lg font-semibold text-surface-100">System Health</h2>
        <SystemHealthBanner />
        <ProductionReadiness />
      </div>
    </div>
  );
}

// ============================================
// Multi-Workspace Settings Component
// ============================================

function MultiWorkspaceSettings() {
  const navigate = useNavigate();
  const {
    isMultiWorkspaceEnabled,
    workspaces,
    enableMultiWorkspace,
    disableMultiWorkspace,
    isLoading,
  } = useWorkspace();
  const [isToggling, setIsToggling] = useState(false);
  const [showDisableWarning, setShowDisableWarning] = useState(false);

  const handleToggle = async () => {
    if (isMultiWorkspaceEnabled) {
      // Show warning before disabling
      if (workspaces.length > 1) {
        toast.error('Cannot disable multi-workspace mode while more than one workspace exists');
        return;
      }
      setShowDisableWarning(true);
    } else {
      setIsToggling(true);
      try {
        await enableMultiWorkspace();
        toast.success('Multi-workspace mode enabled! A default workspace has been created.');
      } catch {
        toast.error('Failed to enable multi-workspace mode');
      } finally {
        setIsToggling(false);
      }
    }
  };

  const confirmDisable = async () => {
    setShowDisableWarning(false);
    setIsToggling(true);
    try {
      await disableMultiWorkspace();
      toast.success('Multi-workspace mode disabled');
    } catch {
      toast.error('Failed to disable multi-workspace mode');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <>
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="w-6 h-6 text-brand-400" />
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Multi-Workspace Mode</h2>
              <p className="text-sm text-surface-400">
                Enable separate workspaces for different products or teams
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={isToggling || isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isMultiWorkspaceEnabled ? 'bg-brand-600' : 'bg-surface-600'
            } ${isToggling || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isMultiWorkspaceEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {isMultiWorkspaceEnabled && (
          <div className="pt-4 border-t border-surface-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-surface-100 font-medium">
                  {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} active
                </p>
                <p className="text-sm text-surface-400">
                  Manage workspaces, members, and permissions
                </p>
              </div>
              <button
                onClick={() => navigate('/settings/workspaces')}
                className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
              >
                Manage Workspaces
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!isMultiWorkspaceEnabled && (
          <div className="bg-surface-800 rounded-lg p-4 text-sm text-surface-400">
            <p className="mb-2">Multi-workspace mode allows you to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Track compliance progress separately for each product</li>
              <li>Assign team members to specific workspaces</li>
              <li>View consolidated org-level dashboards</li>
              <li>Maintain a shared control library across all workspaces</li>
            </ul>
          </div>
        )}
      </div>

      {/* Disable Warning Modal */}
      {showDisableWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-surface-100 mb-4">
              Disable Multi-Workspace Mode?
            </h3>
            <p className="text-surface-400 mb-6">
              This will hide all workspace-related features. Your data will be preserved but
              workspace filtering will be disabled across the platform.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisableWarning(false)}
                className="px-4 py-2 text-sm text-surface-400 hover:text-surface-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisable}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Disable Multi-Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// Communications Settings Component
// ============================================

type EmailProvider = 'disabled' | 'smtp' | 'sendgrid' | 'ses';

function CommunicationsSettings() {
  const queryClient = useQueryClient();
  const [emailProvider, setEmailProvider] = useState<EmailProvider>('disabled');
  const [emailForm, setEmailForm] = useState({
    emailFromAddress: '',
    emailFromName: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
    sendgridApiKey: '',
    sesRegion: 'us-east-1',
    sesAccessKeyId: '',
    sesSecretAccessKey: '',
  });
  const [slackForm, setSlackForm] = useState({
    enabled: false,
    webhookUrl: '',
    botToken: '',
    defaultChannel: '',
    workspaceName: '',
  });
  const [testEmail, setTestEmail] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['notifications-config'],
    queryFn: () => notificationsConfigApi.get().then((res) => res.data),
  });

  const updateEmailMutation = useMutation({
    mutationFn: (data: any) => notificationsConfigApi.updateEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-config'] });
      toast.success('Email configuration saved');
    },
    onError: () => {
      toast.error('Failed to save email configuration');
    },
  });

  const updateSlackMutation = useMutation({
    mutationFn: (data: any) => notificationsConfigApi.updateSlack(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-config'] });
      toast.success('Slack configuration saved');
    },
    onError: () => {
      toast.error('Failed to save Slack configuration');
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: (email: string) => notificationsConfigApi.testEmail(email),
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    },
    onError: () => {
      toast.error('Failed to send test email');
    },
  });

  const testSlackMutation = useMutation({
    mutationFn: (channel?: string) => notificationsConfigApi.testSlack(channel),
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    },
    onError: () => {
      toast.error('Failed to send test message');
    },
  });

  const handleSaveEmail = () => {
    const data: any = {
      emailProvider,
      emailFromAddress: emailForm.emailFromAddress,
      emailFromName: emailForm.emailFromName,
    };

    if (emailProvider === 'smtp') {
      data.smtpConfig = {
        host: emailForm.smtpHost,
        port: emailForm.smtpPort,
        user: emailForm.smtpUser,
        password: emailForm.smtpPassword || undefined,
        secure: emailForm.smtpSecure,
      };
    } else if (emailProvider === 'sendgrid' && emailForm.sendgridApiKey) {
      data.sendgridApiKey = emailForm.sendgridApiKey;
    } else if (emailProvider === 'ses') {
      data.sesConfig = {
        region: emailForm.sesRegion,
        accessKeyId: emailForm.sesAccessKeyId || undefined,
        secretAccessKey: emailForm.sesSecretAccessKey || undefined,
      };
    }

    updateEmailMutation.mutate(data);
  };

  const handleSaveSlack = () => {
    updateSlackMutation.mutate({
      slackNotificationsEnabled: slackForm.enabled,
      slackWebhookUrl: slackForm.webhookUrl || undefined,
      slackBotToken: slackForm.botToken || undefined,
      slackDefaultChannel: slackForm.defaultChannel,
      slackWorkspaceName: slackForm.workspaceName,
    });
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-700 rounded w-1/3" />
          <div className="h-32 bg-surface-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Configuration */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <EnvelopeIcon className="w-5 h-5" />
              Email Configuration
            </h2>
            <p className="text-surface-400 text-sm mt-1">Configure how the platform sends emails</p>
          </div>
          {config?.emailProvider !== 'disabled' && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircleIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Configured</span>
            </div>
          )}
        </div>

        <div>
          <label className="label">Email Provider</label>
          <select
            className="input mt-1"
            value={emailProvider}
            onChange={(e) => setEmailProvider(e.target.value as EmailProvider)}
          >
            <option value="disabled">Disabled</option>
            <option value="smtp">SMTP Server</option>
            <option value="sendgrid">SendGrid</option>
            <option value="ses">AWS SES</option>
          </select>
        </div>

        {emailProvider !== 'disabled' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">From Address</label>
                <input
                  type="email"
                  className="input mt-1"
                  placeholder="noreply@company.com"
                  value={emailForm.emailFromAddress}
                  onChange={(e) =>
                    setEmailForm((f) => ({ ...f, emailFromAddress: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">From Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  placeholder="GigaChad GRC"
                  value={emailForm.emailFromName}
                  onChange={(e) => setEmailForm((f) => ({ ...f, emailFromName: e.target.value }))}
                />
              </div>
            </div>

            {emailProvider === 'smtp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-800/50 rounded-lg">
                <div>
                  <label className="label">SMTP Host</label>
                  <input
                    type="text"
                    className="input mt-1"
                    placeholder="smtp.company.com"
                    value={emailForm.smtpHost}
                    onChange={(e) => setEmailForm((f) => ({ ...f, smtpHost: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Port</label>
                  <input
                    type="number"
                    className="input mt-1"
                    value={emailForm.smtpPort}
                    onChange={(e) =>
                      setEmailForm((f) => ({ ...f, smtpPort: parseInt(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Username</label>
                  <input
                    type="text"
                    className="input mt-1"
                    value={emailForm.smtpUser}
                    onChange={(e) => setEmailForm((f) => ({ ...f, smtpUser: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input mt-1"
                    placeholder="••••••••"
                    value={emailForm.smtpPassword}
                    onChange={(e) => setEmailForm((f) => ({ ...f, smtpPassword: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {emailProvider === 'sendgrid' && (
              <div className="p-4 bg-surface-800/50 rounded-lg">
                <label className="label">SendGrid API Key</label>
                <input
                  type="password"
                  className="input mt-1"
                  placeholder="SG.xxxxxxxxxx"
                  value={emailForm.sendgridApiKey}
                  onChange={(e) => setEmailForm((f) => ({ ...f, sendgridApiKey: e.target.value }))}
                />
              </div>
            )}

            {emailProvider === 'ses' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-800/50 rounded-lg">
                <div>
                  <label className="label">AWS Region</label>
                  <select
                    className="input mt-1"
                    value={emailForm.sesRegion}
                    onChange={(e) => setEmailForm((f) => ({ ...f, sesRegion: e.target.value }))}
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">EU (Ireland)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Access Key ID</label>
                  <input
                    type="text"
                    className="input mt-1"
                    placeholder="AKIA..."
                    value={emailForm.sesAccessKeyId}
                    onChange={(e) =>
                      setEmailForm((f) => ({ ...f, sesAccessKeyId: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Secret Access Key</label>
                  <input
                    type="password"
                    className="input mt-1"
                    placeholder="••••••••"
                    value={emailForm.sesSecretAccessKey}
                    onChange={(e) =>
                      setEmailForm((f) => ({ ...f, sesSecretAccessKey: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-surface-700">
              <div className="flex-1">
                <input
                  type="email"
                  className="input"
                  placeholder="Enter email to send test"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <button
                className="btn-secondary"
                onClick={() => testEmailMutation.mutate(testEmail)}
                disabled={!testEmail || testEmailMutation.isPending}
              >
                {testEmailMutation.isPending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button
            className="btn-primary"
            onClick={handleSaveEmail}
            disabled={updateEmailMutation.isPending}
          >
            {updateEmailMutation.isPending ? 'Saving...' : 'Save Email Settings'}
          </button>
        </div>
      </div>

      {/* Slack Configuration */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Slack Notifications</h2>
            <p className="text-surface-400 text-sm mt-1">Send alerts and notifications to Slack</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={slackForm.enabled}
              onChange={(e) => setSlackForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-700 peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {slackForm.enabled && (
          <>
            <div className="space-y-4">
              <div>
                <label className="label">Webhook URL</label>
                <input
                  type="password"
                  className="input mt-1"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackForm.webhookUrl}
                  onChange={(e) => setSlackForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                />
                <p className="text-surface-500 text-xs mt-1">
                  Create a webhook in your Slack workspace settings
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Channel</label>
                  <input
                    type="text"
                    className="input mt-1"
                    placeholder="#grc-alerts"
                    value={slackForm.defaultChannel}
                    onChange={(e) =>
                      setSlackForm((f) => ({ ...f, defaultChannel: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Workspace Name</label>
                  <input
                    type="text"
                    className="input mt-1"
                    placeholder="Company Workspace"
                    value={slackForm.workspaceName}
                    onChange={(e) => setSlackForm((f) => ({ ...f, workspaceName: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-surface-700">
              <button
                className="btn-secondary"
                onClick={() => testSlackMutation.mutate(slackForm.defaultChannel)}
                disabled={testSlackMutation.isPending}
              >
                {testSlackMutation.isPending ? 'Sending...' : 'Send Test Message'}
              </button>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button
            className="btn-primary"
            onClick={handleSaveSlack}
            disabled={updateSlackMutation.isPending}
          >
            {updateSlackMutation.isPending ? 'Saving...' : 'Save Slack Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiSettings() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<ApiKeyWithSecret | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['all']);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState<string | null>(null);

  const { data: keysResponse, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.list().then((res) => res.data),
  });

  const { data: scopesResponse } = useQuery({
    queryKey: ['api-key-scopes'],
    queryFn: () => apiKeysApi.getScopes().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; scopes?: string[] }) =>
      apiKeysApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKey(response.data);
      setShowCreateModal(false);
      setShowNewKeyModal(true);
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyScopes(['all']);
      toast.success('API key created');
    },
    onError: () => toast.error('Failed to create API key'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setConfirmingRevoke(null);
      toast.success('API key revoked');
    },
    onError: () => toast.error('Failed to revoke API key'),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.regenerate(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKey(response.data);
      setConfirmingRegenerate(null);
      setShowNewKeyModal(true);
      toast.success('API key regenerated');
    },
    onError: () => toast.error('Failed to regenerate API key'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    createMutation.mutate({
      name: newKeyName.trim(),
      description: newKeyDescription.trim() || undefined,
      scopes: newKeyScopes,
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const keys = keysResponse?.keys || [];
  const availableScopes = scopesResponse?.scopes || [
    'all',
    'controls:read',
    'controls:write',
    'evidence:read',
    'evidence:write',
  ];

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">API Keys</h2>
          <p className="text-surface-400 text-sm mt-1">Manage API keys for programmatic access</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Generate New Key
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-surface-400">
          <p>No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key: ApiKey) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-surface-100 font-medium">{key.name}</p>
                  {!key.isActive && (
                    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                      Revoked
                    </span>
                  )}
                </div>
                <p className="text-surface-500 text-sm font-mono">grc_{key.keyPrefix}••••••••</p>
                <p className="text-surface-600 text-xs mt-1">
                  Created {formatDate(key.createdAt)} • Last used {formatDate(key.lastUsedAt)}
                </p>
                {key.scopes.length > 0 && (
                  <p className="text-surface-500 text-xs mt-1">Scopes: {key.scopes.join(', ')}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {key.isActive ? (
                  <>
                    {confirmingRegenerate === key.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-surface-400 text-sm">Regenerate?</span>
                        <button
                          className="btn-primary text-sm"
                          onClick={() => regenerateMutation.mutate(key.id)}
                          disabled={regenerateMutation.isPending}
                        >
                          Yes
                        </button>
                        <button
                          className="btn-secondary text-sm"
                          onClick={() => setConfirmingRegenerate(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : confirmingRevoke === key.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-surface-400 text-sm">Revoke?</span>
                        <button
                          className="btn-danger text-sm"
                          onClick={() => revokeMutation.mutate(key.id)}
                          disabled={revokeMutation.isPending}
                        >
                          Yes
                        </button>
                        <button
                          className="btn-secondary text-sm"
                          onClick={() => setConfirmingRevoke(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn-secondary text-sm"
                          onClick={() => setConfirmingRegenerate(key.id)}
                        >
                          Regenerate
                        </button>
                        <button
                          className="btn-danger text-sm"
                          onClick={() => setConfirmingRevoke(key.id)}
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-surface-500 text-sm">Inactive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">API Key Security</p>
            <p className="text-surface-400 text-sm mt-1">
              API keys grant access to your organization's data based on their scopes. Keep them
              secure and rotate them regularly.
            </p>
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Create API Key</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Production API Key"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Used for CI/CD pipeline"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Scopes</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableScopes.map((scope) => (
                    <label key={scope} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(scope)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyScopes([...newKeyScopes, scope]);
                          } else {
                            setNewKeyScopes(newKeyScopes.filter((s) => s !== scope));
                          }
                        }}
                        className="rounded border-surface-600 bg-surface-800 text-primary-500"
                      />
                      <span className="text-surface-300 text-sm">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createMutation.isPending || !newKeyName.trim()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Key Display Modal */}
      {showNewKeyModal && newKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-surface-100">API Key Created</h3>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
              <p className="text-amber-400 text-sm">
                Copy this key now. You won't be able to see it again!
              </p>
            </div>
            <div className="bg-surface-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <code className="text-green-400 text-sm break-all">{newKey.key}</code>
                <button
                  className="btn-secondary text-sm ml-2 flex-shrink-0"
                  onClick={() => copyToClipboard(newKey.key)}
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="btn-primary"
                onClick={() => {
                  setShowNewKeyModal(false);
                  setNewKey(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Dashboard Templates Settings Component
// ============================================

function DashboardTemplatesSettings() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['dashboard-templates'],
    queryFn: () => customDashboardsApi.getTemplates().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; isTemplate: boolean }) =>
      customDashboardsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-templates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Template created');
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
    },
    onError: () => toast.error('Failed to create template'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customDashboardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-templates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Template deleted');
    },
    onError: () => toast.error('Failed to delete template'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    createMutation.mutate({
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim() || undefined,
      isTemplate: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Dashboard Templates</h2>
            <p className="text-surface-400 text-sm mt-1">
              Templates are shared with all users in your organization
            </p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <PlusIcon className="w-4 h-4 mr-1" /> Create Template
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-surface-600 rounded-full border-t-brand-500" />
          </div>
        ) : templates?.length === 0 ? (
          <div className="text-center py-12 bg-surface-800/50 rounded-lg">
            <Squares2X2Icon className="w-12 h-12 mx-auto text-surface-500 mb-4" />
            <h3 className="text-surface-300 font-medium mb-2">No templates yet</h3>
            <p className="text-surface-500 text-sm mb-4">
              Create a template that all users can use as a starting point
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-ghost">
              <PlusIcon className="w-4 h-4 mr-1" /> Create First Template
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates?.map((template: any) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg hover:bg-surface-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-surface-700 rounded">
                    <Squares2X2Icon className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-surface-100 font-medium">{template.name}</p>
                    {template.description && (
                      <p className="text-surface-500 text-sm">{template.description}</p>
                    )}
                    <p className="text-surface-600 text-xs mt-1">
                      {template.widgets?.length || 0} widgets • Created by{' '}
                      {template.creator?.displayName || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboards`}
                    state={{ editTemplate: template.id }}
                    className="btn btn-ghost btn-sm"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" /> Edit
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Delete this template?')) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                    className="btn btn-ghost btn-sm text-red-400 hover:text-red-300"
                    disabled={deleteMutation.isPending}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-md font-semibold text-surface-100 mb-4">Template Tips</h3>
        <ul className="space-y-2 text-sm text-surface-400">
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span>Templates appear in the template gallery for all users</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span>Users create their own copy when they use a template</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span>Changes to templates don't affect existing user dashboards</span>
          </li>
        </ul>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">
              Create Dashboard Template
            </h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="input w-full"
                    placeholder="Executive Overview"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    className="input w-full h-20"
                    placeholder="A high-level overview for executives..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTemplateName.trim() || createMutation.isPending}
                  className="btn btn-primary"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Employee Compliance Settings Component
// ============================================

interface ComplianceConfig {
  scoreWeights: {
    backgroundCheck: number;
    training: number;
    attestation: number;
    accessReview: number;
  };
  thresholds: {
    compliant: number;
    atRisk: number;
  };
  requirements: {
    backgroundCheckRequired: boolean;
    backgroundCheckValidityDays: number;
    trainingCompletionRequired: boolean;
    trainingOverdueDays: number;
    attestationRequired: boolean;
    attestationValidityDays: number;
    mfaRequired: boolean;
  };
  integrationSources: {
    hris: string | null;
    backgroundCheck: string | null;
    lms: string | null;
    mdm: string | null;
    identityProvider: string | null;
  };
}

const DEFAULT_CONFIG: ComplianceConfig = {
  scoreWeights: {
    backgroundCheck: 25,
    training: 25,
    attestation: 25,
    accessReview: 25,
  },
  thresholds: {
    compliant: 80,
    atRisk: 60,
  },
  requirements: {
    backgroundCheckRequired: true,
    backgroundCheckValidityDays: 365,
    trainingCompletionRequired: true,
    trainingOverdueDays: 30,
    attestationRequired: true,
    attestationValidityDays: 365,
    mfaRequired: true,
  },
  integrationSources: {
    hris: null,
    backgroundCheck: null,
    lms: null,
    mdm: null,
    identityProvider: null,
  },
};

function EmployeeComplianceSettings() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ComplianceConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing config
  useEffect(() => {
    employeeComplianceApi
      .getConfig()
      .then((res) => {
        if (res.data) {
          setConfig((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {
        // Config might not exist yet, use defaults
      });
  }, []);

  const updateScoreWeight = (key: keyof ComplianceConfig['scoreWeights'], value: number) => {
    setConfig((prev) => ({
      ...prev,
      scoreWeights: { ...prev.scoreWeights, [key]: value },
    }));
    setHasChanges(true);
  };

  const updateThreshold = (key: keyof ComplianceConfig['thresholds'], value: number) => {
    setConfig((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, [key]: value },
    }));
    setHasChanges(true);
  };

  const updateRequirement = (
    key: keyof ComplianceConfig['requirements'],
    value: boolean | number
  ) => {
    setConfig((prev) => ({
      ...prev,
      requirements: { ...prev.requirements, [key]: value },
    }));
    setHasChanges(true);
  };

  const totalWeight = Object.values(config.scoreWeights).reduce((sum, w) => sum + w, 0);
  const isValidWeights = totalWeight === 100;

  const handleSave = async () => {
    if (!isValidWeights) {
      toast.error('Score weights must total 100%');
      return;
    }
    setIsSaving(true);
    try {
      await employeeComplianceApi.updateConfig({
        scoreWeights: {
          backgroundCheck: config.scoreWeights.backgroundCheck,
          training: config.scoreWeights.training,
          attestation: config.scoreWeights.attestation,
          deviceCompliance: 0, // Part of accessReview for now
          accessReview: config.scoreWeights.accessReview,
        },
        thresholds: config.thresholds,
        requirements: {
          backgroundCheckRequired: config.requirements.backgroundCheckRequired,
          backgroundCheckExpiration: config.requirements.backgroundCheckValidityDays,
          securityTrainingRequired: config.requirements.trainingCompletionRequired,
          securityTrainingFrequency: config.requirements.trainingOverdueDays,
          policyAttestationRequired: config.requirements.attestationRequired,
          accessReviewRequired: config.requirements.mfaRequired,
        },
      });
      toast.success('Employee compliance settings saved');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['employee-compliance-dashboard'] });
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Score Weights */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">Compliance Score Weights</h2>
          <p className="text-surface-400 text-sm mt-1">
            Configure how much each category contributes to the overall compliance score. Weights
            must total 100%.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center justify-between">
              <span>Background Check</span>
              <span className="text-surface-500">{config.scoreWeights.backgroundCheck}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={config.scoreWeights.backgroundCheck}
              onChange={(e) => updateScoreWeight('backgroundCheck', parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
          <div>
            <label className="label flex items-center justify-between">
              <span>Training Completion</span>
              <span className="text-surface-500">{config.scoreWeights.training}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={config.scoreWeights.training}
              onChange={(e) => updateScoreWeight('training', parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
          <div>
            <label className="label flex items-center justify-between">
              <span>Policy Attestation</span>
              <span className="text-surface-500">{config.scoreWeights.attestation}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={config.scoreWeights.attestation}
              onChange={(e) => updateScoreWeight('attestation', parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
          <div>
            <label className="label flex items-center justify-between">
              <span>Access Review / Device Compliance</span>
              <span className="text-surface-500">{config.scoreWeights.accessReview}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={config.scoreWeights.accessReview}
              onChange={(e) => updateScoreWeight('accessReview', parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
        </div>

        <div
          className={`p-3 rounded-lg ${isValidWeights ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
        >
          <p
            className={`text-sm font-medium ${isValidWeights ? 'text-green-400' : 'text-red-400'}`}
          >
            Total Weight: {totalWeight}% {isValidWeights ? '✓' : '(must equal 100%)'}
          </p>
        </div>
      </div>

      {/* Compliance Thresholds */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">Compliance Thresholds</h2>
          <p className="text-surface-400 text-sm mt-1">
            Define score thresholds for compliance status categories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Compliant Threshold (≥)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={config.thresholds.compliant}
                onChange={(e) => updateThreshold('compliant', parseInt(e.target.value) || 0)}
                className="input w-24"
              />
              <span className="text-surface-400">% score</span>
            </div>
            <p className="text-surface-500 text-xs mt-1">
              Employees scoring at or above this are considered compliant
            </p>
          </div>
          <div>
            <label className="label">At Risk Threshold (≥)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={config.thresholds.atRisk}
                onChange={(e) => updateThreshold('atRisk', parseInt(e.target.value) || 0)}
                className="input w-24"
              />
              <span className="text-surface-400">% score</span>
            </div>
            <p className="text-surface-500 text-xs mt-1">
              Employees scoring between this and compliant are "at risk"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-surface-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>Compliant: ≥{config.thresholds.compliant}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span>
              At Risk: {config.thresholds.atRisk}-{config.thresholds.compliant - 1}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span>Non-Compliant: &lt;{config.thresholds.atRisk}%</span>
          </div>
        </div>
      </div>

      {/* Compliance Requirements */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">Compliance Requirements</h2>
          <p className="text-surface-400 text-sm mt-1">
            Configure what is required for employee compliance.
          </p>
        </div>

        <div className="space-y-4">
          {/* Background Check */}
          <div className="p-4 bg-surface-800/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-surface-200 font-medium">Background Check</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.requirements.backgroundCheckRequired}
                  onChange={(e) => updateRequirement('backgroundCheckRequired', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
            {config.requirements.backgroundCheckRequired && (
              <div className="flex items-center gap-2">
                <label className="text-surface-400 text-sm">Valid for</label>
                <input
                  type="number"
                  min="30"
                  max="1095"
                  value={config.requirements.backgroundCheckValidityDays}
                  onChange={(e) =>
                    updateRequirement(
                      'backgroundCheckValidityDays',
                      parseInt(e.target.value) || 365
                    )
                  }
                  className="input w-20 text-sm"
                />
                <span className="text-surface-400 text-sm">days</span>
              </div>
            )}
          </div>

          {/* Training */}
          <div className="p-4 bg-surface-800/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-surface-200 font-medium">Training Completion</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.requirements.trainingCompletionRequired}
                  onChange={(e) =>
                    updateRequirement('trainingCompletionRequired', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
            {config.requirements.trainingCompletionRequired && (
              <div className="flex items-center gap-2">
                <label className="text-surface-400 text-sm">Mark overdue after</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.requirements.trainingOverdueDays}
                  onChange={(e) =>
                    updateRequirement('trainingOverdueDays', parseInt(e.target.value) || 30)
                  }
                  className="input w-20 text-sm"
                />
                <span className="text-surface-400 text-sm">days past due date</span>
              </div>
            )}
          </div>

          {/* Attestation */}
          <div className="p-4 bg-surface-800/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-surface-200 font-medium">Policy Attestation</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.requirements.attestationRequired}
                  onChange={(e) => updateRequirement('attestationRequired', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
            {config.requirements.attestationRequired && (
              <div className="flex items-center gap-2">
                <label className="text-surface-400 text-sm">Attestations valid for</label>
                <input
                  type="number"
                  min="30"
                  max="1095"
                  value={config.requirements.attestationValidityDays}
                  onChange={(e) =>
                    updateRequirement('attestationValidityDays', parseInt(e.target.value) || 365)
                  }
                  className="input w-20 text-sm"
                />
                <span className="text-surface-400 text-sm">days</span>
              </div>
            )}
          </div>

          {/* MFA */}
          <div className="p-4 bg-surface-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-surface-200 font-medium">MFA Required</label>
                <p className="text-surface-500 text-xs mt-1">
                  Require multi-factor authentication for all employees
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.requirements.mfaRequired}
                  onChange={(e) => updateRequirement('mfaRequired', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources Info */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">Data Sources</h2>
          <p className="text-surface-400 text-sm mt-1">
            Employee compliance data is gathered from configured integrations. Click a category to
            view or configure integrations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            to="/integrations?search=HR%20Tools"
            className="p-3 bg-surface-800/50 rounded-lg hover:bg-surface-700/50 hover:border-brand-500/50 border border-transparent transition-all cursor-pointer group"
          >
            <p className="text-surface-400 text-xs uppercase tracking-wider mb-1 group-hover:text-brand-400">
              HRIS / Employee List
            </p>
            <p className="text-surface-200 text-sm">BambooHR, Workday, ADP, etc.</p>
            <p className="text-surface-500 text-xs mt-2 group-hover:text-brand-400">
              Click to configure →
            </p>
          </Link>
          <Link
            to="/integrations?search=Background%20Check"
            className="p-3 bg-surface-800/50 rounded-lg hover:bg-surface-700/50 hover:border-brand-500/50 border border-transparent transition-all cursor-pointer group"
          >
            <p className="text-surface-400 text-xs uppercase tracking-wider mb-1 group-hover:text-brand-400">
              Background Check
            </p>
            <p className="text-surface-200 text-sm">Certn, Checkr, Sterling, etc.</p>
            <p className="text-surface-500 text-xs mt-2 group-hover:text-brand-400">
              Click to configure →
            </p>
          </Link>
          <Link
            to="/integrations?search=Security%20Awareness"
            className="p-3 bg-surface-800/50 rounded-lg hover:bg-surface-700/50 hover:border-brand-500/50 border border-transparent transition-all cursor-pointer group"
          >
            <p className="text-surface-400 text-xs uppercase tracking-wider mb-1 group-hover:text-brand-400">
              Training / LMS
            </p>
            <p className="text-surface-200 text-sm">KnowBe4, Proofpoint, Curricula, etc.</p>
            <p className="text-surface-500 text-xs mt-2 group-hover:text-brand-400">
              Click to configure →
            </p>
          </Link>
          <Link
            to="/integrations?search=MDM"
            className="p-3 bg-surface-800/50 rounded-lg hover:bg-surface-700/50 hover:border-brand-500/50 border border-transparent transition-all cursor-pointer group"
          >
            <p className="text-surface-400 text-xs uppercase tracking-wider mb-1 group-hover:text-brand-400">
              MDM / Device
            </p>
            <p className="text-surface-200 text-sm">Jamf, Kandji, Intune, etc.</p>
            <p className="text-surface-500 text-xs mt-2 group-hover:text-brand-400">
              Click to configure →
            </p>
          </Link>
          <Link
            to="/integrations?search=Identity%20Provider"
            className="p-3 bg-surface-800/50 rounded-lg hover:bg-surface-700/50 hover:border-brand-500/50 border border-transparent transition-all cursor-pointer group"
          >
            <p className="text-surface-400 text-xs uppercase tracking-wider mb-1 group-hover:text-brand-400">
              Identity Provider
            </p>
            <p className="text-surface-200 text-sm">Okta, Azure AD, Google Workspace</p>
            <p className="text-surface-500 text-xs mt-2 group-hover:text-brand-400">
              Click to configure →
            </p>
          </Link>
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handleReset} className="btn btn-ghost" disabled={!hasChanges}>
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={!hasChanges || !isValidWeights || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// AI Configuration Settings Component
// ============================================

function AISettings() {
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic' | 'disabled'>('disabled');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [features, setFeatures] = useState({
    riskScoring: true,
    categorization: true,
    smartSearch: true,
    policyDrafting: false,
    controlSuggestions: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // API call to save AI configuration would go here
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('AI configuration saved');
    setIsSaving(false);
  };

  const openaiModels = [
    { id: 'gpt-5', name: 'GPT-5 (Most Capable)' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini (Balanced)' },
    { id: 'o3', name: 'o3 (Advanced Reasoning)' },
    { id: 'o3-mini', name: 'o3-mini (Fast Reasoning)' },
    { id: 'gpt-4o', name: 'GPT-4o (Previous Gen)' },
  ];
  const anthropicModels = [
    { id: 'claude-opus-4-5-20250514', name: 'Claude Opus 4.5 (Most Capable)' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Balanced)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
  ];

  return (
    <div className="space-y-6">
      {/* AI Provider Selection */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">AI Provider</h2>
          <p className="text-surface-400 text-sm mt-1">
            Select an AI provider for intelligent automation features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setAiProvider('disabled')}
            className={`p-4 rounded-lg border-2 transition-all ${
              aiProvider === 'disabled'
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-surface-700 hover:border-surface-600'
            }`}
          >
            <p className="text-surface-100 font-medium">Disabled</p>
            <p className="text-surface-500 text-sm mt-1">No AI features</p>
          </button>
          <button
            onClick={() => {
              setAiProvider('openai');
              setModel('gpt-5');
            }} // Latest GPT-5
            className={`p-4 rounded-lg border-2 transition-all ${
              aiProvider === 'openai'
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-surface-700 hover:border-surface-600'
            }`}
          >
            <p className="text-surface-100 font-medium">OpenAI</p>
            <p className="text-surface-500 text-sm mt-1">GPT-4, GPT-3.5</p>
          </button>
          <button
            onClick={() => {
              setAiProvider('anthropic');
              setModel('claude-opus-4-5-20250514');
            }} // Latest Claude Opus 4.5
            className={`p-4 rounded-lg border-2 transition-all ${
              aiProvider === 'anthropic'
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-surface-700 hover:border-surface-600'
            }`}
          >
            <p className="text-surface-100 font-medium">Anthropic</p>
            <p className="text-surface-500 text-sm mt-1">Claude 3</p>
          </button>
        </div>

        {aiProvider !== 'disabled' && (
          <div className="space-y-4 pt-4 border-t border-surface-700">
            <div>
              <label className="label">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input mt-1"
                placeholder={aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              />
              <p className="text-surface-500 text-xs mt-1">
                Your API key is encrypted and stored securely.
              </p>
            </div>
            <div>
              <label className="label">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="input mt-1"
              >
                {(aiProvider === 'openai' ? openaiModels : anthropicModels).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* AI Features */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">AI Features</h2>
          <p className="text-surface-400 text-sm mt-1">
            Enable or disable specific AI-powered features.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              key: 'riskScoring',
              name: 'Risk Scoring',
              desc: 'AI-suggested risk likelihood and impact scores',
            },
            {
              key: 'categorization',
              name: 'Auto-Categorization',
              desc: 'Automatically categorize and tag items',
            },
            {
              key: 'smartSearch',
              name: 'Smart Search',
              desc: 'Natural language search across all modules',
            },
            {
              key: 'policyDrafting',
              name: 'Policy Drafting',
              desc: 'Generate policy drafts based on requirements',
            },
            {
              key: 'controlSuggestions',
              name: 'Control Suggestions',
              desc: 'Recommend controls for risks and requirements',
            },
          ].map((feature) => (
            <div
              key={feature.key}
              className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg"
            >
              <div>
                <p className="text-surface-200 font-medium">{feature.name}</p>
                <p className="text-surface-500 text-sm">{feature.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={features[feature.key as keyof typeof features]}
                  onChange={(e) => setFeatures((f) => ({ ...f, [feature.key]: e.target.checked }))}
                  disabled={aiProvider === 'disabled'}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500 peer-disabled:opacity-50"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* MCP Integration Link */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">MCP Server Integration</h2>
            <p className="text-surface-400 text-sm mt-1">
              Configure Model Context Protocol (MCP) servers for advanced AI workflows.
            </p>
          </div>
          <Link to="/settings/mcp" className="btn btn-secondary">
            Configure MCP →
          </Link>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save AI Configuration'}
        </button>
      </div>
    </div>
  );
}
