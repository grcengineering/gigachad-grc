import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi, CategorizationRequest, CategorizationResponse } from '@/lib/api';
import { SparklesIcon, TagIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AICategorizationProps {
  title: string;
  description: string;
  entityType: 'control' | 'risk' | 'policy' | 'evidence';
  availableCategories?: string[];
  onSelectCategory?: (category: string, tags?: string[]) => void;
  className?: string;
}

export default function AICategorization({
  title,
  description,
  entityType,
  availableCategories,
  onSelectCategory,
  className,
}: AICategorizationProps) {
  const [result, setResult] = useState<CategorizationResponse | null>(null);

  const categorizeMutation = useMutation({
    mutationFn: (data: CategorizationRequest) => aiApi.categorize(data),
    onSuccess: (response) => {
      setResult(response.data.data);
      toast.success('AI categorization complete');
    },
    onError: (error: Error) => {
      toast.error(`AI categorization failed: ${error.message}`);
    },
  });

  const handleCategorize = () => {
    if (!title || !description) {
      toast.error('Please provide title and description');
      return;
    }

    categorizeMutation.mutate({
      title,
      description,
      entityType,
      availableCategories,
    });
  };

  const handleSelectCategory = (category: string) => {
    if (onSelectCategory) {
      onSelectCategory(category, result?.suggestedTags);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-500/20';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-500/20';
    return 'text-orange-600 bg-orange-500/20';
  };

  return (
    <div
      className={clsx(
        'bg-gradient-to-br from-cyan-900/20 to-teal-900/20 rounded-xl border border-cyan-500/30 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-cyan-500/30">
        <div className="flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-white">AI Category Suggestion</span>
        </div>

        <button
          onClick={handleCategorize}
          disabled={categorizeMutation.isPending || !title || !description}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
            categorizeMutation.isPending
              ? 'bg-cyan-500/30 text-cyan-700 cursor-wait'
              : 'bg-cyan-500/50 hover:bg-cyan-500/70 text-white'
          )}
        >
          {categorizeMutation.isPending ? (
            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <SparklesIcon className="w-3.5 h-3.5" />
          )}
          {result ? 'Re-analyze' : 'Suggest'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="p-3 space-y-3">
          {/* Primary Suggestion */}
          <div className="space-y-2">
            <div className="text-xs text-surface-600">Suggested Category</div>
            <button
              onClick={() => handleSelectCategory(result.suggestedCategory)}
              className="w-full flex items-center justify-between p-2 bg-white/50 hover:bg-white rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{result.suggestedCategory}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-xs',
                    getConfidenceColor(result.confidenceScore)
                  )}
                >
                  {Math.round(result.confidenceScore * 100)}%
                </span>
              </div>
              <CheckIcon className="w-4 h-4 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-xs text-surface-600">{result.rationale}</p>
          </div>

          {/* Alternatives */}
          {result.alternativeCategories.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-surface-600">Alternatives</div>
              <div className="space-y-1">
                {result.alternativeCategories.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectCategory(alt.category)}
                    className="w-full flex items-center justify-between p-2 bg-white/30 hover:bg-white/50 rounded-lg transition-colors text-sm group"
                  >
                    <span className="text-surface-700">{alt.category}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-xs',
                          getConfidenceColor(alt.confidence)
                        )}
                      >
                        {Math.round(alt.confidence * 100)}%
                      </span>
                      <CheckIcon className="w-3.5 h-3.5 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Tags */}
          {result.suggestedTags && result.suggestedTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-surface-600">Suggested Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {result.suggestedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-cyan-500/20 text-cyan-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
