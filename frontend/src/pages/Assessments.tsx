import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

interface Assessment {
  id: string;
  assessmentType: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  overallScore?: number;
  vendor: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export default function Assessments() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const response = await fetch('/api/assessments');
      const data = await response.json();
      setAssessments(data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading assessments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Vendor Assessments</h1>
          <p className="mt-1 text-surface-400">
            Track and manage vendor risk assessments
          </p>
        </div>
        <button
          onClick={() => navigate('/assessments/new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Assessment
        </button>
      </div>

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-12 text-center">
          <DocumentCheckIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-300 mb-2">No assessments yet</h3>
          <p className="text-surface-500 mb-6">
            Get started by creating your first vendor assessment
          </p>
          <button
            onClick={() => navigate('/assessments/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Assessment
          </button>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-800 border-b border-surface-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {assessments.map((assessment) => (
                <tr
                  key={assessment.id}
                  onClick={() => navigate(`/assessments/${assessment.id}`)}
                  className="hover:bg-surface-800 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-surface-100">
                    {assessment.vendor.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300 capitalize">
                    {assessment.assessmentType.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      assessment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      assessment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      assessment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-surface-700 text-surface-400'
                    }`}>
                      {assessment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {assessment.overallScore !== null && assessment.overallScore !== undefined ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-100">{assessment.overallScore}</span>
                        <div className="w-16 h-2 bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              assessment.overallScore >= 80 ? 'bg-green-500' :
                              assessment.overallScore >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${assessment.overallScore}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-surface-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300">
                    {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
