import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, BuildingOfficeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { vendorsApi } from '@/lib/api';
import { Vendor } from '@/lib/apiTypes';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/Skeleton';
import { ExportDropdown } from '@/components/ExportDropdown';
import { exportConfigs } from '@/lib/export';
import { useDebounce } from '@/hooks/useDebounce';

import { Input } from '@/components/ui/Input';

export default function Vendors() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: vendorsData, isLoading: loading } = useQuery({
    queryKey: ['vendors', debouncedSearch],
    queryFn: () =>
      vendorsApi
        .list({
          search: debouncedSearch || undefined,
          limit: 25,
        })
        .then((res) => res.data),
    staleTime: 30 * 1000,
  });

  // Filter vendors client-side for instant feedback while waiting for API
  const vendors = useMemo(() => {
    const data = vendorsData?.data || [];
    if (!searchInput || searchInput === debouncedSearch) return data;
    // Client-side filter for immediate feedback
    const lowerSearch = searchInput.toLowerCase();
    return data.filter(
      (v: Vendor) =>
        v.name?.toLowerCase().includes(lowerSearch) ||
        v.category?.toLowerCase().includes(lowerSearch)
    );
  }, [vendorsData?.data, searchInput, debouncedSearch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-900">Vendors</h1>
            <p className="mt-1 text-surface-600">
              Manage third-party vendor relationships and profiles
            </p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Vendors</h1>
          <p className="mt-1 text-surface-600">
            Manage third-party vendor relationships and profiles
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <Input
              type="text"
              placeholder="Search vendors..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-10 w-64"
            />
          </div>
          <ExportDropdown
            data={vendors}
            columns={exportConfigs.vendors}
            filename="vendors"
            sheetName="Vendors"
            disabled={vendors.length === 0}
          />
          <Button
            onClick={() => navigate('/vendors/new')}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add Vendor
          </Button>
        </div>
      </div>
      {/* Vendors List */}
      {vendors.length === 0 ? (
        <div className="bg-white border border-surface-200 rounded-lg p-12 text-center">
          <BuildingOfficeIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-700 mb-2">No vendors yet</h3>
          <p className="text-surface-500 mb-6">Get started by adding your first vendor</p>
          <Button
            onClick={() => navigate('/vendors/new')}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add Vendor
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-surface-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {vendors.map((vendor: Vendor) => (
                <tr
                  key={vendor.id}
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                  className="hover:bg-white cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-surface-900">{vendor.name}</div>
                      <div className="text-sm text-surface-500">{vendor.vendorId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-700 capitalize">
                    {vendor.category.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-surface-200 text-surface-700 capitalize">
                      {vendor.tier.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {vendor.inherentRiskScore ? (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                          vendor.inherentRiskScore === 'critical'
                            ? 'bg-red-500/20 text-red-600'
                            : vendor.inherentRiskScore === 'high'
                              ? 'bg-orange-500/20 text-orange-600'
                              : vendor.inherentRiskScore === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-600'
                                : vendor.inherentRiskScore === 'low'
                                  ? 'bg-green-500/20 text-green-600'
                                  : 'bg-surface-200 text-surface-700'
                        }`}
                      >
                        {vendor.inherentRiskScore}
                      </span>
                    ) : (
                      <span className="text-sm text-surface-500">Not assessed</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        vendor.status === 'active'
                          ? 'bg-green-500/20 text-green-600'
                          : vendor.status === 'inactive'
                            ? 'bg-surface-200 text-surface-600'
                            : 'bg-yellow-500/20 text-yellow-600'
                      }`}
                    >
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
