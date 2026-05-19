import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { useWorkspace, Workspace } from '@/contexts/WorkspaceContext';
import api from '@/lib/api';

function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Create New Workspace</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Workspace Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product A, Enterprise Edition"
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this workspace..."
                rows={2}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkspaceList() {
  const navigate = useNavigate();
  const {
    isMultiWorkspaceEnabled,
    enableMultiWorkspace,
    createWorkspace,
    setCurrentWorkspace,
    currentWorkspace,
    canManageWorkspaces,
  } = useWorkspace();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Fetch org dashboard for stats
  const { data: orgDashboard } = useQuery({
    queryKey: ['org-dashboard'],
    queryFn: () => api.get('/api/workspaces/org/dashboard').then((r) => r.data),
    enabled: isMultiWorkspaceEnabled,
  });

  // Fetch workspaces list
  const { data: workspaces = [], refetch } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/api/workspaces').then((r) => r.data),
    enabled: isMultiWorkspaceEnabled,
  });

  const handleEnableMultiWorkspace = async () => {
    setIsEnabling(true);
    try {
      await enableMultiWorkspace();
      refetch();
    } catch (error) {
      console.error('Failed to enable multi-workspace mode:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleCreateWorkspace = async (data: { name: string; description?: string }) => {
    const newWorkspace = await createWorkspace(data);
    setCurrentWorkspace(newWorkspace);
    refetch();
  };

  const filteredWorkspaces = workspaces.filter(
    (ws: Workspace) =>
      ws.name.toLowerCase().includes(search.toLowerCase()) ||
      ws.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'inactive':
        return <XCircleIcon className="w-4 h-4 text-yellow-600" />;
      case 'archived':
        return <ArchiveBoxIcon className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  // If multi-workspace is not enabled, show the enable screen
  if (!isMultiWorkspaceEnabled) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <BuildingOfficeIcon className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Multi-Workspace Mode</h1>
          <p className="text-muted-foreground mb-8">
            Enable multi-workspace mode to manage multiple products or services with separate
            compliance tracking, while sharing a common control library across your organization.
          </p>

          <div className="bg-surface-800 rounded-lg p-6 text-left mb-8">
            <h3 className="font-semibold text-foreground mb-4">What you get with workspaces:</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <ChartBarIcon className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <span>Track compliance progress independently for each product</span>
              </li>
              <li className="flex items-start gap-3">
                <UsersIcon className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <span>Assign different team members to different workspaces</span>
              </li>
              <li className="flex items-start gap-3">
                <BuildingOfficeIcon className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <span>Consolidated org-level dashboard for executives</span>
              </li>
            </ul>
          </div>

          {canManageWorkspaces ? (
            <button
              onClick={handleEnableMultiWorkspace}
              disabled={isEnabling}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {isEnabling ? 'Enabling...' : 'Enable Multi-Workspace Mode'}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Contact your administrator to enable multi-workspace mode.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
          <p className="text-muted-foreground mt-1">Manage workspaces for your organization</p>
        </div>
        {canManageWorkspaces && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            <PlusIcon className="w-5 h-5" />
            New Workspace
          </button>
        )}
      </div>

      {/* Org-level Stats */}
      {orgDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-sm text-muted-foreground">Total Workspaces</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {orgDashboard.workspaces?.length || 0}
            </p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-sm text-muted-foreground">Avg Compliance Score</p>
            <p className="text-2xl font-bold text-brand-400 mt-1">
              {orgDashboard.avgComplianceScore || 0}%
            </p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-sm text-muted-foreground">Total Controls</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {orgDashboard.totals?.controls || 0}
            </p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-sm text-muted-foreground">Total Risks</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {orgDashboard.totals?.risks || 0}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search workspaces..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkspaces.map((workspace: Workspace) => {
          const stats = orgDashboard?.workspaces?.find((w: any) => w.id === workspace.id);
          return (
            <div
              key={workspace.id}
              className={`bg-surface-800 rounded-lg p-5 border transition-all cursor-pointer hover:border-brand-500/50 ${
                currentWorkspace?.id === workspace.id
                  ? 'border-brand-500 ring-1 ring-brand-500/30'
                  : 'border-surface-700'
              }`}
              onClick={() => {
                setCurrentWorkspace(workspace);
                navigate('/dashboard');
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5 text-brand-400" />
                  <h3 className="font-semibold text-foreground">{workspace.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(workspace.status)}
                  {currentWorkspace?.id === workspace.id && (
                    <span className="text-xs bg-brand-600/20 text-brand-400 px-2 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {workspace.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {workspace.description}
                </p>
              )}

              {/* Workspace Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-surface-700/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Controls</p>
                  <p className="text-sm font-medium text-foreground">
                    {stats?.stats?.controls || 0}
                  </p>
                </div>
                <div className="bg-surface-700/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Risks</p>
                  <p className="text-sm font-medium text-foreground">{stats?.stats?.risks || 0}</p>
                </div>
                <div className="bg-surface-700/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="text-sm font-medium text-brand-400">
                    {stats?.complianceScore || 0}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-surface-700">
                <span className="text-xs text-muted-foreground">
                  {workspace.memberCount || 0} members
                </span>
                {canManageWorkspaces && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/settings/workspaces/${workspace.id}`);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-700 rounded"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredWorkspaces.length === 0 && (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search ? 'No workspaces match your search.' : 'No workspaces yet.'}
          </p>
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWorkspace}
      />
    </div>
  );
}
