/**
 * Dashboard Widget Types
 * 
 * Type definitions for dashboard widgets and their configurations.
 */

export type WidgetType =
  | 'stats'
  | 'chart'
  | 'table'
  | 'list'
  | 'heatmap'
  | 'gauge'
  | 'timeline'
  | 'map'
  | 'custom';

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'area'
  | 'stacked-bar'
  | 'radar';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetDataSource {
  type: 'api' | 'static' | 'query';
  endpoint?: string;
  params?: Record<string, string | number | boolean>;
  refreshInterval?: number; // in seconds
}

export interface WidgetChartConfig {
  chartType: ChartType;
  xAxis?: {
    dataKey: string;
    label?: string;
  };
  yAxis?: {
    dataKey: string;
    label?: string;
  };
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
}

export interface WidgetTableConfig {
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    render?: 'text' | 'badge' | 'date' | 'number' | 'link';
  }>;
  pageSize?: number;
  showPagination?: boolean;
}

export interface WidgetStatsConfig {
  mainValue: {
    dataKey: string;
    label: string;
    format?: 'number' | 'percent' | 'currency';
  };
  comparison?: {
    dataKey: string;
    label: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: string;
  color?: string;
}

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  position?: WidgetPosition;
  dataSource: WidgetDataSource;
  chartConfig?: WidgetChartConfig;
  tableConfig?: WidgetTableConfig;
  statsConfig?: WidgetStatsConfig;
  filters?: Record<string, unknown>;
  permissions?: string[];
}

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  config: WidgetConfig;
  order: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dashboard {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  layout: 'grid' | 'freeform';
  widgets: DashboardWidget[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  layout?: 'grid' | 'freeform';
}

export interface UpdateDashboardDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  layout?: 'grid' | 'freeform';
}

export interface CreateWidgetDto {
  dashboardId: string;
  config: WidgetConfig;
  order?: number;
}

export interface UpdateWidgetDto {
  config?: Partial<WidgetConfig>;
  order?: number;
  isVisible?: boolean;
}
