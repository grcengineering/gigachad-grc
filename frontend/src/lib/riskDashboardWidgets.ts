/**
 * Risk Dashboard Widget Definitions
 * 
 * Pre-configured widgets specifically designed for the Risk Dashboard.
 * These widgets are used with the DashboardGrid component for customizable layouts.
 */

import {
  WidgetType,
  DataSourceType,
  AggregationFunction,
  FilterOperator,
  CHART_COLORS,
  type DashboardWidget,
  type WidgetPosition,
} from './dashboardWidgets';

// Widget IDs for risk dashboard
export const RISK_WIDGET_IDS = {
  TOTAL_RISKS: 'risk-total',
  OPEN_RISKS: 'risk-open',
  IN_TREATMENT: 'risk-in-treatment',
  MITIGATED_THIS_MONTH: 'risk-mitigated-month',
  LEVEL_DISTRIBUTION: 'risk-level-distribution',
  CATEGORY_BREAKDOWN: 'risk-category-breakdown',
  TREND_OVER_TIME: 'risk-trend-over-time',
  RECENT_RISKS: 'risk-recent-list',
  TOP_RISKS: 'risk-top-list',
  RISK_APPETITE: 'risk-appetite-gauge',
  QUICK_ACTIONS: 'risk-quick-actions',
  RISK_HEATMAP: 'risk-heatmap-preview',
} as const;

export type RiskWidgetId = (typeof RISK_WIDGET_IDS)[keyof typeof RISK_WIDGET_IDS];

/**
 * Default widget definitions for the Risk Dashboard
 */
export const RISK_DASHBOARD_WIDGETS: DashboardWidget[] = [
  // Row 1: KPI Cards
  {
    id: RISK_WIDGET_IDS.TOTAL_RISKS,
    widgetType: WidgetType.KPI_CARD,
    title: 'Total Risks',
    position: { x: 0, y: 0, w: 3, h: 2 },
    dataSource: {
      source: DataSourceType.RISKS,
      aggregations: [{ field: 'id', function: AggregationFunction.COUNT, alias: 'total' }],
    },
    config: {
      metricField: 'total',
      valueFormat: '{value}',
      colors: ['#6366f1'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: RISK_WIDGET_IDS.OPEN_RISKS,
    widgetType: WidgetType.KPI_CARD,
    title: 'Open Risks',
    position: { x: 3, y: 0, w: 3, h: 2 },
    dataSource: {
      source: DataSourceType.RISKS,
      filters: [{ field: 'status', operator: FilterOperator.EQ, value: 'open' }],
      aggregations: [{ field: 'id', function: AggregationFunction.COUNT, alias: 'count' }],
    },
    config: {
      metricField: 'count',
      valueFormat: '{value}',
      colors: ['#f97316'],
      thresholds: [
        { value: 50, color: '#dc2626' },
        { value: 20, color: '#f97316' },
        { value: 0, color: '#22c55e' },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: RISK_WIDGET_IDS.IN_TREATMENT,
    widgetType: WidgetType.KPI_CARD,
    title: 'In Treatment',
    position: { x: 6, y: 0, w: 3, h: 2 },
    dataSource: {
      source: DataSourceType.RISKS,
      filters: [{ field: 'treatmentStatus', operator: FilterOperator.EQ, value: 'in_progress' }],
      aggregations: [{ field: 'id', function: AggregationFunction.COUNT, alias: 'count' }],
    },
    config: {
      metricField: 'count',
      valueFormat: '{value}',
      colors: ['#3b82f6'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: RISK_WIDGET_IDS.MITIGATED_THIS_MONTH,
    widgetType: WidgetType.KPI_CARD,
    title: 'Mitigated This Month',
    position: { x: 9, y: 0, w: 3, h: 2 },
    dataSource: {
      source: DataSourceType.RISKS,
      filters: [{ field: 'status', operator: FilterOperator.EQ, value: 'mitigated' }],
      timeRange: {
        field: 'updatedAt',
        preset: 'this_month',
      },
      aggregations: [{ field: 'id', function: AggregationFunction.COUNT, alias: 'count' }],
    },
    config: {
      metricField: 'count',
      valueFormat: '{value}',
      colors: ['#22c55e'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Row 2: Charts
  {
    id: RISK_WIDGET_IDS.LEVEL_DISTRIBUTION,
    widgetType: WidgetType.DONUT_CHART,
    title: 'Risk Level Distribution',
    position: { x: 0, y: 2, w: 4, h: 3 },
    dataSource: {
      source: DataSourceType.RISKS,
      groupBy: 'riskLevel',
    },
    config: {
      colors: [
        CHART_COLORS.risk.critical,
        CHART_COLORS.risk.high,
        CHART_COLORS.risk.medium,
        CHART_COLORS.risk.low,
        CHART_COLORS.risk.very_low,
      ],
      showLegend: true,
      showValues: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: RISK_WIDGET_IDS.CATEGORY_BREAKDOWN,
    widgetType: WidgetType.BAR_CHART,
    title: 'Risks by Category',
    position: { x: 4, y: 2, w: 4, h: 3 },
    dataSource: {
      source: DataSourceType.RISKS,
      groupBy: 'category',
      orderBy: { field: 'count', direction: 'desc' },
      limit: 10,
    },
    config: {
      colors: CHART_COLORS.default,
      orientation: 'horizontal',
      showValues: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: RISK_WIDGET_IDS.TREND_OVER_TIME,
    widgetType: WidgetType.LINE_CHART,
    title: 'Risk Trend Over Time',
    position: { x: 8, y: 2, w: 4, h: 3 },
    dataSource: {
      source: DataSourceType.RISKS,
      groupBy: 'createdAt',
      timeRange: {
        field: 'createdAt',
        preset: 'last_90_days',
      },
    },
    config: {
      colors: ['#6366f1', '#f97316', '#22c55e'],
      xAxisField: 'date',
      yAxisField: 'count',
      showValues: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Row 3: Tables and Lists
  {
    id: RISK_WIDGET_IDS.RECENT_RISKS,
    widgetType: WidgetType.TABLE,
    title: 'Recent Risks',
    position: { x: 0, y: 5, w: 6, h: 4 },
    dataSource: {
      source: DataSourceType.RISKS,
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 10,
    },
    config: {
      columns: [
        { field: 'name', header: 'Risk Name', width: 200 },
        { field: 'category', header: 'Category', width: 120 },
        { field: 'riskLevel', header: 'Level', width: 80 },
        { field: 'status', header: 'Status', width: 100 },
      ],
      linkTemplate: '/risks/{id}',
      pageSize: 5,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: RISK_WIDGET_IDS.TOP_RISKS,
    widgetType: WidgetType.LIST,
    title: 'Top Risks',
    position: { x: 6, y: 5, w: 3, h: 4 },
    dataSource: {
      source: DataSourceType.RISKS,
      filters: [
        { field: 'riskLevel', operator: FilterOperator.IN, value: ['critical', 'high'] },
      ],
      orderBy: { field: 'inherentRiskScore', direction: 'desc' },
      limit: 5,
    },
    config: {
      columns: [
        { field: 'name', header: 'Risk' },
        { field: 'riskLevel', header: 'Level' },
      ],
      linkTemplate: '/risks/{id}',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: RISK_WIDGET_IDS.RISK_APPETITE,
    widgetType: WidgetType.GAUGE,
    title: 'Risk Appetite Status',
    position: { x: 9, y: 5, w: 3, h: 3 },
    dataSource: {
      source: DataSourceType.RISKS,
      aggregations: [
        { field: 'inherentRiskScore', function: AggregationFunction.AVG, alias: 'avgScore' },
      ],
    },
    config: {
      maxValue: 100,
      thresholds: [
        { value: 80, color: '#dc2626' },
        { value: 60, color: '#f97316' },
        { value: 40, color: '#eab308' },
        { value: 0, color: '#22c55e' },
      ],
      valueFormat: '{value}%',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Quick Actions
  {
    id: RISK_WIDGET_IDS.QUICK_ACTIONS,
    widgetType: WidgetType.MARKDOWN,
    title: 'Quick Actions',
    position: { x: 9, y: 8, w: 3, h: 2 },
    dataSource: {
      source: DataSourceType.RISKS,
    },
    config: {
      markdownContent: `
**Actions**
- [Create New Risk](/risks/new)
- [View Risk Register](/risks)
- [Risk Heatmap](/risks/heatmap)
- [Run Assessment](/risks/assessment)
      `.trim(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Heatmap Preview
  {
    id: RISK_WIDGET_IDS.RISK_HEATMAP,
    widgetType: WidgetType.HEATMAP,
    title: 'Risk Heatmap',
    position: { x: 0, y: 9, w: 6, h: 4 },
    dataSource: {
      source: DataSourceType.RISKS,
      groupBy: 'likelihood,impact',
    },
    config: {
      xAxisField: 'likelihood',
      yAxisField: 'impact',
      colors: [
        '#22c55e', // Low
        '#84cc16', // Low-Med
        '#eab308', // Medium
        '#f97316', // High
        '#dc2626', // Critical
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Get the default layout for the risk dashboard grid
 */
export function getDefaultRiskDashboardLayout() {
  return {
    cols: 12,
    rowHeight: 60,
    margin: [16, 16] as [number, number],
    containerPadding: [16, 16] as [number, number],
  };
}

/**
 * Generate layout items for react-grid-layout from widgets
 */
export function generateLayoutFromWidgets(widgets: DashboardWidget[]) {
  return widgets.map((widget) => ({
    i: widget.id,
    x: widget.position.x,
    y: widget.position.y,
    w: widget.position.w,
    h: widget.position.h,
    minW: 2,
    minH: 2,
  }));
}

/**
 * Get a widget by ID
 */
export function getRiskWidgetById(widgetId: string): DashboardWidget | undefined {
  return RISK_DASHBOARD_WIDGETS.find((w) => w.id === widgetId);
}

/**
 * Get available widgets that can be added to the risk dashboard
 */
export function getAvailableRiskWidgets() {
  return RISK_DASHBOARD_WIDGETS.map((widget) => ({
    id: widget.id,
    title: widget.title,
    type: widget.widgetType,
    description: getWidgetDescription(widget.widgetType),
  }));
}

/**
 * Get a description for a widget type
 */
function getWidgetDescription(type: WidgetType): string {
  switch (type) {
    case WidgetType.KPI_CARD:
      return 'Display a key metric with optional trend';
    case WidgetType.DONUT_CHART:
      return 'Show distribution as a donut chart';
    case WidgetType.BAR_CHART:
      return 'Compare values with bars';
    case WidgetType.LINE_CHART:
      return 'Show trends over time';
    case WidgetType.TABLE:
      return 'Display data in a table format';
    case WidgetType.LIST:
      return 'Show items in a list';
    case WidgetType.GAUGE:
      return 'Display a score or percentage';
    case WidgetType.HEATMAP:
      return 'Visualize risk matrix';
    case WidgetType.MARKDOWN:
      return 'Show text content or links';
    default:
      return 'Widget';
  }
}

/**
 * Create a new widget position that doesn't overlap with existing widgets
 */
export function findAvailablePosition(
  existingWidgets: DashboardWidget[],
  newWidgetSize: { w: number; h: number },
  cols: number = 12,
): WidgetPosition {
  // Find the maximum y position
  let maxY = 0;
  existingWidgets.forEach((widget) => {
    const bottomY = widget.position.y + widget.position.h;
    if (bottomY > maxY) {
      maxY = bottomY;
    }
  });

  // Try to find space in the current rows first
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= cols - newWidgetSize.w; x++) {
      const position = { x, y, w: newWidgetSize.w, h: newWidgetSize.h };
      if (!hasOverlap(existingWidgets, position)) {
        return position;
      }
    }
  }

  // Add to the bottom
  return {
    x: 0,
    y: maxY,
    w: newWidgetSize.w,
    h: newWidgetSize.h,
  };
}

/**
 * Check if a position overlaps with existing widgets
 */
function hasOverlap(
  widgets: DashboardWidget[],
  position: WidgetPosition,
): boolean {
  return widgets.some((widget) => {
    const a = widget.position;
    const b = position;
    return !(
      a.x + a.w <= b.x ||
      b.x + b.w <= a.x ||
      a.y + a.h <= b.y ||
      b.y + b.h <= a.y
    );
  });
}
