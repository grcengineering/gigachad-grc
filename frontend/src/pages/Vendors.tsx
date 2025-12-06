import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { vendorsApi } from '@/lib/api';

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

export default function Vendors() {
  const navigate = useNavigate();

  const { data: vendors = [], isLoading: loading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.list().then((res) => res.data),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Vendors</h1>
          <p className="mt-1 text-surface-400">
            Manage third-party vendor relationships and profiles
          </p>
        </div>
        <button
          onClick={() => navigate('/vendors/new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      {/* Vendors List */}
      {vendors.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-12 text-center">
          <BuildingOfficeIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-300 mb-2">No vendors yet</h3>
          <p className="text-surface-500 mb-6">
            Get started by adding your first vendor
          </p>
          <button
            onClick={() => navigate('/vendors/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Vendor
          </button>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-800 border-b border-surface-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                  className="hover:bg-surface-800 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-surface-100">{vendor.name}</div>
                      <div className="text-sm text-surface-500">{vendor.vendorId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300 capitalize">
                    {vendor.category.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-surface-700 text-surface-300 capitalize">
                      {vendor.tier.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {vendor.inherentRiskScore ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        vendor.inherentRiskScore === 'critical' ? 'bg-red-500/20 text-red-400' :
                        vendor.inherentRiskScore === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        vendor.inherentRiskScore === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        vendor.inherentRiskScore === 'low' ? 'bg-green-500/20 text-green-400' :
                        'bg-surface-700 text-surface-300'
                      }`}>
                        {vendor.inherentRiskScore}
                      </span>
                    ) : (
                      <span className="text-sm text-surface-500">Not assessed</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      vendor.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      vendor.status === 'inactive' ? 'bg-surface-700 text-surface-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {vendor.status}
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
