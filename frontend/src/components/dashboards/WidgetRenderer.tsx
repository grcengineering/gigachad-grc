import { useMemo } from 'react';
import { useRecharts } from '@/components/charts/LazyCharts';
import { DashboardWidget, WidgetType, CHART_COLORS } from '@/lib/dashboardWidgets';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle } from 'lucide-react';

// Loading state for chart widgets
function ChartLoading() {
  return (
    <div className="flex items-center justify-center h-full animate-pulse bg-surface-200/30 rounded-lg">
      <div className="text-surface-500 text-sm">Loading chart...</div>
    </div>
  );
}

interface WidgetRendererProps {
  widget: DashboardWidget;
  data: any[];
}

export default function WidgetRenderer({ widget, data }: WidgetRendererProps) {
  const { widgetType, config } = widget;

  switch (widgetType) {
    case WidgetType.KPI_CARD:
      return <KpiCardWidget data={data} config={config} />;
    case WidgetType.PIE_CHART:
      return <PieChartWidget data={data} config={config} />;
    case WidgetType.DONUT_CHART:
      return <DonutChartWidget data={data} config={config} />;
    case WidgetType.BAR_CHART:
      return <BarChartWidget data={data} config={config} />;
    case WidgetType.LINE_CHART:
      return <LineChartWidget data={data} config={config} />;
    case WidgetType.TABLE:
      return <TableWidget data={data} config={config} />;
    case WidgetType.PROGRESS:
      return <ProgressWidget data={data} config={config} />;
    case WidgetType.LIST:
      return <ListWidget data={data} config={config} />;
    case WidgetType.GAUGE:
      return <GaugeWidget data={data} config={config} />;
    case WidgetType.HEATMAP:
      return <HeatmapWidget data={data} config={config} />;
    case WidgetType.MARKDOWN:
      return <MarkdownWidget config={config} />;
    case WidgetType.IFRAME:
      return <IframeWidget config={config} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-surface-500">
          Unknown widget type
        </div>
      );
  }
}

// KPI Card Widget
function KpiCardWidget({ data, config }: { data: any[]; config: any }) {
  const value = useMemo(() => {
    if (data.length === 0) return 0;
    const metricField = config?.metricField || 'count';
    // If data is aggregated, get the total count
    if (data[0]?.[metricField] !== undefined) {
      return data.reduce((sum, item) => sum + (item[metricField] || 0), 0);
    }
    if (data[0]?.count !== undefined) {
      return data.reduce((sum, item) => sum + (item.count || 0), 0);
    }
    return data.length;
  }, [data, config?.metricField]);

  const formattedValue = config?.valueFormat
    ? config.valueFormat.replace('{value}', value.toString())
    : value.toString();

  // Determine color based on thresholds
  let color = '#6366f1';
  if (config?.thresholds) {
    for (const threshold of config.thresholds.sort((a: any, b: any) => b.value - a.value)) {
      if (value >= threshold.value) {
        color = threshold.color;
        break;
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl font-bold" style={{ color }}>
        {formattedValue}
      </div>
      {config?.comparisonPeriod && (
        <div className="text-sm text-surface-600 mt-2">vs {config.comparisonPeriod}</div>
      )}
    </div>
  );
}

// Pie Chart Widget
function PieChartWidget({ data, config }: { data: any[]; config: any }) {
  const colors = config?.colors || CHART_COLORS.default;
  const recharts = useRecharts();

  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: formatLabel(
        Object.keys(item).find((k) => k !== 'count')
          ? item[Object.keys(item).find((k) => k !== 'count')!]
          : `Item ${index + 1}`
      ),
      value: item.count || item.value || 1,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return <EmptyState />;
  }

  if (!recharts) {
    return <ChartLoading />;
  }

  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } = recharts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius="80%"
          dataKey="value"
          label={
            config?.showValues
              ? ({ name, value }: { name: string; value: number }) => `${name}: ${value}`
              : false
          }
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
          }}
        />
        {config?.showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}

// Donut Chart Widget
function DonutChartWidget({ data, config }: { data: any[]; config: any }) {
  const colors = config?.colors || CHART_COLORS.default;
  const recharts = useRecharts();

  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: formatLabel(
        Object.keys(item).find((k) => k !== 'count')
          ? item[Object.keys(item).find((k) => k !== 'count')!]
          : `Item ${index + 1}`
      ),
      value: item.count || item.value || 1,
    }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return <EmptyState />;
  }

  if (!recharts) {
    return <ChartLoading />;
  }

  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } = recharts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" dataKey="value">
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-surface-100 text-2xl font-bold"
        >
          {total}
        </text>
        <Tooltip
          contentStyle={{
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
          }}
        />
        {config?.showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}

// Bar Chart Widget
function BarChartWidget({ data, config }: { data: any[]; config: any }) {
  const colors = config?.colors || CHART_COLORS.default;
  const isHorizontal = config?.orientation === 'horizontal';
  const recharts = useRecharts();

  const chartData = useMemo(() => {
    return data.map((item, index) => {
      const nameKey = Object.keys(item).find((k) => k !== 'count');
      return {
        name: formatLabel(nameKey ? item[nameKey] : `Item ${index + 1}`),
        value: item.count || item.value || 0,
      };
    });
  }, [data]);

  if (chartData.length === 0) {
    return <EmptyState />;
  }

  if (!recharts) {
    return <ChartLoading />;
  }

  const { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } = recharts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ left: isHorizontal ? 80 : 10, right: 20, top: 10, bottom: 10 }}
      >
        {isHorizontal ? (
          <>
            <XAxis type="number" stroke="#71717a" />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#71717a"
              width={70}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis stroke="#71717a" />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Line Chart Widget
function LineChartWidget({ data, config }: { data: any[]; config: any }) {
  const colors = config?.colors || CHART_COLORS.default;
  const recharts = useRecharts();

  const chartData = useMemo(() => {
    return data.map((item, index) => {
      const xField =
        config?.xAxisField || Object.keys(item).find((k) => k !== 'count' && k !== 'value');
      const yField = config?.yAxisField || 'count';
      return {
        name: xField ? item[xField] : `Point ${index + 1}`,
        value: item[yField] || item.count || item.value || 0,
      };
    });
  }, [data, config?.xAxisField, config?.yAxisField]);

  if (chartData.length === 0) {
    return <EmptyState />;
  }

  if (!recharts) {
    return <ChartLoading />;
  }

  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } = recharts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <YAxis stroke="#71717a" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={colors[0]}
          strokeWidth={2}
          dot={{ fill: colors[0], strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Table Widget
function TableWidget({ data, config }: { data: any[]; config: any }) {
  const columns =
    config?.columns ||
    (data.length > 0
      ? Object.keys(data[0]).map((k) => ({ field: k, header: formatLabel(k) }))
      : []);
  const pageSize = config?.pageSize || 10;
  const displayData = data.slice(0, pageSize);

  if (data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200">
            {columns.map((col: any) => (
              <th
                key={col.field}
                className="text-left py-2 px-3 font-medium text-surface-700"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, i) => (
            <tr
              key={i}
              className="border-b border-surface-200 hover:bg-white/50 dark:bg-surface-900/50 dark:hover:bg-surface-800/50"
            >
              {columns.map((col: any) => (
                <td key={col.field} className="py-2 px-3 text-surface-600">
                  {formatValue(row[col.field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > pageSize && (
        <div className="text-xs text-surface-500 mt-2 text-center">
          Showing {pageSize} of {data.length} rows
        </div>
      )}
    </div>
  );
}

// Progress Widget
function ProgressWidget({ data, config }: { data: any[]; config: any }) {
  const value = useMemo(() => {
    if (data.length === 0) return 0;
    if (data[0]?.count !== undefined) {
      return data.reduce((sum, item) => sum + (item.count || 0), 0);
    }
    return data.length;
  }, [data]);

  const target = config?.targetValue || 100;
  const percentage = Math.min(Math.round((value / target) * 100), 100);

  let color = '#6366f1';
  if (config?.thresholds) {
    for (const threshold of config.thresholds.sort((a: any, b: any) => b.value - a.value)) {
      if (percentage >= threshold.value) {
        color = threshold.color;
        break;
      }
    }
  }

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-surface-600 text-sm">
          {value} / {target}
        </span>
        <span className="text-surface-800 font-medium">{percentage}%</span>
      </div>
      <div className="w-full h-3 bg-white rounded-full overflow-hidden dark:bg-surface-900">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// List Widget
function ListWidget({ data, config: _config }: { data: any[]; config: any }) {
  const displayData = data.slice(0, 10);

  if (data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2 overflow-auto h-full">
      {displayData.map((item, i) => {
        const displayFields = Object.entries(item).slice(0, 2);
        return (
          <div
            key={i}
            className="flex items-center justify-between p-2 bg-white/50 rounded hover:bg-white dark:bg-surface-900/50 dark:hover:bg-surface-800"
          >
            <span className="text-surface-800 truncate">{formatValue(displayFields[0]?.[1])}</span>
            {displayFields[1] && (
              <span className="text-surface-600 text-sm">{formatValue(displayFields[1][1])}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Gauge Widget
function GaugeWidget({ data, config }: { data: any[]; config: any }) {
  const value = useMemo(() => {
    if (data.length === 0) return 0;
    if (data[0]?.count !== undefined) {
      const total = data.reduce((sum, item) => sum + (item.count || 0), 0);
      // Calculate percentage if we have status data
      const implemented = data.find((d) => d.status === 'implemented')?.count || 0;
      return total > 0 ? Math.round((implemented / total) * 100) : 0;
    }
    return data.length;
  }, [data]);

  const maxValue = config?.maxValue || 100;
  const percentage = Math.min((value / maxValue) * 100, 100);

  let color = '#6366f1';
  if (config?.thresholds) {
    for (const threshold of config.thresholds.sort((a: any, b: any) => b.value - a.value)) {
      if (value >= threshold.value) {
        color = threshold.color;
        break;
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-32 h-16 overflow-hidden">
        <div
          className="absolute inset-0 border-8 border-surface-200 rounded-t-full"
          style={{ borderBottomWidth: 0 }}
        />
        <div
          className="absolute inset-0 border-8 rounded-t-full transition-all duration-500"
          style={{
            borderColor: color,
            borderBottomWidth: 0,
            clipPath: `polygon(0 100%, ${percentage}% 100%, ${percentage}% 0, 0 0)`,
          }}
        />
      </div>
      <div className="text-2xl font-bold text-surface-900 mt-2">{value}%</div>
    </div>
  );
}

// Heatmap Widget (simplified - would need more complex implementation for full heatmap)
function HeatmapWidget({ data, config }: { data: any[]; config: any }) {
  if (data.length === 0) {
    return <EmptyState />;
  }

  // Group data by x and y axes
  const xField = config?.xAxisField || 'likelihood';
  const yField = config?.yAxisField || 'impact';

  // Create a 5x5 grid for risk heatmap
  const xLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  const yLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 grid grid-cols-5 gap-1">
        {yLabels.reverse().map((y, yi) =>
          xLabels.map((x, xi) => {
            const count = data.filter(
              (d) =>
                d[xField]?.toLowerCase() === x.toLowerCase() &&
                d[yField]?.toLowerCase() === y.toLowerCase()
            ).length;
            const intensity = Math.min(count / 5, 1);
            const baseColor =
              xi + (4 - yi) >= 6 ? '#ef4444' : xi + (4 - yi) >= 4 ? '#f59e0b' : '#22c55e';
            return (
              <div
                key={`${xi}-${yi}`}
                className="flex items-center justify-center text-xs rounded"
                style={{
                  backgroundColor: count > 0 ? baseColor : '#27272a',
                  opacity: count > 0 ? 0.3 + intensity * 0.7 : 0.3,
                }}
                title={`${x} / ${y}: ${count}`}
              >
                {count > 0 && count}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Markdown Widget
function MarkdownWidget({ config }: { config: any }) {
  const content = config?.markdownContent || '*No content*';

  return (
    <div className="prose prose-sm prose-invert max-w-none h-full overflow-auto">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

// URL validation function for iframe security
function isValidIframeUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.includes(parsed.protocol)) {
      return { valid: false, error: 'Protocol not allowed' };
    }

    // Allow HTTPS (and HTTP in dev for localhost)
    const allowedProtocols = ['https:'];
    if (
      import.meta.env.DEV &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      allowedProtocols.push('http:');
    }

    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// IFrame Widget
function IframeWidget({ config }: { config: any }) {
  const url = config?.iframeUrl;
  const validation = url ? isValidIframeUrl(url) : { valid: false, error: 'No URL configured' };

  if (!validation.valid) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-amber-500">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="text-sm">{validation.error}</p>
        {url && <p className="text-xs text-surface-600 mt-1 truncate max-w-full px-4">{url}</p>}
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full h-full border-0 rounded"
      sandbox="allow-scripts allow-same-origin"
      title="Embedded content"
    />
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-surface-500 text-sm">
      No data available
    </div>
  );
}

// Helper functions
function formatLabel(value: any): string {
  if (value === null || value === undefined) return 'Unknown';
  const str = String(value);
  return str
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
