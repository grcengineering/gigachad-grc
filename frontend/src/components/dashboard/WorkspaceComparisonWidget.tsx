import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BuildingOfficeIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface WorkspaceStats {
  id: string;
  name: string;
  slug: string;
  complianceScore: number;
  stats: {
    controls: number;
    evidence: number;
    risks: number;
    vendors: number;
    assets: number;
  };
}

interface OrgDashboardData {
  workspaces: WorkspaceStats[];
  totals: {
    controls: number;
    evidence: number;
    risks: number;
    vendors: number;
    assets: number;
  };
  avgComplianceScore: number;
}

export function WorkspaceComparisonWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMultiWorkspaceEnabled, setCurrentWorkspace } = useWorkspace();

  // Only fetch if multi-workspace is enabled and user is admin
  const { data, isLoading } = useQuery<OrgDashboardData>({
    queryKey: ['org-dashboard'],
    queryFn: () => api.get('/api/workspaces/org/dashboard').then((r) => r.data),
    enabled: isMultiWorkspaceEnabled && user?.role === 'admin',
  });

  // Don't render if multi-workspace is not enabled or user is not admin
  if (!isMultiWorkspaceEnabled || user?.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-surface-200 p-4 dark:bg-surface-900">
        <div className="animate-pulse">
          <div className="h-5 bg-surface-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-surface-200 rounded"></div>
            <div className="h-12 bg-surface-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.workspaces || data.workspaces.length === 0) {
    return null;
  }

  // Sort workspaces by compliance score (descending)
  const sortedWorkspaces = [...data.workspaces].sort(
    (a, b) => b.complianceScore - a.complianceScore
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg border border-surface-200 overflow-hidden dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200">
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-foreground">Workspace Comparison</h3>
        </div>
        <button
          onClick={() => navigate('/settings/workspaces')}
          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          View All
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Org-wide Stats */}
      <div className="grid grid-cols-3 gap-px bg-surface-200">
        <div className="bg-white p-3 text-center dark:bg-surface-900">
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className={`text-lg font-bold ${getScoreColor(data.avgComplianceScore)}`}>
            {data.avgComplianceScore}%
          </p>
        </div>
        <div className="bg-white p-3 text-center dark:bg-surface-900">
          <p className="text-xs text-muted-foreground">Total Controls</p>
          <p className="text-lg font-bold text-foreground">{data.totals.controls}</p>
        </div>
        <div className="bg-white p-3 text-center dark:bg-surface-900">
          <p className="text-xs text-muted-foreground">Total Risks</p>
          <p className="text-lg font-bold text-foreground">{data.totals.risks}</p>
        </div>
      </div>

      {/* Workspace List */}
      <div className="divide-y divide-surface-200">
        {sortedWorkspaces.slice(0, 5).map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => {
              setCurrentWorkspace({
                id: workspace.id,
                organizationId: '',
                name: workspace.name,
                slug: workspace.slug,
                status: 'active',
                settings: {},
                createdAt: '',
                updatedAt: '',
              });
              navigate('/dashboard');
            }}
            className="w-full flex items-center justify-between p-3 hover:bg-surface-200/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center">
                <span className="text-xs font-medium text-brand-400">
                  {workspace.name[0]?.toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">
                  {workspace.stats.controls} controls • {workspace.stats.risks} risks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-sm font-medium ${getScoreColor(workspace.complianceScore)}`}>
                {workspace.complianceScore}%
              </div>
              {workspace.complianceScore >= 80 && (
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Show more link if there are more workspaces */}
      {data.workspaces.length > 5 && (
        <div className="p-3 text-center border-t border-surface-200">
          <button
            onClick={() => navigate('/settings/workspaces')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            + {data.workspaces.length - 5} more workspaces
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceComparisonWidget;
