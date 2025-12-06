import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { contractsApi } from '@/lib/api';

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
  vendor: {
    id: string;
    name: string;
  };
  createdAt: string;
}

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
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading contracts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Vendor Contracts</h1>
          <p className="mt-1 text-surface-400">
            Manage vendor contracts and agreements
          </p>
        </div>
        <button
          onClick={() => navigate('/contracts/new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Contract
        </button>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-12 text-center">
          <DocumentDuplicateIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-300 mb-2">No contracts yet</h3>
          <p className="text-surface-500 mb-6">
            Get started by adding your first vendor contract
          </p>
          <button
            onClick={() => navigate('/contracts/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Contract
          </button>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-800 border-b border-surface-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                  className="hover:bg-surface-800 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-surface-100">{contract.title}</div>
                      {contract.contractNumber && (
                        <div className="text-sm text-surface-500">{contract.contractNumber}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300">
                    {contract.vendor.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300 capitalize">
                    {contract.contractType.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300">
                    {formatCurrency(contract.contractValue, contract.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300">
                    {new Date(contract.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      contract.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      contract.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                      contract.status === 'expiring_soon' ? 'bg-yellow-500/20 text-yellow-400' :
                      contract.status === 'draft' ? 'bg-surface-700 text-surface-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
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
