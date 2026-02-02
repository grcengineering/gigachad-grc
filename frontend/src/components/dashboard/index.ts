/**
 * Dashboard Components Index
 * 
 * Re-exports all dashboard-related components for convenient imports.
 */

export { DashboardHeader } from './DashboardHeader';
export { 
  DashboardWidgetToggle,
  loadDashboardConfig,
  saveDashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  WIDGET_LABELS,
  type DashboardConfig,
} from './DashboardWidgetToggle';
export { DashboardStats, type DashboardStatsData } from './DashboardStats';
export { WorkspaceComparisonWidget } from './WorkspaceComparisonWidget';
