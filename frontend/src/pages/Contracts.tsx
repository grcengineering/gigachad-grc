import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { contractsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

export default function Contracts() {
  const navigate = useNavigate();

  const { data: contracts = [], isLoading: loading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then((res) => res.data),
  });

  const formatCurrency = (value?: number, currency: string = 'USD') => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Vendor Contracts</h1>
            <p className="mt-1 text-surface-600">Manage vendor contracts and agreements</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Vendor Contracts</h1>
          <p className="mt-1 text-surface-600">Manage vendor contracts and agreements</p>
        </div>
        <Button
          onClick={() => navigate('/contracts/new')}
          leftIcon={<PlusIcon className="w-5 h-5" />}
        >
          New Contract
        </Button>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No contracts yet"
          description="Get started by adding your first vendor contract to track agreements and renewals."
          action={{
            label: 'New Contract',
            onClick: () => navigate('/contracts/new'),
            icon: <PlusIcon className="w-5 h-5" />,
          }}
        />
      ) : (
        <div className="bg-white border border-surface-200 rounded-xl overflow-hidden dark:bg-surface-900">
          <table className="w-full">
            <thead className="bg-surface-200/50 border-b border-surface-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {(contracts as any[]).map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                  className="hover:bg-surface-200/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{contract.title}</div>
                      {contract.contractNumber && (
                        <div className="text-sm text-surface-500">{contract.contractNumber}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-700">{contract.vendor.name}</td>
                  <td className="px-6 py-4 text-sm text-surface-700 capitalize">
                    {contract.contractType.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-700">
                    {formatCurrency(contract.contractValue, contract.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-700">
                    {new Date(contract.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        contract.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-600'
                          : contract.status === 'expired'
                            ? 'bg-red-500/20 text-red-600'
                            : contract.status === 'expiring_soon'
                              ? 'bg-amber-500/20 text-amber-600'
                              : contract.status === 'draft'
                                ? 'bg-surface-600 text-surface-700'
                                : 'bg-blue-500/20 text-blue-600'
                      }`}
                    >
                      {contract.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
