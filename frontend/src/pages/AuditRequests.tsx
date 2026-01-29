import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { SkeletonGrid } from '@/components/Skeleton';
import { EmptyState, NoResultsEmptyState } from '@/components/EmptyState';
import toast from 'react-hot-toast';

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewRequest = id === 'new';

  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [auditFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [audits, setAudits] = useState<{ id: string; name: string }[]>([]);
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'evidence',
    priority: 'medium',
    auditId: '',
    description: '',
    dueDate: '',
  });

  useEffect(() => {
    if (!isNewRequest) {
      fetchRequests();
    }
    fetchAudits();
  }, [statusFilter, auditFilter, priorityFilter, isNewRequest]);

  const fetchAudits = async () => {
    try {
      const response = await fetch('/api/audits', {
        headers: {
          'x-organization-id': 'default-org',
          'x-user-id': 'system',
        },
      });
      const data = await response.json();
      setAudits(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching audits:', error);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.error('Please enter a request title');
      return;
    }
    if (!createForm.auditId) {
      toast.error('Please select an audit');
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('/api/audit-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'default-org',
          'x-user-id': 'system',
        },
        body: JSON.stringify(createForm),
      });
      if (!response.ok) throw new Error('Failed to create request');
      toast.success('Audit request created successfully');
      navigate('/audit-requests');
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create audit request');
    } finally {
      setIsCreating(false);
    }
  };

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
      toast.error('Failed to load audit requests');
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

  // Create form for new requests
  if (isNewRequest) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/audit-requests')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-surface-100">Create Audit Request</h1>
            <p className="text-surface-400 mt-1">Create a new evidence or documentation request</p>
          </div>
        </div>

        <div className="bg-surface-800 border border-surface-700 rounded-lg p-6">
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Request Title *
              </label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g., SOC 2 Evidence - Access Control Logs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Associated Audit *
              </label>
              <select
                value={createForm.auditId}
                onChange={(e) => setCreateForm({ ...createForm, auditId: e.target.value })}
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select an audit...</option>
                {audits.map((audit) => (
                  <option key={audit.id} value={audit.id}>{audit.name}</option>
                ))}
              </select>
              {audits.length === 0 && (
                <p className="text-sm text-yellow-400 mt-1">
                  No audits found. Please create an audit first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Category
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Priority
                </label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                  className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Description
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Describe what evidence or documentation is needed..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/audit-requests')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !createForm.title.trim() || !createForm.auditId}
              >
                {isCreating ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-100">Audit Requests</h1>
          <p className="text-surface-400 mt-1">Manage evidence and documentation requests from auditors</p>
        </div>
        <Button
          onClick={() => navigate('/audit-requests/new')}
          leftIcon={<PlusIcon className="w-5 h-5" />}
        >
          New Request
        </Button>
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
        <SkeletonGrid count={6} />
      ) : requests.length === 0 ? (
        <EmptyState
          variant="checklist"
          title="No audit requests yet"
          description="Create audit requests to track evidence and documentation requirements from auditors."
          action={{
            label: "New Request",
            onClick: () => navigate('/audit-requests/new'),
            icon: <PlusIcon className="w-5 h-5" />,
          }}
        />
      ) : filteredRequests.length === 0 ? (
        <NoResultsEmptyState
          searchTerm={searchTerm}
          onClear={() => {
            setSearchTerm('');
            setStatusFilter('');
            setPriorityFilter('');
          }}
        />
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
