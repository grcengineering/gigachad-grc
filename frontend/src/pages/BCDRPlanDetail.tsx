import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Pencil,
  ShieldAlert,
  FileText,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
  Link2,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  Input,
  Label,
  Select,
  Skeleton,
  SkeletonText,
  Tabs,
  Textarea,
  PageHeader,
  type BadgeVariant,
} from '@/components/ui';

interface BCDRPlanProcess {
  id: string;
  process_id?: string;
  processId?: string;
  name: string;
  criticality_tier?: string;
  criticalityTier?: string;
}

interface BCDRPlanControl {
  id: string;
  control_id?: string;
  controlId?: string;
  title: string;
}

interface BCDRPlanTest {
  id: string;
  test_id?: string;
  testId?: string;
  name: string;
  status?: string;
  result?: string;
  scheduled_date?: string;
  scheduledDate?: string;
}

interface BCDRPlanCommunication {
  id: string;
  name: string;
  plan_type?: string;
  planType?: string;
}

interface BCDRPlanProcedure {
  id: string;
  title: string;
  description?: string;
  order?: number;
}

interface BCDRPlanDetailData {
  id: string;
  plan_id?: string;
  planId?: string;
  title: string;
  description?: string;
  plan_type?: string;
  planType?: string;
  status: string;
  version?: string | number;
  owner_id?: string;
  ownerId?: string;
  owner_name?: string;
  ownerName?: string;
  owner_email?: string;
  ownerEmail?: string;
  effective_date?: string;
  effectiveDate?: string;
  review_frequency?: string;
  reviewFrequency?: string;
  next_review_due?: string;
  nextReviewDue?: string;
  last_reviewed_at?: string;
  lastReviewedAt?: string;
  objectives?: string;
  scope?: string;
  scope_description?: string;
  scopeDescription?: string;
  assumptions?: string;
  activation_criteria?: string;
  activationCriteria?: string;
  deactivation_criteria?: string;
  deactivationCriteria?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  in_scope_processes?: BCDRPlanProcess[];
  inScopeProcesses?: BCDRPlanProcess[];
  linked_controls?: BCDRPlanControl[];
  linkedControls?: BCDRPlanControl[];
  communication_plans?: BCDRPlanCommunication[];
  communicationPlans?: BCDRPlanCommunication[];
  dr_tests?: BCDRPlanTest[];
  drTests?: BCDRPlanTest[];
  procedures?: BCDRPlanProcedure[];
}

const PLAN_TYPE_OPTS = [
  { value: 'business_continuity', label: 'Business Continuity' },
  { value: 'disaster_recovery', label: 'Disaster Recovery' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'crisis_communication', label: 'Crisis Communication' },
  { value: 'pandemic_response', label: 'Pandemic Response' },
  { value: 'it_recovery', label: 'IT Recovery' },
  { value: 'data_backup', label: 'Data Backup' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  in_review: 'warning',
  approved: 'info',
  published: 'success',
  archived: 'neutral',
  expired: 'danger',
};

function planTypeLabel(value?: string) {
  if (!value) return '—';
  return PLAN_TYPE_OPTS.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ');
}

function statusLabel(value?: string) {
  if (!value) return '—';
  return STATUS_OPTS.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ');
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function pickFirst<T>(...values: (T | undefined | null)[]): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function getProcesses(plan: BCDRPlanDetailData): BCDRPlanProcess[] {
  return plan.inScopeProcesses ?? plan.in_scope_processes ?? [];
}

function getControls(plan: BCDRPlanDetailData): BCDRPlanControl[] {
  return plan.linkedControls ?? plan.linked_controls ?? [];
}

function getTests(plan: BCDRPlanDetailData): BCDRPlanTest[] {
  return plan.drTests ?? plan.dr_tests ?? [];
}

function getCommunications(plan: BCDRPlanDetailData): BCDRPlanCommunication[] {
  return plan.communicationPlans ?? plan.communication_plans ?? [];
}

function getProcedures(plan: BCDRPlanDetailData): BCDRPlanProcedure[] {
  return plan.procedures ?? [];
}

function getControlCode(c: BCDRPlanControl): string {
  return c.controlId || c.control_id || '';
}

function getProcessCode(p: BCDRPlanProcess): string {
  return p.processId || p.process_id || '';
}

function getCriticality(p: BCDRPlanProcess): string {
  return p.criticalityTier || p.criticality_tier || '';
}

function getScheduledDate(t: BCDRPlanTest): string | undefined {
  return t.scheduledDate || t.scheduled_date;
}

function getCommType(c: BCDRPlanCommunication): string {
  return c.planType || c.plan_type || '';
}

interface EditForm {
  title: string;
  description: string;
  planType: string;
  status: string;
  objectives: string;
  scope: string;
  assumptions: string;
  activationCriteria: string;
  deactivationCriteria: string;
}

const EMPTY_FORM: EditForm = {
  title: '',
  description: '',
  planType: 'business_continuity',
  status: 'draft',
  objectives: '',
  scope: '',
  assumptions: '',
  activationCriteria: '',
  deactivationCriteria: '',
};

export default function BCDRPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);

  const {
    data: plan,
    isLoading,
    isError,
  } = useQuery<BCDRPlanDetailData>({
    queryKey: ['bcdr', 'plan', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/plans/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!plan) return;
    setEditForm({
      title: plan.title || '',
      description: plan.description || '',
      planType: plan.planType || plan.plan_type || 'business_continuity',
      status: plan.status || 'draft',
      objectives: plan.objectives || '',
      scope: plan.scopeDescription || plan.scope_description || plan.scope || '',
      assumptions: plan.assumptions || '',
      activationCriteria: plan.activationCriteria || plan.activation_criteria || '',
      deactivationCriteria: plan.deactivationCriteria || plan.deactivation_criteria || '',
    });
  }, [plan]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditForm) => {
      const res = await api.put(`/api/bcdr/plans/${id}`, {
        title: data.title,
        description: data.description,
        planType: data.planType,
        status: data.status,
        objectives: data.objectives,
        scopeDescription: data.scope,
        assumptions: data.assumptions,
        activationCriteria: data.activationCriteria,
        deactivationCriteria: data.deactivationCriteria,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcdr', 'plan', id] });
      queryClient.invalidateQueries({ queryKey: ['bcdr', 'plans'] });
      setShowEditModal(false);
      toast.success('Plan updated');
    },
    onError: () => {
      toast.error('Failed to update plan');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <Link
            to="/bcdr/plans"
            className="inline-flex items-center gap-1 text-small text-surface-600 hover:text-surface-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to plans
          </Link>
        </div>
        <Skeleton className="h-16" />
        <Card>
          <CardBody density="comfy">
            <SkeletonText lines={4} />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/bcdr/plans"
          className="inline-flex items-center gap-1 text-small text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </Link>
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<XCircle className="h-8 w-8" />}
              title="Plan not found"
              description="The requested BC/DR plan could not be loaded."
              action={
                <Button variant="outline" onClick={() => navigate('/bcdr/plans')}>
                  Back to plans
                </Button>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const planCode = pickFirst(plan.planId, plan.plan_id);
  const planType = pickFirst(plan.planType, plan.plan_type);
  const ownerName = pickFirst(plan.ownerName, plan.owner_name);
  const ownerEmail = pickFirst(plan.ownerEmail, plan.owner_email);
  const effectiveDate = pickFirst(plan.effectiveDate, plan.effective_date);
  const reviewFrequency = pickFirst(plan.reviewFrequency, plan.review_frequency);
  const nextReviewDue = pickFirst(plan.nextReviewDue, plan.next_review_due);
  const lastReviewed = pickFirst(plan.lastReviewedAt, plan.last_reviewed_at);
  const scope = pickFirst(plan.scopeDescription, plan.scope_description, plan.scope);
  const activationCriteria = pickFirst(plan.activationCriteria, plan.activation_criteria);
  const deactivationCriteria = pickFirst(plan.deactivationCriteria, plan.deactivation_criteria);

  const processes = getProcesses(plan);
  const controls = getControls(plan);
  const tests = getTests(plan);
  const communications = getCommunications(plan);
  const procedures = getProcedures(plan);

  const overviewContent = (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          {plan.description ? (
            <p className="text-surface-800 whitespace-pre-wrap">{plan.description}</p>
          ) : (
            <p className="text-surface-500 italic">No description provided.</p>
          )}
        </CardBody>
      </Card>

      {plan.objectives && (
        <Card>
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            <p className="text-surface-800 whitespace-pre-wrap">{plan.objectives}</p>
          </CardBody>
        </Card>
      )}

      {scope && (
        <Card>
          <CardHeader>
            <CardTitle>Scope</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            <p className="text-surface-800 whitespace-pre-wrap">{scope}</p>
          </CardBody>
        </Card>
      )}

      {(activationCriteria || deactivationCriteria) && (
        <Card>
          <CardHeader>
            <CardTitle>Activation & Deactivation</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activationCriteria && (
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                    Activation Criteria
                  </p>
                  <p className="text-surface-800 whitespace-pre-wrap mt-1">{activationCriteria}</p>
                </div>
              )}
              {deactivationCriteria && (
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                    Deactivation Criteria
                  </p>
                  <p className="text-surface-800 whitespace-pre-wrap mt-1">
                    {deactivationCriteria}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {plan.assumptions && (
        <Card>
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            <p className="text-surface-800 whitespace-pre-wrap">{plan.assumptions}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>In-Scope Processes</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          {processes.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="h-6 w-6" />}
              title="No processes in scope"
              description="Link business processes to define the scope of this plan."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {processes.map((process) => (
                <Link
                  key={process.id}
                  to={`/bcdr/processes/${process.id}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldAlert className="h-4 w-4 text-surface-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-surface-900 font-medium truncate">{process.name}</p>
                      <p className="text-xs text-surface-500 font-mono">
                        {getProcessCode(process)}
                      </p>
                    </div>
                  </div>
                  {getCriticality(process) && (
                    <Badge variant="neutral" size="sm">
                      {getCriticality(process).replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const proceduresContent = (
    <Card>
      <CardHeader>
        <CardTitle>Procedures</CardTitle>
      </CardHeader>
      <CardBody density="comfy">
        {procedures.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No procedures defined"
            description="Add step-by-step procedures to execute this plan."
            size="sm"
          />
        ) : (
          <ol className="space-y-3">
            {procedures.map((procedure, idx) => (
              <li
                key={procedure.id}
                className="flex gap-3 p-3 rounded-md bg-surface-50 border border-surface-200"
              >
                <div className="shrink-0 h-7 w-7 rounded-full bg-brand-50 text-brand-700 text-small font-medium flex items-center justify-center">
                  {procedure.order ?? idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-surface-900 font-medium">{procedure.title}</p>
                  {procedure.description && (
                    <p className="text-small text-surface-700 whitespace-pre-wrap mt-1">
                      {procedure.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );

  const controlsContent = (
    <Card>
      <CardHeader>
        <CardTitle>Linked Controls</CardTitle>
      </CardHeader>
      <CardBody density="comfy">
        {controls.length === 0 ? (
          <EmptyState
            icon={<Link2 className="h-6 w-6" />}
            title="No controls linked"
            description="Link controls that implement or support this plan."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {controls.map((control) => (
              <Link
                key={control.id}
                to={`/controls/${control.id}`}
                className="flex items-center gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
              >
                <Link2 className="h-4 w-4 text-surface-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-surface-900 font-medium truncate">{control.title}</p>
                  <p className="text-xs text-surface-500 font-mono">{getControlCode(control)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  const testsContent = (
    <Card>
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
        <Link to="/bcdr/tests/new" className="text-small text-brand-700 hover:text-brand-800">
          Schedule test →
        </Link>
      </CardHeader>
      <CardBody density="comfy">
        {tests.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="h-6 w-6" />}
            title="No DR tests"
            description="Schedule and run tests to validate this plan."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {tests.map((test) => {
              let icon = <Calendar className="h-4 w-4 text-surface-500 shrink-0" />;
              let variant: BadgeVariant = 'neutral';
              if (test.result === 'passed') {
                icon = <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
                variant = 'success';
              } else if (test.result === 'failed') {
                icon = <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
                variant = 'danger';
              } else if (test.status === 'in_progress') {
                variant = 'warning';
              } else if (test.status === 'completed') {
                variant = 'success';
              }
              return (
                <Link
                  key={test.id}
                  to={`/bcdr/tests/${test.id}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {icon}
                    <div className="min-w-0">
                      <p className="text-surface-900 font-medium truncate">{test.name}</p>
                      <p className="text-xs text-surface-500 tabular-nums">
                        {formatDate(getScheduledDate(test))}
                      </p>
                    </div>
                  </div>
                  {test.status && (
                    <Badge variant={variant} size="sm">
                      {test.status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );

  const communicationsContent = (
    <Card>
      <CardHeader>
        <CardTitle>Communications</CardTitle>
      </CardHeader>
      <CardBody density="comfy">
        {communications.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="No communication plans"
            description="Define how to notify stakeholders during plan execution."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {communications.map((comm) => (
              <div
                key={comm.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-surface-50 border border-surface-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="h-4 w-4 text-surface-500 shrink-0" />
                  <p className="text-surface-900 font-medium truncate">{comm.name}</p>
                </div>
                {getCommType(comm) && (
                  <Badge variant="info" size="sm">
                    {getCommType(comm).replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/bcdr/plans"
        className="inline-flex items-center gap-1 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plans
      </Link>

      <PageHeader
        title={plan.title}
        description={
          <span className="font-mono text-surface-600">
            {planCode || '—'}
            {plan.version != null && ` · v${plan.version}`}
          </span>
        }
        meta={
          <>
            <Badge variant={STATUS_VARIANT[plan.status] ?? 'neutral'} dot>
              {statusLabel(plan.status)}
            </Badge>
            {planType && (
              <Badge variant="info" size="sm">
                {planTypeLabel(planType)}
              </Badge>
            )}
          </>
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => setShowEditModal(true)}
          >
            Edit
          </Button>
        }
      />

      <Card>
        <CardBody density="comfy">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Owner</p>
              <p className="text-surface-900 mt-1">{ownerName || '—'}</p>
              {ownerEmail && <p className="text-xs text-surface-500 truncate">{ownerEmail}</p>}
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                Effective Date
              </p>
              <p className="text-surface-900 mt-1 tabular-nums">{formatDate(effectiveDate)}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                Review Frequency
              </p>
              <p className="text-surface-900 mt-1 capitalize">
                {reviewFrequency ? reviewFrequency.replace(/_/g, ' ') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                Next Review
              </p>
              <p className="text-surface-900 mt-1 tabular-nums">{formatDate(nextReviewDue)}</p>
              {lastReviewed && (
                <p className="text-xs text-surface-500">Last: {formatDate(lastReviewed)}</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Overview', content: overviewContent },
          { label: 'Procedures', content: proceduresContent },
          { label: 'Linked Controls', content: controlsContent },
          { label: 'Test Results', content: testsContent },
          { label: 'Communications', content: communicationsContent },
        ]}
      />

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit BC/DR plan"
        description="Update the plan's metadata and content."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editForm)}
              disabled={!editForm.title}
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="plan-title" required>
              Title
            </Label>
            <Input
              id="plan-title"
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Plan Type</Label>
              <Select
                value={editForm.planType}
                onChange={(v) => setEditForm((prev) => ({ ...prev, planType: v }))}
                options={PLAN_TYPE_OPTS}
                searchable
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onChange={(v) => setEditForm((prev) => ({ ...prev, status: v }))}
                options={STATUS_OPTS}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="plan-objectives">Objectives</Label>
            <Textarea
              id="plan-objectives"
              rows={3}
              value={editForm.objectives}
              onChange={(e) => setEditForm((prev) => ({ ...prev, objectives: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="plan-scope">Scope</Label>
            <Textarea
              id="plan-scope"
              rows={3}
              value={editForm.scope}
              onChange={(e) => setEditForm((prev) => ({ ...prev, scope: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan-activation">Activation Criteria</Label>
              <Textarea
                id="plan-activation"
                rows={2}
                value={editForm.activationCriteria}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, activationCriteria: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="plan-deactivation">Deactivation Criteria</Label>
              <Textarea
                id="plan-deactivation"
                rows={2}
                value={editForm.deactivationCriteria}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, deactivationCriteria: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="plan-assumptions">Assumptions</Label>
            <Textarea
              id="plan-assumptions"
              rows={2}
              value={editForm.assumptions}
              onChange={(e) => setEditForm((prev) => ({ ...prev, assumptions: e.target.value }))}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
