import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Megaphone,
  Mail,
  Phone,
  Users,
  ListOrdered,
  Edit2,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
  Tabs,
  EmptyState,
  Skeleton,
  type BadgeVariant,
} from '@/components/ui';

interface MessageTemplate {
  id: string;
  name?: string;
  title?: string;
  channel?: string;
  audience?: string;
  subject?: string;
  body?: string;
  message?: string;
}

interface Stakeholder {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  organizationName?: string;
  organization_name?: string;
  contactType?: string;
  contact_type?: string;
  email?: string;
  phone?: string;
  primaryPhone?: string;
  primary_phone?: string;
  roleInPlan?: string;
  role_in_plan?: string;
}

interface EscalationStep {
  id: string;
  level?: number;
  escalationLevel?: number;
  escalation_level?: number;
  contactName?: string;
  contact_name?: string;
  name?: string;
  role?: string;
  triggerAfterMinutes?: number;
  trigger_after_minutes?: number;
}

interface CommunicationPlanDetailData {
  id: string;
  planId?: string;
  plan_id?: string;
  name?: string;
  title?: string;
  description?: string;
  planType?: string;
  plan_type?: string;
  audience?: string;
  channel?: string;
  status?: string;
  isActive?: boolean;
  is_active?: boolean;
  ownerName?: string;
  owner_name?: string;
  updatedAt?: string;
  updated_at?: string;
  createdAt?: string;
  created_at?: string;
  messageTemplates?: MessageTemplate[];
  message_templates?: MessageTemplate[];
  templates?: MessageTemplate[];
  stakeholders?: Stakeholder[];
  contacts?: Stakeholder[];
  escalationPath?: EscalationStep[];
  escalation_path?: EscalationStep[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  draft: 'warning',
  archived: 'neutral',
  inactive: 'neutral',
};

function pick<T>(...vals: (T | undefined)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

function formatDate(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}

export default function CommunicationPlanDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: plan, isLoading } = useQuery<CommunicationPlanDetailData>({
    queryKey: ['communication-plan', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/communication/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/bcdr/communication"
          className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Link>
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<Megaphone className="h-8 w-8" />}
              title="Communication plan not found"
              description="The plan may have been deleted or you may not have access."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const code = pick(plan.planId, plan.plan_id);
  const title = pick(plan.title, plan.name) ?? 'Untitled plan';
  const explicitStatus = plan.status;
  const isActive = pick(plan.isActive, plan.is_active);
  const status = explicitStatus ?? (isActive === undefined ? undefined : isActive ? 'active' : 'inactive');
  const planType = pick(plan.planType, plan.plan_type);
  const owner = pick(plan.ownerName, plan.owner_name);
  const updatedAt = pick(plan.updatedAt, plan.updated_at);
  const createdAt = pick(plan.createdAt, plan.created_at);

  const templates = plan.messageTemplates ?? plan.message_templates ?? plan.templates ?? [];
  const stakeholders = plan.stakeholders ?? plan.contacts ?? [];
  const escalation = plan.escalationPath ?? plan.escalation_path ?? [];

  const templatesTab = (
    <Card>
      <CardBody density="comfy">
        {templates.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Megaphone className="h-6 w-6" />}
            title="No message templates"
            description="Pre-write messages for common scenarios so you can send fast in an incident."
          />
        ) : (
          <ul className="space-y-3">
            {templates.map((t) => (
              <li key={t.id} className="rounded-md border border-surface-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-h3 text-surface-900">
                    {pick(t.name, t.title) ?? 'Untitled template'}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {t.channel && (
                      <Badge variant="info" size="sm">
                        {t.channel}
                      </Badge>
                    )}
                    {t.audience && (
                      <Badge variant="neutral" size="sm">
                        {t.audience.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
                {t.subject && (
                  <p className="mt-2 text-small text-surface-700">
                    <span className="text-surface-500">Subject:</span> {t.subject}
                  </p>
                )}
                {(t.body || t.message) && (
                  <p className="mt-1 text-small text-surface-700 whitespace-pre-wrap">
                    {t.body ?? t.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  const stakeholdersTab = (
    <Card>
      <CardBody density="comfy">
        {stakeholders.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Users className="h-6 w-6" />}
            title="No stakeholders"
            description="Add contacts that should be notified under this plan."
          />
        ) : (
          <ul className="divide-y divide-surface-200">
            {stakeholders.map((s) => (
              <li key={s.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body text-surface-900">{s.name}</span>
                    {pick(s.contactType, s.contact_type) && (
                      <Badge variant="info" size="sm">
                        {(pick(s.contactType, s.contact_type) ?? '').replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {(s.title || pick(s.organization, s.organizationName, s.organization_name)) && (
                    <p className="text-xs text-surface-500 mt-0.5">
                      {[s.title, pick(s.organization, s.organizationName, s.organization_name)]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-surface-500">
                    {s.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {s.email}
                      </span>
                    )}
                    {pick(s.phone, s.primaryPhone, s.primary_phone) && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {pick(s.phone, s.primaryPhone, s.primary_phone)}
                      </span>
                    )}
                  </div>
                  {pick(s.roleInPlan, s.role_in_plan) && (
                    <p className="text-small text-surface-700 mt-1">
                      Role: {pick(s.roleInPlan, s.role_in_plan)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  const escalationTab = (
    <Card>
      <CardBody density="comfy">
        {escalation.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<ListOrdered className="h-6 w-6" />}
            title="No escalation path defined"
            description="Define an escalation sequence so unanswered alerts climb the ladder."
          />
        ) : (
          <ol className="relative border-l border-surface-200 pl-6 space-y-4">
            {escalation.map((step) => {
              const lvl = pick(step.level, step.escalationLevel, step.escalation_level) ?? '?';
              const contactName = pick(step.contactName, step.contact_name, step.name) ?? 'Unassigned';
              const after = pick(step.triggerAfterMinutes, step.trigger_after_minutes);
              return (
                <li key={step.id} className="relative">
                  <span className="absolute -left-[33px] top-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-brand-700 text-xs font-medium">
                    L{lvl}
                  </span>
                  <p className="text-body text-surface-900">{contactName}</p>
                  <div className="flex items-center gap-3 text-xs text-surface-500 mt-1">
                    {step.role && <span className="capitalize">{step.role.replace(/_/g, ' ')}</span>}
                    {after !== undefined && <span>• after {after} min</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/bcdr/communication"
        className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Plans
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            {code && <span className="font-mono text-brand-700 text-h2">{code}</span>}
            <span>{title}</span>
          </span>
        }
        description={plan.description}
        meta={
          <>
            {planType && (
              <Badge variant="info" size="sm">
                {planType.replace(/_/g, ' ')}
              </Badge>
            )}
            {status && (
              <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} dot>
                {status.replace(/_/g, ' ')}
              </Badge>
            )}
          </>
        }
        actions={
          <Button variant="outline" size="sm" leftIcon={<Edit2 className="h-4 w-4" />}>
            Edit
          </Button>
        }
      />

      <Card>
        <CardBody density="cozy">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-small">
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Audience</dt>
              <dd className="text-surface-900 mt-1 capitalize">
                {plan.audience ? plan.audience.replace(/_/g, ' ') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Channel</dt>
              <dd className="text-surface-900 mt-1 capitalize">
                {plan.channel ? plan.channel.replace(/_/g, ' ') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Owner</dt>
              <dd className="text-surface-900 mt-1">{owner ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Last Updated</dt>
              <dd className="text-surface-900 mt-1">{formatDate(updatedAt ?? createdAt)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: `Message Templates (${templates.length})`, content: templatesTab },
          { label: `Stakeholders (${stakeholders.length})`, content: stakeholdersTab },
          { label: `Escalation Path (${escalation.length})`, content: escalationTab },
        ]}
      />
    </div>
  );
}
