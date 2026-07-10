import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Calendar, User, FileText, ListChecks } from 'lucide-react';
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

interface DRTestFinding {
  id: string;
  title: string;
  description?: string;
  severity?: string;
  status?: string;
  remediation_required?: boolean;
  remediation_status?: string;
  remediation_due_date?: string | null;
  assigned_to_name?: string | null;
}

interface DRTestParticipant {
  id: string;
  user_name: string;
  role: string;
  attended: boolean;
}

interface DRTestDetailData {
  id: string;
  test_id: string;
  name: string;
  description?: string;
  test_type: string;
  status: string;
  result: string | null;
  scheduled_date: string;
  actual_start_at?: string | null;
  actual_end_at?: string | null;
  target_rto_minutes?: number | null;
  actual_recovery_time_minutes?: number | null;
  coordinator_id?: string;
  coordinator_name?: string;
  coordinator_email?: string;
  bcdr_plan_id?: string;
  plan_title?: string;
  plan_id?: string;
  objectives?: string;
  scope?: string;
  lessons_learned?: string;
  procedures?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  findings?: DRTestFinding[];
  participants?: DRTestParticipant[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  planned: 'neutral',
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
  postponed: 'warning',
};

const RESULT_VARIANT: Record<string, BadgeVariant> = {
  passed: 'success',
  passed_with_issues: 'warning',
  failed: 'danger',
  incomplete: 'neutral',
};

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const REMEDIATION_VARIANT: Record<string, BadgeVariant> = {
  resolved: 'success',
  in_progress: 'warning',
  open: 'neutral',
  not_started: 'neutral',
};

const TEST_TYPE_LABELS: Record<string, string> = {
  tabletop: 'Tabletop Exercise',
  walkthrough: 'Walkthrough',
  simulation: 'Simulation',
  parallel: 'Parallel Test',
  full_interruption: 'Full Interruption',
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

export default function DRTestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: test, isLoading } = useQuery<DRTestDetailData>({
    queryKey: ['dr-test', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/tests/${id}`);
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

  if (!test) {
    return (
      <EmptyState
        title="DR test not found"
        description="The requested test could not be loaded."
        action={
          <Button variant="outline" onClick={() => navigate('/bcdr/tests')}>
            Back to tests
          </Button>
        }
      />
    );
  }

  const statusVariant = STATUS_VARIANT[test.status] ?? 'neutral';
  const resultVariant = test.result ? (RESULT_VARIANT[test.result] ?? 'neutral') : null;
  const typeLabel = TEST_TYPE_LABELS[test.test_type] ?? humanize(test.test_type);

  const findings = test.findings ?? [];
  const participants = test.participants ?? [];

  const objectivesTab = (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <h3 className="text-h3 text-surface-900 mb-2">Objectives</h3>
          {test.objectives ? (
            <p className="text-body text-surface-800 whitespace-pre-wrap">{test.objectives}</p>
          ) : (
            <p className="text-small text-surface-500">No objectives recorded.</p>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="text-h3 text-surface-900 mb-2">Scope</h3>
          {test.scope ? (
            <p className="text-body text-surface-800 whitespace-pre-wrap">{test.scope}</p>
          ) : (
            <p className="text-small text-surface-500">No scope recorded.</p>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="text-h3 text-surface-900 mb-2">Description</h3>
          {test.description ? (
            <p className="text-body text-surface-800 whitespace-pre-wrap">{test.description}</p>
          ) : (
            <p className="text-small text-surface-500">No description recorded.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const proceduresTab = (
    <Card>
      <CardBody>
        <h3 className="text-h3 text-surface-900 mb-2">Procedures</h3>
        {test.procedures ? (
          <p className="text-body text-surface-800 whitespace-pre-wrap">{test.procedures}</p>
        ) : (
          <EmptyState
            icon={<ListChecks className="h-8 w-8" />}
            title="No procedures recorded"
            description="Add a procedure walkthrough for this test."
            size="sm"
          />
        )}
      </CardBody>
    </Card>
  );

  const findingsTab = (
    <div className="space-y-3">
      {findings.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No findings"
              description="No findings have been recorded for this test."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        findings.map((f) => (
          <Card key={f.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-body font-medium text-surface-900">{f.title}</h4>
                  {f.description && (
                    <p className="text-small text-surface-700 mt-1">{f.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-surface-600">
                    {f.assigned_to_name && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {f.assigned_to_name}
                      </span>
                    )}
                    {f.remediation_due_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Due {formatDate(f.remediation_due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {f.severity && (
                    <Badge variant={SEVERITY_VARIANT[f.severity] ?? 'neutral'}>
                      {humanize(f.severity)}
                    </Badge>
                  )}
                  {f.remediation_status && (
                    <Badge variant={REMEDIATION_VARIANT[f.remediation_status] ?? 'neutral'}>
                      {humanize(f.remediation_status)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );

  const participantsTab = (
    <div className="space-y-2">
      {participants.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<User className="h-8 w-8" />}
              title="No participants"
              description="Assign participants to this test."
              size="sm"
            />
          </CardBody>
        </Card>
      ) : (
        participants.map((p) => (
          <Card key={p.id}>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-body font-medium text-surface-900">{p.user_name}</p>
                  <p className="text-small text-surface-600">{p.role}</p>
                </div>
                <Badge variant={p.attended ? 'success' : 'neutral'}>
                  {p.attended ? 'Attended' : 'Not attended'}
                </Badge>
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );

  const notesTab = (
    <Card>
      <CardBody>
        <h3 className="text-h3 text-surface-900 mb-2">Notes</h3>
        {test.notes || test.lessons_learned ? (
          <div className="space-y-4">
            {test.lessons_learned && (
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">
                  Lessons Learned
                </p>
                <p className="text-body text-surface-800 whitespace-pre-wrap">
                  {test.lessons_learned}
                </p>
              </div>
            )}
            {test.notes && (
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-body text-surface-800 whitespace-pre-wrap">{test.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-small text-surface-500">No notes recorded.</p>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/bcdr/tests"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to DR Tests
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-h2 text-brand-700">{test.test_id}</span>
            <span className="text-h1 text-surface-900">{test.name}</span>
          </span>
        }
        meta={
          <span className="flex items-center gap-2">
            <Badge variant={statusVariant} dot>
              {humanize(test.status)}
            </Badge>
            {test.result && resultVariant && (
              <Badge variant={resultVariant}>{humanize(test.result)}</Badge>
            )}
          </span>
        }
        description={typeLabel}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit2 className="h-4 w-4" />}
            onClick={() => navigate(`/bcdr/tests/${test.id}/edit`)}
          >
            Edit
          </Button>
        }
      />

      <Card>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetaCell
              label="Plan"
              value={
                test.plan_title ? (
                  <span className="text-surface-900">{test.plan_title}</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell label="Scheduled" value={formatDate(test.scheduled_date)} />
            <MetaCell
              label="Result"
              value={
                test.result && resultVariant ? (
                  <Badge variant={resultVariant}>{humanize(test.result)}</Badge>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
            <MetaCell
              label="Lead"
              value={
                test.coordinator_name ? (
                  <span className="text-surface-900">{test.coordinator_name}</span>
                ) : (
                  <span className="text-surface-500">—</span>
                )
              }
            />
          </div>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Objectives', content: objectivesTab },
          { label: 'Procedures', content: proceduresTab },
          {
            label: (
              <span className="inline-flex items-center gap-2">
                Findings
                {findings.length > 0 && (
                  <Badge variant="warning" size="sm">
                    {findings.length}
                  </Badge>
                )}
              </span>
            ),
            content: findingsTab,
          },
          {
            label: (
              <span className="inline-flex items-center gap-2">
                Participants
                {participants.length > 0 && (
                  <Badge variant="neutral" size="sm">
                    {participants.length}
                  </Badge>
                )}
              </span>
            ),
            content: participantsTab,
          },
          { label: 'Notes', content: notesTab },
        ]}
      />
    </div>
  );
}
