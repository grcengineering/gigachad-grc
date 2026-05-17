import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  SparklesIcon, 
  ArrowPathIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { trustAiApi, trustConfigApi, AnswerSuggestion } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/Button';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AIAnswerAssistantProps {
  questionText: string;
  currentAnswer?: string;
  onApplySuggestion: (answer: string) => void;
  className?: string;
}

export function AIAnswerAssistant({
  questionText,
  currentAnswer,
  onApplySuggestion,
  className,
}: AIAnswerAssistantProps) {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const [suggestion, setSuggestion] = useState<AnswerSuggestion | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);

  // Check if AI is enabled
  const checkAiMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Not signed in');
      const response = await trustConfigApi.get(organizationId);
      return response.data.aiSettings?.enabled === true;
    },
    onSuccess: (enabled) => {
      setAiEnabled(enabled);
    },
    onError: () => {
      setAiEnabled(false);
    },
  });

  // Generate draft answer
  const draftMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Not signed in');
      const response = await trustAiApi.draftAnswer(organizationId, questionText);
      return response.data;
    },
    onSuccess: (data) => {
      setSuggestion(data);
      setIsExpanded(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate answer');
    },
  });

  // Improve existing answer
  const improveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Not signed in');
      if (!currentAnswer) throw new Error('No current answer to improve');
      const response = await trustAiApi.improveAnswer(organizationId, questionText, currentAnswer);
      return response.data;
    },
    onSuccess: (data) => {
      setSuggestion(data);
      setIsExpanded(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to improve answer');
    },
  });

  const handleApply = () => {
    if (suggestion) {
      onApplySuggestion(suggestion.suggestedAnswer);
      toast.success('AI suggestion applied');
    }
  };

  const handleCopy = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion.suggestedAnswer);
      toast.success('Copied to clipboard');
    }
  };

  // Check AI status on first interaction
  const handleGenerateDraft = () => {
    if (aiEnabled === null) {
      checkAiMutation.mutate();
    }
    draftMutation.mutate();
  };

  const isLoading = draftMutation.isPending || improveMutation.isPending || checkAiMutation.isPending;

  const confidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className={clsx(
      'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg overflow-hidden',
      className
    )}>
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-purple-500/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-surface-100">AI Assistant</span>
          {aiEnabled === false && (
            <span className="text-xs text-surface-500">(Disabled)</span>
          )}
        </div>
        <button className="p-1 text-surface-400 hover:text-surface-200">
          {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateDraft}
              isLoading={draftMutation.isPending}
              leftIcon={<LightBulbIcon className="w-4 h-4" />}
              className="flex-1 border-purple-500/50 hover:border-purple-500 text-purple-300"
            >
              Draft Answer
            </Button>
            {currentAnswer && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => improveMutation.mutate()}
                isLoading={improveMutation.isPending}
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
                className="flex-1 border-blue-500/50 hover:border-blue-500 text-blue-300"
              >
                Improve Answer
              </Button>
            )}
          </div>

          {/* Suggestion Display */}
          {suggestion && (
            <div className="space-y-3">
              {/* Confidence Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400">Confidence:</span>
                  <span className={clsx('text-sm font-bold', confidenceColor(suggestion.confidence))}>
                    {suggestion.confidence}%
                  </span>
                </div>
                {suggestion.sources.length > 0 && (
                  <span className="text-xs text-surface-500">
                    {suggestion.sources.length} KB source{suggestion.sources.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Suggested Answer */}
              <div className="bg-surface-800/50 rounded-lg p-3 border border-surface-700">
                <p className="text-sm text-surface-200 whitespace-pre-wrap">
                  {suggestion.suggestedAnswer}
                </p>
              </div>

              {/* Reasoning */}
              {suggestion.reasoning && (
                <div className="flex items-start gap-2 text-xs text-surface-400">
                  <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{suggestion.reasoning}</span>
                </div>
              )}

              {/* Sources */}
              {suggestion.sources.length > 0 && (
                <div>
                  <p className="text-xs text-surface-500 mb-1">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestion.sources.map((source) => (
                      <span 
                        key={source.id}
                        className="px-2 py-0.5 text-xs bg-surface-700 text-surface-300 rounded"
                      >
                        {source.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleApply}
                  leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                  className="flex-1"
                >
                  Apply Suggestion
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  leftIcon={<ClipboardDocumentIcon className="w-4 h-4" />}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!suggestion && !isLoading && (
            <p className="text-xs text-surface-500 text-center py-2">
              Click "Draft Answer" to generate an AI-powered response based on your knowledge base
            </p>
          )}
        </div>
      )}
    </div>
  );
}

