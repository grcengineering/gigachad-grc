import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Link as LinkIcon, Shield, AlertTriangle, Users } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
  Skeleton,
  Tabs,
  type BadgeVariant,
} from '@/components/ui';

interface ProcessDependency {
  id: string;
  dependent_process_id?: string;
  dependent_process_name?: string;
  name?: string;
  dependency_type?: string;
}

interface ProcessAsset {
  id: string;
  asset_id?: string;
  asset_name?: string;
  asset_type?: string;
}

interface RecoveryStrategy {
  id: string;
  strategy_id?: string;
  name: string;
  status?: string;
  description?: string;
}

interface LinkedRisk {
  id: string;
  risk_id?: string;
  title: string;
  status?: string;
  inherent_risk?: string;
}

interface Stakeholder {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

interface BusinessProcessDetailData {
  id: string;
  process_id: string;
  name: string;
  description?: string;
  department?: string;
  category?: string;
  criticality_tier: string;
  criticality?: string;
  rto_hours?: number | null;
  rpo_hours?: number | null;
  mtpd_hours?: number | null;
  is_active?: boolean;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  impact_description?: string;
  recovery_priority?: number;
  minimum_staff_required?: number;
  alternate_site_required?: boolean;
  manual_workaround_available?: boolean;
  workaround_description?: string;
  next_review_due?: string | null;
  last_reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  dependencies?: ProcessDependency[];
  assets?: ProcessAsset[];
  recovery_strategies?: RecoveryStrategy[];
  linked_risks?: LinkedRisk[];
  stakeholders?: Stakeholder[];
  bcdr_plans?: Array<{ id: string; plan_id?: string; title: string; status?: string }>;
}

const TIER_VARIANT: Record<string, BadgeVariant> = {
  tier_1_critical: 'danger',
  tier_2_essential: 'warning',
  tier_3_important: 'info',
  tier_4_standard: 'neutral',
};

const TIER_LABELS: Record<string, string> = {
  tier_1_critical: 'Tier 1 — Critical',
  tier_2_essential: 'Tier 2 — Essential',
  tier_3_important: 'Tier 3 — Important',
  tier_4_standard: 'Tier 4 — Standard',
};

const STRATEGY_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  draft: 'neutral',
  archived: 'neutral',
  in_progress: 'warning',
};

const RISK_LEVEL_VARIANT: Record<string, BadgeVariant> = {
  very_low: 'success',
  low: 'success',
  medium: 'warning',
  high: 'danger',
  very_high: 'danger',
  critical: 'danger',
};

function humanize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-surface-500 uppercase tracking-wider">{label}</p>
      <div className="mt-1 text-body text-surface-900">{value}</div>
    </div>
  );
}

export default function BusinessProcessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: process, isLoading } = useQuery<BusinessProcessDetailData>({
    queryKey: ['business-process', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/processes/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!process) {
    return (
      <EmptyState
        title="Business process not found"
        description="The requested process could not be loaded."
        action={
          <Button variant="outline" onClick={() => navigate('/bcdr/processes')}>
            Back to processes
          </Button>
        }
      />
    );
  }

  const tierVariant = TIER_VARIANT[process.criticality_tier] ?? 'neutral';
  const tierLabel = TIER_LABELS[process.criticality_tier] ?? humanize(process.criticality_tier);

  const dependencies = process.dependencies ?? [];
  const strategies = process.recovery_strategies ?? [];
  const risks = process.linked_risks ?? [];
  const stakeholders = process.stakeholders ?? [];

  const overviewTab = (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <h3 className="text-h3 text-surface-900 mb-2">Description</h3>
          {process.description ? (
            <p className="text-body text-surface-800 whitespace-pre-wrap">{process.description}</p>
          ) : (
            <p className="text-small text-surface-500">No description recorded.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-h3 text-surface-900 mb-3">Recovery Objectives</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">RTO</p>
              <p className="text-h1 text-surface-900 mt-1 tabular-nums">
                {process.rto_hours ?? '—'}
                {process.rto_hours !== undefined && process.rto_hours !== null && 'h'}
              </p>
              <p className="text-xs text-surface-500">Recovery Time Objective</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">RPO</p>
              <p className="text-h1 text-surface-900 mt-1 tabular-nums">
                {process.rpo_hours ?? '—'}
                {process.rpo_hours !== undefined && process.rpo_hours !== null && 'h'}
              </p>
              <p className="text-xs text-surface-500">Recovery Point Objective</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">MTPD</p>
              <p className="text-h1 text-surface-900 mt-1 tabular-nums">
                {process.mtpd_hours ?? '—'}
                {process.mtpd_hours !== undefined && process.mtpd_hours !== null && 'h'}
              </p>
              <p className="text-xs text-surface-500">Max Tolerable Downtime</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {process.impact_description && (
        <Card>
          <CardBody>
            <h3 className="text-h3 text-surface-900 mb-2">Business Impact</h3>
            <p className="text-body text-surface-800 whitespace-pre-wrap">
              {process.impact_description}
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h3 className="text-h3 text-surface-900 mb-3">Continuity Details</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Recovery Priority</p>
              <p className="mt-1 text-body text-surface-900">{process.recovery_priority ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">
                Minimum Staff Required
              </p>
              <p className="mt-1 text-body text-surface-900">
                {process.minimum_staff_required ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">
                Alternate Site Required
              </p>
              <p className="mt-1 text-body text-surface-900">
                {process.alternate_site_required ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Manual Workaround</p>
              <p className="mt-1 text-body text-surface-900">
                {process.manual_workaround_available ? 'Available' : 'Unavailable'}
              </p>
            </div>
          </div>
          {process.workaround_description && (
            <div className="mt-4 pt-4 border-t border-surface-200">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">
                Workaround Description
              </p>
              <p className="text-body text-surface-800 whitespace-pre-wrap">
                {process.workaround_description}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const dependenciesTab = (
    <div className="space-y-2">
      {dependencies.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<LinkIcon className="h-8 w-8" />}
              title="No dependencies"
              description="This process has no recorded dependencies."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        dependencies.map((d) => {
          const name = d.dependent_process_name || d.name || 'Dependency';
          const linkId = d.dependent_process_id;
          const content = (
            <Card key={d.id} interactive={!!linkId}>
              <CardBody>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-4 w-4 text-surface-500" />
                    <span className="text-body text-surface-900">{name}</span>
                  </div>
                  {d.dependency_type && (
                    <Badge variant="neutral">{humanize(d.dependency_type)}</Badge>
                  )}
                </div>
              </CardBody>
            </Card>
          );
          return linkId ? (
            <Link key={d.id} to={`/bcdr/processes/${linkId}`} className="block">
              {content}
            </Link>
          ) : (
            content
          );
        })
      )}
    </div>
  );

  const strategiesTab = (
    <div className="space-y-2">
      {strategies.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Shield className="h-8 w-8" />}
              title="No recovery strategies"
              description="Define a recovery strategy for this process."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        strategies.map((s) => (
          <Card key={s.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {s.strategy_id && (
                      <span className="font-mono text-xs text-brand-700">{s.strategy_id}</span>
                    )}
                    <p className="text-body font-medium text-surface-900">{s.name}</p>
                  </div>
                  {s.description && (
                    <p className="text-small text-surface-700 mt-1 whitespace-pre-wrap">
                      {s.description}
                    </p>
                  )}
                </div>
                {s.status && (
                  <Badge variant={STRATEGY_VARIANT[s.status] ?? 'neutral'}>
                    {humanize(s.status)}
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );

  const risksTab = (
    <div className="space-y-2">
      {risks.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title="No linked risks"
              description="No risks are currently linked to this process."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        risks.map((r) => (
          <Card key={r.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {r.risk_id && (
                      <span className="font-mono text-xs text-brand-700">{r.risk_id}</span>
                    )}
                    <p className="text-body font-medium text-surface-900">{r.title}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {r.inherent_risk && (
                    <Badge variant={RISK_LEVEL_VARIANT[r.inherent_risk] ?? 'neutral'}>
                      {humanize(r.inherent_risk)}
                    </Badge>
                  )}
                  {r.status && <Badge variant="neutral">{humanize(r.status)}</Badge>}
                </div>
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );

  const stakeholdersTab = (
    <div className="space-y-2">
      {stakeholders.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No stakeholders"
              description="Add stakeholders responsible for this process."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        stakeholders.map((s) => (
          <Card key={s.id}>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-body font-medium text-surface-900">{s.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-surface-600">
                    {s.role && <span>{s.role}</span>}
                    {s.email && <span>{s.email}</span>}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/bcdr/processes"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Business Processes
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-h2 text-brand-700">{process.process_id}</span>
            <span className="text-h1 text-surface-900">{process.name}</span>
          </span>
        }
        meta={<Badge variant={tierVariant}>{tierLabel}</Badge>}
        description={process.department || undefined}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit2 className="h-4 w-4" />}
            onClick={() => navigate(`/bcdr/processes/${process.id}/edit`)}
          >
            Edit
          </Button>
        }
      />

      <Card>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetaCell
              label="RTO"
              value={
                process.rto_hours !== undefined && process.rto_hours !== null ? (
                  <span className="text-surface-900">{process.rto_hours}h</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell
              label="RPO"
              value={
                process.rpo_hours !== undefined && process.rpo_hours !== null ? (
                  <span className="text-surface-900">{process.rpo_hours}h</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell
              label="Owner"
              value={
                process.owner_name ? (
                  <span className="text-surface-900">{process.owner_name}</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell label="Last Reviewed" value={formatDate(process.last_reviewed_at)} />
          </div>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          {
            label: (
              <span className="inline-flex items-center gap-2">
                Dependencies
                {dependencies.length > 0 && (
                  <Badge variant="neutral" size="sm">
                    {dependencies.length}
                  </Badge>
                )}
              </span>
            ),
            content: dependenciesTab,
          },
          { label: 'Recovery Strategy', content: strategiesTab },
          {
            label: (
              <span className="inline-flex items-center gap-2">
                Linked Risks
                {risks.length > 0 && (
                  <Badge variant="warning" size="sm">
                    {risks.length}
                  </Badge>
                )}
              </span>
            ),
            content: risksTab,
          },
          { label: 'Stakeholders', content: stakeholdersTab },
        ]}
      />
    </div>
  );
}
