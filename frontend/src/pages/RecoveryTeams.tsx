import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, UserCheck, Shield } from 'lucide-react';
import api from '@/lib/api';
import {
  Button,
  Badge,
  Card,
  CardBody,
  PageHeader,
  FilterBar,
  Select,
  Input,
  EmptyState,
  StatCard,
  Skeleton,
  type ActiveFilter,
} from '@/components/ui';

interface RecoveryTeam {
  id: string;
  name: string;
  description?: string;
  teamType?: string;
  team_type?: string;
  function?: string;
  isActive?: boolean;
  is_active?: boolean;
  memberCount?: number;
  member_count?: number;
  leadName?: string;
  lead_name?: string;
  leadId?: string;
  onCall?: boolean;
  on_call?: boolean;
}

interface TeamStats {
  total?: number;
  total_members?: number;
  on_call_count?: number;
  active_count?: number;
}

const TEAM_TYPE_OPTIONS = [
  { value: 'crisis_management', label: 'Crisis Management' },
  { value: 'it_recovery', label: 'IT Recovery' },
  { value: 'business_recovery', label: 'Business Recovery' },
  { value: 'communications', label: 'Communications' },
  { value: 'executive', label: 'Executive' },
];

function pick<T>(...vals: (T | undefined)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

export default function RecoveryTeams() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('search') ?? '',
    teamType: searchParams.get('teamType') ?? '',
  };

  const [searchInput, setSearchInput] = useState(filters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (debouncedSearch) params.set('search', debouncedSearch);
        else params.delete('search');
        return params;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const { data: teams = [], isLoading } = useQuery<RecoveryTeam[]>({
    queryKey: ['recovery-teams', debouncedSearch, filters.teamType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.teamType) params.append('teamType', filters.teamType);
      const qs = params.toString();
      const res = await api.get(`/api/bcdr/recovery-teams${qs ? `?${qs}` : ''}`);
      const body = res.data;
      if (Array.isArray(body)) return body;
      return body?.data ?? [];
    },
  });

  const { data: stats } = useQuery<TeamStats>({
    queryKey: ['recovery-teams-stats'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/recovery-teams/stats');
      return res.data ?? {};
    },
  });

  const activeFilters: ActiveFilter[] = [];
  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${filters.search}`,
      onClear: () => {
        setSearchInput('');
        updateFilter('search', '');
      },
    });
  }
  if (filters.teamType) {
    const l = TEAM_TYPE_OPTIONS.find((o) => o.value === filters.teamType)?.label ?? filters.teamType;
    activeFilters.push({
      key: 'teamType',
      label: `Type: ${l}`,
      onClear: () => updateFilter('teamType', ''),
    });
  }

  const totalTeams = stats?.total ?? teams.length;
  const totalMembers =
    stats?.total_members ??
    teams.reduce((acc, t) => acc + (pick(t.memberCount, t.member_count) ?? 0), 0);
  const onCallCount =
    stats?.on_call_count ??
    teams.filter((t) => pick(t.onCall, t.on_call) === true).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Recovery Teams"
        description="Define and manage teams responsible for BC/DR incident response."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Create Team
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Teams"
          value={totalTeams}
          icon={<Shield className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Total Members"
          value={totalMembers}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="On-Call Now"
          value={onCallCount}
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search teams…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-52"
          placeholder="All Team Types"
          value={filters.teamType}
          onChange={(v) => updateFilter('teamType', v)}
          options={TEAM_TYPE_OPTIONS}
          clearable
        />
      </FilterBar>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No recovery teams found"
              description={
                activeFilters.length
                  ? 'Try clearing your filters to see all teams.'
                  : 'Create your first recovery team to coordinate BC/DR response.'
              }
              action={
                activeFilters.length ? (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    Create Team
                  </Button>
                )
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            const teamFn = pick(team.function, team.teamType, team.team_type);
            const memberCount = pick(team.memberCount, team.member_count) ?? 0;
            const lead = pick(team.leadName, team.lead_name);
            const isActive = pick(team.isActive, team.is_active);
            return (
              <Card
                key={team.id}
                interactive
                onClick={() => navigate(`/bcdr/recovery-teams/${team.id}`)}
              >
                <CardBody density="comfy" className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-h3 text-surface-900 truncate">{team.name}</h3>
                      {teamFn && (
                        <p className="text-xs text-surface-500 capitalize mt-0.5">
                          {teamFn.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                    {isActive !== undefined && (
                      <Badge variant={isActive ? 'success' : 'neutral'} size="sm" dot>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>

                  {team.description && (
                    <p className="text-small text-surface-700 line-clamp-2">{team.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-surface-200">
                    <div className="flex items-center gap-2 text-small text-surface-700">
                      <Users className="h-4 w-4 text-surface-500" />
                      <span>
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    {lead && (
                      <span className="text-small text-surface-700 truncate max-w-[10rem]">
                        Lead: <span className="text-surface-900">{lead}</span>
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
