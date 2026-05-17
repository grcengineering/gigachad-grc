import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, DocumentArrowUpIcon, PencilIcon, TrashIcon, CheckIcon, BookOpenIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { questionnairesApi } from '../lib/api';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';
import { KnowledgeBaseSearchPanel } from '@/components/trust/KnowledgeBaseSearchPanel';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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
  const { user } = useAuth();
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

  // Initialize edit form when questionnaire loads
  useEffect(() => {
    if (questionnaire) {
      setEditForm({
        title: questionnaire.title || '',
        requesterName: questionnaire.requesterName || '',
        requesterEmail: questionnaire.requesterEmail || '',
        company: questionnaire.company || '',
        priority: questionnaire.priority || 'medium',
        dueDate: questionnaire.dueDate ? questionnaire.dueDate.split('T')[0] : '',
        description: questionnaire.description || '',
      });
    }
  }, [questionnaire]);

  const fetchQuestionnaire = async () => {
    try {
      const response = await questionnairesApi.get(id!);
      setQuestionnaire(response.data as any);
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = async (questionId: string, answer: string) => {
    // x-user-id used to be hardcoded to 'system', which meant every
    // answer was attributed to a fake user — breaking audit trails for
    // a compliance product. Use the authenticated user's id instead.
    if (!user?.id) {
      console.error('Cannot update answer: no authenticated user');
      return;
    }
    try {
      await fetch(`/api/questionnaires/questions/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
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
            return line.replace(/^\s*(\d+[.)]|Q\d+[.)]?)\s*/, '').trim();
          })
          .filter(line => line.length > 0);
      }

      // Update form with parsed questions
      setFormData({
        ...formData,
        questionsText: questions.join('\n'),
      });

      toast.success(`Successfully parsed ${questions.length} questions from ${file.name}`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file. Please check the format or paste questions manually.');
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

      toast.success(`Successfully created questionnaire with ${questionLines.length} questions!`);
      navigate(`/questionnaires/${newQuestionnaire.id}`);
    } catch (error) {
      console.error('Error creating questionnaire:', error);
      toast.error('Failed to create questionnaire. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonDetailHeader />
        <SkeletonDetailSection title />
        <SkeletonDetailSection title />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/questionnaires')}
            className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
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
        {questionnaire && id !== 'new' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              leftIcon={<PencilIcon className="w-5 h-5" />}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<TrashIcon className="w-5 h-5" />}
            >
              Delete
            </Button>
          </div>
        )}
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
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate('/questionnaires')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create Questionnaire
            </Button>
          </div>
        </form>
      ) : questionnaire ? (
        <QuestionnaireWorkspace 
          questionnaire={questionnaire} 
          onUpdateAnswer={updateAnswer}
          onRefresh={fetchQuestionnaire}
        />
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
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  await questionnairesApi.update(id!, {
                    ...editForm,
                    dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
                  });
                  toast.success('Questionnaire updated successfully');
                  setShowEditModal(false);
                  fetchQuestionnaire();
                } catch (error) {
                  console.error('Error updating questionnaire:', error);
                  toast.error('Failed to update questionnaire');
                }
              }}>Save Changes</Button>
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
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={async () => {
                try {
                  await questionnairesApi.delete(id!);
                  toast.success('Questionnaire deleted successfully');
                  navigate('/questionnaires');
                } catch (error) {
                  console.error('Error deleting questionnaire:', error);
                  toast.error('Failed to delete questionnaire');
                }
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Questionnaire Workspace with split panel layout
function QuestionnaireWorkspace({
  questionnaire,
  onUpdateAnswer,
  onRefresh,
}: {
  questionnaire: Questionnaire;
  onUpdateAnswer: (questionId: string, answer: string, kbEntryId?: string) => void;
  onRefresh: () => void;
}) {
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    questionnaire.questions.find(q => q.status === 'pending')?.id || questionnaire.questions[0]?.id || null
  );
  const [showKbPanel, setShowKbPanel] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questionnaire.questions.forEach(q => {
      initial[q.id] = q.answerText || '';
    });
    return initial;
  });

  const activeQuestion = questionnaire.questions.find(q => q.id === activeQuestionId);
  const answeredCount = questionnaire.questions.filter(q => q.status === 'answered' || q.status === 'approved').length;
  const pendingCount = questionnaire.questions.filter(q => q.status === 'pending').length;
  const totalCount = questionnaire.questions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const handleAnswerSelect = (answer: string, _kbEntryId?: string) => {
    if (activeQuestionId) {
      setAnswers(prev => ({ ...prev, [activeQuestionId]: answer }));
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSaveAnswer = async (questionId: string, answer: string, kbEntryId?: string) => {
    await onUpdateAnswer(questionId, answer, kbEntryId);
    onRefresh();
  };

  // Navigate to next unanswered question
  const goToNextPending = () => {
    const currentIndex = questionnaire.questions.findIndex(q => q.id === activeQuestionId);
    const nextPending = questionnaire.questions.find((q, i) => i > currentIndex && q.status === 'pending');
    if (nextPending) {
      setActiveQuestionId(nextPending.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Progress</h2>
              <p className="text-sm text-surface-400">
                {answeredCount} of {totalCount} questions answered
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={clsx(
                'px-2 py-1 text-xs font-medium rounded-full capitalize',
                questionnaire.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                questionnaire.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                'bg-amber-500/20 text-amber-400'
              )}>
                {questionnaire.status.replace('_', ' ')}
              </span>
              <span className={clsx(
                'px-2 py-1 text-xs font-medium rounded-full capitalize',
                questionnaire.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                questionnaire.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                'bg-surface-700 text-surface-300'
              )}>
                {questionnaire.priority} priority
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {questionnaire.dueDate && (
              <div className="text-right">
                <p className="text-xs text-surface-500">Due Date</p>
                <p className="text-sm font-medium text-surface-200">
                  {new Date(questionnaire.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowKbPanel(!showKbPanel)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                showKbPanel
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-700 text-surface-200 hover:bg-surface-600'
              )}
            >
              <BookOpenIcon className="w-4 h-4" />
              {showKbPanel ? 'Hide' : 'Show'} KB
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-2 bg-surface-700 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-surface-500">
          <span>{progressPercent}% complete</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {answeredCount} answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {pendingCount} pending
            </span>
          </div>
        </div>
      </div>

      {/* Split Panel Layout */}
      <div className="flex gap-4">
        {/* Questions Panel */}
        <div className={clsx(
          'space-y-3 transition-all',
          showKbPanel ? 'w-2/3' : 'w-full'
        )}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-surface-100">Questions</h3>
            {pendingCount > 0 && (
              <button
                onClick={goToNextPending}
                className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                Jump to next pending →
              </button>
            )}
          </div>
          
          <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-2">
            {questionnaire.questions.map((question, index) => (
              <QuestionAnswerCard
                key={question.id}
                question={question}
                index={index}
                onUpdateAnswer={handleSaveAnswer}
                isActive={activeQuestionId === question.id}
                onSelect={() => setActiveQuestionId(question.id)}
                onAnswerChange={(answer) => handleAnswerChange(question.id, answer)}
                currentAnswer={answers[question.id] || ''}
              />
            ))}
          </div>
        </div>

        {/* Knowledge Base Panel */}
        {showKbPanel && (
          <div className="w-1/3 sticky top-4">
            <KnowledgeBaseSearchPanel
              questionText={activeQuestion?.questionText || ''}
              onSelectAnswer={handleAnswerSelect}
              onClose={() => setShowKbPanel(false)}
              isOpen={true}
              className="h-[calc(100vh-380px)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Question Answer Card with Knowledge Base sidebar integration
function QuestionAnswerCard({
  question,
  index,
  onUpdateAnswer,
  isActive,
  onSelect,
  onAnswerChange,
  currentAnswer,
}: {
  question: Question;
  index: number;
  onUpdateAnswer: (questionId: string, answer: string, kbEntryId?: string) => void;
  isActive: boolean;
  onSelect: () => void;
  onAnswerChange: (answer: string) => void;
  currentAnswer: string;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdateAnswer(question.id, currentAnswer);
    setSaving(false);
  };

  const statusColors = {
    answered: 'bg-green-500/20 text-green-400 border-green-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div 
      className={clsx(
        'bg-surface-900 border rounded-lg transition-all cursor-pointer',
        isActive 
          ? 'border-brand-500 ring-2 ring-brand-500/20' 
          : 'border-surface-800 hover:border-surface-600'
      )}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-surface-700 text-surface-300 rounded-full">
                {question.questionNumber || index + 1}
              </span>
              {question.category && (
                <span className="px-2 py-0.5 text-xs bg-surface-700 text-surface-300 rounded">
                  {question.category}
                </span>
              )}
              <span className={clsx(
                'px-2 py-0.5 text-xs rounded-full capitalize border',
                statusColors[question.status as keyof typeof statusColors] || statusColors.pending
              )}>
                {question.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-surface-100 font-medium leading-relaxed">{question.questionText}</p>
          </div>
          <ChevronRightIcon className={clsx(
            'w-5 h-5 text-surface-400 transition-transform flex-shrink-0 ml-2',
            isActive && 'rotate-90'
          )} />
        </div>
        
        {isActive && (
          <div className="space-y-3 mt-4 pt-4 border-t border-surface-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-surface-400">
                Your Answer
              </label>
              <div className="flex items-center gap-2 text-xs text-surface-500">
                <BookOpenIcon className="w-4 h-4" />
                Use KB panel to find answers →
              </div>
            </div>
            
            <textarea
              value={currentAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500 resize-y"
              placeholder="Enter your answer here, or use the Knowledge Base panel to find a pre-approved answer..."
            />
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-surface-500">
                {currentAnswer.length > 0 && (
                  <span>{currentAnswer.split(/\s+/).filter(Boolean).length} words</span>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={currentAnswer === (question.answerText || '')}
                isLoading={saving}
                size="sm"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                Save Answer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
