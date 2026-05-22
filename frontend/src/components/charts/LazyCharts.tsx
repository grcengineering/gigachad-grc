/**
 * Lazy-loaded chart components wrapper
 * These components load recharts only when actually rendered,
 * reducing initial bundle size for pages that don't need charts.
 */

import React, { Suspense } from 'react';

// Loading placeholder for charts
function ChartLoading({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-surface-200/30 rounded-lg flex items-center justify-center"
      style={{ height }}
    >
      <div className="text-surface-500 text-sm">Loading chart...</div>
    </div>
  );
}

// Types for chart components
export interface LazyPieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabel?: boolean;
  showLegend?: boolean;
  labelFormatter?: (entry: { name: string; value: number }) => string;
}

export interface LazyBarChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  barColor?: string;
  showGrid?: boolean;
}

export interface LazyLineChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  lineColor?: string;
  showGrid?: boolean;
  showArea?: boolean;
}

// Chart colors
const CHART_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
];

// Lazy Pie Chart
export function LazyPieChart({
  data,
  height = 200,
  innerRadius = 0,
  outerRadius = 80,
  showLabel = true,
  showLegend = false,
  labelFormatter,
}: LazyPieChartProps) {
  return (
    <Suspense fallback={<ChartLoading height={height} />}>
      <LazyPieChartInner
        data={data}
        height={height}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        showLabel={showLabel}
        showLegend={showLegend}
        labelFormatter={labelFormatter}
      />
    </Suspense>
  );
}

function LazyPieChartInner(props: LazyPieChartProps) {
  const { data, height, innerRadius, outerRadius, showLabel, showLegend, labelFormatter } = props;

  const [recharts, setRecharts] = React.useState<typeof import('recharts') | null>(null);

  React.useEffect(() => {
    import('recharts').then(setRecharts);
  }, []);

  if (!recharts) return <ChartLoading height={height} />;

  const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = recharts;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          label={showLabel ? labelFormatter || (({ name, value }) => `${name}: ${value}`) : false}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}

// Lazy Bar Chart
export function LazyBarChart({
  data,
  dataKey,
  xAxisKey = 'name',
  height = 200,
  barColor = '#3b82f6',
  showGrid = true,
}: LazyBarChartProps) {
  return (
    <Suspense fallback={<ChartLoading height={height} />}>
      <LazyBarChartInner
        data={data}
        dataKey={dataKey}
        xAxisKey={xAxisKey}
        height={height}
        barColor={barColor}
        showGrid={showGrid}
      />
    </Suspense>
  );
}

function LazyBarChartInner(props: LazyBarChartProps) {
  const { data, dataKey, xAxisKey, height, barColor, showGrid } = props;

  const [recharts, setRecharts] = React.useState<typeof import('recharts') | null>(null);

  React.useEffect(() => {
    import('recharts').then(setRecharts);
  }, []);

  if (!recharts) return <ChartLoading height={height} />;

  const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } = recharts;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
        <XAxis dataKey={xAxisKey} tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
          }}
        />
        <Bar dataKey={dataKey} fill={barColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Lazy Line Chart
export function LazyLineChart({
  data,
  dataKey,
  xAxisKey = 'name',
  height = 200,
  lineColor = '#10b981',
  showGrid = true,
  showArea = false,
}: LazyLineChartProps) {
  return (
    <Suspense fallback={<ChartLoading height={height} />}>
      <LazyLineChartInner
        data={data}
        dataKey={dataKey}
        xAxisKey={xAxisKey}
        height={height}
        lineColor={lineColor}
        showGrid={showGrid}
        showArea={showArea}
      />
    </Suspense>
  );
}

function LazyLineChartInner(props: LazyLineChartProps) {
  const { data, dataKey, xAxisKey, height, lineColor, showGrid, showArea } = props;

  const [recharts, setRecharts] = React.useState<typeof import('recharts') | null>(null);

  React.useEffect(() => {
    import('recharts').then(setRecharts);
  }, []);

  if (!recharts) return <ChartLoading height={height} />;

  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } =
    recharts;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
        <XAxis dataKey={xAxisKey} tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
          }}
        />
        {showArea && <Area type="monotone" dataKey={dataKey} fill={lineColor} fillOpacity={0.1} />}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Donut chart (pie with inner radius)
export function LazyDonutChart(props: Omit<LazyPieChartProps, 'innerRadius'>) {
  return <LazyPieChart {...props} innerRadius={50} />;
}

// Export all chart components
export default {
  LazyPieChart,
  LazyBarChart,
  LazyLineChart,
  LazyDonutChart,
};

/**
 * Hook to lazily load Recharts components
 * Use this when you need full control over chart configuration
 */
export function useRecharts() {
  const [recharts, setRecharts] = React.useState<typeof import('recharts') | null>(null);

  React.useEffect(() => {
    import('recharts').then(setRecharts);
  }, []);

  return recharts;
}

/**
 * Wrapper component that lazily loads Recharts and renders children only when loaded
 */
export function LazyRechartsWrapper({
  children,
  height = 200,
  fallback,
}: {
  children: (recharts: typeof import('recharts')) => React.ReactNode;
  height?: number;
  fallback?: React.ReactNode;
}) {
  const recharts = useRecharts();

  if (!recharts) {
    return fallback || <ChartLoading height={height} />;
  }

  return <>{children(recharts)}</>;
}
