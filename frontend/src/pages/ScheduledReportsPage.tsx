import { ScheduledReports } from '@/components/ScheduledReports';
import { DocumentChartBarIcon } from '@heroicons/react/24/outline';

export default function ScheduledReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <DocumentChartBarIcon className="w-8 h-8 text-brand-500" />
            Report Scheduling
          </h1>
          <p className="text-surface-600 mt-1">
            Configure automated report generation and email delivery
          </p>
        </div>
      </div>

      {/* Scheduled Reports Component */}
      <ScheduledReports />
    </div>
  );
}
