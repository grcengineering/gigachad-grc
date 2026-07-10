import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus, Search, Copy, PlayCircle } from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CategoryChip,
  EmptyState,
  FilterBar,
  Input,
  PageHeader,
  Select,
  SkeletonRows,
  type ActiveFilter,
} from '@/components/ui';

interface AuditTemplate {
  id: string;
  name: string;
  description?: string | null;
  framework?: string | null;
  auditType?: string | null;
  controlsCount?: number;
  proceduresCount?: number;
  requestsCount?: number;
  checklistItems?: unknown[];
  requestTemplates?: unknown[];
}

interface TemplatesResponse {
  templates?: AuditTemplate[];
  data?: AuditTemplate[];
}

const AUDIT_TYPE_OPTS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'surveillance', label: 'Surveillance' },
  { value: 'certification', label: 'Certification' },
];

const AUDIT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  AUDIT_TYPE_OPTS.map((o) => [o.value, o.label])
);

const FRAMEWORK_OPTS = [
  { value: 'soc2', label: 'SOC 2' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'hipaa', label: 'HIPAA' },
  { value: 'nist', label: 'NIST' },
  { value: 'pci_dss', label: 'PCI DSS' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'fedramp', label: 'FedRAMP' },
];

const FRAMEWORK_LABEL: Record<string, string> = Object.fromEntries(
  FRAMEWORK_OPTS.map((o) => [o.value, o.label])
);

export default function AuditTemplates() {
  const [search, setSearch] = useState('');
  const [framework, setFramework] = useState('');
  const [auditType, setAuditType] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery<TemplatesResponse | AuditTemplate[]>({
    queryKey: ['audit-templates', { search: debouncedSearch, framework, auditType }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (framework) params.framework = framework;
      if (auditType) params.auditType = auditType;
      const res = await api.get('/api/audits/templates', { params });
      return res.data;
    },
  });

  const templates: AuditTemplate[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.templates ?? data.data ?? [];
  }, [data]);

  const activeFilters: ActiveFilter[] = [];
  if (debouncedSearch) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${debouncedSearch}`,
      onClear: () => setSearch(''),
    });
  }
  if (framework) {
    activeFilters.push({
      key: 'framework',
      label: `Framework: ${FRAMEWORK_LABEL[framework] ?? framework}`,
      onClear: () => setFramework(''),
    });
  }
  if (auditType) {
    activeFilters.push({
      key: 'auditType',
      label: `Type: ${AUDIT_TYPE_LABEL[auditType] ?? auditType}`,
      onClear: () => setAuditType(''),
    });
  }
  const clearAll = () => {
    setSearch('');
    setFramework('');
    setAuditType('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Templates"
        description="Reusable audit blueprints with checklists, procedures, and request templates."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Create template
          </Button>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Frameworks"
          value={framework}
          onChange={setFramework}
          options={FRAMEWORK_OPTS}
          clearable
          searchable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Audit Types"
          value={auditType}
          onChange={setAuditType}
          options={AUDIT_TYPE_OPTS}
          clearable
        />
      </FilterBar>

      {isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="No templates found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all templates.'
                : 'Create your first audit template to standardize future audits.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Create template
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const controls = t.controlsCount ?? 0;
            const procedures =
              t.proceduresCount ?? (Array.isArray(t.checklistItems) ? t.checklistItems.length : 0);
            const requests =
              t.requestsCount ??
              (Array.isArray(t.requestTemplates) ? t.requestTemplates.length : 0);

            return (
              <Card key={t.id} className="flex flex-col">
                <CardBody density="cozy" className="flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-brand-500/10 text-brand-700 shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-h3 text-surface-900 truncate">{t.name}</h3>
                      <p className="text-small text-surface-600 line-clamp-2 mt-1">
                        {t.description || 'No description.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.framework && (
                      <CategoryChip
                        value={t.framework}
                        label={FRAMEWORK_LABEL[t.framework] ?? t.framework}
                        case="upper"
                      />
                    )}
                    {t.auditType && (
                      <Badge variant="info">
                        {AUDIT_TYPE_LABEL[t.auditType] ?? t.auditType.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  <dl className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-200">
                    <div>
                      <dt className="text-xs text-surface-500 uppercase tracking-wider">
                        Controls
                      </dt>
                      <dd className="text-h3 text-surface-900 tabular-nums">{controls}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-surface-500 uppercase tracking-wider">
                        Procedures
                      </dt>
                      <dd className="text-h3 text-surface-900 tabular-nums">{procedures}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-surface-500 uppercase tracking-wider">
                        Requests
                      </dt>
                      <dd className="text-h3 text-surface-900 tabular-nums">{requests}</dd>
                    </div>
                  </dl>

                  <div className="flex items-center gap-2 pt-2 mt-auto">
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<PlayCircle className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Copy className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Clone
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
