import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import clsx from 'clsx';

interface PlanEntry {
  id: string;
  year: number;
  quarter: number;
  auditName: string;
  auditType: string;
  framework: string;
  riskRating: string;
  status: string;
  estimatedHours: number;
  linkedAuditId: string | null;
}

interface CalendarData {
  [year: number]: {
    [quarter: number]: PlanEntry[];
  };
}

const riskColors: Record<string, string> = {
  critical: 'bg-red-500/20 border-red-500 text-red-700',
  high: 'bg-orange-500/20 border-orange-500 text-orange-700',
  medium: 'bg-yellow-500/20 border-yellow-500 text-yellow-700',
  low: 'bg-green-500/20 border-green-500 text-green-700',
};

const statusColors: Record<string, string> = {
  planned: 'bg-surface-200 text-surface-700',
  scheduled: 'bg-blue-500/20 text-blue-600',
  in_progress: 'bg-purple-500/20 text-purple-600',
  completed: 'bg-green-500/20 text-green-600',
  deferred: 'bg-gray-500/20 text-gray-400',
  cancelled: 'bg-red-500/20 text-red-600',
};

const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function AuditCalendar() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState(currentYear);
  const endYear = startYear + 2;

  const { data: calendarData, isLoading } = useQuery<CalendarData>({
    queryKey: ['audit-calendar', startYear, endYear],
    queryFn: async () => {
      const res = await fetch(
        `/api/audit/planning/calendar?startYear=${startYear}&endYear=${endYear}`
      );
      if (!res.ok) throw new Error('Failed to fetch calendar');
      return res.json();
    },
  });

  const { data: capacity } = useQuery({
    queryKey: ['audit-capacity', currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/audit/planning/capacity?year=${currentYear}`);
      if (!res.ok) throw new Error('Failed to fetch capacity');
      return res.json();
    },
  });

  const convertToAuditMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`/api/audit/planning/${entryId}/convert-to-audit`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to convert to audit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-calendar'] });
      toast.success('Audit created from plan entry');
    },
  });

  const years = Array.from({ length: 3 }, (_, i) => startYear + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Calendar</h1>
          <p className="text-surface-600 mt-1">Multi-year audit planning and scheduling</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStartYear(startYear - 1)}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-white font-medium">
              {startYear} - {endYear}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setStartYear(startYear + 1)}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Plan Entry
          </Button>
        </div>
      </div>

      {/* Capacity Overview */}
      {capacity && (
        <div className="bg-white rounded-lg p-4 border border-surface-200">
          <h3 className="text-sm font-medium text-surface-600 mb-2">
            {currentYear} Capacity Overview
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {quarterLabels.map((q, i) => {
              const hours = capacity.hoursByQuarter?.[i + 1] || 0;
              return (
                <div key={q} className="text-center">
                  <p className="text-surface-600 text-sm">{q}</p>
                  <p className="text-xl font-bold text-white">{hours}h</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-surface-200 flex justify-between text-sm">
            <span className="text-surface-600">
              Total: <span className="text-white font-medium">{capacity.totalHours}h</span>
            </span>
            <span className="text-surface-600">
              Entries: <span className="text-white font-medium">{capacity.totalEntries}</span>
            </span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="animate-pulse bg-white rounded-lg h-96" />
      ) : (
        <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
          {/* Year Headers */}
          <div className="grid grid-cols-3 border-b border-surface-200">
            {years.map((year) => (
              <div
                key={year}
                className="text-center py-3 text-lg font-semibold text-white border-r border-surface-200 last:border-r-0"
              >
                {year}
              </div>
            ))}
          </div>

          {/* Quarter Rows */}
          {[1, 2, 3, 4].map((quarter) => (
            <div
              key={quarter}
              className="grid grid-cols-3 border-b border-surface-200 last:border-b-0"
            >
              {years.map((year) => {
                const entries = calendarData?.[year]?.[quarter] || [];
                return (
                  <div
                    key={`${year}-${quarter}`}
                    className="min-h-32 p-3 border-r border-surface-200 last:border-r-0"
                  >
                    <div className="text-xs font-medium text-surface-500 mb-2">Q{quarter}</div>
                    <div className="space-y-2">
                      {entries.map((entry: PlanEntry) => (
                        <div
                          key={entry.id}
                          className={clsx(
                            'p-2 rounded-md border text-sm cursor-pointer hover:opacity-80 transition-opacity',
                            riskColors[entry.riskRating] ||
                              'bg-surface-200 border-surface-300 text-surface-700'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{entry.auditName}</span>
                            {!entry.linkedAuditId && entry.status === 'planned' && (
                              <button
                                onClick={() => convertToAuditMutation.mutate(entry.id)}
                                className="p-1 hover:bg-white/10 rounded"
                                title="Convert to Audit"
                              >
                                <PlayIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs opacity-75">
                            <span>{entry.auditType}</span>
                            {entry.framework && <span>• {entry.framework}</span>}
                          </div>
                          <div className="mt-1">
                            <span
                              className={clsx(
                                'text-xs px-1.5 py-0.5 rounded',
                                statusColors[entry.status]
                              )}
                            >
                              {entry.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                      {entries.length === 0 && (
                        <div className="text-surface-600 text-sm italic text-center py-4">
                          No audits planned
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-surface-600">Risk Rating:</span>
        {Object.entries(riskColors).map(([risk, classes]) => (
          <span key={risk} className={clsx('px-2 py-1 rounded border', classes)}>
            {risk}
          </span>
        ))}
      </div>
    </div>
  );
}
