import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  Calendar,
  Link as LinkIcon,
  Edit2,
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
} from '@/components/ui';

interface TeamMember {
  id: string;
  role?: string;
  userId?: string;
  userName?: string;
  user_name?: string;
  userEmail?: string;
  user_email?: string;
  externalName?: string;
  external_name?: string;
  externalEmail?: string;
  external_email?: string;
  externalPhone?: string;
  external_phone?: string;
  responsibilities?: string;
  isPrimary?: boolean;
  is_primary?: boolean;
}

interface RotationSlot {
  id: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  memberName?: string;
  member_name?: string;
  role?: string;
}

interface PlanLink {
  id: string;
  planId?: string;
  plan_id?: string;
  planTitle?: string;
  plan_title?: string;
  planType?: string;
  plan_type?: string;
  roleInPlan?: string;
  role_in_plan?: string;
}

interface RecoveryTeamDetailData {
  id: string;
  name: string;
  description?: string;
  teamType?: string;
  team_type?: string;
  function?: string;
  isActive?: boolean;
  is_active?: boolean;
  activationCriteria?: string;
  activation_criteria?: string;
  assemblyLocation?: string;
  assembly_location?: string;
  communicationChannel?: string;
  communication_channel?: string;
  members?: TeamMember[];
  rotation?: RotationSlot[];
  planLinks?: PlanLink[];
  plan_links?: PlanLink[];
}

function pick<T>(...vals: (T | undefined)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

function formatDate(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}

export default function RecoveryTeamDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: team, isLoading } = useQuery<RecoveryTeamDetailData>({
    queryKey: ['recovery-team', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/recovery-teams/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/bcdr/recovery-teams"
          className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teams
        </Link>
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Team not found"
              description="The team may have been deleted or you may not have access."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const teamFn = pick(team.function, team.teamType, team.team_type);
  const isActive = pick(team.isActive, team.is_active);
  const members = team.members ?? [];
  const rotation = team.rotation ?? [];
  const planLinks = team.planLinks ?? team.plan_links ?? [];

  const membersTab = (
    <Card>
      <CardBody density="comfy">
        {members.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Users className="h-6 w-6" />}
            title="No members yet"
            description="Add members to this team to coordinate response."
          />
        ) : (
          <ul className="divide-y divide-surface-200">
            {members.map((m) => {
              const name = pick(m.userName, m.user_name, m.externalName, m.external_name) ?? 'Unknown';
              const email = pick(m.userEmail, m.user_email, m.externalEmail, m.external_email);
              const phone = pick(m.externalPhone, m.external_phone);
              const isPrimary = pick(m.isPrimary, m.is_primary);
              return (
                <li key={m.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body text-surface-900">{name}</span>
                      {m.role && (
                        <Badge variant="brand" size="sm">
                          {m.role.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {isPrimary === false && (
                        <Badge variant="info" size="sm">
                          Alternate
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-surface-500">
                      {email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {email}
                        </span>
                      )}
                      {phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {phone}
                        </span>
                      )}
                    </div>
                    {m.responsibilities && (
                      <p className="text-small text-surface-700 mt-1">{m.responsibilities}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  const rotationTab = (
    <Card>
      <CardBody density="comfy">
        {rotation.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Calendar className="h-6 w-6" />}
            title="No rotation configured"
            description="Define an on-call rotation so the right person is paged."
          />
        ) : (
          <ul className="divide-y divide-surface-200">
            {rotation.map((slot) => (
              <li key={slot.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body text-surface-900">
                    {pick(slot.memberName, slot.member_name) ?? 'Unassigned'}
                  </p>
                  {slot.role && (
                    <p className="text-xs text-surface-500 capitalize">{slot.role.replace(/_/g, ' ')}</p>
                  )}
                </div>
                <div className="text-xs text-surface-500 text-right shrink-0">
                  <p>{formatDate(pick(slot.startDate, slot.start_date))}</p>
                  <p>→ {formatDate(pick(slot.endDate, slot.end_date))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  const plansTab = (
    <Card>
      <CardBody density="comfy">
        {planLinks.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<LinkIcon className="h-6 w-6" />}
            title="No linked plans"
            description="Link this team to BC/DR plans so it gets paged on activation."
          />
        ) : (
          <ul className="divide-y divide-surface-200">
            {planLinks.map((p) => (
              <li key={p.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body text-surface-900">{pick(p.planTitle, p.plan_title) ?? 'Untitled plan'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-surface-500">
                    {pick(p.planType, p.plan_type) && (
                      <span className="capitalize">
                        {(pick(p.planType, p.plan_type) ?? '').replace(/_/g, ' ')}
                      </span>
                    )}
                    {pick(p.roleInPlan, p.role_in_plan) && (
                      <span>• {pick(p.roleInPlan, p.role_in_plan)}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/bcdr/recovery-teams"
        className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Teams
      </Link>

      <PageHeader
        title={team.name}
        description={team.description}
        meta={
          <>
            {teamFn && (
              <Badge variant="info" size="sm">
                {teamFn.replace(/_/g, ' ')}
              </Badge>
            )}
            {isActive !== undefined && (
              <Badge variant={isActive ? 'success' : 'neutral'} size="sm" dot>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            )}
          </>
        }
        actions={
          <Button variant="outline" size="sm" leftIcon={<Edit2 className="h-4 w-4" />}>
            Edit
          </Button>
        }
      />

      <Tabs
        tabs={[
          { label: `Members (${members.length})`, content: membersTab },
          { label: 'Rotation', content: rotationTab },
          { label: `Linked Plans (${planLinks.length})`, content: plansTab },
        ]}
      />
    </div>
  );
}
