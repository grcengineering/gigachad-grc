import { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EnvelopeIcon,
  DocumentChartBarIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Modal } from './Modal';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { scheduledReportsApi, ScheduledReport } from '@/lib/api';

import { Input } from '@/components/ui/Input';

interface ScheduledReportsProps {
  className?: string;
}

// ===========================================
// Report Type Options
// ===========================================

const REPORT_TYPES = [
  { value: 'risk-register', label: 'Risk Register' },
  { value: 'risk-summary', label: 'Risk Summary' },
  { value: 'control-status', label: 'Control Status' },
  { value: 'compliance-summary', label: 'Compliance Summary' },
  { value: 'vendor-assessment', label: 'Vendor Assessment' },
  { value: 'policy-review', label: 'Policy Review Status' },
  { value: 'evidence-audit', label: 'Evidence Audit Trail' },
  { value: 'executive-summary', label: 'Executive Summary' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// ===========================================
// Main Component
// ===========================================

export function ScheduledReports({ className }: ScheduledReportsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load reports on mount
  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await scheduledReportsApi.list();
      setReports(data);
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
      toast.error('Failed to load scheduled reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const createReport = async (report: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun'>) => {
    try {
      const reportWithNextRun = {
        ...report,
        nextRun: calculateNextRun(report.schedule),
      };
      const newReport = await scheduledReportsApi.create(reportWithNextRun);
      setReports((prev) => [...prev, newReport]);
      toast.success('Scheduled report created');
    } catch (error) {
      console.error('Failed to create report:', error);
      toast.error('Failed to create scheduled report');
    }
  };

  const updateReport = async (id: string, updates: Partial<ScheduledReport>) => {
    try {
      const updatesWithNextRun = {
        ...updates,
        ...(updates.schedule ? { nextRun: calculateNextRun(updates.schedule) } : {}),
      };
      const updated = await scheduledReportsApi.update(id, updatesWithNextRun);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success('Report updated');
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error('Failed to update scheduled report');
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await scheduledReportsApi.delete(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success('Scheduled report deleted');
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete scheduled report');
    }
  };

  const toggleEnabled = (id: string) => {
    const report = reports.find((r) => r.id === id);
    if (report) {
      updateReport(id, { enabled: !report.enabled });
    }
  };

  const runNow = async (report: ScheduledReport) => {
    try {
      toast.success(`Running ${report.name}...`);
      const result = await scheduledReportsApi.runNow(report.id);
      if (result.success) {
        // Refresh reports to get updated lastRun
        await loadReports();
      }
    } catch (error) {
      console.error('Failed to run report:', error);
      toast.error('Failed to run report');
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Scheduled Reports</h2>
          <p className="text-surface-600 text-sm mt-1">Automate report generation and delivery</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<PlusIcon className="w-4 h-4" />}
        >
          New Schedule
        </Button>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-surface-800 border border-surface-700 rounded-xl">
          <ClockIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-700 mb-2">No scheduled reports</h3>
          <p className="text-surface-500 mb-4">
            Set up automated reports to be delivered on a schedule
          </p>
          <Button onClick={() => setShowCreateModal(true)}>Create Your First Schedule</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onEdit={() => setEditingReport(report)}
              onDelete={() => deleteReport(report.id)}
              onToggle={() => toggleEnabled(report.id)}
              onRunNow={() => runNow(report)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <ReportScheduleModal
        isOpen={showCreateModal || !!editingReport}
        onClose={() => {
          setShowCreateModal(false);
          setEditingReport(null);
        }}
        report={editingReport}
        onSave={(data) => {
          if (editingReport) {
            updateReport(editingReport.id, data);
          } else {
            createReport(data);
          }
          setShowCreateModal(false);
          setEditingReport(null);
        }}
      />
    </div>
  );
}

// ===========================================
// Report Card Component
// ===========================================

interface ReportCardProps {
  report: ScheduledReport;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRunNow: () => void;
}

function ReportCard({ report, onEdit, onDelete, onToggle, onRunNow }: ReportCardProps) {
  const reportType = REPORT_TYPES.find((t) => t.value === report.reportType);

  return (
    <div
      className={clsx(
        'bg-surface-800 border rounded-xl p-4',
        report.enabled ? 'border-surface-700' : 'border-surface-700/50 opacity-60'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'p-2 rounded-lg',
              report.enabled ? 'bg-brand-500/20' : 'bg-surface-700'
            )}
          >
            <DocumentChartBarIcon
              className={clsx('w-6 h-6', report.enabled ? 'text-brand-400' : 'text-surface-500')}
            />
          </div>
          <div>
            <h3 className="font-medium text-surface-100">{report.name}</h3>
            <p className="text-sm text-surface-600 mt-1">
              {reportType?.label || report.reportType} • {report.format.toUpperCase()}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1 text-surface-500">
                <ClockIcon className="w-4 h-4" />
                {formatSchedule(report.schedule)}
              </span>
              <span className="flex items-center gap-1 text-surface-500">
                <EnvelopeIcon className="w-4 h-4" />
                {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
              </span>
            </div>
            {report.nextRun && report.enabled && (
              <p className="text-xs text-surface-500 mt-2">
                Next run: {new Date(report.nextRun).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRunNow}
            leftIcon={<PlayIcon className="w-4 h-4" />}
          >
            Run Now
          </Button>
          <button
            onClick={onToggle}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              report.enabled
                ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
                : 'bg-surface-700 text-surface-500 hover:bg-surface-600'
            )}
            title={report.enabled ? 'Disable' : 'Enable'}
          >
            {report.enabled ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <PauseIcon className="w-5 h-5" />
            )}
          </button>
          <button onClick={onEdit} className="p-2 hover:bg-surface-700 rounded-lg text-surface-600">
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-600 hover:text-red-600"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Report Schedule Modal
// ===========================================

interface ReportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ScheduledReport | null;
  onSave: (data: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun'>) => void;
}

interface FormData {
  name: string;
  reportType: string;
  format: 'pdf' | 'csv' | 'xlsx';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek: number;
  dayOfMonth: number;
  time: string;
  recipients: string;
  enabled: boolean;
}

function ReportScheduleModal({ isOpen, onClose, report, onSave }: ReportScheduleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    reportType: 'risk-register',
    format: 'pdf',
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: '09:00',
    recipients: '',
    enabled: true,
  });

  useEffect(() => {
    if (report) {
      setFormData({
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        frequency: report.schedule.frequency,
        dayOfWeek: report.schedule.dayOfWeek || 1,
        dayOfMonth: report.schedule.dayOfMonth || 1,
        time: report.schedule.time,
        recipients: report.recipients.join(', '),
        enabled: report.enabled,
      });
    } else {
      setFormData({
        name: '',
        reportType: 'risk-register',
        format: 'pdf',
        frequency: 'weekly',
        dayOfWeek: 1,
        dayOfMonth: 1,
        time: '09:00',
        recipients: '',
        enabled: true,
      });
    }
  }, [report, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const recipients = formData.recipients
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r);

    if (!formData.name || recipients.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    onSave({
      name: formData.name,
      reportType: formData.reportType,
      format: formData.format,
      schedule: {
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : undefined,
        dayOfMonth:
          formData.frequency === 'monthly' || formData.frequency === 'quarterly'
            ? formData.dayOfMonth
            : undefined,
        time: formData.time,
      },
      recipients,
      enabled: formData.enabled,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={report ? 'Edit Scheduled Report' : 'New Scheduled Report'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Report Name *</label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Weekly Risk Summary"
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500"
          />
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Report Type</label>
          <select
            value={formData.reportType}
            onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
          >
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Format</label>
          <div className="flex gap-2">
            {['pdf', 'csv', 'xlsx'].map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setFormData({ ...formData, format: format as any })}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm',
                  formData.format === format
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-700 text-surface-700 hover:bg-surface-600'
                )}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Frequency</label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Day Selection */}
        {formData.frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Day of Week</label>
            <select
              value={formData.dayOfWeek}
              onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Day of Month</label>
            <select
              value={formData.dayOfMonth}
              onChange={(e) => setFormData({ ...formData, dayOfMonth: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                  {day > 28 ? '*' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-surface-500 mt-1">
              * Days 29-31 will run on the last day of shorter months
            </p>
          </div>
        )}

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Time</label>
          <Input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
          />
        </div>

        {/* Recipients */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">
            Recipients * (comma-separated emails)
          </label>
          <Input
            type="text"
            value={formData.recipients}
            onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
            placeholder="john@example.com, jane@example.com"
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{report ? 'Update Schedule' : 'Create Schedule'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ===========================================
// Helper Functions
// ===========================================

function formatSchedule(schedule: ScheduledReport['schedule']): string {
  const time = schedule.time;
  switch (schedule.frequency) {
    case 'daily':
      return `Daily at ${time}`;
    case 'weekly': {
      const day = DAYS_OF_WEEK.find((d) => d.value === schedule.dayOfWeek)?.label || '';
      return `Every ${day} at ${time}`;
    }
    case 'monthly':
      return `Monthly on day ${schedule.dayOfMonth} at ${time}`;
    case 'quarterly':
      return `Quarterly on day ${schedule.dayOfMonth} at ${time}`;
    default:
      return schedule.frequency;
  }
}

function calculateNextRun(schedule: ScheduledReport['schedule']): string {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);

  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  // If time has passed today, move to next occurrence
  if (nextRun <= now) {
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly': {
        const targetDay = schedule.dayOfWeek || 0;
        const currentDay = now.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        nextRun.setDate(nextRun.getDate() + daysUntil);
        break;
      }
      case 'monthly':
      case 'quarterly': {
        const targetDate = schedule.dayOfMonth || 1;
        const monthIncrement = schedule.frequency === 'quarterly' ? 3 : 1;

        // Try setting the target date in the current month first
        nextRun.setDate(targetDate);

        if (nextRun <= now) {
          // Move to next month/quarter, handling day-of-month overflow
          const targetMonth = now.getMonth() + monthIncrement;
          const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
          const normalizedMonth = targetMonth % 12;

          // Get the last day of the target month
          const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();

          // Clamp the target date to the max days in that month
          const clampedDate = Math.min(targetDate, lastDayOfMonth);

          nextRun = new Date(targetYear, normalizedMonth, clampedDate, hours, minutes, 0, 0);
        }
        break;
      }
    }
  }

  return nextRun.toISOString();
}

export default ScheduledReports;
