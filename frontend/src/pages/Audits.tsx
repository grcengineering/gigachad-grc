import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auditsApi } from '@/lib/api';
import { Plus, Search, ClipboardList } from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardBody,
  Input,
  Select,
  PageHeader,
  FilterBar,
  EmptyState,
  Skeleton,
  type BadgeVariant,
  type ActiveFilter,
} from '@/components/ui';

interface Audit {
  id: string;
  auditId: string;
  name: string;
  auditType: string;
  framework?: string;
  status: string;
  isExternal: boolean;
  plannedStartDate?: string;
  plannedEndDate?: string;
  findingsCount: number;
  criticalFindings: number;
  highFindings: number;
  _count: {
    requests: number;
    findings: number;
    evidence: number;
    testResults: number;
  };
  createdAt: string;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  planning: 'info',
  fieldwork: 'warning',
  testing: 'warning',
  reporting: 'brand',
  completed: 'success',
  cancelled: 'neutral',
};

const STATUS_OPTS = [
  { value: 'planning', label: 'Planning' },
  { value: 'fieldwork', label: 'Fieldwork' },
  { value: 'testing', label: 'Testing' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'surveillance', label: 'Surveillance' },
  { value: 'certification', label: 'Certification' },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TYPE_OPTS.map((o) => [o.value, o.label])
);

export default function Audits() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: audits = [], isLoading } = useQuery<Audit[]>({
    queryKey: ['audits', statusFilter, typeFilter],
    queryFn: () =>
      auditsApi
        .list({
          status: statusFilter || undefined,
          auditType: typeFilter || undefined,
        })
        .then((res) => res.data),
  });

  const filteredAudits = audits.filter(
    (audit) =>
      audit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.auditId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.framework?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeFilters: ActiveFilter[] = [];
  if (searchTerm)
    activeFilters.push({
      key: 'search',
      label: `Search: ${searchTerm}`,
      onClear: () => setSearchTerm(''),
    });
  if (statusFilter) {
    const l = STATUS_OPTS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    activeFilters.push({
      key: 'status',
      label: `Status: ${l}`,
      onClear: () => setStatusFilter(''),
    });
  }
  if (typeFilter) {
    const l = TYPE_LABEL[typeFilter] ?? typeFilter;
    activeFilters.push({ key: 'type', label: `Type: ${l}`, onClear: () => setTypeFilter('') });
  }

  const clearAll = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audits"
        description="Manage internal and external compliance audits."
        actions={
          <Link to="/audits/new">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              New Audit
            </Button>
          </Link>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search audits…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Statuses"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Types"
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTS}
          clearable
        />
      </FilterBar>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filteredAudits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="No audits found"
            description={
              activeFilters.length
                ? 'Try clearing your filters.'
                : 'Get started by creating your first audit.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Link to="/audits/new">
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    New Audit
                  </Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredAudits.map((audit) => (
            <Card
              key={audit.id}
              interactive
              onClick={() => navigate(`/audits/${audit.id}`)}
              className="hover:border-brand-500/50"
            >
              <CardBody density="comfy">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h3 className="text-h3 text-surface-900">{audit.name}</h3>
                      <span className="text-xs text-surface-500 font-mono">#{audit.auditId}</span>
                      <Badge variant={audit.isExternal ? 'info' : 'neutral'} size="sm">
                        {audit.isExternal ? 'External' : 'Internal'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-small text-surface-600 flex-wrap">
                      <span>{TYPE_LABEL[audit.auditType] || audit.auditType}</span>
                      {audit.framework && <span>· {audit.framework}</span>}
                      {audit.plannedStartDate && (
                        <span>· {new Date(audit.plannedStartDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={STATUS_VARIANT[audit.status] ?? 'neutral'}
                    dot
                    className="capitalize shrink-0"
                  >
                    {audit.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-3 border-t border-surface-200">
                  <Stat label="Requests" value={audit._count.requests} />
                  <Stat label="Evidence" value={audit._count.evidence} />
                  <Stat label="Tests" value={audit._count.testResults} />
                  <Stat
                    label="Findings"
                    value={audit._count.findings}
                    extra={
                      audit.criticalFindings > 0 ? (
                        <span className="text-xs text-red-600 ml-1.5">
                          ({audit.criticalFindings} critical)
                        </span>
                      ) : null
                    }
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, extra }: { label: string; value: number; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-surface-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="flex items-baseline">
        <span className="text-h3 text-surface-900">{value}</span>
        {extra}
      </div>
    </div>
  );
}
