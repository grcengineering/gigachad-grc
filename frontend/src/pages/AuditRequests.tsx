import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, AlertTriangle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
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

interface AuditRequest {
  id: string;
  requestNumber: string;
  auditId: string;
  category: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
  audit: { id: string; auditId: string; name: string; status: string };
  _count: { evidence: number; comments: number };
  createdAt: string;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'info',
  in_progress: 'warning',
  submitted: 'brand',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  clarification_needed: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  clarification_needed: 'Clarification Needed',
};

const STATUS_OPTS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

const PRIORITY_OPTS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-surface-600',
  medium: 'text-yellow-700',
  high: 'text-orange-600',
  critical: 'text-red-600',
};

const CATEGORY_LABEL: Record<string, string> = {
  control_documentation: 'Control Documentation',
  policy: 'Policy',
  evidence: 'Evidence',
  interview: 'Interview',
  access: 'Access',
  walkthrough: 'Walkthrough',
};

export default function AuditRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (priorityFilter) params.append('priority', priorityFilter);

        const response = await fetch(`/api/audit-requests?${params}`, {
          headers: { 'x-organization-id': 'default-org', 'x-user-id': 'system' },
        });
        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [statusFilter, priorityFilter]);

  const filteredRequests = requests.filter(
    (request) =>
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.audit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (dueDate?: string) => (dueDate ? new Date(dueDate) < new Date() : false);

  const activeFilters: ActiveFilter[] = [];
  if (searchTerm)
    activeFilters.push({
      key: 'search',
      label: `Search: ${searchTerm}`,
      onClear: () => setSearchTerm(''),
    });
  if (statusFilter) {
    activeFilters.push({
      key: 'status',
      label: `Status: ${STATUS_LABEL[statusFilter]}`,
      onClear: () => setStatusFilter(''),
    });
  }
  if (priorityFilter) {
    activeFilters.push({
      key: 'priority',
      label: `Priority: ${priorityFilter}`,
      onClear: () => setPriorityFilter(''),
    });
  }
  const clearAll = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Requests"
        description="Manage evidence and documentation requests from auditors."
        actions={
          <Link to="/audit-requests/new">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              New Request
            </Button>
          </Link>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search requests…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-52"
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
          placeholder="All Priorities"
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={PRIORITY_OPTS}
          clearable
        />
      </FilterBar>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No requests found"
            description={
              activeFilters.length
                ? 'Try clearing your filters.'
                : 'Create a new audit request to get started.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Link to="/audit-requests/new">
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    New Request
                  </Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              interactive
              onClick={() => navigate(`/audit-requests/${request.id}`)}
              className="hover:border-brand-500/50"
            >
              <CardBody density="comfy">
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h3 className="text-h3 text-surface-900">{request.title}</h3>
                      <span className="text-xs text-surface-500 font-mono">
                        #{request.requestNumber}
                      </span>
                      <AlertTriangle
                        className={cn('h-4 w-4', PRIORITY_COLOR[request.priority])}
                        aria-label={`${request.priority} priority`}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-small text-surface-600 flex-wrap">
                      <span>{CATEGORY_LABEL[request.category] ?? request.category}</span>
                      <span>· Audit: {request.audit.name}</span>
                      {request.dueDate && (
                        <span className={isOverdue(request.dueDate) ? 'text-red-600' : ''}>
                          · Due: {new Date(request.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={STATUS_VARIANT[request.status] ?? 'neutral'}
                    dot
                    className="shrink-0"
                  >
                    {STATUS_LABEL[request.status] ?? request.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-5 pt-3 border-t border-surface-200 text-small text-surface-600">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {request._count.evidence} evidence
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    {request._count.comments} comments
                  </span>
                  {request.assignedTo && <span>Assigned: {request.assignedTo}</span>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
