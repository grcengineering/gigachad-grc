import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Library, Check } from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CategoryChip,
  EmptyState,
  FilterBar,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '@/components/ui';

interface FrameworkTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  requirementCount: number;
  enabled: boolean;
}

export default function FrameworkLibrary() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const { data, isLoading } = useQuery<FrameworkTemplate[]>({
    queryKey: ['framework-library'],
    queryFn: async () => {
      const res = await api.get('/api/framework-library');
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? (payload as FrameworkTemplate[]) : [];
    },
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/framework-library/${id}/enable`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['framework-library'] }),
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((f) => f.category && set.add(f.category));
    return Array.from(set).sort();
  }, [data]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((c) => ({ value: c, label: c })),
    ],
    [categories],
  );

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = debouncedSearch.trim().toLowerCase();
    return list.filter((fw) => {
      if (category && fw.category !== category) return false;
      if (q) {
        const hay = `${fw.name} ${fw.description} ${fw.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, debouncedSearch, category]);

  const active = useMemo(() => {
    const out: { key: string; label: string; onClear: () => void }[] = [];
    if (debouncedSearch) {
      out.push({ key: 'search', label: `Search: ${debouncedSearch}`, onClear: () => setSearch('') });
    }
    if (category) {
      out.push({ key: 'category', label: `Category: ${category}`, onClear: () => setCategory('') });
    }
    return out;
  }, [debouncedSearch, category]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Framework Library"
        description="Browse and enable compliance framework templates for your workspace."
      />

      <FilterBar
        active={active}
        onClearAll={
          active.length > 0
            ? () => {
                setSearch('');
                setCategory('');
              }
            : undefined
        }
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search frameworks…"
          leftIcon={<Search className="h-4 w-4" />}
          className="max-w-sm"
        />
        <div className="w-56">
          <Select
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            placeholder="All categories"
            clearable
          />
        </div>
      </FilterBar>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Library className="h-8 w-8" />}
            title="No framework templates"
            description="Try adjusting your filters or check back later for new templates."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fw) => (
            <Card key={fw.id} className="h-full flex flex-col">
              <CardBody density="comfy" className="flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <CategoryChip value={fw.type} case="upper" />
                  {fw.enabled ? (
                    <Badge variant="success" dot>
                      Enabled
                    </Badge>
                  ) : null}
                </div>
                <h3 className="text-h3 text-surface-900">{fw.name}</h3>
                {fw.description && (
                  <p className="text-small text-surface-600 mt-1.5 line-clamp-3">
                    {fw.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-surface-200">
                  <div>
                    <p className="text-xs text-surface-500">Requirements</p>
                    <p className="text-small font-medium text-surface-800">
                      {fw.requirementCount}
                    </p>
                  </div>
                  {fw.enabled ? (
                    <Button variant="ghost" size="sm" disabled leftIcon={<Check className="h-4 w-4" />}>
                      Added
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => enableMutation.mutate(fw.id)}
                      loading={enableMutation.isPending && enableMutation.variables === fw.id}
                    >
                      Enable
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
