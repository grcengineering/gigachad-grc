import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface Questionnaire {
  id: string;
  title: string;
  requesterName: string;
  requesterEmail: string;
  company?: string;
  status: string;
  priority: string;
  dueDate?: string;
  description?: string;
  questions: Question[];
}

interface Question {
  id: string;
  questionNumber?: string;
  questionText: string;
  answerText?: string;
  status: string;
  category?: string;
}

export default function QuestionnaireDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    requesterName: '',
    requesterEmail: '',
    company: '',
    priority: 'medium',
    dueDate: '',
    description: '',
  });

  // Form state for new questionnaire
  const [formData, setFormData] = useState({
    title: '',
    requesterName: '',
    requesterEmail: '',
    company: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    questionsText: '',
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchQuestionnaire();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchQuestionnaire = async () => {
    try {
      const response = await fetch(`/api/questionnaires/${id}`);
      const data = await response.json();
      setQuestionnaire(data);
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = async (questionId: string, answer: string) => {
    try {
      await fetch(`/api/questionnaires/questions/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'system',
        },
        body: JSON.stringify({
          answerText: answer,
          status: 'answered',
        }),
      });
      fetchQuestionnaire();
    } catch (error) {
      console.error('Error updating answer:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setParsing(true);
    setUploadedFile(file);

    try {
      const text = await file.text();
      let questions: string[] = [];

      // Parse based on file type
      if (file.name.endsWith('.csv')) {
        // CSV parsing - assume first column is questions
        const lines = text.split('\n').filter(line => line.trim());
        // Skip header row if it looks like a header
        const startIndex = lines[0]?.toLowerCase().includes('question') ? 1 : 0;
        questions = lines.slice(startIndex).map(line => {
          // Get first column value (handles quoted CSV)
          const match = line.match(/^"([^"]*)"|^([^,]*)/);
          return match ? (match[1] || match[2]).trim() : line.trim();
        }).filter(q => q.length > 0);
      } else if (file.name.endsWith('.txt')) {
        // Plain text - one question per line
        questions = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      } else {
        // For other formats, just split by lines and clean up
        questions = text.split('\n')
          .map(line => {
            // Remove common numbering patterns: 1., 1), Q1., etc.
            return line.replace(/^\s*(\d+[\.\)]|Q\d+[\.\)]?)\s*/, '').trim();
          })
          .filter(line => line.length > 0);
      }

      // Update form with parsed questions
      setFormData({
        ...formData,
        questionsText: questions.join('\n'),
      });

      alert(`Successfully parsed ${questions.length} questions from ${file.name}`);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Failed to parse file. Please check the format or paste questions manually.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmitNewQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Parse questions from text (one per line, or numbered)
      const questionLines = formData.questionsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Create the questionnaire
      const response = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'system',
        },
        body: JSON.stringify({
          organizationId: 'default-org',
          title: formData.title,
          requesterName: formData.requesterName,
          requesterEmail: formData.requesterEmail,
          company: formData.company || undefined,
          description: formData.description || undefined,
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
          status: 'pending',
        }),
      });

      const newQuestionnaire = await response.json();

      // Create questions
      for (let i = 0; i < questionLines.length; i++) {
        await fetch('/api/questionnaires/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'system',
          },
          body: JSON.stringify({
            questionnaireId: newQuestionnaire.id,
            questionText: questionLines[i],
            questionNumber: `${i + 1}`,
            status: 'pending',
          }),
        });
      }

      alert(`Successfully created questionnaire with ${questionLines.length} questions!`);
      navigate(`/questionnaires/${newQuestionnaire.id}`);
    } catch (error) {
      console.error('Error creating questionnaire:', error);
      alert('Failed to create questionnaire. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading questionnaire...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/questionnaires')}
          className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-surface-100">
            {id === 'new' ? 'Log Incoming Questionnaire' : questionnaire?.title || 'Customer Questionnaire'}
          </h1>
          {questionnaire && (
            <p className="mt-1 text-surface-400">
              Received from {questionnaire.requesterName} {questionnaire.company && `at ${questionnaire.company}`}
            </p>
          )}
        </div>
      </div>

      {id === 'new' ? (
        <form onSubmit={handleSubmitNewQuestionnaire} className="space-y-6">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-surface-100">Customer Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Requester Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.requesterName}
                  onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Requester Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.requesterEmail}
                  onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                  placeholder="Security Assessment 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                placeholder="Additional context about this questionnaire..."
              />
            </div>
          </div>

          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-surface-100">Upload Questionnaire <span className="text-red-400">*</span></h2>
            <p className="text-sm text-surface-400">
              Upload the questionnaire file you received from the customer. Supports CSV, Excel, Word, PDF, and text files.
            </p>

            {!formData.questionsText ? (
              <div className="border-2 border-dashed border-surface-700 rounded-lg p-12">
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,.doc,.docx,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="questionnaire-file-upload"
                  disabled={parsing}
                />
                <label
                  htmlFor="questionnaire-file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <DocumentArrowUpIcon className="w-16 h-16 text-surface-500 mb-3" />
                  <span className="text-surface-100 text-lg mb-2">
                    {parsing ? 'Parsing file...' : 'Click to upload questionnaire'}
                  </span>
                  <span className="text-sm text-surface-400 mb-1">
                    or drag and drop
                  </span>
                  <span className="text-xs text-surface-500">
                    CSV, Excel, Word, PDF, or TXT
                  </span>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-surface-800 rounded-lg border border-surface-700">
                  <div className="flex items-center gap-3">
                    <DocumentArrowUpIcon className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-surface-100 font-medium">{uploadedFile?.name}</p>
                      <p className="text-sm text-surface-400">
                        {formData.questionsText.split('\n').filter(l => l.trim()).length} questions parsed
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, questionsText: '' });
                      setUploadedFile(null);
                    }}
                    className="px-3 py-1.5 text-sm bg-surface-700 text-surface-200 rounded hover:bg-surface-600 transition-colors"
                  >
                    Replace File
                  </button>
                </div>

                {/* Preview of parsed questions */}
                <div className="border border-surface-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <h4 className="text-sm font-medium text-surface-400 mb-2">Parsed Questions Preview:</h4>
                  <ol className="space-y-1 text-sm text-surface-300">
                    {formData.questionsText.split('\n').filter(l => l.trim()).slice(0, 10).map((q, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-surface-500 min-w-[2rem]">{i + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                    {formData.questionsText.split('\n').filter(l => l.trim()).length > 10 && (
                      <li className="text-surface-500 italic">
                        ... and {formData.questionsText.split('\n').filter(l => l.trim()).length - 10} more questions
                      </li>
                    )}
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/questionnaires')}
              className="px-4 py-2 bg-surface-800 text-surface-100 rounded-lg hover:bg-surface-700 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Questionnaire'}
            </button>
          </div>
        </form>
      ) : questionnaire ? (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Status</dt>
                <dd>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    questionnaire.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    questionnaire.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {questionnaire.status.replace('_', ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-surface-400 mb-1">Priority</dt>
                <dd>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    questionnaire.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    questionnaire.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {questionnaire.priority}
                  </span>
                </dd>
              </div>
              {questionnaire.dueDate && (
                <div>
                  <dt className="text-sm font-medium text-surface-400 mb-1">Due Date</dt>
                  <dd className="text-sm text-surface-100">
                    {new Date(questionnaire.dueDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-surface-100">Questions</h2>
            {questionnaire.questions.map((question, index) => (
              <div key={question.id} className="bg-surface-900 border border-surface-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-surface-500">
                        {question.questionNumber || `Q${index + 1}`}
                      </span>
                      {question.category && (
                        <span className="px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded">
                          {question.category}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded capitalize ${
                        question.status === 'answered' ? 'bg-green-500/20 text-green-400' :
                        question.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {question.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-surface-100 font-medium mb-4">{question.questionText}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-2">
                    Answer
                  </label>
                  <textarea
                    value={question.answerText || ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                    placeholder="Enter your answer here..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Edit Questionnaire Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">Title</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} 
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1">Requester Name</label>
                  <input type="text" value={editForm.requesterName} onChange={(e) => setEditForm({...editForm, requesterName: e.target.value})} 
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1">Requester Email</label>
                  <input type="email" value={editForm.requesterEmail} onChange={(e) => setEditForm({...editForm, requesterEmail: e.target.value})} 
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1">Company</label>
                  <input type="text" value={editForm.company} onChange={(e) => setEditForm({...editForm, company: e.target.value})} 
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({...editForm, priority: e.target.value})} 
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">Due Date</label>
                <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})} 
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows={3}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-surface-800 text-surface-100 rounded-lg hover:bg-surface-700 transition-colors">Cancel</button>
              <button onClick={async () => {
                try {
                  await fetch(`/api/questionnaires/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': 'system' },
                    body: JSON.stringify(editForm),
                  });
                  setShowEditModal(false);
                  fetchQuestionnaire();
                } catch (error) {
                  console.error('Error updating questionnaire:', error);
                  alert('Failed to update questionnaire');
                }
              }} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-surface-100 mb-2">Delete Questionnaire</h3>
            <p className="text-surface-400 mb-6">Are you sure you want to delete "{questionnaire?.title}"? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-surface-800 text-surface-100 rounded-lg hover:bg-surface-700 transition-colors">Cancel</button>
              <button onClick={async () => {
                try {
                  await fetch(`/api/questionnaires/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': 'system' },
                  });
                  navigate('/questionnaires');
                } catch (error) {
                  console.error('Error deleting questionnaire:', error);
                  alert('Failed to delete questionnaire');
                }
              }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
