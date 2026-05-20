import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface SystemWarning {
  id: string;
  severity: 'warning' | 'critical';
  category: string;
  title: string;
  message: string;
  recommendation?: string;
  documentationUrl?: string;
}

interface SystemWarningsResponse {
  hasWarnings: boolean;
  count: number;
  warnings: SystemWarning[];
}

/**
 * SystemHealthBanner displays critical system warnings at the top of the admin dashboard.
 * It shows alerts for:
 * - Security issues (dev auth in production, default passwords)
 * - Backup configuration problems
 * - SSL/TLS issues
 * - Missing required configuration
 */
export function SystemHealthBanner() {
  const [warnings, setWarnings] = useState<SystemWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchWarnings();
    // Refresh warnings every 5 minutes
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchWarnings = async () => {
    try {
      const response = await api.get<SystemWarningsResponse>('/api/system/warnings');
      setWarnings(response.data.warnings || []);
    } catch (error) {
      console.error('Failed to fetch system warnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissWarning = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    // Store dismissal in sessionStorage (will reset on new session)
    const dismissedList = JSON.parse(sessionStorage.getItem('dismissedWarnings') || '[]');
    dismissedList.push(id);
    sessionStorage.setItem('dismissedWarnings', JSON.stringify(dismissedList));
  };

  // Load previously dismissed warnings from session
  useEffect(() => {
    const dismissedList = JSON.parse(sessionStorage.getItem('dismissedWarnings') || '[]');
    setDismissed(new Set(dismissedList));
  }, []);

  const activeWarnings = warnings.filter((w) => !dismissed.has(w.id));
  const criticalWarnings = activeWarnings.filter((w) => w.severity === 'critical');
  const regularWarnings = activeWarnings.filter((w) => w.severity === 'warning');

  if (loading || activeWarnings.length === 0) {
    return null;
  }

  const hasCritical = criticalWarnings.length > 0;

  return (
    <div
      className={`mb-6 rounded-lg border ${
        hasCritical ? 'border-red-500/50 bg-red-500/10' : 'border-yellow-500/50 bg-yellow-500/10'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${
          hasCritical ? 'text-red-600' : 'text-yellow-600'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {hasCritical ? (
            <ShieldExclamationIcon className="h-6 w-6" />
          ) : (
            <ExclamationTriangleIcon className="h-6 w-6" />
          )}
          <div>
            <h3 className="font-semibold">
              {hasCritical
                ? `${criticalWarnings.length} Critical Issue${criticalWarnings.length > 1 ? 's' : ''} Detected`
                : `${activeWarnings.length} System Warning${activeWarnings.length > 1 ? 's' : ''}`}
            </h3>
            <p className="text-sm opacity-80">
              {hasCritical
                ? 'Address these issues before deploying to production'
                : 'Review these recommendations to improve system resilience'}
            </p>
          </div>
        </div>
        <button className="p-1 hover:bg-white/10 rounded">
          {expanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Expanded warnings list */}
      {expanded && (
        <div className="border-t border-white/10 divide-y divide-white/10">
          {/* Critical warnings first */}
          {criticalWarnings.map((warning) => (
            <WarningItem
              key={warning.id}
              warning={warning}
              onDismiss={() => dismissWarning(warning.id)}
            />
          ))}
          {/* Then regular warnings */}
          {regularWarnings.map((warning) => (
            <WarningItem
              key={warning.id}
              warning={warning}
              onDismiss={() => dismissWarning(warning.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WarningItem({ warning, onDismiss }: { warning: SystemWarning; onDismiss: () => void }) {
  const isCritical = warning.severity === 'critical';

  return (
    <div className="px-4 py-3 flex items-start gap-4">
      <div
        className={`mt-0.5 p-1 rounded ${
          isCritical ? 'bg-red-500/20 text-red-600' : 'bg-yellow-500/20 text-yellow-600'
        }`}
      >
        {isCritical ? (
          <ShieldExclamationIcon className="h-4 w-4" />
        ) : (
          <ExclamationTriangleIcon className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              isCritical ? 'bg-red-500/20 text-red-600' : 'bg-yellow-500/20 text-yellow-600'
            }`}
          >
            {warning.category.toUpperCase()}
          </span>
          <h4 className="font-medium text-foreground">{warning.title}</h4>
        </div>

        <p className="mt-1 text-sm text-foreground/70">{warning.message}</p>

        {warning.recommendation && (
          <p className="mt-2 text-sm text-foreground/60">
            <span className="font-medium">Recommendation:</span> {warning.recommendation}
          </p>
        )}

        {warning.documentationUrl && (
          <a
            href={warning.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View Documentation
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        )}
      </div>

      {!isCritical && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 hover:bg-white/10 rounded text-foreground/50 hover:text-foreground"
          title="Dismiss for this session"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default SystemHealthBanner;
