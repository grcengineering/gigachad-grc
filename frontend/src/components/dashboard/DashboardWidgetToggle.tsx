/**
 * Dashboard Widget Toggle Component
 * 
 * Displays a customization panel for toggling dashboard widgets on/off.
 */

import { memo } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface DashboardConfig {
  widgets: {
    statsRow: boolean;
    alertBanner: boolean;
    frameworkReadiness: boolean;
    controlStatus: boolean;
    riskHeatMap: boolean;
    vendorReviewsDue: boolean;
    trustQueue: boolean;
    policyLifecycle: boolean;
    controlsByCategory: boolean;
    quickActions: boolean;
    recentActivity: boolean;
  };
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  widgets: {
    statsRow: true,
    alertBanner: true,
    frameworkReadiness: true,
    controlStatus: true,
    riskHeatMap: true,
    vendorReviewsDue: true,
    trustQueue: true,
    policyLifecycle: true,
    controlsByCategory: true,
    quickActions: true,
    recentActivity: true,
  },
};

export const WIDGET_LABELS: Record<keyof DashboardConfig['widgets'], string> = {
  statsRow: 'Stats Cards',
  alertBanner: 'Alert Banner',
  frameworkReadiness: 'Framework Readiness',
  controlStatus: 'Control Status',
  riskHeatMap: 'Risk Heat Map',
  vendorReviewsDue: 'Vendor Reviews Due',
  trustQueue: 'Trust Queue',
  policyLifecycle: 'Policy Lifecycle',
  controlsByCategory: 'Controls by Category',
  quickActions: 'Quick Actions',
  recentActivity: 'Recent Activity',
};

interface DashboardWidgetToggleProps {
  config: DashboardConfig;
  onToggle: (widgetKey: keyof DashboardConfig['widgets']) => void;
  isVisible: boolean;
}

export const DashboardWidgetToggle = memo(function DashboardWidgetToggle({
  config,
  onToggle,
  isVisible,
}: DashboardWidgetToggleProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Toggle Dashboard Widgets
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Object.entries(WIDGET_LABELS).map(([key, label]) => {
          const widgetKey = key as keyof DashboardConfig['widgets'];
          const isEnabled = config.widgets[widgetKey];
          
          return (
            <button
              key={key}
              onClick={() => onToggle(widgetKey)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                isEnabled
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {isEnabled ? (
                <EyeIcon className="w-4 h-4" />
              ) : (
                <EyeSlashIcon className="w-4 h-4" />
              )}
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Load dashboard config from localStorage
 */
export function loadDashboardConfig(): DashboardConfig {
  try {
    const saved = localStorage.getItem('dashboard-config');
    if (saved) {
      return { ...DEFAULT_DASHBOARD_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load dashboard config:', e);
  }
  return DEFAULT_DASHBOARD_CONFIG;
}

/**
 * Save dashboard config to localStorage
 */
export function saveDashboardConfig(config: DashboardConfig): void {
  try {
    localStorage.setItem('dashboard-config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save dashboard config:', e);
  }
}
