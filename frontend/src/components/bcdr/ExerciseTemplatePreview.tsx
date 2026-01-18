import {
  XMarkIcon,
  ClockIcon,
  UserGroupIcon,
  TagIcon,
  QuestionMarkCircleIcon,
  BoltIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface ExerciseTemplatePreviewProps {
  template: ExerciseTemplate;
  onClose: () => void;
  onUseTemplate: () => void;
  canClone?: boolean;
}

interface ExerciseTemplate {
  id: string;
  templateId: string;
  title: string;
  description: string;
  category: string;
  scenarioType: string;
  scenarioNarrative: string;
  discussionQuestions: DiscussionQuestion[];
  injects?: ScenarioInject[];
  expectedDecisions?: string[];
  facilitatorNotes?: string;
  estimatedDuration?: number;
  participantRoles?: ParticipantRole[];
  tags: string[];
  isGlobal: boolean;
  usageCount: number;
}

interface DiscussionQuestion {
  id: string;
  question: string;
  category: string;
  timing?: string;
  expectedResponses?: string[];
}

interface ScenarioInject {
  id: string;
  timing: string;
  title: string;
  description: string;
  expectedActions?: string[];
}

interface ParticipantRole {
  role: string;
  description: string;
  required: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  ransomware: 'bg-red-500',
  natural_disaster: 'bg-orange-500',
  vendor_outage: 'bg-yellow-500',
  data_breach: 'bg-purple-500',
  pandemic: 'bg-blue-500',
  infrastructure: 'bg-cyan-500',
};

const SCENARIO_TYPE_LABELS: Record<string, string> = {
  tabletop: 'Tabletop Exercise',
  walkthrough: 'Walkthrough',
  simulation: 'Full Simulation',
};

// ============================================
// Exercise Template Preview Component
// ============================================

export function ExerciseTemplatePreview({
  template,
  onClose,
  onUseTemplate,
  canClone = true,
}: ExerciseTemplatePreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                'w-3 h-3 rounded-full',
                CATEGORY_COLORS[template.category] || 'bg-slate-500'
              )}
            />
            <div>
              <h2 className="text-xl font-semibold text-white">{template.title}</h2>
              <p className="text-sm text-slate-400">
                {SCENARIO_TYPE_LABELS[template.scenarioType] || template.scenarioType}
                {template.isGlobal && (
                  <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                    Global Template
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm">
            {template.estimatedDuration && (
              <div className="flex items-center gap-2 text-slate-400">
                <ClockIcon className="h-4 w-4" />
                <span>{template.estimatedDuration} minutes</span>
              </div>
            )}
            {template.participantRoles && (
              <div className="flex items-center gap-2 text-slate-400">
                <UserGroupIcon className="h-4 w-4" />
                <span>{template.participantRoles.length} roles</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-400">
              <TagIcon className="h-4 w-4" />
              <span className="capitalize">{template.category.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Description */}
          {template.description && (
            <div>
              <p className="text-slate-300">{template.description}</p>
            </div>
          )}

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Scenario Narrative */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-3">Scenario Narrative</h3>
            <div className="text-slate-300 whitespace-pre-wrap text-sm">
              {template.scenarioNarrative}
            </div>
          </div>

          {/* Participant Roles */}
          {template.participantRoles && template.participantRoles.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-slate-400" />
                Participant Roles
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {template.participantRoles.map((role, index) => (
                  <div key={index} className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{role.role}</span>
                      {role.required && (
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discussion Questions */}
          {template.discussionQuestions && template.discussionQuestions.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <QuestionMarkCircleIcon className="h-5 w-5 text-slate-400" />
                Discussion Questions ({template.discussionQuestions.length})
              </h3>
              <div className="space-y-3">
                {template.discussionQuestions.map((q, index) => (
                  <div key={q.id || index} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-white">{q.question}</p>
                        {q.category && (
                          <span className="text-xs text-slate-400 mt-1 inline-block">
                            Category: {q.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenario Injects */}
          {template.injects && template.injects.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <BoltIcon className="h-5 w-5 text-slate-400" />
                Scenario Injects ({template.injects.length})
              </h3>
              <div className="space-y-3">
                {template.injects.map((inject, index) => (
                  <div key={inject.id || index} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">
                        {inject.timing}
                      </span>
                      <span className="text-white font-medium">{inject.title}</span>
                    </div>
                    <p className="text-sm text-slate-300">{inject.description}</p>
                    {inject.expectedActions && inject.expectedActions.length > 0 && (
                      <div className="mt-2 text-sm text-slate-400">
                        <span className="font-medium">Expected actions: </span>
                        {inject.expectedActions.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected Decisions */}
          {template.expectedDecisions && template.expectedDecisions.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-slate-400" />
                Expected Decisions
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {template.expectedDecisions.map((decision, index) => (
                  <li key={index}>{decision}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Facilitator Notes */}
          {template.facilitatorNotes && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-2">Facilitator Notes</h3>
              <div className="text-sm text-slate-300 whitespace-pre-wrap">
                {template.facilitatorNotes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            Used {template.usageCount} times
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {canClone && (
              <Button variant="primary" onClick={onUseTemplate}>
                Use This Template
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
