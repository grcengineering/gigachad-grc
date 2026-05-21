import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlayIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  BoltIcon,
  CalendarIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import { mcpApi } from '../../lib/api';

import { Textarea } from '@/components/ui/Textarea';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'manual' | 'scheduled' | 'event' | 'webhook';
    schedule?: string;
    event?: string;
  };
  stepCount: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  steps: {
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    output?: unknown;
    error?: string;
  }[];
  output?: Record<string, unknown>;
  error?: string;
}

export default function MCPWorkflowBuilder() {
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [executionInput, setExecutionInput] = useState<Record<string, string>>({});

  // Fetch workflows
  const { data: workflowsData, isLoading: loadingWorkflows } = useQuery({
    queryKey: ['mcp-workflows'],
    queryFn: () => mcpApi.getWorkflows(),
  });

  // Fetch executions
  const { data: executionsData } = useQuery({
    queryKey: ['mcp-executions'],
    queryFn: () => mcpApi.getExecutions(),
    refetchInterval: 5000, // Poll for updates
  });

  const workflows: Workflow[] = (workflowsData?.data?.data || []) as Workflow[];
  const executions: WorkflowExecution[] = (executionsData?.data?.data || []) as WorkflowExecution[];

  // Execute workflow mutation
  const executeMutation = useMutation({
    mutationFn: ({ workflowId, input }: { workflowId: string; input: Record<string, unknown> }) =>
      mcpApi.executeWorkflow(workflowId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-executions'] });
      setShowExecutionModal(false);
      setExecutionInput({});
    },
  });

  // Cancel execution mutation
  const cancelMutation = useMutation({
    mutationFn: (executionId: string) => mcpApi.cancelExecution(executionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-executions'] }),
  });

  const getTriggerIcon = (type: Workflow['trigger']['type']) => {
    switch (type) {
      case 'manual':
        return <CursorArrowRaysIcon className="w-5 h-5" />;
      case 'scheduled':
        return <CalendarIcon className="w-5 h-5" />;
      case 'event':
        return <BoltIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <StopIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: WorkflowExecution['status']) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-600',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-600',
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-600',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const selectedWorkflowData = workflows.find((w) => w.id === selectedWorkflow);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCP Workflows</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Automated GRC workflows powered by MCP servers
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows List */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700">
          <div className="p-4 border-b border-gray-200 dark:border-surface-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Available Workflows
            </h2>
          </div>

          {loadingWorkflows ? (
            <div className="p-8 text-center">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-surface-700">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedWorkflow === workflow.id
                      ? 'bg-brand-50 dark:bg-brand-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-surface-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          selectedWorkflow === workflow.id
                            ? 'bg-brand-100 dark:bg-brand-900/30'
                            : 'bg-gray-100 dark:bg-surface-700'
                        }`}
                      >
                        {getTriggerIcon(workflow.trigger.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {workflow.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {workflow.stepCount} steps • {workflow.trigger.type}
                        </p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow Details & Execution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Details */}
          {selectedWorkflowData ? (
            <div className="bg-white dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700">
              <div className="p-4 border-b border-gray-200 dark:border-surface-700 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedWorkflowData.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedWorkflowData.description}
                  </p>
                </div>
                {selectedWorkflowData.trigger.type === 'manual' && (
                  <Button
                    onClick={() => setShowExecutionModal(true)}
                    className="flex items-center gap-2"
                    variant="primary"
                  >
                    <PlayIcon className="w-5 h-5" />
                    Run Workflow
                  </Button>
                )}
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Trigger Type</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {selectedWorkflowData.trigger.type}
                    </p>
                    {selectedWorkflowData.trigger.schedule && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Schedule: {selectedWorkflowData.trigger.schedule}
                      </p>
                    )}
                    {selectedWorkflowData.trigger.event && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Event: {selectedWorkflowData.trigger.event}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Steps</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedWorkflowData.stepCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700 p-8 text-center">
              <BoltIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Select a workflow to view details
              </p>
            </div>
          )}

          {/* Recent Executions */}
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700">
            <div className="p-4 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Executions
              </h2>
            </div>

            {executions.length === 0 ? (
              <div className="p-8 text-center">
                <ClockIcon className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-600 dark:text-gray-400">No executions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-surface-700">
                {executions
                  .filter((e) => !selectedWorkflow || e.workflowId === selectedWorkflow)
                  .slice(0, 10)
                  .map((execution) => {
                    const workflow = workflows.find((w) => w.id === execution.workflowId);
                    return (
                      <div key={execution.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(execution.status)}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {workflow?.name || execution.workflowId}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Started {new Date(execution.startedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(execution.status)}
                            {execution.status === 'running' && (
                              <button
                                onClick={() => cancelMutation.mutate(execution.id)}
                                className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-600"
                                title="Cancel"
                              >
                                <StopIcon className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Step Progress */}
                        <div className="mt-3 flex gap-1">
                          {execution.steps.map((step) => {
                            const stepColors = {
                              pending: 'bg-gray-300 dark:bg-gray-600',
                              running: 'bg-blue-500 animate-pulse',
                              completed: 'bg-green-500',
                              failed: 'bg-red-500',
                              skipped: 'bg-gray-400',
                            };
                            return (
                              <div
                                key={step.stepId}
                                className={`flex-1 h-2 rounded-full ${stepColors[step.status]}`}
                                title={`${step.stepId}: ${step.status}`}
                              />
                            );
                          })}
                        </div>

                        {execution.error && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-600">
                            {execution.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Execution Modal */}
      {selectedWorkflowData && (
        <Dialog open={showExecutionModal} onClose={() => setShowExecutionModal(false)}>
          <div className="p-4 border-b border-gray-200 dark:border-surface-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Run {selectedWorkflowData.name}
            </h2>
            <button
              onClick={() => {
                setShowExecutionModal(false);
                setExecutionInput({});
              }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-gray-600 dark:text-gray-400">{selectedWorkflowData.description}</p>

            {/* Input fields would go here based on workflow definition */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Input Parameters (JSON)
                </label>
                <Textarea
                  value={JSON.stringify(executionInput, null, 2)}
                  onChange={(e) => {
                    try {
                      setExecutionInput(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="{}"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setShowExecutionModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={() =>
                  executeMutation.mutate({
                    workflowId: selectedWorkflowData.id,
                    input: executionInput,
                  })
                }
                disabled={executeMutation.isPending}
                className="flex items-center gap-2"
                variant="primary"
              >
                {executeMutation.isPending ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
                {executeMutation.isPending ? 'Starting...' : 'Start Execution'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
