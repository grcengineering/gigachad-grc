import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
  FunnelIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface RecoveryTeam {
  id: string;
  name: string;
  description: string;
  teamType: string;
  isActive: boolean;
  memberCount: number;
  planCount: number;
  createdAt: string;
}

const TEAM_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'crisis_management', label: 'Crisis Management' },
  { value: 'it_recovery', label: 'IT Recovery' },
  { value: 'business_recovery', label: 'Business Recovery' },
  { value: 'communications', label: 'Communications' },
  { value: 'executive', label: 'Executive' },
];

const TEAM_TYPE_COLORS: Record<string, string> = {
  crisis_management: 'bg-red-500',
  it_recovery: 'bg-blue-500',
  business_recovery: 'bg-green-500',
  communications: 'bg-purple-500',
  executive: 'bg-orange-500',
};

// ============================================
// Recovery Teams Page Component
// ============================================

export default function RecoveryTeams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<RecoveryTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamType, setTeamType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Create modal state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamType, setNewTeamType] = useState('crisis_management');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTeams();
    loadStats();
  }, [search, teamType]);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (teamType) params.append('teamType', teamType);

      const response = await api.get(`/bcdr/recovery-teams?${params.toString()}`);
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/bcdr/recovery-teams/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      const response = await api.post('/bcdr/recovery-teams', {
        name: newTeamName,
        description: newTeamDescription || undefined,
        teamType: newTeamType,
      });
      navigate(`/bcdr/recovery-teams/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recovery Teams</h1>
          <p className="text-slate-400 mt-1">
            Define and manage teams for BC/DR incident response
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Total Teams</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Active Teams</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.active_count || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Total Members</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.total_members || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Crisis Management</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.crisis_management_count || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-slate-400" />
          <select
            value={teamType}
            onChange={(e) => setTeamType(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            {TEAM_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-400 mt-4">Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <UserGroupIcon className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="text-slate-400 mt-4">No recovery teams found</p>
          <Button variant="primary" className="mt-4" onClick={() => setShowCreateModal(true)}>
            Create Your First Team
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
              onClick={() => navigate(`/bcdr/recovery-teams/${team.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      TEAM_TYPE_COLORS[team.teamType] || 'bg-slate-600'
                    )}
                  >
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{team.name}</h3>
                    <p className="text-sm text-slate-400 capitalize mt-1">
                      {team.teamType.replace('_', ' ')}
                    </p>
                    {team.description && (
                      <p className="text-sm text-slate-400 mt-2">{team.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-slate-400">
                      <UserGroupIcon className="h-4 w-4" />
                      <span>{team.memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                      <LinkIcon className="h-4 w-4" />
                      <span>{team.planCount} plans</span>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'px-2 py-1 rounded text-xs font-medium',
                      team.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-600 text-slate-400'
                    )}
                  >
                    {team.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Create Recovery Team</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Team Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTeamName ?? ''}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="e.g., Crisis Management Team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Team Type
                </label>
                <select
                  value={newTeamType}
                  onChange={(e) => setNewTeamType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {TEAM_TYPE_OPTIONS.filter((t) => t.value).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newTeamDescription ?? ''}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Brief description of the team's purpose..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreateTeam} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Team'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
