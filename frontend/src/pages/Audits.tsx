import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auditsApi } from '@/lib/api';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Audit {
  id: string;
  auditId: string;
  name: string;
  auditType: string;
  framework?: string;
  status: string;
  isExternal: boolean;
  plannedStartDate?: string;
  plannedEndDate?: string;
  findingsCount: number;
  criticalFindings: number;
  highFindings: number;
  _count: {
    requests: number;
    findings: number;
    evidence: number;
    testResults: number;
  };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  fieldwork: 'bg-yellow-100 text-yellow-800',
  testing: 'bg-orange-100 text-orange-800',
  reporting: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const auditTypeLabels: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  surveillance: 'Surveillance',
  certification: 'Certification',
};

export default function Audits() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits', statusFilter, typeFilter],
    queryFn: () => auditsApi.list({
      status: statusFilter || undefined,
      auditType: typeFilter || undefined,
    }).then((res) => res.data),
  });

  const filteredAudits = audits.filter((audit: Audit) =>
    audit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.auditId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.framework?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-100">Audits</h1>
          <p className="text-surface-400 mt-1">Manage internal and external compliance audits</p>
        </div>
        <Link
          to="/audits/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Audit
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder="Search audits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="fieldwork">Fieldwork</option>
          <option value="testing">Testing</option>
          <option value="reporting">Reporting</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="surveillance">Surveillance</option>
          <option value="certification">Certification</option>
        </select>
      </div>

      {/* Audits List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500"></div>
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-300 mb-2">No audits found</h3>
          <p className="text-surface-500 mb-4">Get started by creating your first audit</p>
          <Link
            to="/audits/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Audit
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAudits.map((audit: Audit) => (
            <Link
              key={audit.id}
              to={`/audits/${audit.id}`}
              className="block bg-surface-800 border border-surface-700 rounded-lg p-6 hover:border-brand-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-surface-100">{audit.name}</h3>
                    <span className="text-sm text-surface-500">#{audit.auditId}</span>
                    {audit.isExternal && (
                      <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs font-medium">
                        External
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-surface-400">
                    <span>{auditTypeLabels[audit.auditType] || audit.auditType}</span>
                    {audit.framework && <span>• {audit.framework}</span>}
                    {audit.plannedStartDate && (
                      <span>• {new Date(audit.plannedStartDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[audit.status]}`}>
                  {audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-surface-700">
                <div>
                  <div className="text-sm text-surface-500 mb-1">Requests</div>
                  <div className="text-lg font-semibold text-surface-100">{audit._count.requests}</div>
                </div>
                <div>
                  <div className="text-sm text-surface-500 mb-1">Evidence</div>
                  <div className="text-lg font-semibold text-surface-100">{audit._count.evidence}</div>
                </div>
                <div>
                  <div className="text-sm text-surface-500 mb-1">Tests</div>
                  <div className="text-lg font-semibold text-surface-100">{audit._count.testResults}</div>
                </div>
                <div>
                  <div className="text-sm text-surface-500 mb-1">Findings</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-lg font-semibold text-surface-100">{audit._count.findings}</div>
                    {audit.criticalFindings > 0 && (
                      <span className="text-xs text-red-400">({audit.criticalFindings} critical)</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
