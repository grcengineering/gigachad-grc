import { ComplianceCalendar } from '@/components/ComplianceCalendar';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function ComplianceCalendarPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <CalendarDaysIcon className="w-8 h-8 text-brand-500" />
            Compliance Calendar
          </h1>
          <p className="text-surface-600 mt-1">
            Track policy reviews, audit deadlines, and control assessments
          </p>
        </div>
      </div>

      {/* Calendar Component */}
      <ComplianceCalendar showFilters={true} />
    </div>
  );
}
