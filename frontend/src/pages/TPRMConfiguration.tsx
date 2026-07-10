import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  Tabs,
  Textarea,
} from '@/components/ui';

interface RiskTier {
  id: string;
  name: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
  color: 'red' | 'amber' | 'blue' | 'emerald' | 'neutral';
}

interface AssessmentTemplate {
  id: string;
  name: string;
  description?: string;
  controlsCount: number;
}

type AutotagOperator = 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'gt' | 'lt';

interface AutotagRule {
  id: string;
  field: string;
  operator: AutotagOperator;
  value: string;
  tag: string;
}

interface TPRMConfig {
  riskTiers: RiskTier[];
  assessmentTemplates: AssessmentTemplate[];
  autotaggingRules: AutotagRule[];
}

const DEFAULT_CONFIG: TPRMConfig = {
  riskTiers: [
    { id: 'critical', name: 'Critical', description: 'Highest risk vendors. Require executive review and continuous monitoring.', scoreMin: 80, scoreMax: 100, color: 'red' },
    { id: 'high', name: 'High', description: 'Significant risk. Require annual review and remediation tracking.', scoreMin: 60, scoreMax: 79, color: 'amber' },
    { id: 'medium', name: 'Medium', description: 'Moderate risk. Standard assessment cadence applies.', scoreMin: 30, scoreMax: 59, color: 'blue' },
    { id: 'low', name: 'Low', description: 'Minimal risk. Lightweight assessment.', scoreMin: 0, scoreMax: 29, color: 'emerald' },
  ],
  assessmentTemplates: [],
  autotaggingRules: [],
};

const FIELD_OPTIONS = [
  { value: 'name', label: 'Vendor name' },
  { value: 'category', label: 'Category' },
  { value: 'spend', label: 'Annual spend' },
  { value: 'data_classification', label: 'Data classification' },
  { value: 'region', label: 'Region' },
];

const OPERATOR_OPTIONS: { value: AutotagOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'gt', label: 'is greater than' },
  { value: 'lt', label: 'is less than' },
];

function tierVariant(color: RiskTier['color']) {
  switch (color) {
    case 'red':
      return 'danger' as const;
    case 'amber':
      return 'warning' as const;
    case 'blue':
      return 'info' as const;
    case 'emerald':
      return 'success' as const;
    default:
      return 'neutral' as const;
  }
}

export default function TPRMConfiguration() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TPRMConfig>(DEFAULT_CONFIG);

  const { data, isLoading } = useQuery<TPRMConfig>({
    queryKey: ['tprm-config'],
    queryFn: async () => {
      const res = await api.get('/api/config/tprm');
      const payload = res.data?.data ?? res.data;
      return {
        riskTiers: payload?.riskTiers ?? DEFAULT_CONFIG.riskTiers,
        assessmentTemplates: payload?.assessmentTemplates ?? [],
        autotaggingRules: payload?.autotaggingRules ?? [],
      };
    },
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: TPRMConfig) => api.put('/api/config/tprm', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tprm-config'] }),
  });

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(data), [draft, data]);

  const updateTier = (id: string, patch: Partial<RiskTier>) => {
    setDraft((d) => ({
      ...d,
      riskTiers: d.riskTiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const updateRule = (id: string, patch: Partial<AutotagRule>) => {
    setDraft((d) => ({
      ...d,
      autotaggingRules: d.autotaggingRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeRule = (id: string) => {
    setDraft((d) => ({
      ...d,
      autotaggingRules: d.autotaggingRules.filter((r) => r.id !== id),
    }));
  };

  const addRule = () => {
    setDraft((d) => ({
      ...d,
      autotaggingRules: [
        ...d.autotaggingRules,
        {
          id: `rule-${Date.now()}`,
          field: FIELD_OPTIONS[0].value,
          operator: 'equals',
          value: '',
          tag: '',
        },
      ],
    }));
  };

  const tabs = [
    {
      label: 'Risk Tiers',
      content: <RiskTiersTab tiers={draft.riskTiers} onChange={updateTier} />,
    },
    {
      label: 'Assessment Templates',
      content: <AssessmentTemplatesTab templates={draft.assessmentTemplates} />,
    },
    {
      label: 'Autotagging Rules',
      content: (
        <AutotaggingRulesTab
          rules={draft.autotaggingRules}
          onUpdate={updateRule}
          onRemove={removeRule}
          onAdd={addRule}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="TPRM Configuration"
        description="Configure tiering, assessment templates, and autotagging for third-party risk management."
        actions={
          <Button
            loading={saveMutation.isPending}
            disabled={!isDirty || isLoading}
            onClick={() => saveMutation.mutate(draft)}
          >
            Save
          </Button>
        }
      />
      <Tabs tabs={tabs} />
    </div>
  );
}

function RiskTiersTab({
  tiers,
  onChange,
}: {
  tiers: RiskTier[];
  onChange: (id: string, patch: Partial<RiskTier>) => void;
}) {
  return (
    <Card density="comfy">
      <CardHeader className="px-0 pt-0">
        <div>
          <CardTitle>Risk Tiers</CardTitle>
          <CardDescription>
            Define the score ranges and descriptions for each vendor risk tier.
          </CardDescription>
        </div>
      </CardHeader>
      <CardBody density="cozy" className="px-0 pb-0">
        <div className="space-y-5">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="rounded-lg border border-surface-200 bg-white p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Badge variant={tierVariant(tier.color)} dot>
                    {tier.name}
                  </Badge>
                  <span className="text-small text-surface-600 tabular-nums">
                    Score {tier.scoreMin}–{tier.scoreMax}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor={`tier-${tier.id}-name`}>Name</Label>
                <Input
                  id={`tier-${tier.id}-name`}
                  value={tier.name}
                  onChange={(e) => onChange(tier.id, { name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`tier-${tier.id}-desc`}>Description</Label>
                <Textarea
                  id={`tier-${tier.id}-desc`}
                  value={tier.description}
                  onChange={(e) => onChange(tier.id, { description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`tier-${tier.id}-min`}>Min score</Label>
                  <Input
                    id={`tier-${tier.id}-min`}
                    type="number"
                    value={tier.scoreMin}
                    onChange={(e) =>
                      onChange(tier.id, { scoreMin: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`tier-${tier.id}-max`}>Max score</Label>
                  <Input
                    id={`tier-${tier.id}-max`}
                    type="number"
                    value={tier.scoreMax}
                    onChange={(e) =>
                      onChange(tier.id, { scoreMax: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function AssessmentTemplatesTab({ templates }: { templates: AssessmentTemplate[] }) {
  return (
    <Card density="comfy">
      <CardHeader className="px-0 pt-0">
        <div>
          <CardTitle>Assessment Templates</CardTitle>
          <CardDescription>
            Templates available when launching a vendor assessment.
          </CardDescription>
        </div>
      </CardHeader>
      <CardBody density="cozy" className="px-0 pb-0">
        {templates.length === 0 ? (
          <EmptyState
            title="No assessment templates"
            description="Create a template to standardize vendor assessments."
          />
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-lg border border-surface-200 bg-white p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-surface-900 font-medium">{tpl.name}</p>
                  {tpl.description && (
                    <p className="text-small text-surface-600 mt-1">{tpl.description}</p>
                  )}
                </div>
                <Badge variant="neutral">{tpl.controlsCount} controls</Badge>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function AutotaggingRulesTab({
  rules,
  onUpdate,
  onRemove,
  onAdd,
}: {
  rules: AutotagRule[];
  onUpdate: (id: string, patch: Partial<AutotagRule>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Card density="comfy">
      <CardHeader className="px-0 pt-0">
        <div>
          <CardTitle>Autotagging Rules</CardTitle>
          <CardDescription>
            Automatically apply tags to vendors that match a condition.
          </CardDescription>
        </div>
      </CardHeader>
      <CardBody density="cozy" className="px-0 pb-0 space-y-4">
        {rules.length === 0 ? (
          <EmptyState
            title="No autotagging rules"
            description="Add a rule to auto-tag vendors matching a condition."
          />
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-surface-200 bg-white p-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-1 text-small text-surface-600 pb-2">if</div>
                  <div className="md:col-span-3">
                    <Label htmlFor={`rule-${rule.id}-field`}>Field</Label>
                    <Select
                      value={rule.field}
                      onChange={(v) => onUpdate(rule.id, { field: v })}
                      options={FIELD_OPTIONS}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`rule-${rule.id}-op`}>Operator</Label>
                    <Select
                      value={rule.operator}
                      onChange={(v) => onUpdate(rule.id, { operator: v as AutotagOperator })}
                      options={OPERATOR_OPTIONS}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`rule-${rule.id}-value`}>Value</Label>
                    <Input
                      id={`rule-${rule.id}-value`}
                      value={rule.value}
                      onChange={(e) => onUpdate(rule.id, { value: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1 text-small text-surface-600 pb-2">then tag</div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`rule-${rule.id}-tag`}>Tag</Label>
                    <Input
                      id={`rule-${rule.id}-tag`}
                      value={rule.tag}
                      onChange={(e) => onUpdate(rule.id, { tag: e.target.value })}
                      placeholder="e.g., high-data"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(rule.id)}
                      aria-label="Remove rule"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div>
          <Button variant="secondary" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={onAdd}>
            Add rule
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
