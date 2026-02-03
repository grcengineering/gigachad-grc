import { useState, useEffect } from 'react';
import { trustCenterApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { TrustCenterConfig } from '../lib/apiTypes';
import toast from 'react-hot-toast';
import {
  GlobeAltIcon,
  PaintBrushIcon,
  CodeBracketIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type TabType = 'general' | 'branding' | 'domain' | 'embed';

export default function TrustCenterSettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState<TrustCenterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [saving, setSaving] = useState(false);

  const organizationId = user?.organizationId || '';

  useEffect(() => {
    if (organizationId) {
      fetchConfig();
    }
  }, [organizationId]);

  const fetchConfig = async () => {
    try {
      const response = await trustCenterApi.getConfig({ organizationId });
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching trust center config:', error);
      toast.error('Failed to load trust center config');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<TrustCenterConfig>) => {
    setSaving(true);
    try {
      const response = await trustCenterApi.updateConfig(updates, { organizationId });
      setConfig(response.data);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Error updating trust center config:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general' as TabType, name: 'General', icon: GlobeAltIcon },
    { id: 'branding' as TabType, name: 'Branding', icon: PaintBrushIcon },
    { id: 'domain' as TabType, name: 'Custom Domain', icon: LinkIcon },
    { id: 'embed' as TabType, name: 'Embed Code', icon: CodeBracketIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading settings...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Unable to load configuration</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-surface-100">Trust Center Settings</h1>
        <p className="mt-1 text-surface-400">
          Configure your public-facing security trust center
        </p>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${config.isEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.isEnabled ? (
              <CheckCircleIcon className="w-6 h-6 text-green-500 dark:text-green-400" />
            ) : (
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-yellow-400" />
            )}
            <div>
              <h3 className={`font-medium ${config.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-amber-700 dark:text-yellow-400'}`}>
                {config.isEnabled ? 'Trust Center is Live' : 'Trust Center is Disabled'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-surface-400">
                {config.isEnabled 
                  ? 'Your trust center is publicly accessible' 
                  : 'Enable to make your trust center publicly visible'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.isEnabled}
              onChange={(e) => updateConfig({ isEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden">
        <div className="border-b border-surface-800">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-400 bg-surface-800/50'
                      : 'border-transparent text-surface-400 hover:text-surface-300 hover:bg-surface-800/30'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <GeneralSettings config={config} onUpdate={updateConfig} organizationId={organizationId} />
          )}
          {activeTab === 'branding' && (
            <BrandingSettings config={config} onUpdate={updateConfig} />
          )}
          {activeTab === 'domain' && (
            <DomainSettings config={config} onUpdate={updateConfig} />
          )}
          {activeTab === 'embed' && (
            <EmbedSettings config={config} organizationId={organizationId} />
          )}
        </div>
      </div>

      {/* Save indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-surface-800 text-surface-200 px-4 py-2 rounded-lg shadow-lg">
          Saving...
        </div>
      )}
    </div>
  );
}

// General Settings Tab
function GeneralSettings({ 
  config, 
  onUpdate, 
  organizationId 
}: { 
  config: TrustCenterConfig; 
  onUpdate: (updates: Partial<TrustCenterConfig>) => void;
  organizationId: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-surface-100 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">
              Security Email
            </label>
            <input
              type="email"
              value={config.securityEmail || ''}
              onChange={(e) => onUpdate({ securityEmail: e.target.value })}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              placeholder="security@company.com"
            />
            <p className="text-xs text-surface-500 mt-1">Public email for security inquiries</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">
              Support URL
            </label>
            <input
              type="url"
              value={config.supportUrl || ''}
              onChange={(e) => onUpdate({ supportUrl: e.target.value })}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              placeholder="https://support.company.com"
            />
            <p className="text-xs text-surface-500 mt-1">Link to your support portal</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-surface-800">
        <h3 className="text-lg font-medium text-surface-100 mb-4">Section Visibility</h3>
        <p className="text-sm text-surface-400 mb-4">Choose which sections to display on your public trust center</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'showCertifications', label: 'Certifications & Compliance', description: 'Display your compliance frameworks' },
            { key: 'showSecurityFeatures', label: 'Security Features', description: 'Show technical security controls' },
            { key: 'showPolicies', label: 'Policies', description: 'Link to security policies' },
            { key: 'showPrivacy', label: 'Privacy', description: 'Privacy practices section' },
            { key: 'showIncidentResponse', label: 'Incident Response', description: 'Incident handling procedures' },
          ].map((section) => (
            <label 
              key={section.key} 
              className="flex items-start gap-3 p-3 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800 transition-colors"
            >
              <input
                type="checkbox"
                checked={config[section.key as keyof TrustCenterConfig] as boolean}
                onChange={(e) => onUpdate({ [section.key]: e.target.checked })}
                className="mt-1 w-4 h-4 bg-surface-800 border-surface-700 rounded text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-sm font-medium text-surface-200">{section.label}</span>
                <p className="text-xs text-surface-500">{section.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-surface-800">
        <h3 className="text-lg font-medium text-surface-100 mb-4">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/trust-center/public?organizationId=${organizationId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <GlobeAltIcon className="w-5 h-5" />
            View Live Trust Center
          </a>
          <a
            href="/trust-center"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-700 text-surface-200 rounded-lg hover:bg-surface-600 transition-colors"
          >
            Manage Content
          </a>
        </div>
      </div>
    </div>
  );
}

// Branding Settings Tab
function BrandingSettings({ 
  config, 
  onUpdate 
}: { 
  config: TrustCenterConfig; 
  onUpdate: (updates: Partial<TrustCenterConfig>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-surface-100 mb-4">Company Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={config.companyName}
              onChange={(e) => onUpdate({ companyName: e.target.value })}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              placeholder="Your Company Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">
              Company Description
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              placeholder="Describe your security posture and commitment to security..."
            />
            <p className="text-xs text-surface-500 mt-1">This appears in the hero section of your trust center</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-surface-800">
        <h3 className="text-lg font-medium text-surface-100 mb-4">Visual Branding</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={config.logoUrl || ''}
              onChange={(e) => onUpdate({ logoUrl: e.target.value })}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-surface-500 mt-1">Recommended: 200x50px, PNG or SVG</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">
              Primary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.primaryColor || '#6366f1'}
                onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                className="w-12 h-10 bg-surface-800 border border-surface-700 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={config.primaryColor || '#6366f1'}
                onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                placeholder="#6366f1"
              />
            </div>
            <p className="text-xs text-surface-500 mt-1">Used for headings, buttons, and accents</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="pt-6 border-t border-surface-800">
        <h3 className="text-lg font-medium text-surface-100 mb-4">Preview</h3>
        <div className="bg-white rounded-lg p-8 text-center">
          {config.logoUrl && (
            <img src={config.logoUrl} alt={config.companyName} className="h-12 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold mb-2" style={{ color: config.primaryColor || '#6366f1' }}>
            {config.companyName} Trust Center
          </h2>
          {config.description && (
            <p className="text-gray-600 max-w-xl mx-auto">{config.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Domain Settings Tab
function DomainSettings({ 
  config, 
  onUpdate 
}: { 
  config: TrustCenterConfig; 
  onUpdate: (updates: Partial<TrustCenterConfig>) => void;
}) {
  const [domainInput, setDomainInput] = useState(config.customDomain || '');

  const saveDomain = () => {
    onUpdate({ customDomain: domainInput || undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-surface-100 mb-2">Custom Domain</h3>
        <p className="text-sm text-surface-400 mb-4">
          Host your Trust Center on your own domain for a seamless brand experience
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1">
              Your Custom Domain
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                placeholder="trust.yourcompany.com"
              />
              <button
                onClick={saveDomain}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-surface-500 mt-1">
              Examples: trust.yourcompany.com, security.yourcompany.com
            </p>
          </div>
        </div>
      </div>

      {config.customDomain && (
        <div className="bg-surface-800/50 rounded-lg p-6 border border-surface-700">
          <h4 className="text-md font-medium text-surface-200 mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-brand-400" />
            DNS Configuration Required
          </h4>
          
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="text-surface-200">Log in to your domain registrar or DNS provider</p>
                <p className="text-surface-500 text-xs mt-1">Common providers: Cloudflare, GoDaddy, Namecheap, Route53</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="text-surface-200">Add a CNAME record with these values:</p>
                <div className="mt-2 bg-surface-900 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-surface-400">Type:</span>
                    <code className="text-brand-400">CNAME</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-400">Host/Name:</span>
                    <code className="text-brand-400">{config.customDomain.split('.')[0]}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-400">Value/Points to:</span>
                    <code className="text-brand-400">trust.gigachad-grc.com</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-400">TTL:</span>
                    <code className="text-brand-400">300</code> <span className="text-surface-500">(or Auto)</span>
                  </div>
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p className="text-surface-200">Wait for DNS propagation</p>
                <p className="text-surface-500 text-xs mt-1">This can take up to 24-48 hours, but usually completes within minutes</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <p className="text-surface-200">SSL certificate will be automatically provisioned</p>
                <p className="text-surface-500 text-xs mt-1">We use Let's Encrypt to secure your custom domain</p>
              </div>
            </li>
          </ol>

          <div className="mt-6 pt-4 border-t border-surface-700">
            <a
              href={`https://${config.customDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm"
            >
              <GlobeAltIcon className="w-4 h-4" />
              Test https://{config.customDomain}
            </a>
          </div>
        </div>
      )}

      {!config.customDomain && (
        <div className="bg-surface-800/30 rounded-lg p-6 border border-dashed border-surface-700 text-center">
          <LinkIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400">
            Enter a custom domain above to see setup instructions
          </p>
        </div>
      )}
    </div>
  );
}

// Embed Settings Tab
function EmbedSettings({ 
  config, 
  organizationId 
}: { 
  config: TrustCenterConfig; 
  organizationId: string;
}) {
  const baseUrl = window.location.origin;
  const trustCenterUrl = `${baseUrl}/trust-center/public?organizationId=${organizationId}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const iframeCode = `<iframe
  src="${trustCenterUrl}"
  width="100%"
  height="800"
  frameborder="0"
  title="${config.companyName} Trust Center"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
></iframe>`;

  const buttonCode = `<a 
  href="${trustCenterUrl}" 
  target="_blank" 
  rel="noopener noreferrer"
  style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:${config.primaryColor || '#6366f1'};color:white;border-radius:8px;text-decoration:none;font-weight:500;font-family:system-ui,sans-serif;"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
  View ${config.companyName} Security
</a>`;

  return (
    <div className="space-y-8">
      {/* iframe Embed */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CodeBracketIcon className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-medium text-surface-100">Full Page Embed (iframe)</h3>
        </div>
        <p className="text-sm text-surface-400 mb-4">
          Embed your complete Trust Center on any webpage
        </p>
        <div className="relative">
          <pre className="p-4 bg-surface-800 rounded-lg text-sm text-surface-300 overflow-x-auto">
            {iframeCode}
          </pre>
          <button
            onClick={() => copyToClipboard(iframeCode, 'iframe code')}
            className="absolute top-2 right-2 flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-700 text-surface-300 rounded hover:bg-surface-600 transition-colors"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>

      {/* Button Link */}
      <div className="pt-6 border-t border-surface-800">
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-medium text-surface-100">Security Button</h3>
        </div>
        <p className="text-sm text-surface-400 mb-4">
          Add a branded button that links to your Trust Center
        </p>
        <div className="relative">
          <pre className="p-4 bg-surface-800 rounded-lg text-sm text-surface-300 overflow-x-auto">
            {buttonCode}
          </pre>
          <button
            onClick={() => copyToClipboard(buttonCode.replace(/\n/g, ''), 'button code')}
            className="absolute top-2 right-2 flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-700 text-surface-300 rounded hover:bg-surface-600 transition-colors"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
            Copy
          </button>
        </div>
        
        {/* Button Preview */}
        <div className="mt-4 p-4 bg-surface-800/50 rounded-lg">
          <p className="text-xs text-surface-500 mb-3">Preview:</p>
          <a
            href={trustCenterUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: config.primaryColor || '#6366f1',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            View {config.companyName} Security
          </a>
        </div>
      </div>

      {/* Direct Link */}
      <div className="pt-6 border-t border-surface-800">
        <div className="flex items-center gap-2 mb-2">
          <GlobeAltIcon className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-medium text-surface-100">Direct Link</h3>
        </div>
        <p className="text-sm text-surface-400 mb-4">
          Share this URL directly with customers or partners
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={trustCenterUrl}
            className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-300 text-sm"
          />
          <button
            onClick={() => copyToClipboard(trustCenterUrl, 'URL')}
            className="flex items-center gap-1 px-4 py-2 bg-surface-700 text-surface-200 rounded-lg hover:bg-surface-600 transition-colors"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

