import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Clock, FileText, Layers } from 'lucide-react';
import api from '@/lib/api';
import {
  Button,
  Badge,
  Card,
  CardBody,
  PageHeader,
  FilterBar,
  Select,
  Input,
  EmptyState,
  Skeleton,
  type BadgeVariant,
  type ActiveFilter,
} from '@/components/ui';

interface ExerciseTemplate {
  id: string;
  templateId?: string;
  template_id?: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  estimated_duration?: number;
  duration?: number;
  scenarios?: unknown[];
  scenarioCount?: number;
  scenario_count?: number;
  discussionQuestions?: unknown[];
  discussion_questions?: unknown[];
  isGlobal?: boolean;
  is_global?: boolean;
  tags?: string[];
}

interface CategoryStat {
  category: string;
  count: number;
}

const DIFFICULTY_VARIANT: Record<string, BadgeVariant> = {
  beginner: 'success',
  easy: 'success',
  intermediate: 'warning',
  medium: 'warning',
  advanced: 'danger',
  hard: 'danger',
  expert: 'danger',
};

function pick<T>(...vals: (T | undefined)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

function formatDuration(minutes?: number) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

function toTitle(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ExerciseTemplates() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
  };

  const [searchInput, setSearchInput] = useState(filters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (debouncedSearch) params.set('search', debouncedSearch);
        else params.delete('search');
        return params;
      },
      { replace: true }
    );
  }, [debouncedSearch, setSearchParams]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const { data: templates = [], isLoading } = useQuery<ExerciseTemplate[]>({
    queryKey: ['exercise-templates', debouncedSearch, filters.category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.category) params.append('category', filters.category);
      const qs = params.toString();
      const res = await api.get(`/api/bcdr/exercise-templates${qs ? `?${qs}` : ''}`);
      const body = res.data;
      if (Array.isArray(body)) return body;
      return body?.data ?? [];
    },
  });

  const { data: categories = [] } = useQuery<CategoryStat[]>({
    queryKey: ['exercise-template-categories'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/exercise-templates/categories');
      const body = res.data;
      if (Array.isArray(body)) return body;
      return body?.data ?? [];
    },
  });

  const categoryOptions = categories
    .filter((c) => !!c.category)
    .map((c) => ({
      value: c.category,
      label: `${toTitle(c.category)} (${c.count})`,
    }));

  const activeFilters: ActiveFilter[] = [];
  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${filters.search}`,
      onClear: () => {
        setSearchInput('');
        updateFilter('search', '');
      },
    });
  }
  if (filters.category) {
    activeFilters.push({
      key: 'category',
      label: `Category: ${toTitle(filters.category)}`,
      onClear: () => updateFilter('category', ''),
    });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Exercise Templates"
        description="Pre-built tabletop scenarios for BC/DR drills and DR testing."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Create Template
          </Button>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search templates…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-56"
          placeholder="All Categories"
          value={filters.category}
          onChange={(v) => updateFilter('category', v)}
          options={categoryOptions}
          clearable
          searchable
        />
      </FilterBar>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No exercise templates found"
              description={
                activeFilters.length
                  ? 'Try clearing your filters to see all templates.'
                  : 'Create a tabletop exercise template to get started.'
              }
              action={
                activeFilters.length ? (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    Create Template
                  </Button>
                )
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const name = pick(tpl.name, tpl.title) ?? 'Untitled template';
            const duration = formatDuration(
              pick(tpl.estimatedDuration, tpl.estimated_duration, tpl.duration)
            );
            const scenarioCount =
              pick(tpl.scenarioCount, tpl.scenario_count) ??
              (Array.isArray(tpl.scenarios) ? tpl.scenarios.length : undefined) ??
              (Array.isArray(tpl.discussionQuestions)
                ? tpl.discussionQuestions.length
                : Array.isArray(tpl.discussion_questions)
                  ? tpl.discussion_questions.length
                  : 0);
            const isGlobal = pick(tpl.isGlobal, tpl.is_global);

            return (
              <Card key={tpl.id} interactive>
                <CardBody density="comfy" className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {tpl.category && (
                        <p className="text-xs uppercase tracking-wider text-surface-500">
                          {toTitle(tpl.category)}
                        </p>
                      )}
                      <h3 className="text-h3 text-surface-900 mt-0.5">{name}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {tpl.difficulty && (
                        <Badge variant={DIFFICULTY_VARIANT[tpl.difficulty] ?? 'neutral'} size="sm">
                          {tpl.difficulty.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {isGlobal && (
                        <Badge variant="info" size="sm">
                          Global
                        </Badge>
                      )}
                    </div>
                  </div>

                  {tpl.description && (
                    <p className="text-small text-surface-700 line-clamp-3">{tpl.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-small text-surface-700 pt-2 border-t border-surface-200">
                    {duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4 text-surface-500" />
                        {duration}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-4 w-4 text-surface-500" />
                      {scenarioCount} {scenarioCount === 1 ? 'scenario' : 'scenarios'}
                    </span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
