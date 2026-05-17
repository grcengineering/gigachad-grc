import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditor, AuditorProtectedRoute } from '../contexts/AuditorContext';
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  FolderOpenIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ============================================
// Types
// ============================================

interface AuditRequest {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  assignedTo?: string;
  evidenceCount: number;
  commentCount: number;
  controlReference?: string;
}


// ============================================
// Main Component
// ============================================

function AuditorPortalContent() {
  const navigate = useNavigate();
  const { session, logout } = useAuditor();
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'evidence'>('overview');
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [_selectedRequest, setSelectedRequest] = useState<AuditRequest | null>(null);

  useEffect(() => {
    fetchAuditData();
  }, [session]);

  const fetchAuditData = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/audit-portal/requests', {
        headers: {
          'x-portal-access-code': session.accessCode,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load audit requests: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const data: Array<{
        id: string;
        title: string;
        description: string;
        status: AuditRequest['status'];
        priority: AuditRequest['priority'];
        dueDate?: string;
        assignee?: { name?: string; email?: string } | null;
        controlId?: string | null;
        requirementRef?: string | null;
      }> = result.data ?? [];

      // The bulk-list endpoint does not return evidence/comment counts to
      // keep the response cheap. The request-detail view fetches accurate
      // counts. Default to 0 here so the list renders immediately.
      setRequests(
        data.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          status: r.status,
          priority: r.priority,
          dueDate: r.dueDate ?? '',
          assignedTo: r.assignee?.name,
          evidenceCount: 0,
          commentCount: 0,
          controlReference: r.controlId || r.requirementRef || undefined,
        })),
      );
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/portal');
  };

  const getStatusBadge = (status: AuditRequest['status']) => {
    const styles: Record<AuditRequest['status'], string> = {
      open: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      submitted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    const labels: Record<AuditRequest['status'], string> = {
      open: 'Open',
      in_progress: 'In Progress',
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority: AuditRequest['priority']) => {
    const styles: Record<AuditRequest['priority'], string> = {
      low: 'text-gray-500',
      medium: 'text-yellow-500',
      high: 'text-orange-500',
      critical: 'text-red-500',
    };

    return (
      <span className={`text-xs font-medium capitalize ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const stats = {
    total: requests.length,
    open: requests.filter(r => r.status === 'open' || r.status === 'in_progress').length,
    submitted: requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {session.auditName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {session.organizationName} • Auditor Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {session.auditorName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                  <ClockIcon className="w-3 h-3" />
                  Expires {new Date(session.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <ClipboardDocumentListIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ExclamationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.open}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <FolderOpenIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.submitted}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex gap-6">
            {(['overview', 'requests', 'evidence'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Audit Overview
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Welcome to the auditor portal. You have access to view and download evidence for the audit requests listed below.
                    Use the tabs above to navigate between requests and evidence.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Audit Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{session.auditName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Organization</p>
                      <p className="font-medium text-gray-900 dark:text-white">{session.organizationName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Auditor</p>
                      <p className="font-medium text-gray-900 dark:text-white">{session.auditorName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Access Expires</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(session.expiresAt).toLocaleDateString()} at{' '}
                        {new Date(session.expiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Recent Requests
                    </h2>
                  </div>
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {requests.slice(0, 5).map((request) => (
                      <li
                        key={request.id}
                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {request.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                              {request.controlReference && (
                                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                  {request.controlReference}
                                </span>
                              )}
                              Due: {new Date(request.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(request.status)}
                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-750">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Request
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Control
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Evidence
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {requests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {request.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {request.description}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {request.controlReference || '-'}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="px-6 py-4">
                            {getPriorityBadge(request.priority)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(request.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <FolderOpenIcon className="w-4 h-4" />
                              {request.evidenceCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              {session.permissions.canSubmitComments && (
                                <button
                                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  title="Add Comment"
                                >
                                  <ChatBubbleLeftIcon className="w-4 h-4" />
                                </button>
                              )}
                              {session.permissions.canDownloadEvidence && request.evidenceCount > 0 && (
                                <button
                                  className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                  title="Download Evidence"
                                >
                                  <DocumentArrowDownIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Evidence Library
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Browse and download evidence files that have been submitted for this audit.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requests.filter(r => r.evidenceCount > 0).map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <FolderOpenIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {request.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {request.evidenceCount} file{request.evidenceCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {requests.filter(r => r.evidenceCount > 0).length === 0 && (
                  <div className="text-center py-12">
                    <FolderOpenIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No evidence has been uploaded yet.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ============================================
// Export with Protection
// ============================================

export default function AuditorPortal() {
  return (
    <AuditorProtectedRoute>
      <AuditorPortalContent />
    </AuditorProtectedRoute>
  );
}

