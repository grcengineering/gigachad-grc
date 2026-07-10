import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  MessageSquare,
  Server,
  ClipboardList,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
  Tabs,
  EmptyState,
  Skeleton,
  type BadgeVariant,
} from '@/components/ui';

interface TimelineEntry {
  id: string;
  timestamp?: string;
  entryType?: string;
  entry_type?: string;
  description: string;
  createdByName?: string;
  created_by_name?: string;
}

interface AffectedAsset {
  id: string;
  name?: string;
  assetName?: string;
  asset_name?: string;
  type?: string;
  impact?: string;
}

interface Communication {
  id: string;
  channel?: string;
  audience?: string;
  message?: string;
  sentAt?: string;
  sent_at?: string;
}

interface BCDRIncidentDetailData {
  id: string;
  incidentId?: string;
  incident_id?: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  declaredAt?: string;
  declared_at?: string;
  declaredByName?: string;
  declared_by_name?: string;
  commanderName?: string;
  commander_name?: string;
  resolvedAt?: string;
  resolved_at?: string;
  rootCause?: string;
  root_cause?: string;
  lessonsLearned?: string;
  lessons_learned?: string;
  improvementActions?: { description: string }[];
  timeline?: TimelineEntry[];
  affectedAssets?: AffectedAsset[];
  affected_assets?: AffectedAsset[];
  communications?: Communication[];
}

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'danger',
  major: 'danger',
  medium: 'warning',
  moderate: 'warning',
  low: 'info',
  minor: 'info',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'danger',
  declared: 'danger',
  in_progress: 'warning',
  recovering: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

function pick<T>(...values: (T | undefined)[]) {
  for (const v of values) if (v !== undefined && v !== null) return v;
  return undefined;
}

function formatDateTime(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function BCDRIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: incident, isLoading } = useQuery<BCDRIncidentDetailData>({
    queryKey: ['bcdr-incident', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/incidents/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link to="/bcdr/incidents" className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800">
          <ArrowLeft className="h-4 w-4" />
          Back to Incidents
        </Link>
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title="Incident not found"
              description="The incident may have been deleted or you may not have access."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const incidentCode = pick(incident.incidentId, incident.incident_id) ?? '';
  const declaredAt = pick(incident.declaredAt, incident.declared_at);
  const declaredBy = pick(incident.declaredByName, incident.declared_by_name);
  const commander = pick(incident.commanderName, incident.commander_name);
  const resolvedAt = pick(incident.resolvedAt, incident.resolved_at);
  const rootCause = pick(incident.rootCause, incident.root_cause);
  const lessonsLearned = pick(incident.lessonsLearned, incident.lessons_learned);
  const timeline = incident.timeline ?? [];
  const affected = incident.affectedAssets ?? incident.affected_assets ?? [];
  const communications = incident.communications ?? [];

  const isResolved = incident.status === 'resolved' || incident.status === 'closed';

  const overviewTab = (
    <div className="space-y-4">
      {incident.description ? (
        <Card>
          <CardBody density="comfy">
            <h3 className="text-h3 text-surface-900 mb-2">Description</h3>
            <p className="text-body text-surface-800 whitespace-pre-wrap">{incident.description}</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody density="comfy">
            <EmptyState
              size="sm"
              icon={<FileText className="h-6 w-6" />}
              title="No description provided"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );

  const timelineTab = (
    <Card>
      <CardBody density="comfy">
        {timeline.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Clock className="h-6 w-6" />}
            title="No timeline entries"
            description="Activity on this incident will appear here."
          />
        ) : (
          <ol className="relative border-l border-surface-200 pl-6 space-y-5">
            {timeline.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[29px] top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/10 text-brand-700">
                  <span className="h-2 w-2 rounded-full bg-brand-500" />
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-surface-500">{formatDateTime(entry.timestamp)}</span>
                  {pick(entry.createdByName, entry.created_by_name) && (
                    <span className="text-xs text-surface-500">
                      • {pick(entry.createdByName, entry.created_by_name)}
                    </span>
                  )}
                  {pick(entry.entryType, entry.entry_type) && (
                    <Badge variant="neutral" size="sm">
                      {(pick(entry.entryType, entry.entry_type) ?? '').replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-body text-surface-800 mt-1">{entry.description}</p>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );

  const commsTab = (
    <Card>
      <CardBody density="comfy">
        {communications.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<MessageSquare className="h-6 w-6" />}
            title="No communications logged"
            description="Stakeholder updates sent during the incident will appear here."
          />
        ) : (
          <ul className="space-y-3">
            {communications.map((c) => (
              <li key={c.id} className="rounded-md border border-surface-200 bg-white p-3">
                <div className="flex items-center gap-2 flex-wrap text-xs text-surface-500">
                  {c.channel && <Badge variant="info" size="sm">{c.channel}</Badge>}
                  {c.audience && <Badge variant="neutral" size="sm">{c.audience}</Badge>}
                  <span>{formatDateTime(pick(c.sentAt, c.sent_at))}</span>
                </div>
                {c.message && <p className="text-body text-surface-800 mt-2 whitespace-pre-wrap">{c.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  const assetsTab = (
    <Card>
      <CardBody density="comfy">
        {affected.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Server className="h-6 w-6" />}
            title="No affected assets"
            description="Assets impacted by this incident will appear here."
          />
        ) : (
          <ul className="divide-y divide-surface-200">
            {affected.map((a) => (
              <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body text-surface-900">
                    {pick(a.name, a.assetName, a.asset_name) ?? 'Unnamed asset'}
                  </p>
                  {a.type && <p className="text-xs text-surface-500 capitalize">{a.type.replace(/_/g, ' ')}</p>}
                </div>
                {a.impact && (
                  <Badge variant="warning" size="sm">
                    {a.impact.replace(/_/g, ' ')}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  const postMortemTab = (
    <Card>
      <CardBody density="comfy">
        {!rootCause && !lessonsLearned && (!incident.improvementActions || incident.improvementActions.length === 0) ? (
          <EmptyState
            size="sm"
            icon={<ClipboardList className="h-6 w-6" />}
            title="No post-mortem yet"
            description="Once the incident is resolved, root cause analysis and lessons learned appear here."
          />
        ) : (
          <div className="space-y-4">
            {rootCause && (
              <div>
                <h3 className="text-h3 text-surface-900 mb-1">Root Cause</h3>
                <p className="text-body text-surface-800 whitespace-pre-wrap">{rootCause}</p>
              </div>
            )}
            {lessonsLearned && (
              <div>
                <h3 className="text-h3 text-surface-900 mb-1">Lessons Learned</h3>
                <p className="text-body text-surface-800 whitespace-pre-wrap">{lessonsLearned}</p>
              </div>
            )}
            {incident.improvementActions && incident.improvementActions.length > 0 && (
              <div>
                <h3 className="text-h3 text-surface-900 mb-1">Improvement Actions</h3>
                <ul className="list-disc list-inside space-y-1 text-body text-surface-800">
                  {incident.improvementActions.map((a, i) => (
                    <li key={i}>{a.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/bcdr/incidents"
        className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Incidents
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-brand-700 text-h2">{incidentCode}</span>
            <span>{incident.title}</span>
          </span>
        }
        meta={
          <>
            {incident.severity && (
              <Badge variant={SEVERITY_VARIANT[incident.severity] ?? 'neutral'} dot>
                {incident.severity.replace(/_/g, ' ')}
              </Badge>
            )}
            {incident.status && (
              <Badge variant={STATUS_VARIANT[incident.status] ?? 'neutral'} dot>
                {incident.status.replace(/_/g, ' ')}
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" leftIcon={<Edit2 className="h-4 w-4" />}>
              Edit
            </Button>
            {!isResolved && (
              <Button size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => navigate(`/bcdr/incidents/${id}`)}>
                Resolve
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardBody density="cozy">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-small">
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Declared By</dt>
              <dd className="text-surface-900 mt-1">{declaredBy ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Commander</dt>
              <dd className="text-surface-900 mt-1">{commander ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Declared At</dt>
              <dd className="text-surface-900 mt-1">{formatDateTime(declaredAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-surface-500">Resolved At</dt>
              <dd className="text-surface-900 mt-1">{formatDateTime(resolvedAt)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Timeline', content: timelineTab },
          { label: 'Communications', content: commsTab },
          { label: 'Affected Assets', content: assetsTab },
          { label: 'Post-Mortem', content: postMortemTab },
        ]}
      />
    </div>
  );
}
