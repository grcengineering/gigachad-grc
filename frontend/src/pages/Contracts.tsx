import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Files } from 'lucide-react';
import { contractsApi } from '@/lib/api';
import {
  Button,
  Badge,
  PageHeader,
  DataTable,
  EmptyState,
  type DataTableColumn,
  type BadgeVariant,
} from '@/components/ui';

interface Contract {
  id: string;
  contractNumber?: string;
  contractType: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  contractValue?: number;
  currency: string;
  vendor: { id: string; name: string };
  createdAt: string;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  expired: 'danger',
  expiring_soon: 'warning',
  draft: 'neutral',
  pending: 'info',
};

function formatCurrency(value?: number, currency: string = 'USD') {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

export default function Contracts() {
  const navigate = useNavigate();
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then((res) => res.data),
  });

  const columns: DataTableColumn<Contract>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Contract',
      mobileLabel: 'Contract',
      cell: ({ row }) => (
        <div>
          <div className="text-surface-900 font-medium">{row.original.title}</div>
          {row.original.contractNumber && (
            <div className="text-xs text-surface-500 font-mono">{row.original.contractNumber}</div>
          )}
        </div>
      ),
    },
    {
      id: 'vendor',
      accessorFn: (r) => r.vendor.name,
      header: 'Vendor',
      mobileLabel: 'Vendor',
      cell: ({ row }) => <span className="text-surface-700">{row.original.vendor.name}</span>,
    },
    {
      id: 'type',
      accessorKey: 'contractType',
      header: 'Type',
      mobileLabel: 'Type',
      cell: ({ row }) => (
        <span className="text-surface-700 capitalize">
          {row.original.contractType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      id: 'value',
      accessorKey: 'contractValue',
      header: 'Value',
      mobileLabel: 'Value',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">
          {formatCurrency(row.original.contractValue, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: 'End Date',
      mobileLabel: 'End Date',
      cell: ({ row }) => (
        <span className="text-surface-700">
          {new Date(row.original.endDate).toLocaleDateString()}
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
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Vendor Contracts"
        description="Manage vendor contracts and agreements."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/contracts/new')}
          >
            New Contract
          </Button>
        }
      />

      <DataTable
        data={contracts}
        columns={columns}
        loading={isLoading}
        getRowId={(c) => c.id}
        onRowClick={(c) => navigate(`/contracts/${c.id}`)}
        emptyState={
          <EmptyState
            icon={<Files className="h-8 w-8" />}
            title="No contracts yet"
            description="Get started by adding your first vendor contract."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/contracts/new')}
              >
                New Contract
              </Button>
            }
          />
        }
      />
    </div>
  );
}
