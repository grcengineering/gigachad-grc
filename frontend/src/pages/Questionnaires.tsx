import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { questionnairesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

export default function Questionnaires() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const organizationId = user?.organizationId || '';

  const { data: questionnaires = [], isLoading: loading } = useQuery({
    queryKey: ['questionnaires', filter, organizationId],
    queryFn: () =>
      questionnairesApi
        .list({
          organizationId,
          ...(filter !== 'all' ? { status: filter } : {}),
        })
        .then((res) => res.data),
    enabled: !!organizationId,
  });

  const getCompletionPercentage = (questions: { status: string }[]) => {
    if (questions.length === 0) return 0;
    const answered = questions.filter(
      (q) => q.status === 'answered' || q.status === 'approved'
    ).length;
    return Math.round((answered / questions.length) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-900">Security Questionnaires</h1>
            <p className="mt-1 text-surface-600">
              Respond to incoming customer security questionnaires
            </p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Security Questionnaires</h1>
          <p className="mt-1 text-surface-600">
            Respond to incoming customer security questionnaires
          </p>
        </div>
        <Button
          onClick={() => navigate('/questionnaires/new')}
          leftIcon={<PlusIcon className="w-5 h-5" />}
        >
          Log New Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'in_progress', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-brand-600 text-white'
                : 'bg-white text-surface-700 hover:bg-surface-200'
            }`}
          >
            {status === 'all'
              ? 'All'
              : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Questionnaires List */}
      {questionnaires.length === 0 ? (
        <EmptyState
          variant="checklist"
          title="No incoming questionnaires"
          description="When customers send security questionnaires, you can log and track them here. Use the knowledge base to quickly answer common questions."
          action={{
            label: 'Log New Request',
            onClick: () => navigate('/questionnaires/new'),
            icon: <PlusIcon className="w-5 h-5" />,
          }}
        />
      ) : (
        <div className="bg-white border border-surface-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-surface-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Customer Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {(questionnaires as any[]).map((questionnaire) => {
                const completion = getCompletionPercentage(questionnaire.questions);
                return (
                  <tr
                    key={questionnaire.id}
                    onClick={() => navigate(`/questionnaires/${questionnaire.id}`)}
                    className="hover:bg-white cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-surface-900">
                          {questionnaire.title}
                        </div>
                        <div className="text-sm text-surface-500">
                          {questionnaire.questions.length} questions
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-surface-700">
                          {questionnaire.requesterName}
                        </div>
                        {questionnaire.company && (
                          <div className="text-sm text-surface-500">{questionnaire.company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                          questionnaire.priority === 'urgent'
                            ? 'bg-red-500/20 text-red-600'
                            : questionnaire.priority === 'high'
                              ? 'bg-orange-500/20 text-orange-600'
                              : questionnaire.priority === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-600'
                                : 'bg-green-500/20 text-green-600'
                        }`}
                      >
                        {questionnaire.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                          questionnaire.status === 'completed'
                            ? 'bg-green-500/20 text-green-600'
                            : questionnaire.status === 'in_progress'
                              ? 'bg-blue-500/20 text-blue-600'
                              : questionnaire.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-600'
                                : 'bg-surface-200 text-surface-600'
                        }`}
                      >
                        {questionnaire.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-900">{completion}%</span>
                        <div className="w-24 h-2 bg-surface-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              completion === 100
                                ? 'bg-green-500'
                                : completion >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                            }`}
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-700">
                      {questionnaire.dueDate
                        ? new Date(questionnaire.dueDate).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
