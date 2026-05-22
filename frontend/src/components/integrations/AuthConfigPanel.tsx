import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { AuthConfiguration } from './AdvancedBuilderTab';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

interface AuthConfigPanelProps {
  config: AuthConfiguration;
  onChange: (updates: Partial<AuthConfiguration>) => void;
}

const AUTH_TYPES = [
  {
    value: 'api_key',
    label: 'API Key',
    description: 'Send API key in header or query parameter',
  },
  {
    value: 'bearer',
    label: 'Bearer Token',
    description: 'Send token in Authorization header',
  },
  {
    value: 'basic',
    label: 'Basic Auth',
    description: 'Username and password authentication',
  },
  {
    value: 'oauth2',
    label: 'OAuth 2.0',
    description: 'OAuth 2.0 client credentials or authorization code',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Define custom authentication headers',
  },
] as const;

const HEADER_LOCATIONS = [
  { value: 'header', label: 'Header' },
  { value: 'query', label: 'Query Parameter' },
];

const OAUTH_GRANT_TYPES: Array<{
  value: 'client_credentials' | 'authorization_code';
  label: string;
  description: string;
}> = [
  {
    value: 'client_credentials',
    label: 'Client Credentials',
    description: 'Machine-to-machine authentication',
  },
  {
    value: 'authorization_code',
    label: 'Authorization Code',
    description: 'User-authorized access (requires redirect)',
  },
];

export default function AuthConfigPanel({ config, onChange }: AuthConfigPanelProps) {
  const updateCredential = (key: string, value: string) => {
    onChange({
      credentials: { ...config.credentials, [key]: value },
    });
  };

  const updateOAuth2Config = (updates: Partial<NonNullable<AuthConfiguration['oauth2Config']>>) => {
    onChange({
      oauth2Config: { ...config.oauth2Config, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      {/* Auth Type Selection */}
      <div>
        <label className="text-sm font-medium text-surface-700 block mb-3">
          Authentication Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {AUTH_TYPES.map((authType) => (
            <button
              key={authType.value}
              onClick={() => onChange({ type: authType.value })}
              className={`p-3 text-left rounded-lg border transition-colors ${
                config.type === authType.value
                  ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                  : 'bg-white border-surface-200 hover:border-surface-300 text-surface-700'
              }`}
            >
              <div className="font-medium text-sm">{authType.label}</div>
              <div className="text-xs text-surface-500 mt-0.5">{authType.description}</div>
            </button>
          ))}
        </div>
      </div>
      {/* API Key Configuration */}
      {config.type === 'api_key' && (
        <div className="space-y-4 p-4 bg-white/50 rounded-lg border border-surface-200">
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">API Key</label>
            <Input
              type="password"
              value={config.credentials.apiKey || ''}
              onChange={(e) => updateCredential('apiKey', e.target.value)}
              placeholder="Enter your API key"
              className="input w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-surface-600 block mb-1.5">Header/Parameter Name</label>
              <Input
                type="text"
                value={config.headerName || ''}
                onChange={(e) => onChange({ headerName: e.target.value })}
                placeholder="X-API-Key"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-surface-600 block mb-1.5">Location</label>
              <SelectNative
                value={config.credentials.location || 'header'}
                onChange={(e) => updateCredential('location', e.target.value)}
                className="input w-full"
              >
                {HEADER_LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <p className="text-xs text-surface-500 flex items-start gap-1">
            <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            The API key will be sent as the specified header or query parameter with each request.
          </p>
        </div>
      )}
      {/* Bearer Token Configuration */}
      {config.type === 'bearer' && (
        <div className="space-y-4 p-4 bg-white/50 rounded-lg border border-surface-200">
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">Bearer Token</label>
            <Input
              type="password"
              value={config.credentials.token || ''}
              onChange={(e) => updateCredential('token', e.target.value)}
              placeholder="Enter your bearer token"
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">Token Prefix</label>
            <Input
              type="text"
              value={config.headerPrefix || 'Bearer'}
              onChange={(e) => onChange({ headerPrefix: e.target.value })}
              placeholder="Bearer"
              className="input w-full"
            />
          </div>
          <p className="text-xs text-surface-500 flex items-start gap-1">
            <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Token will be sent as: Authorization: {config.headerPrefix || 'Bearer'} {'<token>'}
          </p>
        </div>
      )}
      {/* Basic Auth Configuration */}
      {config.type === 'basic' && (
        <div className="space-y-4 p-4 bg-white/50 rounded-lg border border-surface-200">
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">Username</label>
            <Input
              type="text"
              value={config.credentials.username || ''}
              onChange={(e) => updateCredential('username', e.target.value)}
              placeholder="Enter username"
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">Password</label>
            <Input
              type="password"
              value={config.credentials.password || ''}
              onChange={(e) => updateCredential('password', e.target.value)}
              placeholder="Enter password"
              className="input w-full"
            />
          </div>
          <p className="text-xs text-surface-500 flex items-start gap-1">
            <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Credentials will be Base64 encoded and sent in the Authorization header.
          </p>
        </div>
      )}
      {/* OAuth 2.0 Configuration */}
      {config.type === 'oauth2' && (
        <div className="space-y-4 p-4 bg-white/50 rounded-lg border border-surface-200">
          <div>
            <label className="text-sm text-surface-600 block mb-2">Grant Type</label>
            <div className="grid grid-cols-2 gap-2">
              {OAUTH_GRANT_TYPES.map((grant) => (
                <button
                  key={grant.value}
                  onClick={() => updateOAuth2Config({ grantType: grant.value })}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    config.oauth2Config?.grantType === grant.value
                      ? 'bg-brand-500/10 border-brand-500/30'
                      : 'bg-white border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="font-medium text-sm text-surface-800">{grant.label}</div>
                  <div className="text-xs text-surface-500">{grant.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-surface-600 block mb-1.5">Token URL</label>
              <Input
                type="url"
                value={config.oauth2Config?.tokenUrl || ''}
                onChange={(e) => updateOAuth2Config({ tokenUrl: e.target.value })}
                placeholder="https://api.example.com/oauth/token"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-surface-600 block mb-1.5">Client ID</label>
              <Input
                type="text"
                value={config.oauth2Config?.clientId || ''}
                onChange={(e) => updateOAuth2Config({ clientId: e.target.value })}
                placeholder="Client ID"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-surface-600 block mb-1.5">Client Secret</label>
              <Input
                type="password"
                value={config.oauth2Config?.clientSecret || ''}
                onChange={(e) => updateOAuth2Config({ clientSecret: e.target.value })}
                placeholder="Client Secret"
                className="input w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-surface-600 block mb-1.5">Scope (optional)</label>
              <Input
                type="text"
                value={config.oauth2Config?.scope || ''}
                onChange={(e) => updateOAuth2Config({ scope: e.target.value })}
                placeholder="read write admin (space-separated)"
                className="input w-full"
              />
            </div>
          </div>
        </div>
      )}
      {/* Custom Authentication */}
      {config.type === 'custom' && (
        <div className="space-y-4 p-4 bg-white/50 rounded-lg border border-surface-200">
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">Header Name</label>
            <Input
              type="text"
              value={config.headerName || ''}
              onChange={(e) => onChange({ headerName: e.target.value })}
              placeholder="X-Custom-Auth"
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">Header Value</label>
            <Input
              type="password"
              value={config.credentials.customValue || ''}
              onChange={(e) => updateCredential('customValue', e.target.value)}
              placeholder="Enter header value"
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-sm text-surface-600 block mb-1.5">Value Prefix (optional)</label>
            <Input
              type="text"
              value={config.headerPrefix || ''}
              onChange={(e) => onChange({ headerPrefix: e.target.value })}
              placeholder="e.g., Token, ApiKey"
              className="input w-full"
            />
          </div>
          <p className="text-xs text-surface-500 flex items-start gap-1">
            <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Header will be sent as: {config.headerName || '<Header-Name>'}:{' '}
            {config.headerPrefix ? `${config.headerPrefix} ` : ''}
            {'<value>'}
          </p>
        </div>
      )}
    </div>
  );
}
