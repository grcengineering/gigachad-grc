import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ExternalLink,
  Calendar,
  Folder,
  User,
  Clock,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { controlsApi, implementationsApi } from '@/lib/api';
import { Button, Badge, Drawer, Select, Skeleton, type BadgeVariant } from '@/components/ui';
import { EvidenceDrawer } from './EvidenceDrawer';

type Status = 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';

const STATUS_CONFIG: Record<Status, { label: string; variant: BadgeVariant }> = {
  implemented: { label: 'Implemented', variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  not_started: { label: 'Not Started', variant: 'neutral' },
  not_applicable: { label: 'N/A', variant: 'info' },
};

const STATUS_OPTS = (Object.keys(STATUS_CONFIG) as Status[]).map((k) => ({
  value: k,
  label: STATUS_CONFIG[k].label,
}));

/** Shape returned by the LIST endpoint — abbreviated. */
export interface Control {
  id: string;
  controlId: string;
  title: string;
  description?: string;
  category: string;
  implementation?: {
    id?: string;
    status?: Status;
    implementationNotes?: string;
    lastReviewedAt?: string;
    nextReviewDue?: string;
  };
  evidenceCount?: number;
  frameworkMappings?: { frameworkId: string; frameworkName: string }[];
  tags?: string[];
  updatedAt?: string;
}

/** Shape returned by the GET endpoint — fuller data. */
interface ControlDetail {
  id: string;
  controlId: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  guidance?: string;
  isCustom?: boolean;
  tags?: string[];
  implementations?: Array<{
    id: string;
    status: Status;
    implementationNotes?: string;
    testingFrequency?: string;
    lastTestedAt?: string;
    nextTestDue?: string;
    effectivenessScore?: number | null;
    owner?: { id: string; displayName: string; email?: string };
    tests?: Array<{
      id: string;
      result: string;
      testType: string;
      testedAt: string;
      findings?: string;
    }>;
  }>;
  mappings?: Array<{
    id: string;
    mappingType: string;
    framework: { id: string; name: string; type: string };
    requirement: { id: string; reference: string; title: string };
  }>;
  evidenceLinks?: Array<{
    id: string;
    evidence: { id: string; title: string; type: string; status: string };
  }>;
  policyLinks?: Array<{
    id: string;
    policy?: { id: string; title: string; category?: string; version?: string; status: string };
  }>;
}

interface ControlDrawerProps {
  control: Control | null;
  open: boolean;
  onClose: () => void;
}

export function ControlDrawer({ control, open, onClose }: ControlDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stackedEvidenceId, setStackedEvidenceId] = useState<string | null>(null);

  // Fetch full detail when drawer opens
  const { data: detail, isLoading: detailLoading } = useQuery<ControlDetail>({
    queryKey: ['control', control?.id],
    queryFn: () => controlsApi.get(control!.id).then((res) => res.data),
    enabled: !!control && open,
  });

  const statusMutation = useMutation({
    mutationFn: ({ implementationId, status }: { implementationId: string; status: Status }) =>
      implementationsApi.update(implementationId, { status }),
    onMutate: async ({ status }) => {
      const detailKey = ['control', control?.id];
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prevDetail = queryClient.getQueryData<ControlDetail>(detailKey);

      // Optimistically patch the detail cache so the badge flips immediately
      queryClient.setQueryData<ControlDetail | undefined>(detailKey, (old) => {
        if (!old) return old;
        const impls = old.implementations || [];
        return {
          ...old,
          implementations: impls.length ? [{ ...impls[0], status }, ...impls.slice(1)] : impls,
        };
      });

      // Patch the list cache too so the row badge updates without a round trip
      queryClient.setQueriesData<{ data?: Control[] } | Control[] | undefined>(
        { queryKey: ['controls'] },
        (old) => {
          if (!old) return old;
          const patchRow = (c: Control): Control =>
            c.id === control?.id
              ? { ...c, implementation: { ...(c.implementation || {}), status } }
              : c;
          if (Array.isArray(old)) return old.map(patchRow);
          if (Array.isArray((old as { data?: Control[] }).data)) {
            return { ...old, data: (old as { data: Control[] }).data.map(patchRow) };
          }
          return old;
        }
      );

      return { prevDetail };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevDetail) {
        queryClient.setQueryData(['control', control?.id], ctx.prevDetail);
      }
      toast.error('Failed to update status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      queryClient.invalidateQueries({ queryKey: ['control'] });
    },
    onSuccess: () => {
      toast.success('Status updated');
    },
  });

  if (!control) return null;

  // Prefer detail data when loaded; fall back to list data instantly
  const impl = detail?.implementations?.[0];
  const status: Status = (impl?.status ||
    control.implementation?.status ||
    'not_started') as Status;
  const cfg = STATUS_CONFIG[status];
  const implementationId = impl?.id || control.implementation?.id;
  const description = detail?.description ?? control.description;
  const tags = detail?.tags ?? control.tags;
  const guidance = detail?.guidance;
  const mappings = detail?.mappings || [];
  const evidenceLinks = detail?.evidenceLinks || [];
  const policyLinks = detail?.policyLinks || [];
  const recentTests = (impl?.tests || []).slice(0, 3);

  const openFullPage = () => {
    onClose();
    navigate(`/controls/${control.id}`);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-brand-700 text-small">{control.controlId}</span>
          <span className="text-surface-500">·</span>
          <span className="truncate">{control.title}</span>
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button leftIcon={<ExternalLink className="h-4 w-4" />} onClick={openFullPage}>
            Open full page
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={cfg.variant} dot size="md">
            {cfg.label}
          </Badge>
          {implementationId && (
            <div className="inline-flex items-center gap-2">
              <span className="text-xs text-surface-500">Change to:</span>
              <Select
                size="sm"
                fullWidth={false}
                className="w-40"
                value={status}
                onChange={(v) => {
                  if (v && v !== status) {
                    statusMutation.mutate({ implementationId, status: v as Status });
                  }
                }}
                options={STATUS_OPTS}
              />
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <Section title="Description">
            <p className="text-body text-surface-800 whitespace-pre-wrap leading-relaxed">
              {description}
            </p>
          </Section>
        )}

        {/* Implementation block */}
        <Section title="Implementation">
          {detailLoading && !impl ? (
            <Skeleton className="h-24" />
          ) : impl ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-surface-200 bg-surface-50/60 p-3">
              <MetaField
                icon={<User className="h-3.5 w-3.5" />}
                label="Owner"
                value={impl.owner?.displayName ?? 'Unassigned'}
              />
              <MetaField
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Testing frequency"
                value={
                  <span className="capitalize">
                    {(impl.testingFrequency || 'quarterly').replace(/_/g, ' ')}
                  </span>
                }
              />
              <MetaField
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Last tested"
                value={
                  impl.lastTestedAt ? new Date(impl.lastTestedAt).toLocaleDateString() : 'Never'
                }
              />
              <MetaField
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Next due"
                value={
                  impl.nextTestDue ? (
                    <span
                      className={
                        new Date(impl.nextTestDue) < new Date() ? 'text-red-600 font-medium' : ''
                      }
                    >
                      {new Date(impl.nextTestDue).toLocaleDateString()}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              {impl.effectivenessScore !== null && impl.effectivenessScore !== undefined && (
                <MetaField
                  icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  label="Effectiveness"
                  value={
                    <span className="text-emerald-700 font-medium">{impl.effectivenessScore}%</span>
                  }
                />
              )}
              <MetaField
                icon={<Folder className="h-3.5 w-3.5" />}
                label="Category"
                value={<span className="capitalize">{control.category.replace(/_/g, ' ')}</span>}
              />
            </div>
          ) : (
            <div className="rounded-md border border-surface-200 bg-surface-50/60 p-3 text-small text-surface-500">
              No implementation data yet.
            </div>
          )}

          {impl?.implementationNotes && (
            <div className="mt-3">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1.5">Notes</p>
              <p className="text-body text-surface-700 whitespace-pre-wrap leading-relaxed">
                {impl.implementationNotes}
              </p>
            </div>
          )}
        </Section>

        {/* Framework mappings */}
        <Section
          title="Framework Mappings"
          count={mappings.length || (control.frameworkMappings?.length ?? 0)}
        >
          {detailLoading && mappings.length === 0 ? (
            <Skeleton className="h-14" />
          ) : mappings.length > 0 ? (
            <div className="space-y-1.5">
              {mappings.map((m) => (
                <Link
                  key={m.id}
                  to={`/frameworks/${m.framework.id}?requirement=${m.requirement.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-surface-200 bg-white px-3 py-2 hover:border-surface-300 hover:bg-surface-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-small font-medium text-brand-700">
                        {m.framework.name}
                      </span>
                      {m.mappingType !== 'primary' && (
                        <Badge variant="neutral" size="sm" className="capitalize">
                          {m.mappingType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 truncate mt-0.5">
                      <span className="font-mono">{m.requirement.reference}</span> ·{' '}
                      {m.requirement.title}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-surface-500 group-hover:text-surface-600 shrink-0" />
                </Link>
              ))}
            </div>
          ) : control.frameworkMappings && control.frameworkMappings.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {control.frameworkMappings.map((m) => (
                <Badge key={m.frameworkId} variant="info">
                  {m.frameworkName}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-small text-surface-500">Not mapped to any frameworks.</p>
          )}
        </Section>

        {/* Evidence */}
        <Section
          title="Evidence"
          count={evidenceLinks.length || control.evidenceCount || 0}
          action={
            <Link
              to={`/evidence?controlId=${control.id}`}
              className="text-xs text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
            >
              Manage <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {detailLoading && evidenceLinks.length === 0 ? (
            <Skeleton className="h-14" />
          ) : evidenceLinks.length > 0 ? (
            <div className="space-y-1.5">
              {evidenceLinks.slice(0, 5).map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setStackedEvidenceId(link.evidence.id)}
                  className="w-full flex items-center justify-between gap-3 rounded-md border border-surface-200 bg-white px-3 py-2 hover:border-surface-300 hover:bg-surface-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-surface-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-small text-surface-800 font-medium truncate">
                        {link.evidence.title}
                      </p>
                      <p className="text-xs text-surface-500 capitalize truncate">
                        {link.evidence.type}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={evidenceStatusVariant(link.evidence.status)}
                    size="sm"
                    className="shrink-0 capitalize"
                  >
                    {link.evidence.status.replace(/_/g, ' ')}
                  </Badge>
                </button>
              ))}
              {evidenceLinks.length > 5 && (
                <p className="text-xs text-surface-500 pl-1">
                  +{evidenceLinks.length - 5} more — open full page to see all.
                </p>
              )}
            </div>
          ) : (
            <p className="text-small text-surface-500">No evidence linked yet.</p>
          )}
        </Section>

        {/* Linked policies */}
        {(policyLinks.length > 0 || detailLoading) && (
          <Section title="Linked Policies" count={policyLinks.length}>
            {detailLoading && policyLinks.length === 0 ? (
              <Skeleton className="h-14" />
            ) : (
              <div className="space-y-1.5">
                {policyLinks.slice(0, 4).map((link) =>
                  link.policy ? (
                    <Link
                      key={link.id}
                      to={`/policies/${link.policy.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-surface-200 bg-white px-3 py-2 hover:border-surface-300 hover:bg-surface-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <LinkIcon className="h-4 w-4 text-brand-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-small text-surface-800 font-medium truncate">
                            {link.policy.title}
                          </p>
                          <p className="text-xs text-surface-500 capitalize truncate">
                            {link.policy.category?.replace(/_/g, ' ')} · v{link.policy.version}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={policyStatusVariant(link.policy.status)}
                        size="sm"
                        className="shrink-0 capitalize"
                      >
                        {link.policy.status}
                      </Badge>
                    </Link>
                  ) : null
                )}
              </div>
            )}
          </Section>
        )}

        {/* Recent tests */}
        {recentTests.length > 0 && (
          <Section title="Recent Tests" count={impl?.tests?.length}>
            <div className="space-y-1.5">
              {recentTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-surface-200 bg-white px-3 py-2"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Activity className="h-4 w-4 text-surface-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={testResultVariant(test.result)}
                          size="sm"
                          className="capitalize"
                        >
                          {test.result}
                        </Badge>
                        <span className="text-xs text-surface-500 capitalize">
                          {test.testType} test
                        </span>
                      </div>
                      {test.findings && (
                        <p className="text-xs text-surface-600 mt-1 line-clamp-2">
                          {test.findings}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-surface-500 shrink-0 tabular-nums">
                    {new Date(test.testedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Guidance */}
        {guidance && (
          <Section title="Implementation Guidance">
            <p className="text-small text-surface-700 whitespace-pre-wrap leading-relaxed">
              {guidance}
            </p>
          </Section>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="neutral" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </Section>
        )}
        {/* Nested evidence drawer — inside Drawer's children so HUI stacks dialogs correctly */}
        <EvidenceDrawer
          evidenceId={stackedEvidenceId}
          open={!!stackedEvidenceId}
          onClose={() => setStackedEvidenceId(null)}
        />
      </div>
    </Drawer>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider inline-flex items-center gap-1.5">
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-surface-500 font-mono tabular-nums">{count}</span>
          )}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function MetaField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-surface-500 uppercase tracking-wider mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-small text-surface-800 font-medium">{value}</div>
    </div>
  );
}

function evidenceStatusVariant(s: string): BadgeVariant {
  if (s === 'approved') return 'success';
  if (s === 'expired') return 'danger';
  if (s === 'rejected') return 'danger';
  return 'warning';
}

function policyStatusVariant(s: string): BadgeVariant {
  if (s === 'published' || s === 'approved') return 'success';
  if (s === 'retired') return 'danger';
  return 'warning';
}

function testResultVariant(r: string): BadgeVariant {
  if (r === 'pass') return 'success';
  if (r === 'fail') return 'danger';
  return 'warning';
}
