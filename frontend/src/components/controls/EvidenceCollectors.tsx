import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PlayIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { collectorsApi } from '@/lib/api';
import CollectorConfigModal from './CollectorConfigModal';

import { Button } from '@/components/ui/Button';

interface Props {
  controlId: string;
  implementationId: string;
}

export default function EvidenceCollectors({ controlId, implementationId }: Props) {
  const queryClient = useQueryClient();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState<any>(null);
  const [expandedCollector, setExpandedCollector] = useState<string | null>(null);

  // Fetch collectors
  const { data: collectors, isLoading } = useQuery({
    queryKey: ['collectors', controlId, implementationId],
    queryFn: () => collectorsApi.list(controlId, implementationId).then((res) => res.data),
  });

  // Run mutation
  const runMutation = useMutation({
    mutationFn: (collectorId: string) =>
      collectorsApi.run(controlId, implementationId, collectorId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['collectors', controlId, implementationId] });
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    },
    onError: () => {
      toast.error('Failed to run collector');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (collectorId: string) =>
      collectorsApi.delete(controlId, implementationId, collectorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors', controlId, implementationId] });
      toast.success('Collector deleted');
    },
    onError: () => {
      toast.error('Failed to delete collector');
    },
  });

  const handleCreateNew = () => {
    setSelectedCollector(null);
    setShowConfigModal(true);
  };

  const handleEdit = (collector: any) => {
    setSelectedCollector(collector);
    setShowConfigModal(true);
  };

  const handleRun = (collectorId: string) => {
    runMutation.mutate(collectorId);
  };

  const handleDelete = (collector: any) => {
    if (confirm(`Are you sure you want to delete the collector "${collector.name}"?`)) {
      deleteMutation.mutate(collector.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-surface-500">
        <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
        Loading collectors...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-surface-100">Evidence Collectors</h3>
          <p className="text-sm text-surface-600">
            Configure API endpoints to automatically collect evidence for this control
          </p>
        </div>
        <Button onClick={handleCreateNew} className="text-sm" variant="primary">
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Collector
        </Button>
      </div>
      {/* Collectors List */}
      {collectors?.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-surface-700 rounded-lg">
          <Cog6ToothIcon className="w-10 h-10 mx-auto text-surface-600 mb-3" />
          <p className="text-surface-600 mb-3">No evidence collectors configured</p>
          <Button onClick={handleCreateNew} className="text-sm" variant="secondary">
            <PlusIcon className="w-4 h-4 mr-1" />
            Create your first collector
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {collectors?.map((collector: any) => (
            <CollectorCard
              key={collector.id}
              collector={collector}
              isExpanded={expandedCollector === collector.id}
              onToggle={() =>
                setExpandedCollector(expandedCollector === collector.id ? null : collector.id)
              }
              onEdit={() => handleEdit(collector)}
              onRun={() => handleRun(collector.id)}
              onDelete={() => handleDelete(collector)}
              isRunning={runMutation.isPending && runMutation.variables === collector.id}
              controlId={controlId}
              implementationId={implementationId}
            />
          ))}
        </div>
      )}
      {/* Config Modal */}
      {showConfigModal && (
        <CollectorConfigModal
          controlId={controlId}
          implementationId={implementationId}
          collector={selectedCollector}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedCollector(null);
          }}
        />
      )}
    </div>
  );
}

interface CollectorCardProps {
  collector: any;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
  isRunning: boolean;
  controlId: string;
  implementationId: string;
}

function CollectorCard({
  collector,
  isExpanded,
  onToggle,
  onEdit,
  onRun,
  onDelete,
  isRunning,
  controlId,
  implementationId,
}: CollectorCardProps) {
  const { data: runs } = useQuery({
    queryKey: ['collector-runs', collector.id],
    queryFn: () =>
      collectorsApi.getRuns(controlId, implementationId, collector.id, 5).then((res) => res.data),
    enabled: isExpanded,
  });

  const statusConfig = {
    success: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-500/20' },
    error: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-500/20' },
    running: { icon: ArrowPathIcon, color: 'text-blue-600', bg: 'bg-blue-500/20' },
  };

  const lastStatus = collector.lastRunStatus as keyof typeof statusConfig;
  const StatusIcon = lastStatus ? statusConfig[lastStatus]?.icon : ClockIcon;
  const statusColor = lastStatus ? statusConfig[lastStatus]?.color : 'text-surface-600';

  return (
    <div className="border border-surface-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-surface-800/50 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'p-2 rounded-lg',
              collector.mode === 'integration' ? 'bg-brand-500/20' : 'bg-surface-700'
            )}
          >
            {collector.mode === 'integration' ? (
              <LinkIcon className="w-5 h-5 text-brand-400" />
            ) : (
              <Cog6ToothIcon className="w-5 h-5 text-surface-600" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-surface-100">{collector.name}</h4>
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span className="uppercase">{collector.method}</span>
              <span>{collector.endpoint || '/'}</span>
              {collector.scheduleEnabled && (
                <span className="px-1.5 py-0.5 bg-surface-700 rounded">
                  <ClockIcon className="w-3 h-3 inline mr-1" />
                  {collector.scheduleFrequency}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status */}
          {collector.lastRunAt && (
            <div className="flex items-center gap-1 text-xs">
              <StatusIcon
                className={clsx('w-4 h-4', statusColor, lastStatus === 'running' && 'animate-spin')}
              />
              <span className="text-surface-600">
                {formatDistanceToNow(new Date(collector.lastRunAt), { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="text-xs text-surface-500">
            {collector.successfulRuns}/{collector.totalRuns} runs
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onRun}
              disabled={isRunning}
              className="p-1.5 text-surface-600 hover:text-green-600 hover:bg-surface-700 rounded transition-colors"
              title="Run now"
            >
              {isRunning ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 text-surface-600 hover:text-surface-200 hover:bg-surface-700 rounded transition-colors"
              title="Edit"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-surface-600 hover:text-red-600 hover:bg-surface-700 rounded transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Expand/Collapse */}
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-surface-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-surface-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-surface-700 space-y-4">
          {/* Description */}
          {collector.description && (
            <p className="text-sm text-surface-600">{collector.description}</p>
          )}

          {/* Configuration Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-surface-500">Mode:</span>{' '}
              <span className="text-surface-700 capitalize">{collector.mode}</span>
              {collector.integration && (
                <span className="ml-2 text-brand-400">({collector.integration.name})</span>
              )}
            </div>
            <div>
              <span className="text-surface-500">Evidence Type:</span>{' '}
              <span className="text-surface-700 capitalize">{collector.evidenceType}</span>
            </div>
            <div>
              <span className="text-surface-500">Base URL:</span>{' '}
              <span className="text-surface-700 font-mono text-xs">
                {collector.baseUrl || (collector.integration ? 'From integration' : 'Not set')}
              </span>
            </div>
            <div>
              <span className="text-surface-500">Endpoint:</span>{' '}
              <span className="text-surface-700 font-mono text-xs">
                {collector.endpoint || '/'}
              </span>
            </div>
          </div>

          {/* Schedule Info */}
          {collector.scheduleEnabled && (
            <div className="p-3 bg-surface-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <ClockIcon className="w-4 h-4 text-surface-500" />
                <span className="text-surface-700">
                  Scheduled: <span className="capitalize">{collector.scheduleFrequency}</span>
                </span>
                {collector.nextRunAt && (
                  <span className="text-surface-500">
                    • Next run: {format(new Date(collector.nextRunAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Recent Runs */}
          {runs && runs.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-surface-700 mb-2">Recent Runs</h5>
              <div className="space-y-2">
                {runs.map((run: any) => {
                  const runStatus = run.status as keyof typeof statusConfig;
                  const RunIcon = statusConfig[runStatus]?.icon || ClockIcon;
                  return (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-2 bg-surface-800/30 rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <RunIcon className={clsx('w-4 h-4', statusConfig[runStatus]?.color)} />
                        <span className="text-surface-700 capitalize">{run.status}</span>
                        <span className="text-surface-500">•</span>
                        <span className="text-surface-500">{run.triggeredBy}</span>
                        {run.evidenceCreated > 0 && (
                          <>
                            <span className="text-surface-500">•</span>
                            <span className="text-green-600">
                              {run.evidenceCreated} evidence created
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-surface-500">
                        {format(new Date(run.startedAt), 'MMM dd HH:mm')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Last Error */}
          {collector.lastRunError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600">{collector.lastRunError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
