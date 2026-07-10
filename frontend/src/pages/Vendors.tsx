import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { vendorsApi } from '@/lib/api';
import {
  Button,
  Badge,
  PageHeader,
  DataTable,
  EmptyState,
  type DataTableColumn,
  type BadgeVariant,
} from '@/components/ui';

interface Vendor {
  id: string;
  vendorId: string;
  name: string;
  category: string;
  tier: string;
  status: string;
  inherentRiskScore?: string;
  createdAt: string;
}

const RISK_VARIANT: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  inactive: 'neutral',
};

export default function Vendors() {
  const navigate = useNavigate();

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.list().then((res) => res.data),
  });

  const columns: DataTableColumn<Vendor>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Vendor',
      mobileLabel: 'Vendor',
      cell: ({ row }) => (
        <div>
          <div className="text-surface-900 font-medium">{row.original.name}</div>
          <div className="text-xs text-surface-500 font-mono">{row.original.vendorId}</div>
        </div>
      ),
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      mobileLabel: 'Category',
      cell: ({ row }) => (
        <span className="capitalize text-surface-700">
          {row.original.category.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      id: 'tier',
      accessorKey: 'tier',
      header: 'Tier',
      mobileLabel: 'Tier',
      cell: ({ row }) => (
        <Badge variant="neutral" className="capitalize">
          {row.original.tier.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'risk',
      accessorKey: 'inherentRiskScore',
      header: 'Risk Score',
      mobileLabel: 'Risk',
      cell: ({ row }) =>
        row.original.inherentRiskScore ? (
          <Badge
            variant={RISK_VARIANT[row.original.inherentRiskScore] ?? 'neutral'}
            dot
            className="capitalize"
          >
            {row.original.inherentRiskScore}
          </Badge>
        ) : (
          <span className="text-small text-surface-500">Not assessed</span>
        ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={STATUS_VARIANT[row.original.status] ?? 'warning'}
          dot
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Vendors"
        description="Manage third-party vendor relationships and profiles."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/vendors/new')}
          >
            Add Vendor
          </Button>
        }
      />

      <DataTable
        data={vendors}
        columns={columns}
        loading={isLoading}
        getRowId={(v) => v.id}
        onRowClick={(v) => navigate(`/vendors/${v.id}`)}
        emptyState={
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No vendors yet"
            description="Get started by adding your first vendor relationship."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/vendors/new')}
              >
                Add Vendor
              </Button>
            }
          />
        }
      />
    </div>
  );
}
