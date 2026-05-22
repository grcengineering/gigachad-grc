import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi, SmartSearchRequest, SmartSearchInterpretation } from '@/lib/api';
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useDebounce } from '@/hooks/useDebounce';

import { Input } from '@/components/ui/Input';

interface AISmartSearchProps {
  onSearch?: (terms: string[], filters: Record<string, string>, entityTypes: string[]) => void;
  placeholder?: string;
  className?: string;
}

const ENTITY_OPTIONS = [
  { value: 'controls', label: 'Controls' },
  { value: 'risks', label: 'Risks' },
  { value: 'policies', label: 'Policies' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'evidence', label: 'Evidence' },
] as const;

export default function AISmartSearch({
  onSearch,
  placeholder = "Ask a question or describe what you're looking for...",
  className,
}: AISmartSearchProps) {
  const [query, setQuery] = useState('');
  const [interpretation, setInterpretation] = useState<SmartSearchInterpretation | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(query, 500);

  const interpretMutation = useMutation({
    mutationFn: (data: SmartSearchRequest) => aiApi.interpretSearch(data),
    onSuccess: (response) => {
      setInterpretation(response.data.data);
    },
    onError: () => {
      // Silent fail - just don't show interpretation
    },
  });

  // Auto-interpret when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length > 10) {
      interpretMutation.mutate({
        query: debouncedQuery,
        searchIn:
          selectedEntities.length > 0
            ? (selectedEntities as SmartSearchRequest['searchIn'])
            : undefined,
      });
    }
  }, [debouncedQuery, selectedEntities]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setInterpretation(null);
  }, []);

  const handleSearch = () => {
    if (!query.trim()) return;

    if (interpretation && onSearch) {
      onSearch(interpretation.searchTerms, interpretation.filters, interpretation.entityTypes);
    } else {
      // Fallback to basic search
      onSearch?.([query], {}, selectedEntities);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleEntity = (entity: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  return (
    <div className={clsx('space-y-2', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {interpretMutation.isPending ? (
            <ArrowPathIcon className="w-5 h-5 text-purple-600 animate-spin" />
          ) : (
            <SparklesIcon className="w-5 h-5 text-purple-600" />
          )}
        </div>

        <Input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-3 bg-white border border-surface-200 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all dark:bg-surface-900"
        />

        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              showFilters ? 'bg-purple-500/30 text-purple-700' : 'text-surface-600 hover:text-white'
            )}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>

          <button
            onClick={handleSearch}
            disabled={!query.trim()}
            className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Entity Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/50 rounded-lg border border-surface-200 dark:bg-surface-900/50">
          <span className="text-xs text-surface-600 mr-2 self-center">Search in:</span>
          {ENTITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleEntity(option.value)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                selectedEntities.includes(option.value)
                  ? 'bg-purple-500/30 text-purple-700 border border-purple-500/50'
                  : 'bg-surface-200/50 text-surface-600 hover:text-white border border-transparent'
              )}
            >
              {option.label}
            </button>
          ))}

          {selectedEntities.length > 0 && (
            <button
              onClick={() => setSelectedEntities([])}
              className="px-2 py-1 text-xs text-surface-600 hover:text-white"
            >
              Clear all
            </button>
          )}
        </div>
      )}
      {/* AI Interpretation */}
      {interpretation && (
        <div className="p-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">AI Interpretation</span>
            </div>
            <button
              onClick={() => setInterpretation(null)}
              className="text-surface-600 hover:text-white"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-white mb-2">{interpretation.interpretedQuery}</p>

          <div className="flex flex-wrap gap-2">
            {interpretation.searchTerms.map((term, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-purple-500/20 text-purple-700 rounded text-xs"
              >
                {term}
              </span>
            ))}

            {Object.entries(interpretation.filters).map(
              ([key, value]) =>
                value && (
                  <span
                    key={key}
                    className="px-2 py-0.5 bg-cyan-500/20 text-cyan-700 rounded text-xs"
                  >
                    {key}: {value}
                  </span>
                )
            )}
          </div>

          {interpretation.entityTypes.length > 0 && (
            <div className="mt-2 text-xs text-surface-600">
              Searching: {interpretation.entityTypes.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
