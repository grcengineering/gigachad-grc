import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Clock, BookOpen, Users, Link as LinkIcon, History } from 'lucide-react';
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

interface RunbookStep {
  id: string;
  step_number: number;
  title: string;
  description?: string;
  expected_duration_minutes?: number;
  role_responsible?: string;
  verification_criteria?: string;
}

interface RunbookRole {
  id: string;
  role_name: string;
  responsibility?: string;
  assignee_name?: string;
}

interface RunbookDependency {
  id: string;
  name: string;
  dependency_type?: string;
}

interface RunbookTestHistoryEntry {
  id: string;
  test_id?: string;
  test_name?: string;
  result?: string;
  executed_at?: string;
  executed_by?: string;
}

interface RunbookDetailData {
  id: string;
  runbook_id: string;
  title: string;
  description?: string;
  category?: string;
  scenario?: string;
  system_name?: string;
  status: string;
  version?: string;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  process_id?: string;
  process_name?: string;
  estimated_duration_minutes?: number;
  prerequisites?: string;
  post_conditions?: string;
  rollback_procedure?: string;
  last_reviewed_at?: string | null;
  next_review_due?: string | null;
  created_at?: string;
  updated_at?: string;
  steps?: RunbookStep[];
  roles?: RunbookRole[];
  dependencies?: RunbookDependency[];
  test_history?: RunbookTestHistoryEntry[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  approved: 'info',
  published: 'success',
  needs_review: 'warning',
  archived: 'neutral',
};

const RESULT_VARIANT: Record<string, BadgeVariant> = {
  passed: 'success',
  passed_with_issues: 'warning',
  failed: 'danger',
  incomplete: 'neutral',
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

export default function RunbookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: runbook, isLoading } = useQuery<RunbookDetailData>({
    queryKey: ['runbook', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/runbooks/${id}`);
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

  if (!runbook) {
    return (
      <EmptyState
        title="Runbook not found"
        description="The requested runbook could not be loaded."
        action={
          <Button variant="outline" onClick={() => navigate('/bcdr/runbooks')}>
            Back to runbooks
          </Button>
        }
      />
    );
  }

  const statusVariant = STATUS_VARIANT[runbook.status] ?? 'neutral';
  const steps = runbook.steps ?? [];
  const roles = runbook.roles ?? [];
  const dependencies = runbook.dependencies ?? [];
  const testHistory = runbook.test_history ?? [];
  const scenario = runbook.scenario || runbook.category || '';

  const overviewTab = (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <h3 className="text-h3 text-surface-900 mb-2">Description</h3>
          {runbook.description ? (
            <p className="text-body text-surface-800 whitespace-pre-wrap">{runbook.description}</p>
          ) : (
            <p className="text-small text-surface-500">No description recorded.</p>
          )}
        </CardBody>
      </Card>
      {runbook.prerequisites && (
        <Card>
          <CardBody>
            <h3 className="text-h3 text-surface-900 mb-2">Prerequisites</h3>
            <p className="text-body text-surface-800 whitespace-pre-wrap">
              {runbook.prerequisites}
            </p>
          </CardBody>
        </Card>
      )}
      {runbook.post_conditions && (
        <Card>
          <CardBody>
            <h3 className="text-h3 text-surface-900 mb-2">Post-Conditions</h3>
            <p className="text-body text-surface-800 whitespace-pre-wrap">
              {runbook.post_conditions}
            </p>
          </CardBody>
        </Card>
      )}
      {runbook.rollback_procedure && (
        <Card>
          <CardBody>
            <h3 className="text-h3 text-surface-900 mb-2">Rollback Procedure</h3>
            <p className="text-body text-surface-800 whitespace-pre-wrap">
              {runbook.rollback_procedure}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );

  const stepsTab = (
    <div className="space-y-3">
      {steps.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="No steps defined"
              description="Add procedure steps to this runbook."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        steps
          .slice()
          .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))
          .map((step, idx) => (
            <Card key={step.id}>
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-8 w-8 rounded-md bg-brand-50 border border-brand-200 text-brand-800 inline-flex items-center justify-center font-semibold">
                    {step.step_number ?? idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-body font-medium text-surface-900">{step.title}</h4>
                    {step.description && (
                      <p className="text-small text-surface-700 mt-1 whitespace-pre-wrap">
                        {step.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-surface-600">
                      {step.role_responsible && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {step.role_responsible}
                        </span>
                      )}
                      {step.expected_duration_minutes !== undefined &&
                        step.expected_duration_minutes !== null && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {step.expected_duration_minutes}m
                          </span>
                        )}
                    </div>
                    {step.verification_criteria && (
                      <p className="text-xs text-surface-600 mt-2">
                        <span className="uppercase tracking-wider text-surface-500">
                          Verification:
                        </span>{' '}
                        {step.verification_criteria}
                      </p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
      )}
    </div>
  );

  const rolesTab = (
    <div className="space-y-2">
      {roles.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No roles assigned"
              description="Define the roles that own each step."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        roles.map((r) => (
          <Card key={r.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body font-medium text-surface-900">{r.role_name}</p>
                  {r.responsibility && (
                    <p className="text-small text-surface-700 mt-1">{r.responsibility}</p>
                  )}
                </div>
                {r.assignee_name && (
                  <span className="text-small text-surface-700">{r.assignee_name}</span>
                )}
              </div>
            </CardBody>
          </Card>
        ))
      )}
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
              description="This runbook has no upstream dependencies."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        dependencies.map((d) => (
          <Card key={d.id}>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-4 w-4 text-surface-500" />
                  <span className="text-body text-surface-900">{d.name}</span>
                </div>
                {d.dependency_type && (
                  <Badge variant="neutral">{humanize(d.dependency_type)}</Badge>
                )}
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );

  const historyTab = (
    <div className="space-y-2">
      {testHistory.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="No test history"
              description="This runbook has not been tested yet."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        testHistory.map((h) => (
          <Card key={h.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body font-medium text-surface-900">
                    {h.test_name || h.test_id || 'Test'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-surface-600">
                    {h.executed_at && <span>{formatDate(h.executed_at)}</span>}
                    {h.executed_by && <span>by {h.executed_by}</span>}
                  </div>
                </div>
                {h.result && (
                  <Badge variant={RESULT_VARIANT[h.result] ?? 'neutral'}>{humanize(h.result)}</Badge>
                )}
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
        to="/bcdr/runbooks"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Runbooks
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-h2 text-brand-700">{runbook.runbook_id}</span>
            <span className="text-h1 text-surface-900">{runbook.title}</span>
          </span>
        }
        meta={
          <Badge variant={statusVariant} dot>
            {humanize(runbook.status)}
          </Badge>
        }
        description={scenario ? humanize(scenario) : undefined}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit2 className="h-4 w-4" />}
            onClick={() => navigate(`/bcdr/runbooks/${runbook.id}/edit`)}
          >
            Edit
          </Button>
        }
      />

      <Card>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetaCell
              label="Owner"
              value={
                runbook.owner_name ? (
                  <span className="text-surface-900">{runbook.owner_name}</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell
              label="Version"
              value={
                runbook.version ? (
                  <span className="text-surface-900">v{runbook.version}</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell
              label="Est. Duration"
              value={
                runbook.estimated_duration_minutes !== undefined &&
                runbook.estimated_duration_minutes !== null ? (
                  <span className="text-surface-900">{runbook.estimated_duration_minutes}m</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell label="Last Reviewed" value={formatDate(runbook.last_reviewed_at)} />
          </div>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          {
            label: (
              <span className="inline-flex items-center gap-2">
                Steps
                {steps.length > 0 && (
                  <Badge variant="neutral" size="sm">
                    {steps.length}
                  </Badge>
                )}
              </span>
            ),
            content: stepsTab,
          },
          { label: 'Roles', content: rolesTab },
          { label: 'Dependencies', content: dependenciesTab },
          { label: 'Test History', content: historyTab },
        ]}
      />
    </div>
  );
}
