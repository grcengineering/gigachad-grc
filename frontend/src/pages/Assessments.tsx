import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FileCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { vendorAssessmentsApi } from '@/lib/api';
import {
  Button,
  Badge,
  PageHeader,
  DataTable,
  EmptyState,
  type DataTableColumn,
  type BadgeVariant,
} from '@/components/ui';

interface Assessment {
  id: string;
  assessmentType: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  overallScore?: number;
  vendor: { id: string; name: string };
  createdAt: string;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  completed: 'success',
  in_progress: 'info',
  pending: 'warning',
};

export default function Assessments() {
  const navigate = useNavigate();
  const {
    data: assessments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Assessment[]>({
    queryKey: ['vendor-assessments'],
    queryFn: () => vendorAssessmentsApi.list().then((response) => response.data),
  });

  const columns: DataTableColumn<Assessment>[] = [
    {
      id: 'vendor',
      accessorFn: (row) => row.vendor.name,
      header: 'Vendor',
      mobileLabel: 'Vendor',
      cell: ({ row }) => (
        <span className="text-surface-900 font-medium">{row.original.vendor.name}</span>
      ),
    },
    {
      id: 'type',
      accessorKey: 'assessmentType',
      header: 'Type',
      mobileLabel: 'Type',
      cell: ({ row }) => (
        <span className="text-surface-700 capitalize">
          {row.original.assessmentType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={STATUS_VARIANT[row.original.status] ?? 'neutral'}
          dot
          className="capitalize"
        >
          {row.original.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'score',
      accessorKey: 'overallScore',
      header: 'Score',
      mobileLabel: 'Score',
      cell: ({ row }) => {
        const s = row.original.overallScore;
        if (s === null || s === undefined) return <span className="text-surface-500">—</span>;
        const barColor = s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-yellow-500' : 'bg-red-500';
        return (
          <div className="flex items-center gap-2">
            <span className="text-small text-surface-900 font-medium tabular-nums w-7">{s}</span>
            <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div className={cn('h-full', barColor)} style={{ width: `${s}%` }} />
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

  if (isError) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="Vendor Assessments"
          description="Track and manage vendor risk assessments."
        />
        <div className="rounded-lg border bg-white">
          <EmptyState
            icon={<FileCheck className="h-8 w-8" />}
            title="Couldn't load assessments"
            description="The vendor assessment service didn't respond."
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Vendor Assessments"
        description="Track and manage vendor risk assessments."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/assessments/new')}
          >
            New Assessment
          </Button>
        }
      />

      <DataTable
        data={assessments}
        columns={columns}
        loading={isLoading}
        getRowId={(a) => a.id}
        onRowClick={(a) => navigate(`/assessments/${a.id}`)}
        emptyState={
          <EmptyState
            icon={<FileCheck className="h-8 w-8" />}
            title="No assessments yet"
            description="Get started by creating your first vendor assessment."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/assessments/new')}
              >
                New Assessment
              </Button>
            }
          />
        }
      />
    </div>
  );
}
