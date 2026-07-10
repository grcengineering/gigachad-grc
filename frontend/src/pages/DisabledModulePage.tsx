import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock, Mail } from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';

interface ModuleMeta {
  label: string;
  body: string;
  capabilities: string[];
}

const MODULE_META: Record<string, ModuleMeta> = {
  risks: {
    label: 'Risk Management',
    body:
      "The Risk Management module isn't enabled for your workspace. Once turned on, you'll be able to register risks, assess likelihood and impact, and track treatment across the organization.",
    capabilities: [
      'Maintain a centralized risk register with ownership and review cadence',
      'Run qualitative and quantitative risk assessments',
      'Plan, approve, and track treatment activities',
      'Link risks to controls, assets, and scenarios',
    ],
  },
  vendors: {
    label: 'Vendor Risk Management',
    body:
      "The Vendor Risk module isn't enabled for your workspace. Once turned on, you'll be able to onboard, tier, and continuously monitor your third-party vendors.",
    capabilities: [
      'Centralize vendor inventory and contract details',
      'Tier vendors by criticality and data access',
      'Issue and grade security questionnaires',
      'Track contract renewals and recertifications',
    ],
  },
  audits: {
    label: 'Audit Management',
    body:
      "The Audit Management module isn't enabled for your workspace. Once turned on, you'll be able to plan engagements, collect evidence, and manage findings end-to-end.",
    capabilities: [
      'Plan internal, external, and certification engagements',
      'Issue evidence requests and collect responses',
      'Manage workpapers and audit procedures',
      'Track findings to remediation',
    ],
  },
  policies: {
    label: 'Policy Management',
    body:
      "The Policy Management module isn't enabled for your workspace. Once turned on, you'll be able to author, version, and attest to policies.",
    capabilities: [
      'Author policies with version history and approvals',
      'Distribute policies and collect attestations',
      'Map policies to controls and frameworks',
      'Schedule periodic policy reviews',
    ],
  },
  bcdr: {
    label: 'Business Continuity & DR',
    body:
      "The Business Continuity & DR module isn't enabled for your workspace. Once turned on, you'll be able to plan, test, and respond to incidents.",
    capabilities: [
      'Maintain BCDR plans for critical business processes',
      'Schedule and document DR tests',
      'Track incidents, communications, and post-mortems',
      'Map dependencies between processes and assets',
    ],
  },
};

const DEFAULT_META: ModuleMeta = {
  label: 'this module',
  body:
    "This module isn't enabled for your workspace. Reach out to your administrator to learn more about turning it on.",
  capabilities: [
    'Streamlined workflows tailored to this module',
    'Reporting and dashboards specific to this domain',
    'Integration with the rest of your GRC program',
  ],
};

function metaFor(slug: string | null): { meta: ModuleMeta; heading: string } {
  if (!slug) return { meta: DEFAULT_META, heading: "This module isn't enabled" };
  const lower = slug.toLowerCase();
  const meta = MODULE_META[lower] ?? DEFAULT_META;
  const heading =
    meta === DEFAULT_META
      ? `The ${slug} module isn't enabled`
      : `${meta.label} isn't enabled`;
  return { meta, heading };
}

export default function DisabledModulePage() {
  const [params] = useSearchParams();
  const moduleSlug = params.get('module');
  const { meta, heading } = metaFor(moduleSlug);

  const subject = encodeURIComponent(`Request to enable ${meta.label}`);
  const mailto = `mailto:admin@example.com?subject=${subject}`;

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <Card>
        <CardBody density="comfy" className="text-center space-y-5 py-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-surface-100 text-surface-600 mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-h1 text-surface-900">{heading}</h1>
            <p className="text-body text-surface-700 max-w-md mx-auto">{meta.body}</p>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <a href={mailto}>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Mail className="h-4 w-4" />}
              >
                Contact Admin
              </Button>
            </a>
            <Link to="/dashboard">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody density="comfy" className="space-y-3">
          <h2 className="text-h2 text-surface-900">
            What you&apos;d get with {meta.label}
          </h2>
          <ul className="space-y-2">
            {meta.capabilities.map((cap) => (
              <li key={cap} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-brand-700 shrink-0" />
                <span className="text-small text-surface-800">{cap}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
