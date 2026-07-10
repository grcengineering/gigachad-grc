import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { questionnairesApi } from '@/lib/api';
import {
  Button,
  Badge,
  PageHeader,
  Tabs,
  DataTable,
  EmptyState,
  type DataTableColumn,
  type BadgeVariant,
} from '@/components/ui';

interface Questionnaire {
  id: string;
  title: string;
  requesterName: string;
  requesterEmail: string;
  company?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
  createdAt: string;
  questions: { id: string; status: string }[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  completed: 'success',
  in_progress: 'info',
  pending: 'warning',
};

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  urgent: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

const TAB_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

export default function Questionnaires() {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const { data: questionnaires = [], isLoading } = useQuery<Questionnaire[]>({
    queryKey: ['questionnaires', filter],
    queryFn: () =>
      questionnairesApi.list(filter !== 'all' ? { status: filter } : undefined).then((res) => res.data),
  });

  const getCompletion = (questions: { status: string }[]) => {
    if (questions.length === 0) return 0;
    const answered = questions.filter((q) => q.status === 'answered' || q.status === 'approved').length;
    return Math.round((answered / questions.length) * 100);
  };

  const columns: DataTableColumn<Questionnaire>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Customer Request',
      mobileLabel: 'Request',
      cell: ({ row }) => (
        <div>
          <div className="text-surface-900 font-medium">{row.original.title}</div>
          <div className="text-xs text-surface-500">{row.original.questions.length} questions</div>
        </div>
      ),
    },
    {
      id: 'from',
      header: 'From',
      mobileLabel: 'From',
      enableSorting: false,
      cell: ({ row }) => (
        <div>
          <div className="text-small text-surface-700">{row.original.requesterName}</div>
          {row.original.company && (
            <div className="text-xs text-surface-500">{row.original.company}</div>
          )}
        </div>
      ),
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: 'Priority',
      mobileLabel: 'Priority',
      cell: ({ row }) => (
        <Badge variant={PRIORITY_VARIANT[row.original.priority] ?? 'neutral'} dot className="capitalize">
          {row.original.priority}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'neutral'} dot className="capitalize">
          {row.original.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'completion',
      header: 'Completion',
      mobileLabel: 'Completion',
      enableSorting: false,
      cell: ({ row }) => {
        const c = getCompletion(row.original.questions);
        const bar = c === 100 ? 'bg-green-500' : c >= 50 ? 'bg-blue-500' : 'bg-yellow-500';
        return (
          <div className="flex items-center gap-2">
            <span className="text-small text-surface-900 font-medium tabular-nums w-9">{c}%</span>
            <div className="w-20 h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div className={cn('h-full', bar)} style={{ width: `${c}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: 'Due Date',
      mobileLabel: 'Due Date',
      cell: ({ row }) => (
        <span className="text-surface-700">
          {row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Security Questionnaires"
        description="Respond to incoming customer security questionnaires."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/questionnaires/new')}>
            Log New Request
          </Button>
        }
      />

      <Tabs
        defaultIndex={TAB_FILTERS.findIndex((t) => t.value === filter)}
        onChange={(i) => setFilter(TAB_FILTERS[i].value)}
        tabs={TAB_FILTERS.map((t) => ({
          label: t.label,
          content: (
            <DataTable
              data={questionnaires}
              columns={columns}
              loading={isLoading}
              getRowId={(q) => q.id}
              onRowClick={(q) => navigate(`/questionnaires/${q.id}`)}
              emptyState={
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title="No questionnaires"
                  description="When customers send security questionnaires, they'll appear here."
                  action={
                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => navigate('/questionnaires/new')}
                    >
                      Log New Request
                    </Button>
                  }
                />
              }
            />
          ),
        }))}
      />
    </div>
  );
}
