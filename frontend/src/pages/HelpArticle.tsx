import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  GlobeAltIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronRightIcon,
  LinkIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

// Trust Center Custom Domain Article Content
function TrustCenterCustomDomainArticle() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <button
      onClick={() => copyToClipboard(text, section)}
      className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded transition-colors"
      title="Copy to clipboard"
    >
      {copiedSection === section ? (
        <CheckIcon className="w-4 h-4 text-green-400" />
      ) : (
        <ClipboardDocumentIcon className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <article className="prose prose-invert max-w-none">
      {/* Summary */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Summary</h2>
        <p className="text-surface-300">
          Custom domain URLs allow you to use your own branded domain (like <code className="bg-surface-800 px-1.5 py-0.5 rounded text-brand-400">trust.yourcompany.com</code>)
          instead of the default GigaChad GRC URL when sharing your Trust Center with prospects, customers, and partners.
        </p>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">Benefits of using a custom domain:</h4>
          <ul className="text-surface-400 space-y-1 text-sm list-disc list-inside">
            <li><strong>Brand consistency</strong> - Keep visitors on your domain throughout their security review</li>
            <li><strong>Professional appearance</strong> - Builds trust with a URL that matches your brand</li>
            <li><strong>Easy to remember</strong> - Share a simple, memorable URL with stakeholders</li>
            <li><strong>SEO benefits</strong> - Content lives on your domain</li>
          </ul>
        </div>
      </section>

      {/* Prerequisites */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Prerequisites</h2>
        <p className="text-surface-300 mb-4">Before setting up a custom domain, ensure you have:</p>
        <ul className="space-y-2">
          {[
            { text: 'Admin access to your GigaChad GRC organization', done: true },
            { text: 'Domain ownership - You own or control the domain you want to use', done: false },
            { text: 'DNS access - You can modify DNS records for your domain', done: false },
            { text: 'Trust Center content - Your Trust Center has been configured', done: false },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-surface-300">
              <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="bg-amber-50 dark:bg-yellow-500/10 border border-amber-300 dark:border-yellow-500/30 rounded-lg p-4 mt-4">
          <p className="text-amber-700 dark:text-yellow-400 text-sm">
            <strong>Note:</strong> If you don't have access to modify your DNS records, contact your IT administrator or the person who manages your domain.
          </p>
        </div>
      </section>

      {/* Step 1 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Enable Your Custom Domain in GigaChad GRC</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Log in to GigaChad GRC with an admin account</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Navigate to <strong>Trust</strong> → <strong>Trust Center Settings</strong> in the sidebar</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Click on the <strong>Custom Domain</strong> tab</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Enter your desired custom domain (e.g., <code className="bg-surface-800 px-1.5 py-0.5 rounded text-brand-400">trust.yourcompany.com</code>)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Click <strong>Save</strong></span>
          </li>
        </ol>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
          <p className="text-blue-400 text-sm">
            <strong>Tip:</strong> We recommend using a subdomain like <code className="bg-surface-800 px-1 rounded">trust</code> or <code className="bg-surface-800 px-1 rounded">security</code> rather than your root domain.
          </p>
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Update Your DNS Records</h2>
        <p className="text-surface-300 mb-4">
          After saving your custom domain, you need to create a CNAME record with your DNS provider:
        </p>

        {/* DNS Record Table */}
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Field</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-400">Type</td>
                <td className="px-4 py-3">
                  <code className="text-brand-400">CNAME</code>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-400">Host/Name</td>
                <td className="px-4 py-3">
                  <code className="text-brand-400">trust</code>
                  <span className="text-surface-500 text-xs ml-2">(or your chosen subdomain)</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-400">Value/Points to</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <code className="text-brand-400">trust.gigachad-grc.com</code>
                  <CopyButton text="trust.gigachad-grc.com" section="cname-value" />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-400">TTL</td>
                <td className="px-4 py-3">
                  <code className="text-brand-400">300</code>
                  <span className="text-surface-500 text-xs ml-2">(or "Auto")</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DNS Provider Instructions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-surface-200">Provider-Specific Instructions</h3>

          {/* Cloudflare */}
          <details className="bg-surface-800/50 border border-surface-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-surface-200 font-medium hover:bg-surface-800 rounded-lg">
              Cloudflare
            </summary>
            <div className="px-4 pb-4 text-sm text-surface-400 space-y-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to your Cloudflare Dashboard</li>
                <li>Select your domain</li>
                <li>Click <strong>DNS</strong> in the sidebar</li>
                <li>Click <strong>Add Record</strong></li>
                <li>Set Type to CNAME, Name to your subdomain, Target to <code className="bg-surface-800 px-1 rounded text-brand-400">trust.gigachad-grc.com</code></li>
                <li><strong>Important:</strong> Set proxy status to "DNS only" (gray cloud)</li>
                <li>Click <strong>Save</strong></li>
              </ol>
              <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mt-2">
                <p className="text-red-400 text-xs">
                  ⚠️ Make sure the proxy is disabled (gray cloud). Orange cloud may cause SSL issues.
                </p>
              </div>
            </div>
          </details>

          {/* GoDaddy */}
          <details className="bg-surface-800/50 border border-surface-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-surface-200 font-medium hover:bg-surface-800 rounded-lg">
              GoDaddy
            </summary>
            <div className="px-4 pb-4 text-sm text-surface-400 space-y-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to your GoDaddy Account</li>
                <li>Go to <strong>My Products</strong> → <strong>Domains</strong></li>
                <li>Click <strong>DNS</strong> next to your domain</li>
                <li>Click <strong>Add</strong> in the Records section</li>
                <li>Set Type to CNAME, Name to your subdomain, Value to <code className="bg-surface-800 px-1 rounded text-brand-400">trust.gigachad-grc.com</code></li>
                <li>Set TTL to 1 Hour</li>
                <li>Click <strong>Save</strong></li>
              </ol>
            </div>
          </details>

          {/* Route 53 */}
          <details className="bg-surface-800/50 border border-surface-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-surface-200 font-medium hover:bg-surface-800 rounded-lg">
              Amazon Route 53
            </summary>
            <div className="px-4 pb-4 text-sm text-surface-400 space-y-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to the AWS Console</li>
                <li>Navigate to <strong>Route 53</strong> → <strong>Hosted zones</strong></li>
                <li>Click on your domain</li>
                <li>Click <strong>Create record</strong></li>
                <li>Enter your subdomain, select CNAME, enter <code className="bg-surface-800 px-1 rounded text-brand-400">trust.gigachad-grc.com</code></li>
                <li>Set TTL to 300</li>
                <li>Click <strong>Create records</strong></li>
              </ol>
            </div>
          </details>

          {/* Namecheap */}
          <details className="bg-surface-800/50 border border-surface-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-surface-200 font-medium hover:bg-surface-800 rounded-lg">
              Namecheap
            </summary>
            <div className="px-4 pb-4 text-sm text-surface-400 space-y-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to your Namecheap Account</li>
                <li>Go to <strong>Domain List</strong> → click <strong>Manage</strong></li>
                <li>Click <strong>Advanced DNS</strong></li>
                <li>Click <strong>Add New Record</strong></li>
                <li>Select CNAME, enter your subdomain, value <code className="bg-surface-800 px-1 rounded text-brand-400">trust.gigachad-grc.com</code></li>
                <li>Click the checkmark to save</li>
              </ol>
            </div>
          </details>

          {/* Google Domains */}
          <details className="bg-surface-800/50 border border-surface-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-surface-200 font-medium hover:bg-surface-800 rounded-lg">
              Google Domains / Squarespace
            </summary>
            <div className="px-4 pb-4 text-sm text-surface-400 space-y-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to Google Domains or Squarespace Domains</li>
                <li>Select your domain</li>
                <li>Click <strong>DNS</strong> in the sidebar</li>
                <li>Scroll to <strong>Custom records</strong></li>
                <li>Add CNAME record with your subdomain pointing to <code className="bg-surface-800 px-1 rounded text-brand-400">trust.gigachad-grc.com</code></li>
                <li>Click <strong>Save</strong></li>
              </ol>
            </div>
          </details>
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Verify Your Configuration</h2>
        <p className="text-surface-300 mb-4">
          DNS changes can take anywhere from a few minutes to 48 hours to propagate (most take under 30 minutes).
        </p>

        <h3 className="text-lg font-semibold text-surface-200 mb-3">How to Check DNS Propagation</h3>
        <ul className="space-y-3 text-surface-300 mb-4">
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Use <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">DNS Checker</a> to verify global propagation</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Or run from terminal: <code className="bg-surface-800 px-2 py-0.5 rounded text-brand-400">dig trust.yourcompany.com CNAME</code></span>
          </li>
        </ul>
      </section>

      {/* SSL */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">SSL Certificate</h2>
        <p className="text-surface-300 mb-4">
          GigaChad GRC automatically provisions a free SSL/TLS certificate for your custom domain using Let's Encrypt.
        </p>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Starts automatically once DNS propagation is detected</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Takes 5-15 minutes to complete</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Renews automatically before expiration</span>
          </li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">FAQ</h2>
        <div className="space-y-4">
          {[
            {
              q: 'How long does DNS propagation take?',
              a: 'Most DNS changes propagate within 5-30 minutes, but can take up to 48 hours in some cases.',
            },
            {
              q: 'Can I use my root domain (e.g., yourcompany.com)?',
              a: 'We recommend using a subdomain (e.g., trust.yourcompany.com) as it\'s easier to configure and won\'t affect your main website.',
            },
            {
              q: 'Do I need to renew the SSL certificate?',
              a: 'No, GigaChad GRC automatically renews SSL certificates before they expire.',
            },
            {
              q: 'What if I don\'t have DNS access?',
              a: 'Contact your IT administrator with the CNAME record details: Type=CNAME, Host=trust, Value=trust.gigachad-grc.com',
            },
          ].map((faq, i) => (
            <details key={i} className="bg-surface-800/50 border border-surface-700 rounded-lg">
              <summary className="px-4 py-3 cursor-pointer text-surface-200 font-medium hover:bg-surface-800 rounded-lg">
                {faq.q}
              </summary>
              <div className="px-4 pb-4 text-sm text-surface-400">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/trust-center/settings"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <GlobeAltIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Trust Center Settings</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/trust-center"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <GlobeAltIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Manage Trust Center Content</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Getting Started with Trust Center Article
function TrustCenterGettingStartedArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          Your Trust Center is a public-facing security portal that showcases your organization's security posture,
          compliance certifications, and security documentation to prospects, customers, and partners. It serves as
          a central hub for security information, reducing the need for repetitive security questionnaires.
        </p>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">What you can showcase:</h4>
          <ul className="text-surface-400 space-y-1 text-sm list-disc list-inside">
            <li><strong>Compliance certifications</strong> - SOC 2, ISO 27001, HIPAA, GDPR badges</li>
            <li><strong>Security policies</strong> - Share approved policy documents</li>
            <li><strong>Security features</strong> - Encryption, access controls, monitoring</li>
            <li><strong>Privacy practices</strong> - Data handling and retention policies</li>
            <li><strong>Incident response</strong> - Your approach to security incidents</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Enable Your Trust Center</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Navigate to <strong>Trust</strong> → <strong>Trust Center Settings</strong> in the sidebar</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>On the <strong>General</strong> tab, toggle <strong>Enable Trust Center</strong> to on</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Enter your <strong>Security Email</strong> for inquiries</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Optionally add a <strong>Support URL</strong> for additional resources</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Configure Branding</h2>
        <p className="text-surface-300 mb-4">
          Make your Trust Center match your brand identity:
        </p>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Click on the <strong>Branding</strong> tab</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Enter your <strong>Company Name</strong> as you want it displayed</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Add a <strong>Description</strong> (e.g., "Security-first cloud platform")</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Upload your <strong>Logo URL</strong> (recommended: 200x50px PNG with transparency)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Select a <strong>Primary Color</strong> that matches your brand</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Choose Content Sections</h2>
        <p className="text-surface-300 mb-4">
          Select which sections to display on your Trust Center:
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Section</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200 font-medium">Certifications</td>
                <td className="px-4 py-3 text-surface-400">Display compliance badges (SOC 2, ISO 27001, etc.)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-medium">Policies</td>
                <td className="px-4 py-3 text-surface-400">Share security and privacy policy documents</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-medium">Security Features</td>
                <td className="px-4 py-3 text-surface-400">Highlight encryption, access controls, monitoring</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-medium">Privacy</td>
                <td className="px-4 py-3 text-surface-400">Data handling, retention, and privacy practices</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-medium">Incident Response</td>
                <td className="px-4 py-3 text-surface-400">Your incident response procedures and contacts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 4: Add Content</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Navigate to <strong>Trust</strong> → <strong>Trust Center</strong> in the sidebar</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>Add Content</strong> for each section you want to populate</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Enter a <strong>Title</strong> and <strong>Description</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Optionally upload documents or add external links</span>
          </li>
        </ol>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
          <p className="text-blue-400 text-sm">
            <strong>Tip:</strong> Start with your compliance certifications and most-requested security documentation to provide immediate value to visitors.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 5: Share Your Trust Center</h2>
        <p className="text-surface-300 mb-4">
          Once configured, share your Trust Center with stakeholders:
        </p>
        <ul className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Direct Link:</strong> Copy the URL from Trust Center Settings → Embed Code tab</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Website Embed:</strong> Use the iframe code to embed on your website</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Security Button:</strong> Add a branded "Security" button to your site</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Custom Domain:</strong> Set up a custom URL like trust.yourcompany.com</span>
          </li>
        </ul>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/help/trust-center/custom-domain"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <GlobeAltIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Set Up a Custom URL</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/trust-center/settings"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <GlobeAltIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Trust Center Settings</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Connecting Integrations Article
function IntegrationsOverviewArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          Integrations connect GigaChad GRC to your existing tools and systems to automate evidence collection,
          sync compliance data, and streamline your security workflows. Instead of manually gathering screenshots
          and documents, integrations pull data directly from your systems.
        </p>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">Integration categories:</h4>
          <ul className="text-surface-400 space-y-1 text-sm list-disc list-inside">
            <li><strong>Cloud Providers</strong> - AWS, Azure, GCP configuration evidence</li>
            <li><strong>Identity & Access</strong> - Okta, Azure AD user access reviews</li>
            <li><strong>DevOps & CI/CD</strong> - GitHub, GitLab, Jenkins security configs</li>
            <li><strong>Security Tools</strong> - Vulnerability scanners, SIEM, EDR</li>
            <li><strong>HR & Background Check</strong> - Employee verification, training records</li>
            <li><strong>Communication</strong> - Slack, Teams for audit trails</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Browse Available Integrations</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Navigate to <strong>Data</strong> → <strong>Integrations</strong> in the sidebar</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Browse by category or use the search bar to find specific integrations</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Click on an integration card to view details and configuration options</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Configure an Integration</h2>
        <p className="text-surface-300 mb-4">
          GigaChad GRC offers three ways to configure integrations:
        </p>

        <div className="space-y-4">
          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">Quick Setup (No-Code)</h4>
            <p className="text-surface-400 text-sm mb-2">
              Best for standard integrations. Enter your credentials and select what data to collect.
            </p>
            <ul className="text-surface-400 text-sm list-disc list-inside">
              <li>Enter API key, client ID/secret, or OAuth credentials</li>
              <li>Select data categories to collect (users, configs, logs, etc.)</li>
              <li>Choose sync frequency (hourly, daily, weekly)</li>
              <li>Test connection and save</li>
            </ul>
          </div>

          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">Advanced Builder (Low-Code)</h4>
            <p className="text-surface-400 text-sm mb-2">
              For custom configurations. Build API calls visually with response mapping.
            </p>
            <ul className="text-surface-400 text-sm list-disc list-inside">
              <li>Configure authentication (API Key, OAuth, Basic Auth)</li>
              <li>Add custom API endpoints with headers and parameters</li>
              <li>Map response fields to evidence types</li>
              <li>Test and preview responses</li>
            </ul>
          </div>

          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">Raw API (Code)</h4>
            <p className="text-surface-400 text-sm mb-2">
              For engineers. Write custom API calls or JavaScript code directly.
            </p>
            <ul className="text-surface-400 text-sm list-disc list-inside">
              <li>Paste cURL commands or raw HTTP requests</li>
              <li>Write custom JavaScript for complex logic</li>
              <li>Full control over request/response handling</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Select Evidence to Collect</h2>
        <p className="text-surface-300 mb-4">
          Each integration can collect different types of evidence. Common evidence types include:
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Evidence Type</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200">User Lists</td>
                <td className="px-4 py-3 text-surface-400">Active users, roles, last login dates</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Access Reviews</td>
                <td className="px-4 py-3 text-surface-400">Permission assignments, group memberships</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Security Configs</td>
                <td className="px-4 py-3 text-surface-400">MFA settings, password policies, encryption</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Audit Logs</td>
                <td className="px-4 py-3 text-surface-400">Login events, configuration changes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Vulnerability Scans</td>
                <td className="px-4 py-3 text-surface-400">Scan results, remediation status</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <strong>Tip:</strong> Start with the evidence types required for your current compliance frameworks. You can always add more later.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 4: Test and Monitor</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Click <strong>Test Connection</strong> to verify credentials work</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Run a <strong>Manual Sync</strong> to pull initial data</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Review collected evidence in <strong>Data</strong> → <strong>Evidence</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Monitor sync status on the Integrations page</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Security & Credentials</h2>
        <p className="text-surface-300 mb-4">
          Your integration credentials are protected:
        </p>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>All credentials encrypted with AES-256-GCM at rest</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Credentials never displayed after initial entry (masked as ••••••)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>API keys can be rotated without losing configuration</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>OAuth tokens automatically refreshed</span>
          </li>
        </ul>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/integrations"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <LinkIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Browse Integrations</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/evidence"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <ClipboardDocumentIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">View Evidence</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Managing Compliance Frameworks Article
function ComplianceFrameworksArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          Compliance frameworks in GigaChad GRC help you track and manage your organization's adherence to
          security standards and regulations. Whether you're pursuing SOC 2, ISO 27001, HIPAA, or multiple
          frameworks simultaneously, the platform maps your controls to framework requirements.
        </p>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">Supported frameworks include:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-surface-400 text-sm">
            <span>• SOC 2 Type I & II</span>
            <span>• ISO 27001:2022</span>
            <span>• HIPAA</span>
            <span>• GDPR</span>
            <span>• PCI DSS 4.0.1</span>
            <span>• NIST CSF</span>
            <span>• NIST 800-53</span>
            <span>• CIS Controls</span>
            <span>• FedRAMP</span>
            <span>• CCPA</span>
            <span>• SOX</span>
            <span>• CMMC</span>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Add a Framework</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Navigate to <strong>Compliance</strong> → <strong>Frameworks</strong> in the sidebar</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>Add Framework</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Select a framework from the library or create a custom framework</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Choose which requirements/controls are applicable to your organization</span>
          </li>
        </ol>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
          <p className="text-blue-400 text-sm">
            <strong>Tip:</strong> If you're new to compliance, start with SOC 2 Type II - it's widely recognized and covers foundational security controls that map well to other frameworks.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Map Controls to Requirements</h2>
        <p className="text-surface-300 mb-4">
          Each framework has requirements that need to be satisfied. Map your existing controls to these requirements:
        </p>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Click on a framework requirement to view details</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>Map Control</strong> and select existing controls or create new ones</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>One control can satisfy multiple requirements (cross-framework mapping)</span>
          </li>
        </ol>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">Control mapping example:</h4>
          <p className="text-surface-400 text-sm">
            A "Multi-Factor Authentication" control might satisfy:
          </p>
          <ul className="text-surface-400 text-sm list-disc list-inside mt-2">
            <li>SOC 2 CC6.1 - Logical access security</li>
            <li>ISO 27001 A.9.4.2 - Secure log-on procedures</li>
            <li>HIPAA §164.312(d) - Person or entity authentication</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Track Compliance Status</h2>
        <p className="text-surface-300 mb-4">
          Monitor your compliance posture with real-time dashboards:
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Compliant</span></td>
                <td className="px-4 py-3 text-surface-400">All mapped controls are implemented with current evidence</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Partial</span></td>
                <td className="px-4 py-3 text-surface-400">Some controls implemented, evidence may be outdated</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Non-Compliant</span></td>
                <td className="px-4 py-3 text-surface-400">Required controls missing or failed testing</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-surface-600 text-surface-300 rounded text-xs">Not Applicable</span></td>
                <td className="px-4 py-3 text-surface-400">Requirement doesn't apply to your organization</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 4: Prepare for Audits</h2>
        <p className="text-surface-300 mb-4">
          When audit time comes, GigaChad GRC helps you:
        </p>
        <ul className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Generate reports</strong> - Export compliance status by framework</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Collect evidence</strong> - Pull together all evidence for each control</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Track requests</strong> - Manage auditor evidence requests in one place</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span><strong>Identify gaps</strong> - See what needs attention before the audit</span>
          </li>
        </ul>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/frameworks"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <ShieldCheckIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">View Frameworks</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/controls"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <ShieldCheckIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Manage Controls</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Third-Party Vendor Management Article
function VendorManagementArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          Third-Party Risk Management (TPRM) helps you assess, monitor, and manage the security risks introduced
          by your vendors, suppliers, and service providers. A single vendor breach can impact your organization,
          making vendor security a critical component of your overall security program.
        </p>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">Key TPRM capabilities:</h4>
          <ul className="text-surface-400 space-y-1 text-sm list-disc list-inside">
            <li><strong>Vendor inventory</strong> - Centralized database of all third parties</li>
            <li><strong>Risk assessments</strong> - Evaluate vendor security posture</li>
            <li><strong>Questionnaires</strong> - Send and track security questionnaires</li>
            <li><strong>Contract management</strong> - Track agreements and SLAs</li>
            <li><strong>Continuous monitoring</strong> - Ongoing risk surveillance</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Add Vendors to Your Inventory</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Navigate to <strong>Third Party Risk</strong> → <strong>Vendors</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>Add Vendor</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Enter vendor details: name, website, primary contact</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Categorize by type: SaaS, Infrastructure, Professional Services, etc.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Set initial risk tier: Critical, High, Medium, or Low</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Classify Vendor Risk</h2>
        <p className="text-surface-300 mb-4">
          Determine the appropriate level of due diligence based on data access and business impact:
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Risk Tier</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Criteria</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Review Frequency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Critical</span></td>
                <td className="px-4 py-3 text-surface-400">Access to sensitive data, critical infrastructure</td>
                <td className="px-4 py-3 text-surface-400">Quarterly</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">High</span></td>
                <td className="px-4 py-3 text-surface-400">Access to internal systems, PII</td>
                <td className="px-4 py-3 text-surface-400">Semi-annually</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Medium</span></td>
                <td className="px-4 py-3 text-surface-400">Limited data access, business operations</td>
                <td className="px-4 py-3 text-surface-400">Annually</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Low</span></td>
                <td className="px-4 py-3 text-surface-400">No data access, minimal business impact</td>
                <td className="px-4 py-3 text-surface-400">Every 2 years</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Conduct Risk Assessments</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Click on a vendor and select <strong>Start Assessment</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Choose an assessment template (SIG Lite, CAIQ, custom)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Send the questionnaire to the vendor contact</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Review responses and request certifications (SOC 2, ISO 27001)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Score the assessment and document findings</span>
          </li>
        </ol>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
          <p className="text-blue-400 text-sm">
            <strong>Tip:</strong> Request vendors' SOC 2 Type II reports first - they provide comprehensive assurance and can reduce questionnaire burden.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 4: Track Contracts and Renewals</h2>
        <p className="text-surface-300 mb-4">
          Link contracts to vendors for complete visibility:
        </p>
        <ul className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Upload contract documents and track key dates</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Set renewal reminders to trigger reassessment</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Document security requirements and SLAs</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Track compliance with contractual obligations</span>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 5: Monitor Ongoing Risk</h2>
        <p className="text-surface-300 mb-4">
          Vendor risk doesn't stop after initial assessment:
        </p>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Schedule periodic reassessments based on risk tier</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Track vendor security incidents and breaches</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Monitor for certification expirations</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Review vendor risk dashboard for changes</span>
          </li>
        </ul>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/vendors"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <BuildingOfficeIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Manage Vendors</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/contracts"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <ClipboardDocumentIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">View Contracts</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Managing Audits Article
function AuditManagementArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          The Audit module helps you manage internal and external audits from planning through remediation.
          Track evidence requests, coordinate with auditors, document findings, and ensure timely remediation
          of identified issues.
        </p>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">Audit management features:</h4>
          <ul className="text-surface-400 space-y-1 text-sm list-disc list-inside">
            <li><strong>Audit planning</strong> - Schedule and scope audits</li>
            <li><strong>Evidence requests</strong> - Track and fulfill auditor requests</li>
            <li><strong>Findings management</strong> - Document and track remediation</li>
            <li><strong>Audit reports</strong> - Generate status and completion reports</li>
            <li><strong>Audit log</strong> - Complete history of compliance activities</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Create an Audit</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Navigate to <strong>Audit</strong> → <strong>Audits</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>Create Audit</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Select audit type: SOC 2, ISO 27001, Internal, Custom</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Enter audit details: name, auditor firm, audit period dates</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Link to relevant compliance frameworks</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Manage Evidence Requests</h2>
        <p className="text-surface-300 mb-4">
          When auditors send requests, track them in one place:
        </p>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Click <strong>Add Request</strong> on an audit</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Enter the request description and due date</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Assign to a team member responsible for gathering evidence</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Link to existing evidence from integrations or upload documents</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Mark as complete when evidence is provided</span>
          </li>
        </ol>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
          <p className="text-blue-400 text-sm">
            <strong>Tip:</strong> Use the evidence library to quickly find and attach previously collected evidence. Integration-collected evidence is automatically timestamped and verified.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Track Audit Progress</h2>
        <p className="text-surface-300 mb-4">
          Monitor your audit status with the dashboard:
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Planning</span></td>
                <td className="px-4 py-3 text-surface-400">Audit scope and timeline being defined</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">In Progress</span></td>
                <td className="px-4 py-3 text-surface-400">Evidence collection and auditor review underway</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">Pending Review</span></td>
                <td className="px-4 py-3 text-surface-400">Awaiting final auditor review and report</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Completed</span></td>
                <td className="px-4 py-3 text-surface-400">Audit finished, report issued</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 4: Document and Remediate Findings</h2>
        <p className="text-surface-300 mb-4">
          When auditors identify issues, track them to resolution:
        </p>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Go to <strong>Audit</strong> → <strong>Findings</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>Add Finding</strong> and document the issue</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Set severity (Critical, High, Medium, Low)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Assign an owner and target remediation date</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Document remediation actions and evidence of resolution</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
            <span>Mark as resolved when complete</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 5: Review Audit History</h2>
        <p className="text-surface-300 mb-4">
          The Audit Log provides a complete history of compliance activities:
        </p>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>All changes to controls, evidence, and policies are logged</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>User actions are tracked with timestamps</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Filter by date range, user, or action type</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Export logs for external review or compliance evidence</span>
          </li>
        </ul>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/audits"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <ClipboardDocumentListIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">View Audits</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/audit"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <ClipboardDocumentListIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Audit Log</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Cloud Deployment Article Content
function CloudDeploymentArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          GigaChad GRC can be deployed to the cloud using Supabase for database/storage and Vercel for hosting.
          This guide covers the deployment process and configuration options.
        </p>

        <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4 mt-4">
          <p className="text-brand-400 text-sm">
            <strong>Estimated Monthly Cost:</strong> ~$45/month (Vercel Pro $20 + Supabase Pro $25)
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Prerequisites</h2>
        <ul className="space-y-2">
          {[
            'Okta Account - For enterprise SSO authentication',
            'Supabase Account - Free tier available at supabase.com',
            'Vercel Account - Free tier available at vercel.com',
            'Git Repository - GitHub, GitLab, or Bitbucket',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-surface-300">
              <span className="text-green-400">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Create Supabase Project</h2>
        <ol className="space-y-4 text-surface-300">
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
            <span>Log in to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Supabase</a></span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
            <span>Click "New Project"</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
            <div>
              <span>Configure your project:</span>
              <ul className="mt-2 ml-4 space-y-1 text-sm text-surface-400">
                <li>• <strong>Project Name:</strong> gigachad-grc</li>
                <li>• <strong>Database Password:</strong> Use a strong password</li>
                <li>• <strong>Region:</strong> Choose closest to your users</li>
              </ul>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">4</span>
            <span>Save your database password securely</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Configure Okta</h2>
        <ol className="space-y-4 text-surface-300">
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
            <span>In Okta Admin Console, go to <strong>Applications → Create App Integration</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
            <span>Select <strong>OIDC - OpenID Connect</strong> and <strong>Single-Page Application</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
            <div>
              <span>Configure redirect URIs:</span>
              <div className="bg-surface-800 rounded p-3 mt-2 text-sm font-mono text-surface-300">
                https://your-app.vercel.app/login/callback
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">4</span>
            <span>Note your <strong>Client ID</strong> and <strong>Issuer URL</strong></span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Deploy to Vercel</h2>
        <ol className="space-y-4 text-surface-300">
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
            <span>Import your Git repository in Vercel</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
            <span>Set environment variables (see table below)</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
            <span>Deploy!</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Environment Variables</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left py-2 text-surface-200">Variable</th>
                <th className="text-left py-2 text-surface-200">Description</th>
              </tr>
            </thead>
            <tbody className="text-surface-400">
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono text-brand-400">VITE_OKTA_ISSUER</td>
                <td className="py-2">Your Okta authorization server URL</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono text-brand-400">VITE_OKTA_CLIENT_ID</td>
                <td className="py-2">Okta application client ID</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono text-brand-400">DATABASE_URL</td>
                <td className="py-2">Supabase pooled connection string</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono text-brand-400">DIRECT_URL</td>
                <td className="py-2">Supabase direct connection string</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono text-brand-400">SUPABASE_URL</td>
                <td className="py-2">Supabase project URL</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono text-brand-400">SUPABASE_ANON_KEY</td>
                <td className="py-2">Supabase anonymous key</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono text-brand-400">SUPABASE_SERVICE_KEY</td>
                <td className="py-2">Supabase service role key</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-brand-400">ENCRYPTION_KEY</td>
                <td className="py-2">32-byte hex key for encryption</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 4: Run Database Migrations</h2>
        <p className="text-surface-300 mb-4">After first deployment, run:</p>
        <div className="bg-surface-800 rounded p-4 font-mono text-sm text-surface-300">
          npx prisma migrate deploy
        </div>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/help/deployment/supabase-vercel-migration"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <BookOpenIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Full Migration Guide</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Settings</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Supabase + Vercel Migration Article Content
function SupabaseVercelMigrationArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          This guide covers migrating GigaChad GRC from the Docker-based microservices architecture to
          Supabase (database/storage) + Vercel (frontend/serverless API) with Okta SSO authentication.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">Previous Architecture</h4>
            <ul className="text-surface-400 text-sm space-y-1">
              <li>• 6 NestJS microservices</li>
              <li>• PostgreSQL + Redis + RustFS</li>
              <li>• Keycloak authentication</li>
              <li>• Docker Compose orchestration</li>
            </ul>
          </div>
          <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-brand-300 mb-2">New Architecture</h4>
            <ul className="text-brand-400 text-sm space-y-1">
              <li>• Vercel serverless functions</li>
              <li>• Supabase PostgreSQL + Storage</li>
              <li>• Okta direct OIDC</li>
              <li>• Zero infrastructure management</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Migration Phases</h2>
        <div className="space-y-4">
          {[
            { phase: '1', title: 'Authentication Migration', desc: 'Replace Keycloak with Okta OIDC', time: '2-3 days' },
            { phase: '2', title: 'Database Migration', desc: 'Move PostgreSQL to Supabase', time: '1 day' },
            { phase: '3', title: 'API Migration', desc: 'Convert NestJS to Vercel functions', time: '5-7 days' },
            { phase: '4', title: 'Storage Migration', desc: 'Move RustFS to Supabase Storage', time: '1-2 days' },
            { phase: '5', title: 'Deployment', desc: 'Deploy to Vercel', time: '1 day' },
          ].map((item) => (
            <div key={item.phase} className="flex items-start gap-4 p-4 bg-surface-800/50 border border-surface-700 rounded-lg">
              <span className="bg-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {item.phase}
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-surface-200">{item.title}</h4>
                <p className="text-surface-400 text-sm">{item.desc}</p>
              </div>
              <span className="text-surface-500 text-sm">{item.time}</span>
            </div>
          ))}
        </div>
        <p className="text-surface-400 mt-4 text-sm">
          <strong>Total estimated time:</strong> 10-14 days
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Supabase Connection Strings</h2>
        <p className="text-surface-300 mb-4">
          Supabase uses two connection strings - pooled for queries and direct for migrations:
        </p>
        <div className="space-y-4">
          <div className="bg-surface-800 rounded-lg p-4">
            <h4 className="font-mono text-brand-400 text-sm mb-2">DATABASE_URL (Pooled - Port 6543)</h4>
            <p className="text-surface-400 text-sm mb-2">Use for all application queries. Handles connection pooling automatically.</p>
            <code className="text-surface-300 text-xs break-all">
              postgres://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres
            </code>
          </div>
          <div className="bg-surface-800 rounded-lg p-4">
            <h4 className="font-mono text-brand-400 text-sm mb-2">DIRECT_URL (Direct - Port 5432)</h4>
            <p className="text-surface-400 text-sm mb-2">Use only for database migrations and schema changes.</p>
            <code className="text-surface-300 text-xs break-all">
              postgres://postgres:[password]@db.[ref].supabase.co:5432/postgres
            </code>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Storage Buckets</h2>
        <p className="text-surface-300 mb-4">Create these buckets in Supabase Storage:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left py-2 text-surface-200">Bucket</th>
                <th className="text-left py-2 text-surface-200">Access</th>
                <th className="text-left py-2 text-surface-200">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-surface-400">
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono">evidence</td>
                <td className="py-2">Private</td>
                <td className="py-2">Evidence files and documents</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono">policies</td>
                <td className="py-2">Private</td>
                <td className="py-2">Policy document storage</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono">integrations</td>
                <td className="py-2">Private</td>
                <td className="py-2">Integration configuration</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 font-mono">questionnaires</td>
                <td className="py-2">Private</td>
                <td className="py-2">Questionnaire attachments</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">trust-center</td>
                <td className="py-2">Public</td>
                <td className="py-2">Trust center public assets</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Okta Configuration</h2>
        <div className="space-y-4">
          <div className="bg-surface-800 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">Application Settings</h4>
            <ul className="text-surface-400 text-sm space-y-1">
              <li>• <strong>Type:</strong> OIDC - Single-Page Application</li>
              <li>• <strong>Grant Type:</strong> Authorization Code with PKCE</li>
              <li>• <strong>Redirect URI:</strong> https://your-app.vercel.app/login/callback</li>
              <li>• <strong>Post-Logout URI:</strong> https://your-app.vercel.app</li>
            </ul>
          </div>
          <div className="bg-surface-800 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">Groups Claim (for roles)</h4>
            <p className="text-surface-400 text-sm mb-2">Add a groups claim to include user roles in tokens:</p>
            <ul className="text-surface-400 text-sm space-y-1">
              <li>• <strong>admin</strong> - Full access</li>
              <li>• <strong>compliance_manager</strong> - Manage controls, policies</li>
              <li>• <strong>auditor</strong> - View audit information</li>
              <li>• <strong>viewer</strong> - Read-only access</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Rollback Procedure</h2>
        <p className="text-surface-300 mb-4">If you need to rollback to the Docker architecture:</p>
        <ol className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
            <span>Update DNS to point to your Docker host</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
            <span>Restore database from backup</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
            <span>Start Docker services: <code className="bg-surface-800 px-1.5 py-0.5 rounded text-brand-400">docker-compose up -d</code></span>
          </li>
          <li className="flex gap-3">
            <span className="bg-surface-700 text-surface-200 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">4</span>
            <span>Update frontend .env to use legacy API endpoints</span>
          </li>
        </ol>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/help/deployment/cloud-deployment"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <BookOpenIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Cloud Deployment Guide</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/integrations"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <LinkIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Integrations</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// MCP Quick Start Article
function MCPQuickStartArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          Model Context Protocol (MCP) servers automate GRC workflows by connecting to external services to
          collect compliance evidence, run automated compliance checks, and provide AI-powered analysis.
          This guide walks you through setting up your first MCP server.
        </p>

        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-surface-200 mb-2">Available MCP Server Types:</h4>
          <ul className="text-surface-400 space-y-1 text-sm list-disc list-inside">
            <li><strong>GRC Evidence Collection</strong> - Automated evidence from AWS, Azure, GitHub, Okta, Google Workspace, Jamf</li>
            <li><strong>GRC Compliance Automation</strong> - Control testing and gap analysis for SOC 2, ISO 27001, HIPAA, GDPR</li>
            <li><strong>GRC AI Assistant</strong> - AI-powered risk analysis, policy drafting, and control suggestions</li>
            <li><strong>External Servers</strong> - GitHub, Slack, PostgreSQL, Puppeteer, and more</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 1: Access MCP Settings</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Navigate to <strong>Settings → MCP Servers</strong> in the sidebar</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>Add Server</strong> to open the template selection modal</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 2: Select a Template</h2>
        <p className="text-surface-300 mb-4">Choose the server type that matches your needs:</p>
        <div className="space-y-4">
          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">GRC Evidence Collection Server</h4>
            <p className="text-surface-400 text-sm mb-2">Best for automated evidence gathering from cloud providers and identity systems.</p>
            <p className="text-surface-500 text-xs">Integrations: AWS, Azure, GitHub, Okta, Google Workspace, Jamf</p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">GRC Compliance Automation Server</h4>
            <p className="text-surface-400 text-sm mb-2">Best for running automated compliance checks against your controls.</p>
            <p className="text-surface-500 text-xs">Capabilities: Control testing, gap analysis, policy validation</p>
          </div>
          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
            <h4 className="font-semibold text-surface-200 mb-2">GRC AI Assistant Server</h4>
            <p className="text-surface-400 text-sm mb-2">Best for AI-powered analysis and recommendations.</p>
            <p className="text-surface-500 text-xs">Requires: OpenAI or Anthropic API key</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 3: Configure Credentials</h2>
        <p className="text-surface-300 mb-4">
          After selecting a template, configure the integrations you want to use. Expand each section and enter your API credentials:
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Integration</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Required Credentials</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200">AWS</td>
                <td className="px-4 py-3 text-surface-400 font-mono text-xs">AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Azure</td>
                <td className="px-4 py-3 text-surface-400 font-mono text-xs">AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">GitHub</td>
                <td className="px-4 py-3 text-surface-400 font-mono text-xs">GITHUB_TOKEN</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Okta</td>
                <td className="px-4 py-3 text-surface-400 font-mono text-xs">OKTA_DOMAIN, OKTA_API_TOKEN</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">OpenAI</td>
                <td className="px-4 py-3 text-surface-400 font-mono text-xs">OPENAI_API_KEY</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Anthropic</td>
                <td className="px-4 py-3 text-surface-400 font-mono text-xs">ANTHROPIC_API_KEY</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <strong>Tip:</strong> Only configure the integrations you need. Leave others blank and they won't be activated.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 4: Deploy and Connect</h2>
        <ol className="space-y-3 text-surface-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Click <strong>Deploy Server</strong> to create the server instance</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>The server will appear in your "Registered Servers" list</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Click the <strong>Play</strong> button to connect and start the server</span>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Step 5: View Server Details</h2>
        <p className="text-surface-300 mb-4">
          Click on any registered server to view detailed information:
        </p>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span><strong>Server Information</strong> - ID, transport, creation date, created by</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span><strong>Configuration Details</strong> - Configured integrations and evidence types (for auditors)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span><strong>Credential Status</strong> - Which providers have credentials configured</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span><strong>Available Tools</strong> - Tools exposed by the server when connected</span>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Security</h2>
        <p className="text-surface-300 mb-4">
          All MCP server credentials are protected with enterprise-grade security:
        </p>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Encrypted at rest using AES-256-GCM</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Credentials never exposed via API (only masked versions shown)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Full audit trail of who created and when</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Secure key derivation using SCRYPT</span>
          </li>
        </ul>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/help/mcp/credential-security"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <ShieldCheckIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">MCP Credential Security</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/settings/mcp"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">MCP Settings</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// MCP Credential Security Article
function MCPCredentialSecurityArticle() {
  return (
    <article className="prose prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Overview</h2>
        <p className="text-surface-300">
          MCP server credentials (API keys, tokens, secrets) are protected using industry-standard encryption.
          This document explains the security architecture and provides recommendations for production deployments.
        </p>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-green-300 mb-2">Security Highlights</h4>
          <ul className="text-green-400 space-y-1 text-sm list-disc list-inside">
            <li>AES-256-GCM encryption (military-grade)</li>
            <li>Unique IV per encryption operation</li>
            <li>Authentication tags prevent tampering</li>
            <li>Credentials never exposed via API</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Encryption Details</h2>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Component</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Specification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200">Algorithm</td>
                <td className="px-4 py-3 text-surface-400">AES-256-GCM</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Key Derivation</td>
                <td className="px-4 py-3 text-surface-400">SCRYPT with salt</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">IV Size</td>
                <td className="px-4 py-3 text-surface-400">128 bits (16 bytes), random per operation</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Auth Tag Size</td>
                <td className="px-4 py-3 text-surface-400">128 bits (16 bytes)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200">Storage</td>
                <td className="px-4 py-3 text-surface-400">PostgreSQL (encrypted JSON)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Configuration</h2>
        <p className="text-surface-300 mb-4">
          Set the encryption key via environment variable:
        </p>
        <div className="bg-surface-900 rounded-lg p-4 font-mono text-sm text-green-400 mb-4">
          MCP_ENCRYPTION_KEY=your-64-character-random-string
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
          <h4 className="font-semibold text-surface-200 mb-2">Generate a Secure Key:</h4>
          <div className="bg-surface-900 rounded-lg p-3 font-mono text-sm text-surface-300 mt-2">
            openssl rand -hex 32
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
          <p className="text-red-400 text-sm">
            <strong>⚠️ Critical:</strong> Never use the default encryption key in production. Generate a unique key for each environment.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">What's Protected</h2>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>API keys (AWS, Azure, GitHub, etc.)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Access tokens and secrets</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Passwords and credentials</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Client secrets</span>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">What's NOT Exposed</h2>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-red-400">✗</span>
            <span>Full credential values are never returned by any API</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400">✗</span>
            <span>Encryption keys are never logged or exposed</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400">✗</span>
            <span>Decrypted credentials are never persisted to disk</span>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Audit Trail</h2>
        <p className="text-surface-300 mb-4">
          Every MCP server configuration records:
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Field</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono">created_by</td>
                <td className="px-4 py-3 text-surface-400">User who created the configuration</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono">created_at</td>
                <td className="px-4 py-3 text-surface-400">Timestamp of creation</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono">last_updated</td>
                <td className="px-4 py-3 text-surface-400">Last modification timestamp</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono">configured_integrations</td>
                <td className="px-4 py-3 text-surface-400">Which integrations have credentials</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Recommendations</h2>
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-300 mb-2">🔴 Critical</h4>
            <ul className="text-red-400 text-sm space-y-1 list-disc list-inside">
              <li>Generate a unique 64+ character encryption key</li>
              <li>Store key in a secrets manager (AWS Secrets Manager, HashiCorp Vault)</li>
              <li>Enable TLS/HTTPS for all API endpoints</li>
            </ul>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-300 mb-2">🟡 Important</h4>
            <ul className="text-yellow-400 text-sm space-y-1 list-disc list-inside">
              <li>Implement key rotation annually</li>
              <li>Enable database encryption (TDE)</li>
              <li>Monitor failed decryption attempts</li>
              <li>Implement rate limiting on credential APIs</li>
            </ul>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-300 mb-2">🟢 Best Practices</h4>
            <ul className="text-green-400 text-sm space-y-1 list-disc list-inside">
              <li>Use Hardware Security Modules (HSM) for key storage</li>
              <li>Implement multi-tenant key isolation</li>
              <li>Set up credential expiration reminders</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-surface-800 pt-8">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/help/mcp/quick-start"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <BookOpenIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">MCP Quick Start Guide</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/settings/mcp"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">MCP Settings</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </section>
    </article>
  );
}

// Article Router
export default function HelpArticle() {
  const { category, article } = useParams<{ category: string; article: string }>();

  // Map articles to components
  const getArticleContent = () => {
    // MCP articles
    if (category === 'mcp' && article === 'quick-start') {
      return {
        title: 'MCP Server Quick Start Guide',
        breadcrumb: 'MCP & Automation',
        component: <MCPQuickStartArticle />,
      };
    }

    if (category === 'mcp' && article === 'credential-security') {
      return {
        title: 'MCP Credential Security',
        breadcrumb: 'MCP & Automation',
        component: <MCPCredentialSecurityArticle />,
      };
    }

    if (category === 'mcp' && article === 'evidence-collection') {
      return {
        title: 'Automated Evidence Collection',
        breadcrumb: 'MCP & Automation',
        component: <MCPQuickStartArticle />, // Reuse for now
      };
    }

    if (category === 'security' && article === 'encryption') {
      return {
        title: 'Data Encryption & Security',
        breadcrumb: 'Security',
        component: <MCPCredentialSecurityArticle />, // Reuse for now
      };
    }

    if (category === 'trust-center' && article === 'custom-domain') {
      return {
        title: 'Set Up a Custom URL for Your Trust Center',
        breadcrumb: 'Trust Center',
        component: <TrustCenterCustomDomainArticle />,
      };
    }

    if (category === 'trust-center' && article === 'getting-started') {
      return {
        title: 'Getting Started with Trust Center',
        breadcrumb: 'Trust Center',
        component: <TrustCenterGettingStartedArticle />,
      };
    }

    if (category === 'integrations' && article === 'overview') {
      return {
        title: 'Connecting Integrations',
        breadcrumb: 'Integrations',
        component: <IntegrationsOverviewArticle />,
      };
    }

    if (category === 'compliance' && article === 'frameworks') {
      return {
        title: 'Managing Compliance Frameworks',
        breadcrumb: 'Compliance',
        component: <ComplianceFrameworksArticle />,
      };
    }

    if (category === 'tprm' && article === 'vendors') {
      return {
        title: 'Third-Party Vendor Management',
        breadcrumb: 'Third-Party Risk',
        component: <VendorManagementArticle />,
      };
    }

    if (category === 'audit' && article === 'management') {
      return {
        title: 'Managing Audits and Evidence Requests',
        breadcrumb: 'Audit',
        component: <AuditManagementArticle />,
      };
    }

    if (category === 'deployment' && article === 'cloud-deployment') {
      return {
        title: 'Cloud Deployment Guide',
        breadcrumb: 'Deployment',
        component: <CloudDeploymentArticle />,
      };
    }

    if (category === 'deployment' && article === 'supabase-vercel-migration') {
      return {
        title: 'Supabase + Vercel Migration Guide',
        breadcrumb: 'Deployment',
        component: <SupabaseVercelMigrationArticle />,
      };
    }

    // Default "not found" for unknown articles
    return {
      title: 'Article Not Found',
      breadcrumb: category || 'Help',
      component: (
        <div className="text-center py-16">
          <GlobeAltIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-surface-200 mb-2">Article Not Found</h2>
          <p className="text-surface-400 mb-6">The help article you're looking for doesn't exist.</p>
          <Link
            to="/help"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Help Center
          </Link>
        </div>
      ),
    };
  };

  const articleData = getArticleContent();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-surface-400 mb-6">
        <Link to="/help" className="hover:text-surface-200">Help Center</Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="capitalize">{articleData.breadcrumb}</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-surface-200">{articleData.title}</span>
      </nav>

      {/* Back Link */}
      <Link
        to="/help"
        className="inline-flex items-center gap-2 text-surface-400 hover:text-surface-200 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Help Center
      </Link>

      {/* Article Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-surface-100">{articleData.title}</h1>
        <p className="text-surface-500 text-sm mt-2">Last updated: December 2025</p>
      </header>

      {/* Article Content */}
      {articleData.component}
    </div>
  );
}

