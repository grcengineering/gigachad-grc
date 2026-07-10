import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Badge,
  Button,
  CategoryChip,
  DataTable,
  Dialog,
  EmptyState,
  FilterBar,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
  type ActiveFilter,
  type DataTableColumn,
} from '@/components/ui';

interface AnswerTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  usageCount?: number;
  updatedAt?: string;
}

interface AnswerTemplateListResponse {
  templates: AnswerTemplate[];
}

const CATEGORY_OPTS = [
  { value: 'security', label: 'Security' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'governance', label: 'Governance' },
  { value: 'general', label: 'General' },
];

function formatDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}

interface DraftTemplate {
  id?: string;
  name: string;
  category: string;
  body: string;
}

const EMPTY_DRAFT: DraftTemplate = { name: '', category: 'security', body: '' };

export default function AnswerTemplates() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const search = useDebounce(searchInput, 250);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftTemplate>(EMPTY_DRAFT);

  const { data, isLoading } = useQuery<AnswerTemplateListResponse>({
    queryKey: ['answer-templates', { search, category }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await api.get('/api/answer-templates', { params });
      const payload = res.data;
      if (Array.isArray(payload)) return { templates: payload };
      return { templates: payload?.templates ?? [] };
    },
  });

  const templates = useMemo(() => data?.templates ?? [], [data]);

  const createMutation = useMutation({
    mutationFn: async (payload: DraftTemplate) => {
      const res = await api.post('/api/answer-templates', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-templates'] });
      setDialogOpen(false);
      setDraft(EMPTY_DRAFT);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: DraftTemplate) => {
      const res = await api.put(`/api/answer-templates/${payload.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-templates'] });
      setDialogOpen(false);
      setDraft(EMPTY_DRAFT);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/answer-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-templates'] });
      setDialogOpen(false);
      setDraft(EMPTY_DRAFT);
    },
  });

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  };

  const openEdit = (t: AnswerTemplate) => {
    setDraft({
      id: t.id,
      name: t.name,
      category: t.category,
      body: t.body ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!draft.name.trim() || !draft.body.trim()) return;
    if (draft.id) updateMutation.mutate(draft);
    else createMutation.mutate(draft);
  };

  const handleDelete = () => {
    if (!draft.id) return;
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    deleteMutation.mutate(draft.id);
  };

  const activeFilters: ActiveFilter[] = [];
  if (search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${search}`,
      onClear: () => setSearchInput(''),
    });
  }
  if (category) {
    const l = CATEGORY_OPTS.find((o) => o.value === category)?.label ?? category;
    activeFilters.push({
      key: 'category',
      label: `Category: ${l}`,
      onClear: () => setCategory(''),
    });
  }

  const clearAll = () => {
    setSearchInput('');
    setCategory('');
  };

  const columns: DataTableColumn<AnswerTemplate>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      mobileLabel: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="text-surface-900 font-medium">{row.original.name}</p>
          <p className="text-xs text-surface-500 truncate max-w-md">
            {row.original.body}
          </p>
        </div>
      ),
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      mobileLabel: 'Category',
      cell: ({ row }) => <CategoryChip value={row.original.category} />,
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      header: 'Last updated',
      mobileLabel: 'Updated',
      cell: ({ row }) => (
        <span className="text-surface-700">{formatDate(row.original.updatedAt)}</span>
      ),
    },
    {
      id: 'usageCount',
      accessorKey: 'usageCount',
      header: 'Usage',
      mobileLabel: 'Usage',
      cell: ({ row }) => (
        <Badge variant="neutral">{row.original.usageCount ?? 0}</Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Answer Templates"
        description="Reusable answers for security questionnaires, audits, and customer due diligence."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Create template
          </Button>
        }
      />

      <FilterBar
        active={activeFilters}
        onClearAll={activeFilters.length ? clearAll : undefined}
      >
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
          className="w-48"
          placeholder="All categories"
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={templates}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        onRowClick={openEdit}
        emptyState={
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No templates yet"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all templates.'
                : 'Create your first answer template to speed up questionnaire responses.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={openCreate}
                >
                  Create template
                </Button>
              )
            }
          />
        }
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={draft.id ? 'Edit template' : 'Create template'}
        description={
          draft.id
            ? 'Update this reusable answer.'
            : 'Capture a reusable answer for questionnaires and audits.'
        }
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <div>
              {draft.id && (
                <Button
                  variant="danger"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  loading={deleteMutation.isPending}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={!draft.name.trim() || !draft.body.trim()}
                onClick={handleSave}
              >
                {draft.id ? 'Save changes' : 'Create template'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="tmpl-name" required>
              Name
            </Label>
            <Input
              id="tmpl-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g., Encryption in transit"
            />
          </div>
          <div>
            <Label required>Category</Label>
            <Select
              value={draft.category}
              onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
              options={CATEGORY_OPTS}
            />
          </div>
          <div>
            <Label htmlFor="tmpl-body" required>
              Answer body
            </Label>
            <Textarea
              id="tmpl-body"
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              rows={8}
              placeholder="The canonical answer text. Use {{variables}} for substitutions."
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
