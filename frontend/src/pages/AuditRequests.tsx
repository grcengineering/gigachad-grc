import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface AuditRequest {
  id: string;
  requestNumber: string;
  auditId: string;
  category: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
  audit: {
    id: string;
    auditId: string;
    name: string;
    status: string;
  };
  _count: {
    evidence: number;
    comments: number;
  };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-purple-100 text-purple-800',
  under_review: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  clarification_needed: 'bg-pink-100 text-pink-800',
};

const priorityColors: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

const categoryLabels: Record<string, string> = {
  control_documentation: 'Control Documentation',
  policy: 'Policy',
  evidence: 'Evidence',
  interview: 'Interview',
  access: 'Access',
  walkthrough: 'Walkthrough',
};

export default function AuditRequests() {
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, auditFilter, priorityFilter]);

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (auditFilter) params.append('auditId', auditFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const response = await fetch(`/api/audit-requests?${params}`, {
        headers: {
          'x-organization-id': 'default-org',
          'x-user-id': 'system',
        },
      });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) =>
    request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.audit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-100">Audit Requests</h1>
          <p className="text-surface-400 mt-1">Manage evidence and documentation requests from auditors</p>
        </div>
        <Link
          to="/audit-requests/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder="Search requests..."
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
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="clarification_needed">Clarification Needed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-12 text-surface-400">Loading requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-300 mb-2">No requests found</h3>
          <p className="text-surface-500 mb-4">Create a new audit request to get started</p>
          <Link
            to="/audit-requests/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Request
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Link
              key={request.id}
              to={`/audit-requests/${request.id}`}
              className="block bg-surface-800 border border-surface-700 rounded-lg p-6 hover:border-brand-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-surface-100">{request.title}</h3>
                    <span className="text-sm text-surface-500">#{request.requestNumber}</span>
                    <span className={`${priorityColors[request.priority]}`}>
                      <ExclamationTriangleIcon className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-surface-400">
                    <span>{categoryLabels[request.category]}</span>
                    <span>• Audit: {request.audit.name}</span>
                    {request.dueDate && (
                      <span className={isOverdue(request.dueDate) ? 'text-red-400' : ''}>
                        • Due: {new Date(request.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status]}`}>
                  {request.status.replace('_', ' ').charAt(0).toUpperCase() + request.status.replace('_', ' ').slice(1)}
                </span>
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-surface-700 text-sm text-surface-400">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  <span>{request._count.evidence} evidence items</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{request._count.comments} comments</span>
                </div>
                {request.assignedTo && (
                  <div className="flex items-center gap-2">
                    <span>Assigned to: {request.assignedTo}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
