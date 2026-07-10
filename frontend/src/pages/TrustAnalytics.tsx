import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Users, FileSignature, Download, ArrowDownUp } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
} from '@/components/ui';

interface TopDocument {
  id: string;
  title: string;
  views: number;
}

interface RecentVisitor {
  id: string;
  org: string;
  contact: string;
  accessedAt: string;
  signedNda: boolean;
}

interface DailyPageview {
  date: string;
  count: number;
}

interface TrustAnalytics {
  pageviews: number;
  uniqueVisitors: number;
  ndaSigns: number;
  documentDownloads: number;
  topDocuments: TopDocument[];
  recentVisitors: RecentVisitor[];
  pageviewsByDay: DailyPageview[];
}

const EMPTY: TrustAnalytics = {
  pageviews: 0,
  uniqueVisitors: 0,
  ndaSigns: 0,
  documentDownloads: 0,
  topDocuments: [],
  recentVisitors: [],
  pageviewsByDay: [],
};

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TrustAnalytics() {
  const [range, setRange] = useState('30d');
  const [docSort, setDocSort] = useState<'desc' | 'asc'>('desc');

  const { data, isLoading } = useQuery<TrustAnalytics>({
    queryKey: ['trust-center-analytics', range],
    queryFn: async () => {
      const res = await api.get('/api/trust-center/analytics', { params: { range } });
      const payload = res.data?.data ?? res.data;
      return {
        pageviews: payload?.pageviews ?? 0,
        uniqueVisitors: payload?.uniqueVisitors ?? 0,
        ndaSigns: payload?.ndaSigns ?? 0,
        documentDownloads: payload?.documentDownloads ?? 0,
        topDocuments: Array.isArray(payload?.topDocuments) ? payload.topDocuments : [],
        recentVisitors: Array.isArray(payload?.recentVisitors) ? payload.recentVisitors : [],
        pageviewsByDay: Array.isArray(payload?.pageviewsByDay) ? payload.pageviewsByDay : [],
      };
    },
  });

  const analytics = data ?? EMPTY;

  const sortedDocs = useMemo(() => {
    const arr = [...analytics.topDocuments];
    arr.sort((a, b) => (docSort === 'desc' ? b.views - a.views : a.views - b.views));
    return arr;
  }, [analytics.topDocuments, docSort]);

  const maxPageviews = useMemo(
    () => Math.max(1, ...analytics.pageviewsByDay.map((d) => d.count)),
    [analytics.pageviewsByDay],
  );

  const visitorColumns: ColumnDef<RecentVisitor>[] = useMemo(
    () => [
      {
        id: 'org',
        accessorKey: 'org',
        header: 'Organization',
        cell: ({ row }) => (
          <span className="font-medium text-surface-900">{row.original.org}</span>
        ),
      },
      {
        id: 'contact',
        accessorKey: 'contact',
        header: 'Contact',
        cell: ({ row }) => <span className="text-surface-700">{row.original.contact}</span>,
      },
      {
        id: 'accessedAt',
        accessorKey: 'accessedAt',
        header: 'Accessed',
        cell: ({ row }) => (
          <span className="text-surface-700 text-small">
            {formatDateTime(row.original.accessedAt)}
          </span>
        ),
      },
      {
        id: 'signedNda',
        accessorKey: 'signedNda',
        header: 'NDA',
        cell: ({ row }) =>
          row.original.signedNda ? (
            <Badge variant="success" dot>
              Signed
            </Badge>
          ) : (
            <Badge variant="neutral">Not signed</Badge>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Trust Center Analytics"
        description="Pageviews, visitor activity, and document engagement."
        actions={
          <div className="w-48">
            <Select value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pageviews"
          value={analytics.pageviews.toLocaleString()}
          tone="brand"
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Unique visitors"
          value={analytics.uniqueVisitors.toLocaleString()}
          tone="blue"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="NDA signs"
          value={analytics.ndaSigns.toLocaleString()}
          tone="emerald"
          icon={<FileSignature className="h-5 w-5" />}
        />
        <StatCard
          label="Document downloads"
          value={analytics.documentDownloads.toLocaleString()}
          tone="purple"
          icon={<Download className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Top documents</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowDownUp className="h-4 w-4" />}
              onClick={() => setDocSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
            >
              {docSort === 'desc' ? 'Most views' : 'Fewest views'}
            </Button>
          </CardHeader>
          <CardBody density="compact">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : sortedDocs.length === 0 ? (
              <p className="text-small text-surface-600 px-2 py-4 text-center">
                No document activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-surface-200/60">
                {sortedDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 px-2 py-2.5"
                  >
                    <span className="text-body text-surface-900 truncate">{doc.title}</span>
                    <span className="text-small font-medium text-surface-700 tabular-nums shrink-0">
                      {doc.views.toLocaleString()} views
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent visitors</CardTitle>
          </CardHeader>
          <CardBody density="compact" className="p-0">
            <DataTable
              data={analytics.recentVisitors}
              columns={visitorColumns}
              loading={isLoading}
              density="compact"
              getRowId={(row) => row.id}
              className="border-0 rounded-none"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pageviews over time</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : analytics.pageviewsByDay.length === 0 ? (
            <p className="text-small text-surface-600 text-center py-8">
              No pageview history in this range.
            </p>
          ) : (
            <div className="flex items-end gap-1.5 h-48">
              {analytics.pageviewsByDay.map((d) => {
                const heightPct = (d.count / maxPageviews) * 100;
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1.5 group"
                  >
                    <span className="text-[10px] font-medium text-surface-700 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.count.toLocaleString()}
                    </span>
                    <div
                      className="w-full rounded-t-sm bg-brand-500/70 group-hover:bg-brand-600 transition-colors"
                      style={{ height: `${Math.max(2, heightPct)}%` }}
                      title={`${formatDate(d.date)}: ${d.count.toLocaleString()}`}
                    />
                    <span className="text-[10px] text-surface-500 truncate w-full text-center">
                      {formatDate(d.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
