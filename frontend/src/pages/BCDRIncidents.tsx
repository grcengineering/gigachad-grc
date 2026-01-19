import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ClockIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { DeclareIncidentModal } from '@/components/bcdr/DeclareIncidentModal';
import { api } from '@/lib/api';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================

interface BCDRIncident {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  declaredAt: string;
  declaredByName: string;
  resolvedAt: string;
  closedAt: string;
  timelineCount: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'recovering', label: 'Recovering' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  major: 'bg-orange-500',
  moderate: 'bg-yellow-500',
  minor: 'bg-green-500',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-red-500/20', text: 'text-red-400' },
  recovering: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  resolved: { bg: 'bg-green-500/20', text: 'text-green-400' },
  closed: { bg: 'bg-slate-600/50', text: 'text-slate-400' },
};

const TYPE_LABELS: Record<string, string> = {
  disaster: 'Disaster',
  major_incident: 'Major Incident',
  drill: 'Drill/Exercise',
  near_miss: 'Near Miss',
};

// ============================================
// BC/DR Incidents Page Component
// ============================================

export default function BCDRIncidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<BCDRIncident[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<BCDRIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadIncidents();
    loadActiveIncidents();
    loadStats();
  }, [search, status]);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await api.get(`/bcdr/incidents?${params.toString()}`);
      setIncidents(response.data.data || []);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveIncidents = async () => {
    try {
      const response = await api.get('/bcdr/incidents/active');
      const data = response.data;
      // Handle both array response and { data: [] } response format
      setActiveIncidents(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Failed to load active incidents:', error);
      setActiveIncidents([]);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/bcdr/incidents/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleDeclareComplete = (incidentId: string) => {
    setShowDeclareModal(false);
    navigate(`/bcdr/incidents/${incidentId}`);
  };

  // Ensure activeIncidents is always an array for safe iteration
  const safeActiveIncidents = Array.isArray(activeIncidents) ? activeIncidents : [];

  return (
    <div className="space-y-6">
      {/* Active Incidents Banner */}
      {safeActiveIncidents.length > 0 && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400 animate-pulse" />
              <div>
                <h3 className="text-lg font-medium text-red-400">
                  {safeActiveIncidents.length} Active Incident{safeActiveIncidents.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-red-300">
                  {safeActiveIncidents.map((i) => i.title).join(', ')}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate(`/bcdr/incidents/${safeActiveIncidents[0].id}`)}
            >
              <PlayIcon className="h-4 w-4 mr-1" />
              View Active
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">BC/DR Incidents</h1>
          <p className="text-slate-400 mt-1">
            Track and manage business continuity and disaster recovery incidents
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowDeclareModal(true)}>
          <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
          Declare Incident
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.active_count || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Recovering</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{stats.recovering_count || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Resolved</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.resolved_count || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Avg Resolution</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">
              {stats.avg_resolution_minutes
                ? `${Math.round(stats.avg_resolution_minutes / 60)}h`
                : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-slate-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incidents List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-400 mt-4">Loading incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="text-slate-400 mt-4">No incidents found</p>
          <p className="text-sm text-slate-500 mt-2">
            When an incident occurs, you can declare it here to track the response
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className={clsx(
                'bg-slate-800 rounded-lg p-6 border transition-all cursor-pointer hover:border-slate-500',
                incident.status === 'active'
                  ? 'border-red-500/50'
                  : incident.status === 'recovering'
                  ? 'border-orange-500/50'
                  : 'border-slate-700'
              )}
              onClick={() => navigate(`/bcdr/incidents/${incident.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={clsx(
                      'w-3 h-3 rounded-full mt-2',
                      SEVERITY_COLORS[incident.severity] || 'bg-slate-500'
                    )}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-white">{incident.title}</h3>
                      <span className="text-sm text-slate-400">#{incident.incidentId}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <span className="capitalize">{incident.severity}</span>
                      <span>•</span>
                      <span>{TYPE_LABELS[incident.incidentType] || incident.incidentType}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {formatDistanceToNow(new Date(incident.declaredAt), { addSuffix: true })}
                      </span>
                    </div>
                    {incident.description && (
                      <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                        {incident.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={clsx(
                      'px-3 py-1 rounded text-sm font-medium capitalize',
                      STATUS_COLORS[incident.status]?.bg || 'bg-slate-600',
                      STATUS_COLORS[incident.status]?.text || 'text-slate-300'
                    )}
                  >
                    {incident.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Declare Incident Modal */}
      {showDeclareModal && (
        <DeclareIncidentModal
          onClose={() => setShowDeclareModal(false)}
          onComplete={handleDeclareComplete}
        />
      )}
    </div>
  );
}
