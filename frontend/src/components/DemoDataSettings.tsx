import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seedApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  BeakerIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DataSummary {
  controls: number;
  evidence: number;
  policies: number;
  risks: number;
  vendors: number;
  employees: number;
  assets: number;
  integrations: number;
  audits: number;
  frameworks: number;
  total: number;
}

interface SeedStatus {
  demoDataLoaded: boolean;
  hasExistingData: boolean;
  dataSummary: DataSummary;
}

export default function DemoDataSettings() {
  const queryClient = useQueryClient();
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [countdown, setCountdown] = useState(0);

  const { data: status, isLoading } = useQuery<SeedStatus>({
    queryKey: ['seed-status'],
    queryFn: () => seedApi.getStatus().then((res) => res.data),
  });

  const loadDemoMutation = useMutation({
    mutationFn: () => seedApi.loadDemoData(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['seed-status'] });
      queryClient.invalidateQueries(); // Invalidate all queries to refresh data
      toast.success(`Demo data loaded! Created ${res.data.totalRecords} records.`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to load demo data');
    },
  });

  const resetMutation = useMutation({
    mutationFn: (confirmationPhrase: string) => seedApi.resetData(confirmationPhrase),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['seed-status'] });
      queryClient.invalidateQueries(); // Invalidate all queries to refresh data
      toast.success(`Data reset complete. Deleted ${res.data.totalRecords} records.`);
      setShowResetModal(false);
      setConfirmationText('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset data');
    },
  });

  const handleLoadDemo = () => {
    loadDemoMutation.mutate();
  };

  const handleOpenResetModal = () => {
    setShowResetModal(true);
    setConfirmationText('');
    // Start 5-second countdown
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleReset = () => {
    if (confirmationText === 'DELETE ALL DATA') {
      resetMutation.mutate(confirmationText);
    }
  };

  const canReset = confirmationText === 'DELETE ALL DATA' && countdown === 0;

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-24">
          <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <BeakerIcon className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Demo Data</h2>
            <p className="text-sm text-muted-foreground">
              Load sample data to explore the platform or reset to start fresh
            </p>
          </div>
        </div>

        {/* Status Banner */}
        {status?.demoDataLoaded && (
          <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <BeakerIcon className="h-5 w-5 text-purple-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-400">Demo Mode Active</p>
              <p className="text-xs text-purple-400/70">
                This organization contains demonstration data. Clear it when ready for production use.
              </p>
            </div>
          </div>
        )}

        {!status?.hasExistingData && !status?.demoDataLoaded && (
          <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-400">Ready for Demo Data</p>
              <p className="text-xs text-blue-400/70">
                Your organization is empty. Load demo data to see the platform in action.
              </p>
            </div>
          </div>
        )}

        {/* Data Summary */}
        {status?.hasExistingData && status.dataSummary && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Current Data</h3>
            <div className="grid grid-cols-3 gap-3">
              <DataCard label="Controls" count={status.dataSummary.controls} />
              <DataCard label="Evidence" count={status.dataSummary.evidence} />
              <DataCard label="Policies" count={status.dataSummary.policies} />
              <DataCard label="Risks" count={status.dataSummary.risks} />
              <DataCard label="Vendors" count={status.dataSummary.vendors} />
              <DataCard label="Employees" count={status.dataSummary.employees} />
              <DataCard label="Assets" count={status.dataSummary.assets} />
              <DataCard label="Integrations" count={status.dataSummary.integrations} />
              <DataCard label="Audits" count={status.dataSummary.audits} />
              <DataCard label="Frameworks" count={status.dataSummary.frameworks} />
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {status.dataSummary.total} records
            </p>
          </div>
        )}

        {/* What Demo Data Includes */}
        {!status?.hasExistingData && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Demo Data Includes</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>50 security controls</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>3 compliance frameworks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>15 security policies</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>25 risk items</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>20 vendor profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>50 employee records</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>30+ assets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <span>5 audit records</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          {!status?.hasExistingData && (
            <button
              onClick={handleLoadDemo}
              disabled={loadDemoMutation.isPending}
              className="btn btn-primary flex items-center gap-2"
            >
              {loadDemoMutation.isPending ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <BeakerIcon className="h-4 w-4" />
              )}
              {loadDemoMutation.isPending ? 'Loading...' : 'Load Demo Data'}
            </button>
          )}

          {status?.hasExistingData && (
            <button
              onClick={handleOpenResetModal}
              className="btn btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-400/50"
            >
              <TrashIcon className="h-4 w-4" />
              Reset All Data
            </button>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Reset All Data</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-2 hover:bg-surface-700 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will permanently delete all data in your organization:
              </p>
              
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <ul className="text-sm text-red-400 space-y-1">
                  <li>• {status?.dataSummary.controls || 0} controls</li>
                  <li>• {status?.dataSummary.evidence || 0} evidence records</li>
                  <li>• {status?.dataSummary.policies || 0} policies</li>
                  <li>• {status?.dataSummary.risks || 0} risks</li>
                  <li>• {status?.dataSummary.vendors || 0} vendors</li>
                  <li>• {status?.dataSummary.employees || 0} employees</li>
                  <li>• {status?.dataSummary.assets || 0} assets</li>
                  <li>• And all related records...</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">This cannot be undone.</strong> Users and organization settings will be preserved.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Type <span className="font-mono text-red-400">DELETE ALL DATA</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="input w-full font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowResetModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={!canReset || resetMutation.isPending}
                className="btn bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {resetMutation.isPending ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : countdown > 0 ? (
                  <span className="w-4 text-center">{countdown}</span>
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
                {resetMutation.isPending ? 'Deleting...' : countdown > 0 ? `Wait ${countdown}s` : 'Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DataCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="p-3 bg-surface-800/50 rounded-lg">
      <p className="text-lg font-semibold text-foreground">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}




