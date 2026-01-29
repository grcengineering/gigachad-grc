import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ClockIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import clsx from 'clsx';

interface TestProcedure {
  id: string;
  procedureNumber: string;
  title: string;
  testType: string;
  testMethod: string;
  sampleSize: number;
  status: string;
  conclusion: string | null;
  testedBy: string | null;
  testedAt: string | null;
  testedByUser?: { displayName: string };
}

interface Stats {
  total: number;
  effectivenessRate: number;
  byConclusion: { conclusion: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
}

const conclusionConfig: Record<string, { icon: typeof CheckCircleIcon; color: string; label: string }> = {
  effective: { icon: CheckCircleIcon, color: 'text-green-400', label: 'Effective' },
  partially_effective: { icon: ClockIcon, color: 'text-yellow-400', label: 'Partially Effective' },
  ineffective: { icon: XCircleIcon, color: 'text-red-400', label: 'Ineffective' },
  not_applicable: { icon: ClockIcon, color: 'text-surface-400', label: 'N/A' },
};

const testTypeLabels: Record<string, string> = {
  inquiry: 'Inquiry',
  observation: 'Observation',
  inspection: 'Inspection',
  reperformance: 'Reperformance',
};

export default function TestProcedures() {
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get('auditId') || '';
  const queryClient = useQueryClient();
  const toast = useToast();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    testType: 'inspection',
    testMethod: '',
    sampleSize: 25,
    controlId: '',
  });
  const [resultForm, setResultForm] = useState({
    actualResult: '',
    deviationsNoted: '',
    conclusion: 'effective',
    conclusionRationale: '',
  });

  const { data: procedures = [], isLoading } = useQuery<TestProcedure[]>({
    queryKey: ['test-procedures', auditId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditId) params.set('auditId', auditId);
      const res = await fetch(`/api/audit/test-procedures?${params}`);
      if (!res.ok) throw new Error('Failed to fetch procedures');
      return res.json();
    },
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['test-procedures-stats', auditId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditId) params.set('auditId', auditId);
      const res = await fetch(`/api/audit/test-procedures/stats?${params}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const recordResultMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof resultForm }) => {
      const res = await fetch(`/api/audit/test-procedures/${id}/record-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to record result');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-procedures'] });
      queryClient.invalidateQueries({ queryKey: ['test-procedures-stats'] });
      toast.success('Test result recorded');
      setRecordingId(null);
      setResultForm({
        actualResult: '',
        deviationsNoted: '',
        conclusion: 'effective',
        conclusionRationale: '',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const res = await fetch('/api/audit/test-procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, auditId: auditId || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create test procedure');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-procedures'] });
      queryClient.invalidateQueries({ queryKey: ['test-procedures-stats'] });
      toast.success('Test procedure created');
      setShowCreateModal(false);
      setCreateForm({ title: '', testType: 'inspection', testMethod: '', sampleSize: 25, controlId: '' });
    },
    onError: () => {
      toast.error('Failed to create test procedure');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    createMutation.mutate(createForm);
  };

  const handleRecordResult = (id: string) => {
    recordResultMutation.mutate({ id, data: resultForm });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Test Procedures</h1>
          <p className="text-surface-400 mt-1">
            Control testing with sampling and effectiveness assessment
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Procedure
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Total Procedures</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Effectiveness Rate</p>
            <p className="text-3xl font-bold text-green-400">{stats.effectivenessRate}%</p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Completed</p>
            <p className="text-3xl font-bold text-white">
              {stats.byStatus.find(s => s.status === 'completed')?.count || 0}
            </p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-400">
              {stats.byStatus.find(s => s.status === 'pending')?.count || 0}
            </p>
          </div>
        </div>
      )}

      {/* Procedures List */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-800 rounded-lg h-24" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {procedures.map((proc) => {
            const conclusionCfg = proc.conclusion ? conclusionConfig[proc.conclusion] : null;
            const isRecording = recordingId === proc.id;

            return (
              <div
                key={proc.id}
                className="bg-surface-800 rounded-lg border border-surface-700 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-brand-500/10 rounded-lg">
                      <BeakerIcon className="h-6 w-6 text-brand-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-brand-400">
                          {proc.procedureNumber}
                        </span>
                        <h3 className="font-semibold text-white">{proc.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-surface-400">
                        <span>{testTypeLabels[proc.testType] || proc.testType}</span>
                        {proc.sampleSize && <span>Sample: {proc.sampleSize}</span>}
                        {proc.testedByUser && (
                          <span>Tested by: {proc.testedByUser.displayName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {proc.conclusion && conclusionCfg && (
                      <span className={clsx('flex items-center gap-1', conclusionCfg.color)}>
                        <conclusionCfg.icon className="h-4 w-4" />
                        {conclusionCfg.label}
                      </span>
                    )}
                    {proc.status === 'pending' && !isRecording && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setRecordingId(proc.id)}
                      >
                        <PlayIcon className="h-4 w-4 mr-1" />
                        Record Result
                      </Button>
                    )}
                  </div>
                </div>

                {/* Record Result Form */}
                {isRecording && (
                  <div className="mt-4 pt-4 border-t border-surface-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-400 mb-1">
                          Actual Result
                        </label>
                        <textarea
                          value={resultForm.actualResult}
                          onChange={(e) => setResultForm({ ...resultForm, actualResult: e.target.value })}
                          className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-400 mb-1">
                          Deviations Noted
                        </label>
                        <textarea
                          value={resultForm.deviationsNoted}
                          onChange={(e) => setResultForm({ ...resultForm, deviationsNoted: e.target.value })}
                          className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-400 mb-1">
                          Conclusion
                        </label>
                        <select
                          value={resultForm.conclusion}
                          onChange={(e) => setResultForm({ ...resultForm, conclusion: e.target.value })}
                          className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="effective">Effective</option>
                          <option value="partially_effective">Partially Effective</option>
                          <option value="ineffective">Ineffective</option>
                          <option value="not_applicable">Not Applicable</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-400 mb-1">
                          Conclusion Rationale
                        </label>
                        <input
                          type="text"
                          value={resultForm.conclusionRationale}
                          onChange={(e) => setResultForm({ ...resultForm, conclusionRationale: e.target.value })}
                          className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="ghost" onClick={() => setRecordingId(null)}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleRecordResult(proc.id)}>
                        Save Result
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {procedures.length === 0 && (
            <div className="text-center py-12 bg-surface-800 rounded-lg border border-surface-700">
              <BeakerIcon className="h-12 w-12 text-surface-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No test procedures yet</h3>
              <p className="text-surface-400 mt-2">
                Create test procedures to document control testing.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Test Procedure Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-lg p-6 w-full max-w-lg border border-surface-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Create Test Procedure</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-surface-700 rounded"
              >
                <XMarkIcon className="h-5 w-5 text-surface-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="Procedure title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">
                    Test Type
                  </label>
                  <select
                    value={createForm.testType}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, testType: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  >
                    <option value="inquiry">Inquiry</option>
                    <option value="observation">Observation</option>
                    <option value="inspection">Inspection</option>
                    <option value="reperformance">Reperformance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">
                    Sample Size
                  </label>
                  <input
                    type="number"
                    value={createForm.sampleSize}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, sampleSize: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Test Method
                </label>
                <textarea
                  value={createForm.testMethod}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, testMethod: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white h-24"
                  placeholder="Describe the testing methodology..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !createForm.title.trim()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Procedure'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

