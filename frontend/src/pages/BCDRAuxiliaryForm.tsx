import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button, Input, PageHeader, Select, Textarea } from '@/components/ui';

type AuxiliaryKind = 'recovery-teams' | 'communication' | 'exercise-templates' | 'incidents';

interface Props {
  kind: AuxiliaryKind;
  edit?: boolean;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  type: string;
  secondary: string;
  details: string;
  extra: string;
  duration: string;
}

const EMPTY: FormState = {
  code: '',
  name: '',
  description: '',
  type: '',
  secondary: '',
  details: '',
  extra: '',
  duration: '',
};

const OPTIONS: Record<AuxiliaryKind, Array<{ value: string; label: string }>> = {
  'recovery-teams': [
    { value: 'crisis_management', label: 'Crisis Management' },
    { value: 'it_recovery', label: 'IT Recovery' },
    { value: 'business_recovery', label: 'Business Recovery' },
    { value: 'communications', label: 'Communications' },
    { value: 'executive', label: 'Executive' },
  ],
  communication: [
    { value: 'crisis', label: 'Crisis Communications' },
    { value: 'employee', label: 'Employee Communications' },
    { value: 'customer', label: 'Customer Communications' },
    { value: 'regulatory', label: 'Regulatory Communications' },
    { value: 'media', label: 'Media Communications' },
  ],
  'exercise-templates': [
    { value: 'ransomware', label: 'Ransomware' },
    { value: 'natural_disaster', label: 'Natural Disaster' },
    { value: 'vendor_outage', label: 'Vendor Outage' },
    { value: 'data_breach', label: 'Data Breach' },
    { value: 'pandemic', label: 'Pandemic' },
    { value: 'infrastructure', label: 'Infrastructure' },
  ],
  incidents: [
    { value: 'disaster', label: 'Disaster' },
    { value: 'major_incident', label: 'Major Incident' },
    { value: 'drill', label: 'Drill' },
    { value: 'near_miss', label: 'Near Miss' },
  ],
};

const SECONDARY_OPTIONS: Partial<
  Record<AuxiliaryKind, Array<{ value: string; label: string }>>
> = {
  'exercise-templates': [
    { value: 'tabletop', label: 'Tabletop' },
    { value: 'walkthrough', label: 'Walkthrough' },
    { value: 'simulation', label: 'Simulation' },
  ],
  incidents: [
    { value: 'critical', label: 'Critical' },
    { value: 'major', label: 'Major' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'minor', label: 'Minor' },
  ],
};

const LABELS: Record<
  AuxiliaryKind,
  { title: string; singular: string; list: string; type: string; secondary?: string }
> = {
  'recovery-teams': {
    title: 'Recovery Team',
    singular: 'team',
    list: '/bcdr/recovery-teams',
    type: 'Team Type',
  },
  communication: {
    title: 'Communication Plan',
    singular: 'plan',
    list: '/bcdr/communication',
    type: 'Plan Type',
  },
  'exercise-templates': {
    title: 'Exercise Template',
    singular: 'template',
    list: '/bcdr/exercise-templates',
    type: 'Category',
    secondary: 'Scenario Type',
  },
  incidents: {
    title: 'BC/DR Incident',
    singular: 'incident',
    list: '/bcdr/incidents',
    type: 'Incident Type',
    secondary: 'Severity',
  },
};

function read(record: Record<string, unknown>, camel: string, snake: string): string {
  const raw = record[camel] ?? record[snake];
  return raw === null || raw === undefined ? '' : String(raw);
}

function fromRecord(kind: AuxiliaryKind, record: Record<string, unknown>): FormState {
  if (kind === 'recovery-teams') {
    return {
      ...EMPTY,
      name: read(record, 'name', 'name'),
      description: read(record, 'description', 'description'),
      type: read(record, 'teamType', 'team_type'),
      details: read(record, 'activationCriteria', 'activation_criteria'),
      secondary: read(record, 'assemblyLocation', 'assembly_location'),
      extra: read(record, 'communicationChannel', 'communication_channel'),
    };
  }
  if (kind === 'exercise-templates') {
    const rawQuestions =
      (record.discussionQuestions as unknown[]) ||
      (record.discussion_questions as unknown[]) ||
      [];
    return {
      ...EMPTY,
      code: read(record, 'templateId', 'template_id'),
      name: read(record, 'title', 'title'),
      description: read(record, 'description', 'description'),
      type: read(record, 'category', 'category'),
      secondary: read(record, 'scenarioType', 'scenario_type'),
      details: read(record, 'scenarioNarrative', 'scenario_narrative'),
      extra: rawQuestions
        .map((question) =>
          typeof question === 'string'
            ? question
            : String((question as Record<string, unknown>)?.question || '')
        )
        .filter(Boolean)
        .join('\n'),
      duration: read(record, 'estimatedDuration', 'estimated_duration_minutes'),
    };
  }
  return {
    ...EMPTY,
    name: read(record, 'name', 'name'),
    description: read(record, 'description', 'description'),
    type: read(record, 'planType', 'plan_type'),
    details: read(record, 'activationTriggers', 'activation_triggers'),
  };
}

export default function BCDRAuxiliaryForm({ kind, edit = false }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  const labels = LABELS[kind];
  const [form, setForm] = useState<FormState>(EMPTY);

  const record = useQuery<Record<string, unknown>>({
    queryKey: ['bcdr', kind, id, 'edit'],
    queryFn: async () => (await api.get(`/api/bcdr/${kind}/${id}`)).data,
    enabled: edit && Boolean(id),
  });

  useEffect(() => {
    if (record.data) setForm(fromRecord(kind, record.data));
  }, [kind, record.data]);

  const payload = useMemo(() => {
    if (kind === 'recovery-teams') {
      return {
        name: form.name,
        description: form.description || undefined,
        teamType: form.type,
        activationCriteria: form.details || undefined,
        assemblyLocation: form.secondary || undefined,
        communicationChannel: form.extra || undefined,
      };
    }
    if (kind === 'communication') {
      return {
        name: form.name,
        description: form.description || undefined,
        planType: form.type || undefined,
        activationTriggers: form.details || undefined,
      };
    }
    if (kind === 'exercise-templates') {
      const discussionQuestions = form.extra
        .split('\n')
        .map((question) => question.trim())
        .filter(Boolean)
        .map((question) => ({ question }));
      return {
        templateId: form.code,
        title: form.name,
        description: form.description || undefined,
        category: form.type,
        scenarioType: form.secondary,
        scenarioNarrative: form.details,
        discussionQuestions,
        estimatedDuration: form.duration ? Number(form.duration) : undefined,
      };
    }
    return {
      title: form.name,
      description: form.description || undefined,
      incidentType: form.type,
      severity: form.secondary,
    };
  }, [form, kind]);

  const save = useMutation({
    mutationFn: async () =>
      edit
        ? (await api.put(`/api/bcdr/${kind}/${id}`, payload)).data
        : (await api.post(`/api/bcdr/${kind}`, payload)).data,
    onSuccess: (saved) => {
      toast.success(`${labels.title} ${edit ? 'updated' : 'created'}`);
      if (kind === 'exercise-templates') navigate(labels.list);
      else navigate(`${labels.list}/${saved?.id ?? id}`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || `Unable to save ${labels.singular}`),
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
        title={`${kind === 'incidents' ? 'Declare' : edit ? 'Edit' : 'Create'} ${labels.title}`}
        description={`Save a persisted ${labels.singular} in the BC/DR register.`}
      />
      <form onSubmit={submit} className="card p-6 space-y-5 max-w-3xl">
        {kind === 'exercise-templates' && (
          <Input
            label="Template ID"
            value={form.code}
            onChange={(event) => set('code', event.target.value)}
            required
            disabled={edit}
          />
        )}
        <Input
          label={kind === 'exercise-templates' ? 'Title' : 'Name'}
          value={form.name}
          onChange={(event) => set('name', event.target.value)}
          required
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => set('description', event.target.value)}
          rows={3}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label={labels.type}
            value={form.type}
            onChange={(next) => set('type', next)}
            options={OPTIONS[kind]}
            required
          />
          {SECONDARY_OPTIONS[kind] && (
            <Select
              label={labels.secondary}
              value={form.secondary}
              onChange={(next) => set('secondary', next)}
              options={SECONDARY_OPTIONS[kind]!}
              required
            />
          )}
        </div>
        {kind === 'recovery-teams' && (
          <>
            <Textarea
              label="Activation Criteria"
              value={form.details}
              onChange={(event) => set('details', event.target.value)}
              rows={3}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Assembly Location"
                value={form.secondary}
                onChange={(event) => set('secondary', event.target.value)}
              />
              <Input
                label="Communication Channel"
                value={form.extra}
                onChange={(event) => set('extra', event.target.value)}
              />
            </div>
          </>
        )}
        {kind === 'communication' && (
          <Textarea
            label="Activation Triggers"
            value={form.details}
            onChange={(event) => set('details', event.target.value)}
            rows={3}
          />
        )}
        {kind === 'exercise-templates' && (
          <>
            <Textarea
              label="Scenario Narrative"
              value={form.details}
              onChange={(event) => set('details', event.target.value)}
              rows={6}
              required
            />
            <Textarea
              label="Discussion Questions (one per line)"
              value={form.extra}
              onChange={(event) => set('extra', event.target.value)}
              rows={5}
              required
            />
            <Input
              type="number"
              min="15"
              label="Estimated Duration (minutes)"
              value={form.duration}
              onChange={(event) => set('duration', event.target.value)}
            />
          </>
        )}
        <div className="flex justify-end gap-3 border-t border-surface-200 pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate(labels.list)}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {kind === 'incidents'
              ? 'Declare Incident'
              : edit
                ? 'Save Changes'
                : `Create ${labels.title}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
