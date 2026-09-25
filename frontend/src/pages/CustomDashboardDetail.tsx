import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Plus, Settings, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  config?: { markdownContent?: string };
  dataSource?: { source?: string };
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isTemplate?: boolean;
  widgets: Widget[];
}

const WIDGET_TYPES = [
  { value: 'kpi_card', label: 'KPI Card' },
  { value: 'table', label: 'Table' },
  { value: 'list', label: 'List' },
  { value: 'bar_chart', label: 'Bar Data' },
  { value: 'line_chart', label: 'Trend Data' },
  { value: 'markdown', label: 'Markdown Note' },
];

const DATA_SOURCES = [
  { value: 'controls', label: 'Controls' },
  { value: 'risks', label: 'Risks' },
  { value: 'policies', label: 'Policies' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'employees', label: 'Employees' },
  { value: 'audits', label: 'Audits' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'frameworks', label: 'Frameworks' },
];

function WidgetView({
  dashboardId,
  widget,
  onDelete,
}: {
  dashboardId: string;
  widget: Widget;
  onDelete?: () => void;
}) {
  const data = useQuery<unknown[]>({
    queryKey: ['dashboard-widget-data', dashboardId, widget.id],
    queryFn: async () => {
      const response = await api.get(`/api/dashboards/${dashboardId}/widgets/${widget.id}/data`);
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
    enabled: widget.widgetType !== 'markdown' && Boolean(widget.dataSource?.source),
  });

  const rows = data.data ?? [];
  const firstRows = rows.slice(0, 8) as Array<Record<string, unknown>>;
  const columns = firstRows.length ? Object.keys(firstRows[0]).slice(0, 5) : [];
  const groupingField = ['status', 'category', 'type', 'tier', 'source', 'auditType'].find((field) =>
    firstRows.some((row) => row[field] !== undefined && row[field] !== null)
  );
  const barData = groupingField
    ? Array.from(
        rows.reduce<Map<string, number>>((counts, raw) => {
          const row = raw as Record<string, unknown>;
          const label = String(row[groupingField] ?? 'Unspecified');
          counts.set(label, (counts.get(label) ?? 0) + 1);
          return counts;
        }, new Map())
      ).sort((left, right) => right[1] - left[1])
    : [];
  const dateField = [
    'createdAt',
    'updatedAt',
    'collectedAt',
    'startDate',
    'lastAssessmentDate',
  ].find((field) => firstRows.some((row) => row[field]));
  const trendData = dateField
    ? Array.from(
        rows.reduce<Map<string, number>>((counts, raw) => {
          const row = raw as Record<string, unknown>;
          const date = new Date(String(row[dateField]));
          if (!Number.isNaN(date.getTime())) {
            const bucket = date.toISOString().slice(0, 10);
            counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
          }
          return counts;
        }, new Map())
      ).sort(([left], [right]) => left.localeCompare(right))
    : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{widget.title}</CardTitle>
          <Badge variant="neutral" size="sm" className="mt-1">
            {widget.widgetType.replace(/_/g, ' ')}
          </Badge>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${widget.title}`}
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={onDelete}
          >
            Remove
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {widget.widgetType === 'markdown' ? (
          <p className="whitespace-pre-wrap text-sm text-surface-700">
            {widget.config?.markdownContent || 'No note content configured.'}
          </p>
        ) : data.isLoading ? (
          <Skeleton className="h-24" />
        ) : data.isError ? (
          <p className="text-sm text-red-700">The live data query failed.</p>
        ) : widget.widgetType === 'kpi_card' ? (
          <div>
            <p className="text-4xl font-semibold text-surface-900">{rows.length}</p>
            <p className="text-sm text-surface-500">matching records</p>
          </div>
        ) : widget.widgetType === 'bar_chart' && barData.length ? (
          <div className="space-y-2">
            {barData.slice(0, 10).map(([label, count]) => {
              const max = Math.max(...barData.map((entry) => entry[1]));
              return (
                <div key={label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-xs">
                  <span className="truncate capitalize text-surface-600">
                    {label.replace(/_/g, ' ')}
                  </span>
                  <div className="h-4 overflow-hidden rounded bg-surface-100">
                    <div
                      className="h-full rounded bg-brand-600"
                      style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-surface-700">{count}</span>
                </div>
              );
            })}
          </div>
        ) : widget.widgetType === 'line_chart' && trendData.length ? (
          <div className="space-y-2">
            <svg viewBox="0 0 360 120" className="h-36 w-full" role="img" aria-label={widget.title}>
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-brand-600"
                points={trendData
                  .map(([, count], index) => {
                    const max = Math.max(...trendData.map((entry) => entry[1]), 1);
                    const x =
                      trendData.length === 1 ? 180 : (index / (trendData.length - 1)) * 340 + 10;
                    const y = 110 - (count / max) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              {trendData.map(([date, count], index) => {
                const max = Math.max(...trendData.map((entry) => entry[1]), 1);
                const x = trendData.length === 1 ? 180 : (index / (trendData.length - 1)) * 340 + 10;
                const y = 110 - (count / max) * 100;
                return <circle key={date} cx={x} cy={y} r="4" className="fill-brand-600" />;
              })}
            </svg>
            <div className="flex justify-between text-xs text-surface-500">
              <span>{trendData[0][0]}</span>
              <span>{trendData[trendData.length - 1][0]}</span>
            </div>
          </div>
        ) : firstRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-200">
                  {columns.map((column) => (
                    <th key={column} className="px-2 py-2 font-medium text-surface-600">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {firstRows.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="border-b border-surface-100">
                    {columns.map((column) => (
                      <td key={column} className="max-w-48 truncate px-2 py-2 text-surface-700">
                        {typeof row[column] === 'object'
                          ? JSON.stringify(row[column])
                          : String(row[column] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > firstRows.length && (
              <p className="mt-2 text-xs text-surface-500">
                Showing {firstRows.length} of {rows.length} records
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-surface-500">No records match this widget query.</p>
        )}
      </CardBody>
    </Card>
  );
}

export default function CustomDashboardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [widget, setWidget] = useState({
    title: '',
    widgetType: 'kpi_card',
    source: 'controls',
    markdownContent: '',
  });
  const [details, setDetails] = useState({ name: '', description: '' });
  const queryKey = ['dashboard', id];

  const dashboard = useQuery<Dashboard>({
    queryKey,
    queryFn: async () => (await api.get(`/api/dashboards/${id}`)).data,
    enabled: Boolean(id),
  });

  const addWidget = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/api/dashboards/${id}/widgets`, {
          title: widget.title,
          widgetType: widget.widgetType,
          config:
            widget.widgetType === 'markdown'
              ? { markdownContent: widget.markdownContent }
              : undefined,
          dataSource:
            widget.widgetType === 'markdown' ? undefined : { source: widget.source, limit: 100 },
        })
      ).data,
    onSuccess: () => {
      toast.success('Widget added');
      setAddOpen(false);
      setWidget({
        title: '',
        widgetType: 'kpi_card',
        source: 'controls',
        markdownContent: '',
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to add widget'),
  });

  const removeWidget = useMutation({
    mutationFn: async (widgetId: string) =>
      api.delete(`/api/dashboards/${id}/widgets/${widgetId}`),
    onSuccess: () => {
      toast.success('Widget removed');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateDashboard = useMutation({
    mutationFn: async () => (await api.put(`/api/dashboards/${id}`, details)).data,
    onSuccess: () => {
      toast.success('Dashboard updated');
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to update dashboard'),
  });

  const duplicateDashboard = useMutation({
    mutationFn: async () => (await api.post(`/api/dashboards/${id}/duplicate`)).data,
    onSuccess: (copy) => {
      toast.success('Template duplicated into your dashboards');
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      navigate(`/dashboards/${copy.id}`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to duplicate template'),
  });

  if (dashboard.isLoading) return <Skeleton className="h-96" />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description="This dashboard does not exist or is not accessible."
        action={
          <Link to="/dashboards">
            <Button>Back to Dashboards</Button>
          </Link>
        }
      />
    );
  }

  const data = dashboard.data;
  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/dashboards"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboards
      </Link>
      <PageHeader
        title={data.name}
        description={data.description || 'Live custom platform metrics.'}
        meta={
          data.isDefault ? (
            <Badge variant="brand">Default dashboard</Badge>
          ) : data.isTemplate ? (
            <Badge variant="info">Template</Badge>
          ) : undefined
        }
        actions={
          <div className="flex gap-2">
            {data.isTemplate ? (
              <Button
                size="sm"
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={() => duplicateDashboard.mutate()}
                loading={duplicateDashboard.isPending}
              >
                Duplicate to Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Settings className="h-4 w-4" />}
                  onClick={() => {
                    setDetails({ name: data.name, description: data.description || '' });
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setAddOpen(true)}
                >
                  Add Widget
                </Button>
              </>
            )}
          </div>
        }
      />

      {data.widgets.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.widgets.map((item) => (
            <WidgetView
              key={item.id}
              dashboardId={data.id}
              widget={item}
              onDelete={
                data.isTemplate
                  ? undefined
                  : () => {
                      if (window.confirm(`Remove "${item.title}" from this dashboard?`)) {
                        removeWidget.mutate(item.id);
                      }
                    }
              }
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody>
            <EmptyState
              title="No widgets configured"
              description={
                data.isTemplate
                  ? 'Duplicate this template to configure widgets.'
                  : 'Add a widget backed by a live platform data source.'
              }
              action={
                data.isTemplate ? (
                  <Button onClick={() => duplicateDashboard.mutate()}>Duplicate Template</Button>
                ) : (
                  <Button onClick={() => setAddOpen(true)}>Add Widget</Button>
                )
              }
            />
          </CardBody>
        </Card>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Widget"
        description="Choose a persisted widget and live platform data source."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addWidget.mutate()}
              loading={addWidget.isPending}
              disabled={!widget.title.trim()}
            >
              Add Widget
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={widget.title}
            onChange={(event) =>
              setWidget((current) => ({ ...current, title: event.target.value }))
            }
          />
          <Select
            label="Widget Type"
            value={widget.widgetType}
            options={WIDGET_TYPES}
            onChange={(value) => setWidget((current) => ({ ...current, widgetType: value }))}
          />
          {widget.widgetType === 'markdown' ? (
            <Textarea
              label="Note"
              value={widget.markdownContent}
              onChange={(event) =>
                setWidget((current) => ({ ...current, markdownContent: event.target.value }))
              }
              rows={6}
            />
          ) : (
            <Select
              label="Data Source"
              value={widget.source}
              options={DATA_SOURCES}
              onChange={(value) => setWidget((current) => ({ ...current, source: value }))}
            />
          )}
        </div>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Dashboard"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateDashboard.mutate()}
              loading={updateDashboard.isPending}
              disabled={!details.name.trim()}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="dashboard-detail-name">Name</Label>
            <Input
              id="dashboard-detail-name"
              value={details.name}
              onChange={(event) =>
                setDetails((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <Textarea
            label="Description"
            value={details.description}
            onChange={(event) =>
              setDetails((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
          />
        </div>
      </Dialog>
    </div>
  );
}
