import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button, Input, PageHeader, Select, Textarea } from '@/components/ui';

type RecordKind = 'plans' | 'runbooks' | 'tests' | 'processes';

interface Props {
  kind: RecordKind;
  edit?: boolean;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  type: string;
  secondary: string;
  content: string;
  date: string;
  duration: string;
  rto: string;
  rpo: string;
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  description: '',
  type: '',
  secondary: '',
  content: '',
  date: '',
  duration: '',
  rto: '',
  rpo: '',
};

const TYPES: Record<RecordKind, Array<{ value: string; label: string }>> = {
  plans: [
    { value: 'business_continuity', label: 'Business Continuity' },
    { value: 'disaster_recovery', label: 'Disaster Recovery' },
    { value: 'incident_response', label: 'Incident Response' },
    { value: 'crisis_communication', label: 'Crisis Communication' },
    { value: 'it_recovery', label: 'IT Recovery' },
    { value: 'other', label: 'Other' },
  ],
  runbooks: [
    { value: 'system_recovery', label: 'System Recovery' },
    { value: 'data_restore', label: 'Data Restore' },
    { value: 'failover', label: 'Failover' },
    { value: 'communication', label: 'Communication' },
    { value: 'network', label: 'Network' },
    { value: 'security', label: 'Security' },
    { value: 'general', label: 'General' },
  ],
  tests: [
    { value: 'tabletop', label: 'Tabletop Exercise' },
    { value: 'walkthrough', label: 'Walkthrough' },
    { value: 'simulation', label: 'Simulation' },
    { value: 'parallel', label: 'Parallel Test' },
    { value: 'full_interruption', label: 'Full Interruption' },
  ],
  processes: [
    { value: 'tier_1_critical', label: 'Tier 1 — Critical' },
    { value: 'tier_2_essential', label: 'Tier 2 — Essential' },
    { value: 'tier_3_important', label: 'Tier 3 — Important' },
    { value: 'tier_4_standard', label: 'Tier 4 — Standard' },
  ],
};

const LABELS: Record<
  RecordKind,
  { singular: string; title: string; code: string; type: string; secondary: string }
> = {
  plans: {
    singular: 'plan',
    title: 'BC/DR Plan',
    code: 'Plan ID',
    type: 'Plan Type',
    secondary: 'Version',
  },
  runbooks: {
    singular: 'runbook',
    title: 'Runbook',
    code: 'Runbook ID',
    type: 'Category',
    secondary: 'System Name',
  },
  tests: {
    singular: 'test',
    title: 'DR Test',
    code: 'Test ID',
    type: 'Test Type',
    secondary: 'Success Criteria',
  },
  processes: {
    singular: 'process',
    title: 'Business Process',
    code: 'Process ID',
    type: 'Criticality Tier',
    secondary: 'Department',
  },
};

function value(record: Record<string, unknown>, camel: string, snake: string): string {
  const raw = record[camel] ?? record[snake];
  return raw === null || raw === undefined ? '' : String(raw);
}

function toForm(kind: RecordKind, record: Record<string, unknown>): FormState {
  const common = {
    ...EMPTY_FORM,
    description: value(record, 'description', 'description'),
  };
  if (kind === 'plans') {
    return {
      ...common,
      code: value(record, 'planId', 'plan_id'),
      name: value(record, 'title', 'title'),
      type: value(record, 'planType', 'plan_type'),
      secondary: value(record, 'version', 'version'),
    };
  }
  if (kind === 'runbooks') {
    return {
      ...common,
      code: value(record, 'runbookId', 'runbook_id'),
      name: value(record, 'title', 'title'),
      type: value(record, 'category', 'category'),
      secondary: value(record, 'systemName', 'system_name'),
      content: value(record, 'content', 'content'),
      duration: value(record, 'estimatedDurationMinutes', 'estimated_duration_minutes'),
    };
  }
  if (kind === 'tests') {
    return {
      ...common,
      code: value(record, 'testId', 'test_id'),
      name: value(record, 'name', 'name'),
      type: value(record, 'testType', 'test_type'),
      secondary: value(record, 'successCriteria', 'success_criteria'),
      content: value(record, 'testObjectives', 'test_objectives'),
      date: value(record, 'scheduledDate', 'scheduled_date').slice(0, 10),
      duration: value(record, 'scheduledDurationHours', 'scheduled_duration_hours'),
    };
  }
  return {
    ...common,
    code: value(record, 'processId', 'process_id'),
    name: value(record, 'name', 'name'),
    type: value(record, 'criticalityTier', 'criticality_tier'),
    secondary: value(record, 'department', 'department'),
    rto: value(record, 'rtoHours', 'rto_hours'),
    rpo: value(record, 'rpoHours', 'rpo_hours'),
  };
}

export default function BCDRRecordForm({ kind, edit = false }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  const labels = LABELS[kind];
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const record = useQuery<Record<string, unknown>>({
    queryKey: ['bcdr', kind, id, 'edit'],
    queryFn: async () => (await api.get(`/api/bcdr/${kind}/${id}`)).data,
    enabled: edit && Boolean(id),
  });

  useEffect(() => {
    if (record.data) setForm(toForm(kind, record.data));
  }, [kind, record.data]);

  const payload = useMemo(() => {
    const optionalNumber = (input: string) => (input ? Number(input) : undefined);
    if (kind === 'plans') {
      return {
        ...(!edit && { planId: form.code }),
        title: form.name,
        description: form.description || undefined,
        planType: form.type,
        version: form.secondary || undefined,
      };
    }
    if (kind === 'runbooks') {
      return {
        ...(!edit && { runbookId: form.code }),
        title: form.name,
        description: form.description || undefined,
        category: form.type || undefined,
        systemName: form.secondary || undefined,
        content: form.content || undefined,
        estimatedDurationMinutes: optionalNumber(form.duration),
      };
    }
    if (kind === 'tests') {
      return {
        ...(!edit && { testId: form.code, testType: form.type }),
        name: form.name,
        description: form.description || undefined,
        scheduledDate: form.date || undefined,
        scheduledDurationHours: optionalNumber(form.duration),
        testObjectives: form.content || undefined,
        successCriteria: form.secondary || undefined,
      };
    }
    return {
      ...(!edit && { processId: form.code }),
      name: form.name,
      description: form.description || undefined,
      department: form.secondary || undefined,
      criticalityTier: form.type,
      rtoHours: optionalNumber(form.rto),
      rpoHours: optionalNumber(form.rpo),
    };
  }, [edit, form, kind]);

  const save = useMutation({
    mutationFn: async () =>
      edit
        ? (await api.put(`/api/bcdr/${kind}/${id}`, payload)).data
        : (await api.post(`/api/bcdr/${kind}`, payload)).data,
    onSuccess: (saved) => {
      toast.success(`${labels.title} ${edit ? 'updated' : 'created'}`);
      navigate(`/bcdr/${kind}/${saved?.id ?? id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || `Unable to save ${labels.singular}`);
    },
  });

  const set = (field: keyof FormState, next: string) =>
    setForm((current) => ({ ...current, [field]: next }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  if (record.isLoading) return <div className="card p-6 text-surface-600">Loading record…</div>;
  if (record.isError) {
    return <div className="card p-6 text-red-700">This {labels.singular} could not be loaded.</div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={`${edit ? 'Edit' : kind === 'tests' ? 'Schedule' : 'Create'} ${labels.title}`}
        description={`Save a persisted ${labels.singular} in the BC/DR register.`}
      />
      <form onSubmit={submit} className="card p-6 space-y-5 max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={labels.code}
            value={form.code}
            onChange={(event) => set('code', event.target.value)}
            required
            disabled={edit}
          />
          <Input
            label={kind === 'plans' || kind === 'runbooks' ? 'Title' : 'Name'}
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            required
          />
          <Select
            label={labels.type}
            value={form.type}
            onChange={(next) => set('type', next)}
            options={TYPES[kind]}
            required
            disabled={edit && kind === 'tests'}
          />
          <Input
            label={labels.secondary}
            value={form.secondary}
            onChange={(event) => set('secondary', event.target.value)}
          />
        </div>
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => set('description', event.target.value)}
          rows={3}
        />
        {kind === 'runbooks' && (
          <>
            <Textarea
              label="Recovery Procedure"
              value={form.content}
              onChange={(event) => set('content', event.target.value)}
              rows={8}
            />
            <Input
              type="number"
              min="1"
              label="Estimated Duration (minutes)"
              value={form.duration}
              onChange={(event) => set('duration', event.target.value)}
            />
          </>
        )}
        {kind === 'tests' && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="date"
                label="Scheduled Date"
                value={form.date}
                onChange={(event) => set('date', event.target.value)}
              />
              <Input
                type="number"
                min="1"
                label="Duration (hours)"
                value={form.duration}
                onChange={(event) => set('duration', event.target.value)}
              />
            </div>
            <Textarea
              label="Test Objectives"
              value={form.content}
              onChange={(event) => set('content', event.target.value)}
              rows={4}
            />
          </>
        )}
        {kind === 'processes' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              min="0"
              label="RTO (hours)"
              value={form.rto}
              onChange={(event) => set('rto', event.target.value)}
            />
            <Input
              type="number"
              min="0"
              label="RPO (hours)"
              value={form.rpo}
              onChange={(event) => set('rpo', event.target.value)}
            />
          </div>
        )}
        <div className="flex justify-end gap-3 border-t border-surface-200 pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate(`/bcdr/${kind}`)}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {edit ? 'Save Changes' : kind === 'tests' ? 'Schedule Test' : `Create ${labels.title}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
