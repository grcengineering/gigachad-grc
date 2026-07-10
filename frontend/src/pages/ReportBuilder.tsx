import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  ShieldCheck,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CategoryChip,
  Input,
  Label,
  PageHeader,
  Select,
  Tabs,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/cn';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'risk-register',
    name: 'Risk Register',
    description: 'Full risk register with inherent, residual, owners, and treatment.',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    id: 'control-coverage',
    name: 'Control Coverage',
    description: 'Map of controls to frameworks with implementation status.',
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    id: 'audit-findings',
    name: 'Audit Findings',
    description: 'Findings grouped by severity, owner, and remediation status.',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: 'evidence-inventory',
    name: 'Evidence Inventory',
    description: 'All evidence artifacts with freshness and approval state.',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'compliance-rollup',
    name: 'Compliance Roll-up',
    description: 'Executive roll-up of compliance posture across frameworks.',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start blank and pick your own data sources and filters.',
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
];

const DATE_RANGE_OPTS = [
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'last_90d', label: 'Last 90 days' },
  { value: 'qtd', label: 'Quarter to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

const FRAMEWORK_OPTS = [
  { value: 'soc2', label: 'SOC 2' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'hipaa', label: 'HIPAA' },
  { value: 'pci_dss', label: 'PCI DSS' },
  { value: 'nist_csf', label: 'NIST CSF' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'fedramp', label: 'FedRAMP' },
];

const RISK_CATEGORY_OPTS = [
  { value: 'operational', label: 'Operational' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'security', label: 'Security' },
  { value: 'financial', label: 'Financial' },
];

const STATUS_OPTS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
  { value: 'on_hold', label: 'On hold' },
];

const SEVERITY_OPTS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const FORMAT_OPTS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'XLSX (Excel)' },
  { value: 'csv', label: 'CSV' },
];

const SCHEDULE_OPTS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface ReportConfig {
  templateId: string;
  dateRange: string;
  frameworks: string[];
  riskCategories: string[];
  status: string;
  owner: string;
  severity: string;
  name: string;
  format: string;
  schedule: string;
  recipients: string;
}

const DEFAULT_CONFIG: ReportConfig = {
  templateId: '',
  dateRange: 'last_30d',
  frameworks: [],
  riskCategories: [],
  status: '',
  owner: '',
  severity: '',
  name: '',
  format: 'pdf',
  schedule: 'one_time',
  recipients: '',
};

export default function ReportBuilder() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG);

  const saveMutation = useMutation({
    mutationFn: async (payload: ReportConfig) => {
      const recipients = payload.recipients
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api.post('/api/reports/scheduled', {
        templateId: payload.templateId,
        name: payload.name,
        format: payload.format,
        schedule: payload.schedule,
        recipients,
        data: {
          dateRange: payload.dateRange,
          frameworks: payload.frameworks,
          riskCategories: payload.riskCategories,
        },
        filters: {
          status: payload.status || undefined,
          owner: payload.owner || undefined,
          severity: payload.severity || undefined,
        },
      });
      return res.data;
    },
    onSuccess: () => {
      navigate('/scheduled-reports');
    },
  });

  const toggleArray = (key: 'frameworks' | 'riskCategories', value: string) => {
    setConfig((c) => {
      const current = c[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...c, [key]: next };
    });
  };

  const canSave =
    !!config.templateId &&
    !!config.name.trim() &&
    !!config.format &&
    !!config.schedule;

  const templateTab = (
    <Card>
      <CardBody density="comfy">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => {
            const selected = config.templateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, templateId: t.id }))
                }
                className={cn(
                  'text-left rounded-lg border bg-white p-4 transition-colors',
                  selected
                    ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-50'
                    : 'border-surface-200 hover:border-surface-300',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-md bg-brand-500/10 p-2 text-brand-700">
                    {t.icon}
                  </div>
                  {selected && (
                    <CheckCircle2 className="h-4 w-4 text-brand-700" />
                  )}
                </div>
                <h3 className="text-h3 text-surface-900 mt-3">{t.name}</h3>
                <p className="mt-1 text-small text-surface-600">{t.description}</p>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );

  const dataTab = (
    <Card>
      <CardHeader>
        <CardTitle>Data sources</CardTitle>
      </CardHeader>
      <CardBody density="comfy">
        <div className="space-y-5">
          <div>
            <Label>Date range</Label>
            <Select
              value={config.dateRange}
              onChange={(v) => setConfig((c) => ({ ...c, dateRange: v }))}
              options={DATE_RANGE_OPTS}
              fullWidth={false}
              className="w-64"
            />
          </div>

          <div>
            <Label>Frameworks</Label>
            <div className="flex flex-wrap gap-2">
              {FRAMEWORK_OPTS.map((f) => {
                const selected = config.frameworks.includes(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => toggleArray('frameworks', f.value)}
                    className={cn(
                      'rounded-md border px-2 py-1 transition-colors',
                      selected
                        ? 'border-brand-500 ring-1 ring-brand-500'
                        : 'border-transparent hover:border-surface-300',
                    )}
                  >
                    <CategoryChip value={f.value} label={f.label} case="upper" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Risk categories</Label>
            <div className="flex flex-wrap gap-2">
              {RISK_CATEGORY_OPTS.map((r) => {
                const selected = config.riskCategories.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleArray('riskCategories', r.value)}
                    className={cn(
                      'rounded-md border px-2 py-1 transition-colors',
                      selected
                        ? 'border-brand-500 ring-1 ring-brand-500'
                        : 'border-transparent hover:border-surface-300',
                    )}
                  >
                    <CategoryChip value={r.value} label={r.label} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  const filtersTab = (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardBody density="comfy">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <Select
              value={config.status}
              onChange={(v) => setConfig((c) => ({ ...c, status: v }))}
              options={STATUS_OPTS}
              placeholder="Any status"
              clearable
            />
          </div>
          <div>
            <Label htmlFor="rb-owner">Owner</Label>
            <Input
              id="rb-owner"
              value={config.owner}
              onChange={(e) =>
                setConfig((c) => ({ ...c, owner: e.target.value }))
              }
              placeholder="Filter by owner email or name"
            />
          </div>
          <div>
            <Label>Severity</Label>
            <Select
              value={config.severity}
              onChange={(v) => setConfig((c) => ({ ...c, severity: v }))}
              options={SEVERITY_OPTS}
              placeholder="Any severity"
              clearable
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );

  const scheduleTab = (
    <Card>
      <CardHeader>
        <CardTitle>Schedule &amp; delivery</CardTitle>
      </CardHeader>
      <CardBody density="comfy">
        <div className="space-y-4">
          <div>
            <Label htmlFor="rb-name" required>
              Report name
            </Label>
            <Input
              id="rb-name"
              value={config.name}
              onChange={(e) =>
                setConfig((c) => ({ ...c, name: e.target.value }))
              }
              placeholder="e.g., Quarterly Risk Roll-up"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label required>Format</Label>
              <Select
                value={config.format}
                onChange={(v) => setConfig((c) => ({ ...c, format: v }))}
                options={FORMAT_OPTS}
              />
            </div>
            <div>
              <Label required>Schedule</Label>
              <Select
                value={config.schedule}
                onChange={(v) => setConfig((c) => ({ ...c, schedule: v }))}
                options={SCHEDULE_OPTS}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="rb-recipients">Email recipients</Label>
            <Textarea
              id="rb-recipients"
              value={config.recipients}
              onChange={(e) =>
                setConfig((c) => ({ ...c, recipients: e.target.value }))
              }
              rows={4}
              placeholder="One email per line, or comma-separated"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Report Builder"
        description="Compose a one-time or recurring GRC report from your existing data."
      />

      <Tabs
        tabs={[
          { label: '1. Template', content: templateTab },
          {
            label: '2. Data',
            content: dataTab,
            disabled: !config.templateId,
          },
          {
            label: '3. Filters',
            content: filtersTab,
            disabled: !config.templateId,
          },
          {
            label: '4. Schedule',
            content: scheduleTab,
            disabled: !config.templateId,
          },
        ]}
      />

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          leftIcon={<X className="h-4 w-4" />}
          onClick={() => navigate('/scheduled-reports')}
        >
          Cancel
        </Button>
        <Button
          loading={saveMutation.isPending}
          disabled={!canSave}
          onClick={() => saveMutation.mutate(config)}
        >
          Save report
        </Button>
      </div>
    </div>
  );
}
