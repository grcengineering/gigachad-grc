import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { questionnairesApi } from '@/lib/api';

interface Questionnaire {
  id: string;
  title: string;
  requesterName: string;
  requesterEmail: string;
  company?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
  createdAt: string;
  questions: { id: string; status: string }[];
}

export default function Questionnaires() {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const { data: questionnaires = [], isLoading: loading } = useQuery({
    queryKey: ['questionnaires', filter],
    queryFn: () => questionnairesApi.list(filter !== 'all' ? { status: filter } : undefined).then((res) => res.data),
  });

  const getCompletionPercentage = (questions: { status: string }[]) => {
    if (questions.length === 0) return 0;
    const answered = questions.filter(q => q.status === 'answered' || q.status === 'approved').length;
    return Math.round((answered / questions.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading questionnaires...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Security Questionnaires</h1>
          <p className="mt-1 text-surface-400">
            Respond to incoming customer security questionnaires
          </p>
        </div>
        <button
          onClick={() => navigate('/questionnaires/new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Log New Request
        </button>
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
                : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Questionnaires List */}
      {questionnaires.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-12 text-center">
          <ChatBubbleLeftRightIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-300 mb-2">No incoming questionnaires</h3>
          <p className="text-surface-500 mb-6">
            When customers send security questionnaires, they'll appear here
          </p>
          <button
            onClick={() => navigate('/questionnaires/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Log New Request
          </button>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-800 border-b border-surface-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Customer Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {questionnaires.map((questionnaire) => {
                const completion = getCompletionPercentage(questionnaire.questions);
                return (
                  <tr
                    key={questionnaire.id}
                    onClick={() => navigate(`/questionnaires/${questionnaire.id}`)}
                    className="hover:bg-surface-800 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-surface-100">{questionnaire.title}</div>
                        <div className="text-sm text-surface-500">
                          {questionnaire.questions.length} questions
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-surface-300">{questionnaire.requesterName}</div>
                        {questionnaire.company && (
                          <div className="text-sm text-surface-500">{questionnaire.company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        questionnaire.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        questionnaire.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        questionnaire.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {questionnaire.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        questionnaire.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        questionnaire.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        questionnaire.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-surface-700 text-surface-400'
                      }`}>
                        {questionnaire.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-100">{completion}%</span>
                        <div className="w-24 h-2 bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              completion === 100 ? 'bg-green-500' :
                              completion >= 50 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-300">
                      {questionnaire.dueDate ? new Date(questionnaire.dueDate).toLocaleDateString() : '—'}
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
