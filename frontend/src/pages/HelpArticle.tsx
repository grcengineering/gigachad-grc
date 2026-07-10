import { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/ui';

interface ArticleBlockHeading {
  type: 'heading';
  text: string;
}
interface ArticleBlockParagraph {
  type: 'paragraph';
  text: string;
}
interface ArticleBlockList {
  type: 'list';
  items: string[];
}
interface ArticleBlockCode {
  type: 'code';
  code: string;
  language?: string;
}

type ArticleBlock =
  ArticleBlockHeading | ArticleBlockParagraph | ArticleBlockList | ArticleBlockCode;

interface HelpArticle {
  slug: string;
  title: string;
  summary?: string;
  blocks: ArticleBlock[];
}

interface HelpCategoryRecord {
  id: string;
  name: string;
  articles: HelpArticle[];
}

const HELP_ARTICLES: HelpCategoryRecord[] = [
  {
    id: 'getting-started',
    name: 'Getting started',
    articles: [
      {
        slug: 'welcome',
        title: 'Welcome to GigaChad GRC',
        summary: 'Overview of the platform and where to find things.',
        blocks: [
          {
            type: 'paragraph',
            text: 'GigaChad GRC is a compliance, risk, and governance platform. This guide walks you through the workspace, the side navigation, and where to find your first set of controls.',
          },
          { type: 'heading', text: 'Your workspace' },
          {
            type: 'paragraph',
            text: 'Each organization gets a workspace with its own controls, frameworks, evidence, risks, and audits. Switching workspaces (top-left) re-scopes every page.',
          },
          { type: 'heading', text: 'What to do first' },
          {
            type: 'list',
            items: [
              'Enable a framework from the Framework Library.',
              'Invite teammates from the Users page.',
              'Upload your first evidence artifact.',
              'Configure your trust center under Trust Center → Settings.',
            ],
          },
        ],
      },
      {
        slug: 'invite-teammates',
        title: 'Inviting your teammates',
        summary: 'How to invite users and assign permission groups.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Open Users → Invite to send an invitation email. Each invite includes an optional permission group, which controls what the user can read and edit.',
          },
          { type: 'heading', text: 'Permission groups' },
          {
            type: 'paragraph',
            text: 'Permission groups are managed under Settings → Permissions. The defaults — Admin, Editor, Auditor, Viewer — cover most cases.',
          },
        ],
      },
      {
        slug: 'keyboard-shortcuts',
        title: 'Keyboard shortcuts',
        summary: 'Speed up your workflow with global shortcuts.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Press ? anywhere in the app to see the full list of shortcuts. The command palette opens with Cmd+K (Ctrl+K on Windows).',
          },
        ],
      },
    ],
  },
  {
    id: 'controls',
    name: 'Controls',
    articles: [
      {
        slug: 'creating-controls',
        title: 'Creating and editing controls',
        summary: 'How to define your control library.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Controls represent the policies and technical safeguards your organization uses to meet compliance requirements. Each control has a short code (e.g., AC-2), a name, an owner, and an implementation status.',
          },
          { type: 'heading', text: 'Bulk upload' },
          {
            type: 'paragraph',
            text: 'For larger libraries, use the CSV bulk upload from the Controls page header. Download the template first to see the expected columns.',
          },
          {
            type: 'code',
            language: 'csv',
            code: `code,name,category,status
AC-2,Account Management,access-control,implemented
IA-2,Multi-Factor Authentication,identity,planned`,
          },
        ],
      },
      {
        slug: 'mapping-controls',
        title: 'Mapping controls to requirements',
        summary: 'Link controls to framework requirements for coverage scoring.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Use the Mappings page or the requirement detail drawer to attach controls to framework requirements. The readiness score on each framework updates automatically.',
          },
        ],
      },
    ],
  },
  {
    id: 'frameworks',
    name: 'Frameworks',
    articles: [
      {
        slug: 'enable-framework',
        title: 'Enabling a framework from the library',
        summary: 'Add a pre-built framework template to your workspace.',
        blocks: [
          {
            type: 'paragraph',
            text: 'The Framework Library has pre-built templates for SOC 2, ISO 27001, HIPAA, PCI DSS, NIST, and more. Click Enable on a card to copy the framework, its categories, and its requirements into your workspace.',
          },
        ],
      },
      {
        slug: 'readiness-score',
        title: 'Understanding readiness scores',
        summary: 'How GigaChad calculates per-framework readiness.',
        blocks: [
          {
            type: 'paragraph',
            text: 'A readiness score is the percentage of requirements that have at least one implemented control mapped to them. Partial coverage and pending evidence reduce the score proportionally.',
          },
          { type: 'heading', text: 'Tiers' },
          {
            type: 'list',
            items: [
              'Green (80%+) — audit ready.',
              'Amber (50–79%) — meaningful coverage with gaps.',
              'Red (below 50%) — significant gaps remain.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'evidence',
    name: 'Evidence',
    articles: [
      {
        slug: 'uploading-evidence',
        title: 'Uploading evidence',
        summary: 'Attach files, links, and policies as evidence.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Evidence can be uploaded files, external URLs, or imports from connected integrations. Each evidence artifact can be linked to one or more controls.',
          },
        ],
      },
      {
        slug: 'expiry-and-reviews',
        title: 'Evidence expiry and reviews',
        summary: 'Stay ahead of expiring evidence with scheduled reviews.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Set an expiresAt date on each artifact. The platform sends notifications 30, 14, and 7 days before expiration to the artifact owner.',
          },
        ],
      },
    ],
  },
  {
    id: 'users',
    name: 'Users & permissions',
    articles: [
      {
        slug: 'permission-groups',
        title: 'Managing permission groups',
        summary: 'Create, edit, and assign permission groups.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Permission groups bundle resource + action pairs (e.g., controls:write, evidence:read). Open Settings → Permissions to manage groups, then assign users via Users → Edit → Group.',
          },
        ],
      },
      {
        slug: 'sso-setup',
        title: 'Setting up SSO',
        summary: 'Configure SAML or OIDC single sign-on.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Settings → SSO walks through the metadata exchange with your identity provider. Both SAML 2.0 and OIDC are supported.',
          },
        ],
      },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    articles: [
      {
        slug: 'trust-center',
        title: 'Configuring your trust center',
        summary: 'Publish a branded trust center for your prospects and customers.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Trust Center → Settings controls branding (logo, brand color), visibility (private, NDA-required, public), the NDA template itself, and which sections are published.',
          },
        ],
      },
      {
        slug: 'api-keys',
        title: 'Generating API keys',
        summary: 'Create and rotate API keys for integrations.',
        blocks: [
          {
            type: 'paragraph',
            text: 'Settings → API Keys lets you create scoped tokens. Treat the secret as a password — it is shown once at creation time and never again.',
          },
        ],
      },
    ],
  },
];

function renderBlock(block: ArticleBlock, index: number): ReactNode {
  switch (block.type) {
    case 'heading':
      return (
        <h3 key={index} className="text-h2 text-surface-900 mt-6 mb-2">
          {block.text}
        </h3>
      );
    case 'paragraph':
      return (
        <p key={index} className="text-body text-surface-700 leading-relaxed">
          {block.text}
        </p>
      );
    case 'list':
      return (
        <ul key={index} className="list-disc pl-6 space-y-1.5 text-body text-surface-700">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <pre
          key={index}
          className="rounded-md border border-surface-200 bg-surface-50/40 p-3 overflow-x-auto text-xs font-mono text-surface-800"
        >
          <code>{block.code}</code>
        </pre>
      );
  }
}

export default function HelpArticle() {
  const { category: categoryId, article: articleSlug } = useParams<{
    category: string;
    article: string;
  }>();

  const category = HELP_ARTICLES.find((c) => c.id === categoryId);
  const article = category?.articles.find((a) => a.slug === articleSlug);

  if (!category || !article) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/help"
          className="inline-flex items-center gap-1.5 text-small text-brand-700 hover:text-brand-800 hover:underline underline-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help Center
        </Link>
        <Card>
          <EmptyState
            title="Article not found"
            description="We couldn't find the article you're looking for."
          />
        </Card>
      </div>
    );
  }

  const related = category.articles.filter((a) => a.slug !== article.slug);

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/help"
        className="inline-flex items-center gap-1.5 text-small text-brand-700 hover:text-brand-800 hover:underline underline-offset-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Help Center
      </Link>

      <PageHeader title={article.title} description={article.summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <CardBody density="comfy">
              <div className="space-y-4">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                  {category.name}
                </p>
                {article.blocks.map((block, i) => renderBlock(block, i))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Related articles</CardTitle>
            </CardHeader>
            <CardBody density="compact">
              {related.length === 0 ? (
                <p className="text-small text-surface-600 px-2 py-2">
                  No other articles in this category yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {related.map((a) => (
                    <li key={a.slug}>
                      <Link
                        to={`/help/${category.id}/${a.slug}`}
                        className="block px-2 py-1.5 rounded-md text-body text-surface-800 hover:bg-surface-100 hover:text-brand-700 transition-colors"
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
