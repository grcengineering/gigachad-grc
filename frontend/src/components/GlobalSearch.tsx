import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  FolderIcon,
  CubeIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface SearchResult {
  type: 'control' | 'framework' | 'policy' | 'evidence' | 'integration' | 'risk' | 'vendor' | 'audit' | 'user' | 'asset';
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

const SEARCH_ICONS = {
  control: ShieldCheckIcon,
  framework: CubeIcon,
  policy: DocumentTextIcon,
  evidence: FolderIcon,
  integration: LinkIcon,
  risk: ExclamationTriangleIcon,
  vendor: BuildingOfficeIcon,
  audit: ClipboardDocumentListIcon,
  user: UsersIcon,
  asset: ServerStackIcon,
};

const SEARCH_LABELS = {
  control: 'Control',
  framework: 'Framework',
  policy: 'Policy',
  evidence: 'Evidence',
  integration: 'Integration',
  risk: 'Risk',
  vendor: 'Vendor',
  audit: 'Audit',
  user: 'User',
  asset: 'Asset',
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Search API call with debounce
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/search/global`, {
          params: { q: query },
          withCredentials: true,
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    enabled: query.length >= 2,
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }

      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }

      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-xl">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search everything... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSelectedIndex(0);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-900 border border-surface-800 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-surface-400">
              <div className="animate-spin w-5 h-5 border-2 border-surface-700 border-t-brand-500 rounded-full mx-auto"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-surface-400">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result: SearchResult, index: number) => {
                const Icon = SEARCH_ICONS[result.type];
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    className={clsx(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      isSelected
                        ? 'bg-brand-500/20 text-surface-100'
                        : 'text-surface-300 hover:bg-surface-800'
                    )}
                  >
                    <div className={clsx(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-brand-500/30' : 'bg-surface-800'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.title}</span>
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded',
                          isSelected ? 'bg-brand-500/30 text-brand-300' : 'bg-surface-800 text-surface-500'
                        )}>
                          {SEARCH_LABELS[result.type]}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-surface-500 truncate mt-0.5">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
