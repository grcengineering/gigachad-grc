import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  LockClosedIcon,
  ServerIcon,
  DocumentCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { Tooltip } from '@/components/Tooltip';
import clsx from 'clsx';

// ============================================
// Tooltip Descriptions
// ============================================

const CATEGORY_TOOLTIPS = {
  security: 'Evaluates SSL/TLS configuration, security headers (CSP, HSTS, X-Frame-Options), and HTTP-to-HTTPS redirects. Higher scores indicate better technical security posture.',
  breach: 'Assesses known data breach history and exposure. This is an automated check and should be supplemented with manual verification via HaveIBeenPwned or vendor attestations.',
  reputation: 'Evaluates website accessibility, professional web presence, contact information availability, and terms of service. Indicates operational maturity.',
  compliance: 'Checks for SOC 2 reports, ISO 27001 certification, trust portals, privacy policies, GDPR compliance indicators, and bug bounty programs.',
};

const ITEM_TOOLTIPS = {
  sslGrade: 'SSL/TLS certificate quality and configuration. Grade A indicates strong encryption with proper certificate chain.',
  httpRedirect: 'Whether HTTP requests are automatically redirected to HTTPS, ensuring encrypted connections.',
  spf: 'Sender Policy Framework (SPF) DNS record prevents email spoofing by specifying authorized mail servers.',
  dmarc: 'Domain-based Message Authentication (DMARC) provides email authentication and reporting to prevent phishing.',
  accessible: 'Whether the vendor website is publicly accessible and returns a valid HTTP response.',
  privacyPolicy: 'Presence of a privacy policy or privacy notice page explaining data handling practices.',
  soc2: 'SOC 2 Type I/II audit reports demonstrate independent verification of security controls.',
  trustPortal: 'Dedicated security trust center or portal where vendors publish compliance documents and security information.',
};

// ============================================
// Types
// ============================================

interface SecurityScanPanelProps {
  vendorId: string;
  vendorName: string;
  vendorWebsite?: string;
  onScanComplete?: () => void;
  showSubdomains?: boolean;
}

interface SecurityFinding {
  id: string;
  category: 'Security' | 'Breach' | 'Reputation' | 'Compliance';
  level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  title: string;
  description: string;
  impact: string;
  remediation: string;
}

interface SubdomainInfo {
  subdomain: string;
  fullDomain: string;
  resolved: boolean;
  ipAddresses?: string[];
  accessible?: boolean;
  httpStatus?: number;
  redirectsTo?: string;
  hasSSL?: boolean;
}

interface SubdomainScanResult {
  domain: string;
  totalChecked: number;
  discovered: SubdomainInfo[];
  hasWildcard: boolean;
  wildcardIp?: string;
}

interface DiscoveredPage {
  url: string;
  title?: string;
  statusCode?: number;
  contentType?: string;
  size?: number;
  isExternal: boolean;
  linkText?: string;
  foundOn?: string;
}

interface CrawlResult {
  subdomain: string;
  baseUrl: string;
  crawledAt: string;
  pagesDiscovered: number;
  pages: DiscoveredPage[];
  externalLinks: DiscoveredPage[];
  errors: string[];
}

interface SecurityScanResult {
  id: string;
  vendorId: string;
  targetUrl: string;
  scannedAt: string;
  status: 'completed' | 'failed' | 'partial';
  ssl: {
    enabled: boolean;
    grade: string;
    issuer?: string;
    expiry?: string;
    daysUntilExpiry?: number;
    httpRedirectsToHttps: boolean;
  };
  securityHeaders: Record<string, string>;
  missingHeaders: string[];
  dns: {
    hasSPF: boolean;
    hasDMARC: boolean;
    hasDNSSEC: boolean;
    hasCAA: boolean;
  };
  webPresence: {
    accessible: boolean;
    statusCode?: number;
    title?: string;
    hasContactInfo: boolean;
    hasPrivacyPolicy: boolean;
    privacyPolicyUrl?: string;
  };
  compliance: {
    hasTrustPortal: boolean;
    trustPortalUrl?: string;
    trustPortalProvider?: string;
    hasSOC2: boolean;
    soc2Type?: string;
    soc2Url?: string;
    hasISO27001: boolean;
    iso27001Url?: string;
    certifications: string[];
    hasBugBounty: boolean;
    bugBountyUrl?: string;
    hasPrivacyPolicy?: boolean;
    privacyPolicyUrl?: string;
    hasSecurityWhitepaper?: boolean;
    securityWhitepaperUrl?: string;
  };
  subdomains?: SubdomainScanResult;
  categoryScores: {
    security: number;
    breach: number;
    reputation: number;
    compliance: number;
  };
  overallScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  findings: SecurityFinding[];
  summary: string;
  keyRisks: string[];
  recommendations: string[];
}

// ============================================
// Helper Components
// ============================================

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBgColor = (s: number) => {
    if (s >= 80) return 'stroke-green-400';
    if (s >= 60) return 'stroke-yellow-400';
    if (s >= 40) return 'stroke-orange-400';
    return 'stroke-red-400';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2">
        <div className={clsx('text-lg font-bold', getColor(score))}>{score}</div>
        <div className="w-16 h-2 bg-surface-800 rounded-full overflow-hidden">
          <div
            className={clsx('h-full', score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500')}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-surface-800"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={getBgColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx('text-3xl font-bold', getColor(score))}>{score}</span>
        <span className="text-xs text-surface-500">/100</span>
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircleIcon className="w-4 h-4 text-green-400" />
      ) : (
        <XCircleIcon className="w-4 h-4 text-red-400" />
      )}
      <span className={clsx('text-sm', status ? 'text-surface-300' : 'text-surface-500')}>{label}</span>
    </div>
  );
}

/**
 * Status badge with optional clickable link for artifacts
 */
function StatusBadgeWithLink({ 
  status, 
  label, 
  url 
}: { 
  status: boolean; 
  label: string; 
  url?: string;
}) {
  const content = (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircleIcon className="w-4 h-4 text-green-400" />
      ) : (
        <XCircleIcon className="w-4 h-4 text-red-400" />
      )}
      <span className={clsx('text-sm', status ? 'text-surface-300' : 'text-surface-500')}>{label}</span>
      {status && url && (
        <ArrowTopRightOnSquareIcon className="w-3 h-3 text-brand-400" />
      )}
    </div>
  );

  if (status && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:bg-surface-800 rounded px-1 -mx-1 transition-colors group"
        title={`Open ${label}`}
      >
        {content}
      </a>
    );
  }

  return content;
}

// Sensitive subdomains that may indicate security concerns
const SENSITIVE_SUBDOMAINS = ['dev', 'staging', 'test', 'beta', 'demo', 'admin', 'internal', 'uat', 'qa', 'sandbox'];

// Modal for showing crawl results
function SubdomainCrawlModal({
  subdomain,
  vendorId,
  onClose,
}: {
  subdomain: SubdomainInfo;
  vendorId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pages' | 'external'>('pages');

  useEffect(() => {
    const crawlSubdomain = async () => {
      try {
        const subdomainUrl = `${subdomain.hasSSL ? 'https' : 'http'}://${subdomain.fullDomain}`;
        const response = await fetch(`/api/vendors/${vendorId}/security-scan/crawl-subdomain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: subdomainUrl }),
        });

        if (!response.ok) {
          throw new Error('Failed to crawl subdomain');
        }

        const data = await response.json();
        setCrawlResult(data);
      } catch (err) {
        setError('Failed to crawl subdomain. It may not be accessible.');
      } finally {
        setLoading(false);
      }
    };

    crawlSubdomain();
  }, [subdomain, vendorId]);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 rounded-lg">
              <LinkIcon className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">{subdomain.fullDomain}</h3>
              <p className="text-sm text-surface-400">Discovered pages and links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64">
              <ArrowPathIcon className="w-10 h-10 text-brand-400 animate-spin mb-4" />
              <p className="text-surface-300">Crawling {subdomain.fullDomain}...</p>
              <p className="text-sm text-surface-500 mt-1">Discovering pages and links</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64">
              <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mb-4" />
              <p className="text-surface-300">{error}</p>
            </div>
          )}

          {crawlResult && (
            <>
              {/* Stats Bar */}
              <div className="flex items-center gap-6 p-4 bg-surface-800/50 border-b border-surface-700">
                <div>
                  <div className="text-2xl font-bold text-surface-100">{crawlResult.pages.length}</div>
                  <div className="text-xs text-surface-400">Pages Found</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-surface-100">{crawlResult.externalLinks.length}</div>
                  <div className="text-xs text-surface-400">External Links</div>
                </div>
                <div className="ml-auto text-xs text-surface-500">
                  Crawled {new Date(crawlResult.crawledAt).toLocaleTimeString()}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-surface-700">
                <button
                  onClick={() => setActiveTab('pages')}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'pages'
                      ? 'border-brand-400 text-brand-400'
                      : 'border-transparent text-surface-400 hover:text-surface-200'
                  )}
                >
                  Internal Pages ({crawlResult.pages.length})
                </button>
                <button
                  onClick={() => setActiveTab('external')}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'external'
                      ? 'border-brand-400 text-brand-400'
                      : 'border-transparent text-surface-400 hover:text-surface-200'
                  )}
                >
                  External Links ({crawlResult.externalLinks.length})
                </button>
              </div>

              {/* Table */}
              <div className="overflow-auto max-h-[calc(85vh-280px)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-800 z-10">
                    <tr className="border-b border-surface-700">
                      <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase">Page</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase w-20">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase w-24 hidden md:table-cell">Size</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {(activeTab === 'pages' ? crawlResult.pages : crawlResult.externalLinks).map((page, idx) => (
                      <tr key={idx} className="hover:bg-surface-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <DocumentTextIcon className="w-4 h-4 text-surface-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-surface-200 truncate max-w-md" title={page.title || page.url}>
                                {page.title || new URL(page.url).pathname || '/'}
                              </div>
                              <div className="text-xs text-surface-500 truncate max-w-md" title={page.url}>
                                {page.url}
                              </div>
                              {page.linkText && (
                                <div className="text-xs text-surface-600 mt-0.5 truncate max-w-md">
                                  Link text: "{page.linkText}"
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {page.statusCode ? (
                            <span className={clsx(
                              'px-2 py-0.5 rounded text-xs font-mono',
                              page.statusCode >= 200 && page.statusCode < 300 ? 'bg-green-500/20 text-green-400' :
                              page.statusCode >= 300 && page.statusCode < 400 ? 'bg-blue-500/20 text-blue-400' :
                              page.statusCode >= 400 ? 'bg-red-500/20 text-red-400' :
                              'bg-surface-700 text-surface-400'
                            )}>
                              {page.statusCode}
                            </span>
                          ) : (
                            <span className="text-surface-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-surface-500 text-xs hidden md:table-cell">
                          {formatSize(page.size)}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-surface-400 hover:text-brand-400 transition-colors"
                            title="Open in new tab"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {((activeTab === 'pages' && crawlResult.pages.length === 0) ||
                  (activeTab === 'external' && crawlResult.externalLinks.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-12 text-surface-500">
                    <DocumentTextIcon className="w-8 h-8 mb-2" />
                    <p>No {activeTab === 'pages' ? 'pages' : 'external links'} found</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-700 flex justify-between items-center">
          <a
            href={`${subdomain.hasSSL ? 'https' : 'http'}://${subdomain.fullDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            Open {subdomain.fullDomain}
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </a>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubdomainSection({ subdomains, vendorId }: { subdomains: SubdomainScanResult; vendorId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sensitive' | 'ssl' | 'nossl'>('all');
  const [selectedSubdomain, setSelectedSubdomain] = useState<SubdomainInfo | null>(null);

  // Categorize subdomains
  const sensitiveSubdomains = subdomains.discovered.filter(sub => 
    SENSITIVE_SUBDOMAINS.some(s => sub.subdomain.toLowerCase().includes(s))
  );
  const sslSubdomains = subdomains.discovered.filter(sub => sub.hasSSL);
  const noSslSubdomains = subdomains.discovered.filter(sub => sub.accessible && !sub.hasSSL);

  // Filter subdomains based on selection
  const filteredSubdomains = subdomains.discovered.filter(sub => {
    if (filter === 'sensitive') return SENSITIVE_SUBDOMAINS.some(s => sub.subdomain.toLowerCase().includes(s));
    if (filter === 'ssl') return sub.hasSSL;
    if (filter === 'nossl') return sub.accessible && !sub.hasSSL;
    return true;
  });

  const displaySubdomains = expanded ? filteredSubdomains : filteredSubdomains.slice(0, 8);

  const getStatusBadge = (sub: SubdomainInfo) => {
    if (sub.hasSSL) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
          <LockClosedIcon className="w-3 h-3" />
          Secure
        </span>
      );
    }
    if (sub.accessible) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
          <ExclamationTriangleIcon className="w-3 h-3" />
          No SSL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-700 text-surface-400">
        <ServerIcon className="w-3 h-3" />
        DNS Only
      </span>
    );
  };

  const isSensitive = (sub: SubdomainInfo) => 
    SENSITIVE_SUBDOMAINS.some(s => sub.subdomain.toLowerCase().includes(s));

  return (
    <div className="p-4 border-b border-surface-800">
      {/* Modal */}
      {selectedSubdomain && (
        <SubdomainCrawlModal
          subdomain={selectedSubdomain}
          vendorId={vendorId}
          onClose={() => setSelectedSubdomain(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ServerIcon className="w-5 h-5 text-surface-400" />
          <h4 className="text-sm font-medium text-surface-200">
            Discovered Subdomains
          </h4>
          <span className="px-2 py-0.5 text-xs bg-surface-700 text-surface-300 rounded-full">
            {subdomains.discovered.length} found
          </span>
          <Tooltip 
            content="Subdomains discovered through DNS enumeration. Click any subdomain to crawl and discover all pages. Sensitive subdomains (dev, staging, admin) are flagged as they may indicate exposed development environments."
            position="right"
            width="lg"
          />
          {subdomains.hasWildcard && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
              Wildcard DNS
            </span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={clsx(
            'px-3 py-2 rounded-lg text-left transition-colors',
            filter === 'all' 
              ? 'bg-brand-500/20 border border-brand-500/50' 
              : 'bg-surface-800 border border-surface-700 hover:border-surface-600'
          )}
        >
          <div className="text-lg font-semibold text-surface-100">{subdomains.discovered.length}</div>
          <div className="text-xs text-surface-400">Total</div>
        </button>
        <button
          onClick={() => setFilter('sensitive')}
          className={clsx(
            'px-3 py-2 rounded-lg text-left transition-colors',
            filter === 'sensitive' 
              ? 'bg-red-500/20 border border-red-500/50' 
              : 'bg-surface-800 border border-surface-700 hover:border-surface-600'
          )}
        >
          <div className={clsx('text-lg font-semibold', sensitiveSubdomains.length > 0 ? 'text-red-400' : 'text-surface-100')}>
            {sensitiveSubdomains.length}
          </div>
          <div className="text-xs text-surface-400">Sensitive</div>
        </button>
        <button
          onClick={() => setFilter('ssl')}
          className={clsx(
            'px-3 py-2 rounded-lg text-left transition-colors',
            filter === 'ssl' 
              ? 'bg-green-500/20 border border-green-500/50' 
              : 'bg-surface-800 border border-surface-700 hover:border-surface-600'
          )}
        >
          <div className="text-lg font-semibold text-green-400">{sslSubdomains.length}</div>
          <div className="text-xs text-surface-400">With SSL</div>
        </button>
        <button
          onClick={() => setFilter('nossl')}
          className={clsx(
            'px-3 py-2 rounded-lg text-left transition-colors',
            filter === 'nossl' 
              ? 'bg-yellow-500/20 border border-yellow-500/50' 
              : 'bg-surface-800 border border-surface-700 hover:border-surface-600'
          )}
        >
          <div className={clsx('text-lg font-semibold', noSslSubdomains.length > 0 ? 'text-yellow-400' : 'text-surface-100')}>
            {noSslSubdomains.length}
          </div>
          <div className="text-xs text-surface-400">No SSL</div>
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-800/50 rounded-lg border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 bg-surface-800">
              <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Subdomain</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase tracking-wider hidden md:table-cell">HTTP</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 uppercase tracking-wider hidden lg:table-cell">Details</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-surface-400 uppercase tracking-wider w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {displaySubdomains.map((sub) => (
              <tr 
                key={sub.fullDomain} 
                className={clsx(
                  'hover:bg-surface-700/50 transition-colors',
                  isSensitive(sub) && 'bg-red-500/5'
                )}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {isSensitive(sub) && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded uppercase">
                        Sensitive
                      </span>
                    )}
                    <span className="text-surface-200 font-medium">{sub.subdomain}</span>
                    <span className="text-surface-500">.{subdomains.domain}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {getStatusBadge(sub)}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  {sub.httpStatus ? (
                    <span className={clsx(
                      'font-mono text-xs',
                      sub.httpStatus >= 200 && sub.httpStatus < 300 ? 'text-green-400' :
                      sub.httpStatus >= 300 && sub.httpStatus < 400 ? 'text-blue-400' :
                      'text-yellow-400'
                    )}>
                      {sub.httpStatus}
                    </span>
                  ) : (
                    <span className="text-surface-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell text-surface-500 text-xs">
                  {sub.redirectsTo ? (
                    <span className="truncate max-w-[200px] inline-block" title={sub.redirectsTo}>
                      → {sub.redirectsTo}
                    </span>
                  ) : sub.ipAddresses && sub.ipAddresses.length > 0 ? (
                    <span className="font-mono">{sub.ipAddresses[0]}</span>
                  ) : (
                    <span className="text-surface-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {sub.accessible && (
                      <button
                        onClick={() => setSelectedSubdomain(sub)}
                        className="px-2 py-1 text-xs font-medium text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded transition-colors"
                      >
                        View Pages
                      </button>
                    )}
                    <a 
                      href={`${sub.hasSSL ? 'https' : 'http'}://${sub.fullDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-surface-400 hover:text-surface-200 transition-colors"
                      title="Open in new tab"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show More/Less */}
      {filteredSubdomains.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4" />
              Show {filteredSubdomains.length - 8} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

function FindingCard({ finding, expanded, onToggle }: { finding: SecurityFinding; expanded: boolean; onToggle: () => void }) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'border-red-500/50 bg-red-500/5';
      case 'High':
        return 'border-orange-500/50 bg-orange-500/5';
      case 'Medium':
        return 'border-yellow-500/50 bg-yellow-500/5';
      case 'Low':
        return 'border-blue-500/50 bg-blue-500/5';
      default:
        return 'border-surface-700 bg-surface-800/50';
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400';
      case 'High':
        return 'bg-orange-500/20 text-orange-400';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Low':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-surface-700 text-surface-400';
    }
  };

  return (
    <div className={clsx('border rounded-lg', getLevelColor(finding.level))}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', getLevelBadgeColor(finding.level))}>
            {finding.level}
          </span>
          <span className="font-medium text-surface-200">{finding.title}</span>
        </div>
        {expanded ? (
          <ChevronUpIcon className="w-4 h-4 text-surface-500" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-surface-500" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-sm">
          <p className="text-surface-400">{finding.description}</p>
          <div>
            <span className="font-medium text-surface-300">Impact: </span>
            <span className="text-surface-400">{finding.impact}</span>
          </div>
          <div>
            <span className="font-medium text-surface-300">Remediation: </span>
            <span className="text-surface-400">{finding.remediation}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function VendorSecurityScanPanel({
  vendorId,
  vendorName,
  vendorWebsite,
  onScanComplete,
  showSubdomains = true,
}: SecurityScanPanelProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<SecurityScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  // Load latest scan on mount
  useEffect(() => {
    loadLatestScan();
  }, [vendorId]);

  const loadLatestScan = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}/security-scan/latest`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setResult(data);
        }
      }
    } catch (err) {
      console.error('Failed to load latest scan:', err);
    }
  };

  const startScan = async () => {
    setScanning(true);
    setError(null);

    try {
      const response = await fetch(`/api/vendors/${vendorId}/security-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: vendorWebsite }),
      });

      if (!response.ok) {
        throw new Error('Scan failed');
      }

      const data = await response.json();
      setResult(data);
      onScanComplete?.();
    } catch (err) {
      setError('Failed to complete security scan. Please try again.');
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const toggleFinding = (id: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFindings(newExpanded);
  };

  if (scanning) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-8">
        <div className="flex flex-col items-center justify-center">
          <ArrowPathIcon className="w-12 h-12 text-brand-400 animate-spin mb-4" />
          <h3 className="text-lg font-medium text-surface-100 mb-2">Scanning {vendorName}...</h3>
          <p className="text-surface-400 text-center max-w-md">
            Analyzing SSL/TLS, security headers, DNS configuration, and compliance indicators.
            This may take 30 seconds to 2 minutes depending on the target website.
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <GlobeAltIcon className="w-8 h-8 text-brand-400" />
          <div>
            <h3 className="text-lg font-medium text-surface-100">Security Scan</h3>
            <p className="text-sm text-surface-400">
              Automatically scan vendor website for security posture, compliance indicators, and risks.
            </p>
          </div>
        </div>

        {!vendorWebsite && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              No website configured for this vendor. Please add a website URL to the vendor profile before scanning.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <Button
          onClick={startScan}
          disabled={!vendorWebsite}
          leftIcon={<ShieldCheckIcon className="w-5 h-5" />}
        >
          Start Security Scan
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-brand-400" />
          <div>
            <h3 className="font-medium text-surface-100">Security Scan Results</h3>
            <p className="text-sm text-surface-500">
              Scanned {new Date(result.scannedAt).toLocaleDateString()} at{' '}
              {new Date(result.scannedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={startScan}
          leftIcon={<ArrowPathIcon className="w-4 h-4" />}
        >
          Rescan
        </Button>
      </div>

      {/* Overall Score */}
      <div className="p-6 border-b border-surface-800">
        <div className="flex items-center gap-8">
          <ScoreGauge score={result.overallScore} />
          <div className="flex-1">
            <div className={clsx(
              'inline-block px-3 py-1 rounded-full text-sm font-medium mb-2',
              result.riskLevel === 'Critical' ? 'bg-red-500/20 text-red-400' :
              result.riskLevel === 'High' ? 'bg-orange-500/20 text-orange-400' :
              result.riskLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            )}>
              {result.riskLevel} Risk
            </div>
            <p className="text-surface-400 text-sm">{result.summary}</p>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="p-4 border-b border-surface-800">
        <h4 className="text-sm font-medium text-surface-300 mb-3">Category Scores</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="w-5 h-5 text-surface-500" />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-surface-500">Security</p>
                <Tooltip content={CATEGORY_TOOLTIPS.security} position="top" />
              </div>
              <ScoreGauge score={result.categoryScores.security} size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-surface-500" />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-surface-500">Breach History</p>
                <Tooltip content={CATEGORY_TOOLTIPS.breach} position="top" />
              </div>
              <ScoreGauge score={result.categoryScores.breach} size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GlobeAltIcon className="w-5 h-5 text-surface-500" />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-surface-500">Reputation</p>
                <Tooltip content={CATEGORY_TOOLTIPS.reputation} position="top" />
              </div>
              <ScoreGauge score={result.categoryScores.reputation} size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DocumentCheckIcon className="w-5 h-5 text-surface-500" />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-surface-500">Compliance</p>
                <Tooltip content={CATEGORY_TOOLTIPS.compliance} position="top" />
              </div>
              <ScoreGauge score={result.categoryScores.compliance} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-surface-800">
        <div>
          <h5 className="text-xs font-medium text-surface-500 mb-2">SSL/TLS</h5>
          <div className="flex items-center gap-1">
            <StatusBadge status={result.ssl.enabled} label={result.ssl.enabled ? `Grade ${result.ssl.grade}` : 'Not Enabled'} />
            <Tooltip content={ITEM_TOOLTIPS.sslGrade} position="right" />
          </div>
          <div className="flex items-center gap-1">
            <StatusBadge status={result.ssl.httpRedirectsToHttps} label="HTTP → HTTPS Redirect" />
            <Tooltip content={ITEM_TOOLTIPS.httpRedirect} position="right" />
          </div>
        </div>
        <div>
          <h5 className="text-xs font-medium text-surface-500 mb-2">DNS Security</h5>
          <div className="flex items-center gap-1">
            <StatusBadge status={result.dns.hasSPF} label="SPF Record" />
            <Tooltip content={ITEM_TOOLTIPS.spf} position="right" />
          </div>
          <div className="flex items-center gap-1">
            <StatusBadge status={result.dns.hasDMARC} label="DMARC Record" />
            <Tooltip content={ITEM_TOOLTIPS.dmarc} position="right" />
          </div>
        </div>
        <div>
          <h5 className="text-xs font-medium text-surface-500 mb-2">Web Presence</h5>
          <div className="flex items-center gap-1">
            <StatusBadge status={result.webPresence.accessible} label="Site Accessible" />
            <Tooltip content={ITEM_TOOLTIPS.accessible} position="right" />
          </div>
          <div className="flex items-center gap-1">
            <StatusBadgeWithLink 
              status={result.webPresence.hasPrivacyPolicy} 
              label="Privacy Policy" 
              url={result.webPresence.privacyPolicyUrl || result.compliance.privacyPolicyUrl}
            />
            <Tooltip content={ITEM_TOOLTIPS.privacyPolicy} position="right" />
          </div>
        </div>
        <div>
          <h5 className="text-xs font-medium text-surface-500 mb-2">Compliance</h5>
          <div className="flex items-center gap-1">
            <StatusBadgeWithLink 
              status={result.compliance.hasSOC2} 
              label={result.compliance.hasSOC2 ? `SOC 2 ${result.compliance.soc2Type || ''}` : 'SOC 2'} 
              url={result.compliance.soc2Url}
            />
            <Tooltip content={ITEM_TOOLTIPS.soc2} position="left" />
          </div>
          <div className="flex items-center gap-1">
            <StatusBadgeWithLink 
              status={result.compliance.hasTrustPortal} 
              label="Trust Portal" 
              url={result.compliance.trustPortalUrl}
            />
            <Tooltip content={ITEM_TOOLTIPS.trustPortal} position="left" />
          </div>
        </div>
      </div>

      {/* Additional Compliance Artifacts with Links */}
      {(result.compliance.hasBugBounty || result.compliance.hasISO27001 || result.compliance.hasSecurityWhitepaper || result.compliance.certifications.length > 2) && (
        <div className="px-4 pb-4 border-b border-surface-800">
          <h5 className="text-xs font-medium text-surface-500 mb-2">Additional Compliance</h5>
          <div className="flex flex-wrap gap-3">
            {result.compliance.hasBugBounty && (
              <div className="flex items-center gap-1">
                <StatusBadgeWithLink 
                  status={true} 
                  label="Bug Bounty Program" 
                  url={result.compliance.bugBountyUrl}
                />
              </div>
            )}
            {result.compliance.hasISO27001 && (
              <div className="flex items-center gap-1">
                <StatusBadgeWithLink 
                  status={true} 
                  label="ISO 27001" 
                  url={result.compliance.iso27001Url}
                />
              </div>
            )}
            {result.compliance.hasSecurityWhitepaper && (
              <div className="flex items-center gap-1">
                <StatusBadgeWithLink 
                  status={true} 
                  label="Security Whitepaper" 
                  url={result.compliance.securityWhitepaperUrl}
                />
              </div>
            )}
            {result.compliance.certifications
              .filter(cert => !['SOC 2', 'SOC 2 Type I', 'SOC 2 Type II', 'ISO 27001'].includes(cert))
              .map((cert, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <StatusBadge status={true} label={cert} />
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Subdomains - conditionally shown based on feature settings */}
      {showSubdomains && result.subdomains && result.subdomains.discovered.length > 0 && (
        <SubdomainSection subdomains={result.subdomains} vendorId={vendorId} />
      )}

      {/* Findings */}
      {result.findings.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-3">
            Findings ({result.findings.length})
          </h4>
          <div className="space-y-2">
            {result.findings
              .sort((a, b) => {
                const order = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
                return order[a.level] - order[b.level];
              })
              .map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  expanded={expandedFindings.has(finding.id)}
                  onToggle={() => toggleFinding(finding.id)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="p-4 bg-surface-800/30 border-t border-surface-800">
          <h4 className="text-sm font-medium text-surface-300 mb-2">Top Recommendations</h4>
          <ul className="space-y-1">
            {result.recommendations.slice(0, 5).map((rec, i) => (
              <li key={i} className="text-sm text-surface-400 flex items-start gap-2">
                <span className="text-brand-400">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
