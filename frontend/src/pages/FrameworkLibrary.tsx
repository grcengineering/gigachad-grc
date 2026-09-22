import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Library, Check, Eye, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CategoryChip,
  Dialog,
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
  version: string;
  source: string;
  category: string;
  description: string;
  requirementCount: number;
  categoryCount: number;
  isActivated: boolean;
  activatedFrameworkId?: string;
}

interface FrameworkRequirement {
  reference: string;
  title: string;
  description: string;
  children?: FrameworkRequirement[];
}

interface FrameworkDetail extends FrameworkTemplate {
  requirements: FrameworkRequirement[];
}

function RequirementList({ requirements }: { requirements: FrameworkRequirement[] }) {
  return (
    <ul className="space-y-2">
      {requirements.map((requirement) => (
        <li key={requirement.reference} className="rounded-md border border-surface-200 p-3">
          <div className="flex items-start gap-2">
            <code className="text-xs text-brand-700 dark:text-brand-500">
              {requirement.reference}
            </code>
            <div>
              <p className="text-small font-medium text-surface-900">{requirement.title}</p>
              {requirement.description && (
                <p className="mt-1 text-xs text-surface-600">{requirement.description}</p>
              )}
            </div>
          </div>
          {requirement.children?.length ? (
            <div className="mt-2 ml-4">
              <RequirementList requirements={requirement.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function FrameworkLibrary() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 200);

  const { data, isLoading, isError, refetch } = useQuery<FrameworkTemplate[]>({
    queryKey: ['framework-catalog-status'],
    queryFn: async () => {
      const res = await api.get('/api/frameworks/catalog/status');
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? (payload as FrameworkTemplate[]) : [];
    },
  });

  const { data: preview, isLoading: isPreviewLoading } = useQuery<FrameworkDetail>({
    queryKey: ['framework-catalog-detail', previewId],
    queryFn: () =>
      api
        .get<FrameworkDetail>(`/api/frameworks/catalog/${previewId}`)
        .then((response) => response.data),
    enabled: Boolean(previewId),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/frameworks/catalog/${id}/activate`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['framework-catalog-status'] }),
        queryClient.invalidateQueries({ queryKey: ['frameworks'] }),
      ]);
      toast.success('Framework enabled');
    },
    onError: () => toast.error('Failed to enable framework'),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/frameworks/catalog/${id}/deactivate`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['framework-catalog-status'] }),
        queryClient.invalidateQueries({ queryKey: ['frameworks'] }),
      ]);
      toast.success('Framework disabled');
    },
    onError: () => toast.error('Failed to disable framework'),
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
    [categories]
  );

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = debouncedSearch.trim().toLowerCase();
    return list.filter((fw) => {
      if (category && fw.category !== category) return false;
      if (q) {
        const hay = `${fw.name} ${fw.description} ${fw.source}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, debouncedSearch, category]);

  const active = useMemo(() => {
    const out: { key: string; label: string; onClear: () => void }[] = [];
    if (debouncedSearch) {
      out.push({
        key: 'search',
        label: `Search: ${debouncedSearch}`,
        onClear: () => setSearch(''),
      });
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
      ) : isError ? (
        <Card>
          <EmptyState
            icon={<Library className="h-8 w-8" />}
            title="Framework catalog unavailable"
            description="The catalog API could not be reached. Check service routing and try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Library className="h-8 w-8" />}
            title="No framework templates"
            description={
              search || category
                ? 'Try adjusting your filters.'
                : 'No frameworks are currently available in the catalog.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fw) => (
            <Card key={fw.id} className="h-full flex flex-col">
              <CardBody density="comfy" className="flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <CategoryChip value={fw.source || fw.category} case="upper" />
                  {fw.isActivated ? (
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
                <p className="mt-2 text-xs text-surface-500">Version {fw.version}</p>
                <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-surface-200">
                  <div>
                    <p className="text-xs text-surface-500">Requirements</p>
                    <p className="text-small font-medium text-surface-800">{fw.requirementCount}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewId(fw.id)}
                      leftIcon={<Eye className="h-4 w-4" />}
                    >
                      Preview
                    </Button>
                    {fw.isActivated && fw.activatedFrameworkId ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => disableMutation.mutate(fw.activatedFrameworkId!)}
                        loading={
                          disableMutation.isPending &&
                          disableMutation.variables === fw.activatedFrameworkId
                        }
                        leftIcon={<X className="h-4 w-4" />}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => enableMutation.mutate(fw.id)}
                        loading={enableMutation.isPending && enableMutation.variables === fw.id}
                        leftIcon={<Plus className="h-4 w-4" />}
                      >
                        Enable
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(previewId)}
        onClose={() => setPreviewId(null)}
        title={preview?.name || 'Framework preview'}
        description={
          preview ? `${preview.source} · Version ${preview.version}` : 'Loading framework details…'
        }
        size="xl"
        footer={
          preview && !preview.isActivated ? (
            <Button
              onClick={() => enableMutation.mutate(preview.id)}
              loading={enableMutation.isPending && enableMutation.variables === preview.id}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Enable framework
            </Button>
          ) : undefined
        }
      >
        {isPreviewLoading || !preview ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="space-y-4">
            <p className="text-small text-surface-600">{preview.description}</p>
            <div className="flex gap-4 text-small text-surface-600">
              <span>{preview.requirementCount} requirements</span>
              <span>{preview.categoryCount} categories</span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <RequirementList requirements={preview.requirements} />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
