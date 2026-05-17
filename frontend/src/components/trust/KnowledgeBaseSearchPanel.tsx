import { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  BookOpenIcon, 
  CheckBadgeIcon,
  ClockIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { knowledgeBaseApi } from '../../lib/api';
import { KnowledgeBaseEntry } from '../../lib/apiTypes';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface KnowledgeBaseSearchPanelProps {
  questionText: string;
  onSelectAnswer: (answer: string, kbEntryId?: string) => void;
  onClose?: () => void;
  isOpen: boolean;
  className?: string;
}

export function KnowledgeBaseSearchPanel({
  questionText,
  onSelectAnswer,
  onClose,
  isOpen,
  className,
}: KnowledgeBaseSearchPanelProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoSearched, setAutoSearched] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);

  const organizationId = user?.organizationId;

  // Debounced search
  const searchKnowledgeBase = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      return;
    }
    if (!organizationId) {
      // Panel can't search without a tenant context; parent handles the
      // sign-in prompt at the page level.
      return;
    }

    setLoading(true);
    try {
      const response = await knowledgeBaseApi.search(organizationId, query);
      setResults(response.data || []);
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      // Fallback to list with search param
      try {
        const fallbackResponse = await knowledgeBaseApi.list({ 
          organizationId, 
          search: query,
          status: 'approved'
        });
        setResults(fallbackResponse.data || []);
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Auto-search based on question text when panel opens
  useEffect(() => {
    if (isOpen && questionText && !autoSearched) {
      // Extract key terms from question (first 100 chars, remove common words)
      const keyTerms = questionText
        .slice(0, 100)
        .toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(' ')
        .filter(word => word.length > 3 && !['what', 'when', 'where', 'which', 'does', 'have', 'your', 'this', 'that', 'with', 'from', 'into'].includes(word))
        .slice(0, 5)
        .join(' ');
      
      if (keyTerms) {
        setSearchQuery(keyTerms);
        searchKnowledgeBase(keyTerms);
        setAutoSearched(true);
      }
    }
  }, [isOpen, questionText, autoSearched, searchKnowledgeBase]);

  // Reset when panel closes
  useEffect(() => {
    if (!isOpen) {
      setAutoSearched(false);
      setSelectedEntry(null);
    }
  }, [isOpen]);

  // Debounce manual search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchKnowledgeBase(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchKnowledgeBase]);

  const handleUseAnswer = async (entry: KnowledgeBaseEntry) => {
    onSelectAnswer(entry.answer || '', entry.id);
    // Track usage
    try {
      await knowledgeBaseApi.incrementUsage(entry.id);
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
    toast.success('Answer applied from Knowledge Base');
  };

  const handleCopyAnswer = (entry: KnowledgeBaseEntry) => {
    navigator.clipboard.writeText(entry.answer || '');
    toast.success('Answer copied to clipboard');
  };

  if (!isOpen) return null;

  return (
    <div className={clsx(
      'bg-surface-900 border border-surface-700 rounded-xl shadow-xl overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="bg-surface-800 px-4 py-3 flex items-center justify-between border-b border-surface-700">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-surface-100">Knowledge Base</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-surface-400 hover:text-surface-200 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-surface-700">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-100 text-sm focus:outline-none focus:border-brand-500 placeholder:text-surface-500"
          />
          {loading && (
            <ArrowPathIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 animate-spin" />
          )}
        </div>
        <p className="text-xs text-surface-500 mt-2">
          {results.length > 0 
            ? `Found ${results.length} matching entries`
            : searchQuery.length > 0 && searchQuery.length < 3
              ? 'Type at least 3 characters to search'
              : 'Search by keywords, tags, or categories'
          }
        </p>
      </div>

      {/* Results List */}
      <div className="max-h-80 overflow-y-auto">
        {results.length === 0 && !loading && searchQuery.length >= 3 && (
          <div className="p-6 text-center text-surface-400">
            <BookOpenIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No matching entries found</p>
            <p className="text-xs mt-1">Try different keywords</p>
          </div>
        )}

        {results.map((entry) => (
          <div
            key={entry.id}
            className={clsx(
              'border-b border-surface-700 last:border-b-0 transition-colors',
              selectedEntry?.id === entry.id 
                ? 'bg-brand-500/10' 
                : 'hover:bg-surface-800'
            )}
          >
            <button
              onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
              className="w-full p-3 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-100 truncate">
                      {entry.title}
                    </span>
                    {entry.status === 'approved' && (
                      <CheckBadgeIcon className="w-4 h-4 text-green-400 flex-shrink-0" title="Approved" />
                    )}
                  </div>
                  {entry.question && (
                    <p className="text-xs text-surface-400 line-clamp-1 mb-1">
                      Q: {entry.question}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-surface-500">
                    {entry.category && (
                      <span className="px-1.5 py-0.5 bg-surface-700 rounded">
                        {entry.category}
                      </span>
                    )}
                    {entry.usageCount && entry.usageCount > 0 && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        Used {entry.usageCount}x
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Expanded View */}
            {selectedEntry?.id === entry.id && (
              <div className="px-3 pb-3 space-y-3">
                <div className="bg-surface-800 rounded-lg p-3 border border-surface-600">
                  <p className="text-sm text-surface-200 whitespace-pre-wrap">
                    {entry.answer || 'No answer content'}
                  </p>
                </div>
                
                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-xs bg-surface-700 text-surface-300 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUseAnswer(entry)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    Use This Answer
                  </button>
                  <button
                    onClick={() => handleCopyAnswer(entry)}
                    className="px-3 py-2 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 bg-surface-800 border-t border-surface-700">
        <p className="text-xs text-surface-500 text-center">
          Click an entry to preview, then "Use This Answer" to apply
        </p>
      </div>
    </div>
  );
}

