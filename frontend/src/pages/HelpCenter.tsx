import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  GlobeAltIcon,
  LinkIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  CpuChipIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

import { Input } from '@/components/ui/Input';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  href: string;
  external?: boolean;
}

const helpArticles: HelpArticle[] = [
  // MCP & Automation
  {
    id: 'mcp-quick-start',
    title: 'MCP Server Quick Start Guide',
    description:
      'Get started with Model Context Protocol (MCP) servers for automated evidence collection, compliance checks, and AI-powered analysis. Step-by-step setup guide.',
    category: 'MCP & Automation',
    href: '/help/mcp/quick-start',
  },
  {
    id: 'mcp-credential-security',
    title: 'MCP Credential Security',
    description:
      'Learn how MCP server credentials are securely stored using AES-256-GCM encryption. Includes configuration guide, best practices, and security recommendations.',
    category: 'MCP & Automation',
    href: '/help/mcp/credential-security',
  },
  {
    id: 'mcp-evidence-collection',
    title: 'Automated Evidence Collection',
    description:
      'Configure MCP servers to automatically collect compliance evidence from AWS, Azure, GitHub, Okta, and other services. Understand evidence types and collection schedules.',
    category: 'MCP & Automation',
    href: '/help/mcp/evidence-collection',
  },
  // Trust Center
  {
    id: 'trust-center-custom-domain',
    title: 'Set Up a Custom URL for Your Trust Center',
    description:
      'Learn how to configure a custom domain like trust.yourcompany.com for your public Trust Center. Includes step-by-step DNS configuration for Cloudflare, GoDaddy, Route53, and more.',
    category: 'Trust Center',
    href: '/help/trust-center/custom-domain',
  },
  {
    id: 'trust-center-getting-started',
    title: 'Getting Started with Trust Center',
    description:
      'Create and publish your public-facing security trust center. Learn how to enable, brand, and populate your Trust Center with security documentation.',
    category: 'Trust Center',
    href: '/help/trust-center/getting-started',
  },
  // Integrations
  {
    id: 'integrations-overview',
    title: 'Connecting Integrations',
    description:
      'Connect your cloud providers, identity systems, and security tools to automate evidence collection. Supports Quick Setup, Advanced Builder, and Raw API configurations.',
    category: 'Integrations',
    href: '/help/integrations/overview',
  },
  // Compliance
  {
    id: 'compliance-frameworks',
    title: 'Managing Compliance Frameworks',
    description:
      'Set up and manage compliance frameworks like SOC 2, ISO 27001, HIPAA, and more. Learn how to map controls to requirements and track compliance status.',
    category: 'Compliance',
    href: '/help/compliance/frameworks',
  },
  // Third-Party Risk
  {
    id: 'vendor-management',
    title: 'Third-Party Vendor Management',
    description:
      'Track, assess, and manage security risks from your third-party vendors. Includes vendor inventory, risk assessments, questionnaires, and contract management.',
    category: 'Third-Party Risk',
    href: '/help/tprm/vendors',
  },
  // Audit
  {
    id: 'audit-management',
    title: 'Managing Audits and Evidence Requests',
    description:
      'Organize audits, respond to evidence requests, track findings, and manage remediation. Complete guide to internal and external audit management.',
    category: 'Audit',
    href: '/help/audit/management',
  },
  // Security
  {
    id: 'encryption-overview',
    title: 'Data Encryption & Security',
    description:
      'Understand how GigaChad GRC protects sensitive data with AES-256-GCM encryption, secure key management, and defense-in-depth security architecture.',
    category: 'Security',
    href: '/help/security/encryption',
  },
  // Deployment
  {
    id: 'cloud-deployment',
    title: 'Cloud Deployment Guide',
    description:
      'Deploy GigaChad GRC to Supabase and Vercel for a fully managed cloud deployment. Includes Okta SSO configuration and step-by-step setup instructions.',
    category: 'Deployment',
    href: '/help/deployment/cloud-deployment',
  },
  {
    id: 'supabase-vercel-migration',
    title: 'Supabase + Vercel Migration Guide',
    description:
      'Complete technical guide for migrating from Docker-based deployment to Supabase + Vercel. Covers database migration, storage migration, and authentication setup.',
    category: 'Deployment',
    href: '/help/deployment/supabase-vercel-migration',
  },
];

const categories = [
  { name: 'MCP & Automation', icon: CpuChipIcon, color: 'text-indigo-600' },
  { name: 'Trust Center', icon: GlobeAltIcon, color: 'text-blue-600' },
  { name: 'Integrations', icon: LinkIcon, color: 'text-purple-600' },
  { name: 'Compliance', icon: ShieldCheckIcon, color: 'text-green-600' },
  { name: 'Risk Management', icon: ExclamationTriangleIcon, color: 'text-yellow-600' },
  { name: 'Third-Party Risk', icon: BuildingOfficeIcon, color: 'text-orange-600' },
  { name: 'Audit', icon: ClipboardDocumentListIcon, color: 'text-red-600' },
  { name: 'Security', icon: LockClosedIcon, color: 'text-emerald-600' },
  { name: 'Administration', icon: Cog6ToothIcon, color: 'text-surface-600' },
  { name: 'Deployment', icon: BookOpenIcon, color: 'text-cyan-600' },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredArticles = helpArticles.filter((article) => {
    const matchesSearch =
      searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-surface-100">Help Center</h1>
        <p className="mt-2 text-lg text-surface-600">
          Find guides, tutorials, and answers to common questions
        </p>
      </div>
      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <Input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.name;
          return (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(isSelected ? null : category.name)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                isSelected
                  ? 'bg-brand-600/20 border-brand-500 text-brand-400'
                  : 'bg-surface-800/50 border-surface-700 text-surface-600 hover:bg-surface-800 hover:text-surface-200'
              }`}
            >
              <Icon className={`w-6 h-6 ${isSelected ? 'text-brand-400' : category.color}`} />
              <span className="text-xs font-medium text-center">{category.name}</span>
            </button>
          );
        })}
      </div>
      {/* Featured Article - Custom Domain */}
      <div className="bg-gradient-to-r from-brand-600/20 to-purple-600/20 border border-brand-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand-600/20 rounded-lg">
            <GlobeAltIcon className="w-8 h-8 text-brand-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs bg-brand-600/30 text-brand-300 rounded">
                Featured
              </span>
            </div>
            <h3 className="text-xl font-semibold text-surface-100 mb-2">
              Set Up a Custom URL for Your Trust Center
            </h3>
            <p className="text-surface-600 mb-4">
              Configure a custom domain like trust.yourcompany.com to provide a branded experience
              for your Trust Center. Includes step-by-step DNS configuration guides for all major
              providers.
            </p>
            <Link
              to="/help/trust-center/custom-domain"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Read Guide
              <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
      {/* Articles Grid */}
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-4">
          {selectedCategory ? `${selectedCategory} Articles` : 'All Articles'}
          <span className="ml-2 text-sm font-normal text-surface-500">
            ({filteredArticles.length})
          </span>
        </h2>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-12 bg-surface-800/30 rounded-lg border border-surface-700">
            <BookOpenIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-600">No articles found matching your search</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
              }}
              className="mt-2 text-brand-400 hover:text-brand-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                to={article.href}
                className="group bg-surface-800/50 border border-surface-700 rounded-lg p-5 hover:bg-surface-800 hover:border-surface-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-0.5 text-xs bg-surface-700 text-surface-600 rounded">
                    {article.category}
                  </span>
                  {article.external && (
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 text-surface-500" />
                  )}
                </div>
                <h3 className="text-surface-100 font-medium mb-2 group-hover:text-brand-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-surface-500 line-clamp-2">{article.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
      {/* Quick Links */}
      <div className="border-t border-surface-800 pt-8">
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Developer Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/docs?section=api"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <BookOpenIcon className="w-5 h-5 text-surface-600" />
            <span className="text-surface-200">API Documentation</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/docs?section=architecture"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <BookOpenIcon className="w-5 h-5 text-surface-600" />
            <span className="text-surface-200">Architecture Guide</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
          <Link
            to="/docs?section=configuration"
            className="flex items-center gap-3 p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <BookOpenIcon className="w-5 h-5 text-surface-600" />
            <span className="text-surface-200">Configuration Guide</span>
            <ChevronRightIcon className="w-4 h-4 text-surface-500 ml-auto" />
          </Link>
        </div>
      </div>
      {/* Contact Support */}
      <div className="bg-surface-800/30 border border-surface-700 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-surface-100 mb-2">Still need help?</h3>
        <p className="text-surface-600 mb-4">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <a
          href="mailto:support@example.com"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-700 text-surface-200 rounded-lg hover:bg-surface-600 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
