import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Search, Copy, PlayCircle, Pencil, Trash2 } from 'lucide-react';
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
  Label,
  PageHeader,
  Select,
  SkeletonRows,
  Textarea,
  type ActiveFilter,
} from '@/components/ui';

interface AuditTemplate {
  id: string;
  name: string;
  description?: string | null;
  framework?: string | null;
  auditType?: string | null;
  controlsCount?: number;
  proceduresCount?: number;
  requestsCount?: number;
  checklistItems?: unknown[];
  requestTemplates?: unknown[];
  isSystem?: boolean;
}

interface TemplatesResponse {
  templates?: AuditTemplate[];
  data?: AuditTemplate[];
}

const AUDIT_TYPE_OPTS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'surveillance', label: 'Surveillance' },
  { value: 'certification', label: 'Certification' },
];

const AUDIT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  AUDIT_TYPE_OPTS.map((o) => [o.value, o.label])
);

const FRAMEWORK_OPTS = [
  { value: 'soc2', label: 'SOC 2' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'hipaa', label: 'HIPAA' },
  { value: 'nist', label: 'NIST' },
  { value: 'pci_dss', label: 'PCI DSS' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'fedramp', label: 'FedRAMP' },
];

const FRAMEWORK_LABEL: Record<string, string> = Object.fromEntries(
  FRAMEWORK_OPTS.map((o) => [o.value, o.label])
);

export default function AuditTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [framework, setFramework] = useState('');
  const [auditType, setAuditType] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AuditTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    auditType: 'internal',
    framework: '',
  });
  const [auditForm, setAuditForm] = useState({
    name: '',
    plannedStartDate: '',
    plannedEndDate: '',
  });

  const { data, isLoading } = useQuery<TemplatesResponse | AuditTemplate[]>({
    queryKey: ['audit-templates', { search: debouncedSearch, framework, auditType }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (framework) params.framework = framework;
      if (auditType) params.auditType = auditType;
      const res = await api.get('/api/audit/templates', { params });
      return res.data;
    },
  });

  const templates: AuditTemplate[] = useMemo(() => {
    if (!data) return [];
    const records = Array.isArray(data) ? data : (data.templates ?? data.data ?? []);
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    if (!normalizedSearch) return records;
    return records.filter(
      (template) =>
        template.name.toLowerCase().includes(normalizedSearch) ||
        template.description?.toLowerCase().includes(normalizedSearch)
    );
  }, [data, debouncedSearch]);

  const activeFilters: ActiveFilter[] = [];
  if (debouncedSearch) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${debouncedSearch}`,
      onClear: () => setSearch(''),
    });
  }
  if (framework) {
    activeFilters.push({
      key: 'framework',
      label: `Framework: ${FRAMEWORK_LABEL[framework] ?? framework}`,
      onClear: () => setFramework(''),
    });
  }
  if (auditType) {
    activeFilters.push({
      key: 'auditType',
      label: `Type: ${AUDIT_TYPE_LABEL[auditType] ?? auditType}`,
      onClear: () => setAuditType(''),
    });
  }
  const clearAll = () => {
    setSearch('');
    setFramework('');
    setAuditType('');
  };

  const saveTemplate = useMutation({
    mutationFn: async () =>
      (
        await (editingTemplate
          ? api.put(`/api/audit/templates/${editingTemplate.id}`, {
              ...templateForm,
              framework: templateForm.framework || undefined,
            })
          : api.post('/api/audit/templates', {
              ...templateForm,
              framework: templateForm.framework || undefined,
              checklistItems: [],
              requestTemplates: [],
              testProcedureTemplates: [],
            }))
      ).data,
    onSuccess: () => {
      toast.success(`Audit template ${editingTemplate ? 'updated' : 'created'}`);
      setCreateOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '', auditType: 'internal', framework: '' });
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to save template'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/audit/templates/${id}`),
    onSuccess: () => {
      toast.success('Audit template archived');
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to archive template'),
  });

  const cloneTemplate = useMutation({
    mutationFn: async (template: AuditTemplate) =>
      (
        await api.post(`/api/audit/templates/${template.id}/clone`, {
          name: `${template.name} Copy`,
        })
      ).data,
    onSuccess: () => {
      toast.success('Audit template cloned');
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to clone template'),
  });

  const createAudit = useMutation({
    mutationFn: async () =>
      (
        await api.post('/api/audit/templates/create-audit', {
          templateId: selectedTemplate?.id,
          name: auditForm.name,
          plannedStartDate: auditForm.plannedStartDate || undefined,
          plannedEndDate: auditForm.plannedEndDate || undefined,
          createRequests: true,
          createTestProcedures: true,
        })
      ).data,
    onSuccess: (audit) => {
      toast.success('Audit created from template');
      setSelectedTemplate(null);
      navigate(`/audits/${audit.id}`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to create audit'),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Templates"
        description="Reusable audit blueprints with checklists, procedures, and request templates."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingTemplate(null);
              setTemplateForm({ name: '', description: '', auditType: 'internal', framework: '' });
              setCreateOpen(true);
            }}
          >
            Create template
          </Button>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Frameworks"
          value={framework}
          onChange={setFramework}
          options={FRAMEWORK_OPTS}
          clearable
          searchable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Audit Types"
          value={auditType}
          onChange={setAuditType}
          options={AUDIT_TYPE_OPTS}
          clearable
        />
      </FilterBar>

      {isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="No templates found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all templates.'
                : 'Create your first audit template to standardize future audits.'
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
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({
                      name: '',
                      description: '',
                      auditType: 'internal',
                      framework: '',
                    });
                    setCreateOpen(true);
                  }}
                >
                  Create template
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const procedures =
              t.proceduresCount ?? (Array.isArray(t.checklistItems) ? t.checklistItems.length : 0);
            const requests =
              t.requestsCount ??
              (Array.isArray(t.requestTemplates) ? t.requestTemplates.length : 0);

            return (
              <Card key={t.id} className="flex flex-col">
                <CardBody density="cozy" className="flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-brand-500/10 text-brand-700 shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-h3 text-surface-900 truncate">{t.name}</h3>
                      <p className="text-small text-surface-600 line-clamp-2 mt-1">
                        {t.description || 'No description.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.framework && (
                      <CategoryChip
                        value={t.framework}
                        label={FRAMEWORK_LABEL[t.framework] ?? t.framework}
                        case="upper"
                      />
                    )}
                    {t.auditType && (
                      <Badge variant="info">
                        {AUDIT_TYPE_LABEL[t.auditType] ?? t.auditType.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-200">
                    <div>
                      <dt className="text-xs text-surface-500 uppercase tracking-wider">
                        Procedures
                      </dt>
                      <dd className="text-h3 text-surface-900 tabular-nums">{procedures}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-surface-500 uppercase tracking-wider">
                        Requests
                      </dt>
                      <dd className="text-h3 text-surface-900 tabular-nums">{requests}</dd>
                    </div>
                  </dl>

                  <div className="flex items-center gap-2 pt-2 mt-auto">
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<PlayCircle className="h-4 w-4" />}
                      className="flex-1"
                      onClick={() => {
                        setSelectedTemplate(t);
                        setAuditForm({
                          name: `${t.name} Audit`,
                          plannedStartDate: '',
                          plannedEndDate: '',
                        });
                      }}
                    >
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Copy className="h-4 w-4" />}
                      className="flex-1"
                      onClick={() => cloneTemplate.mutate(t)}
                      loading={cloneTemplate.isPending}
                    >
                      Clone
                    </Button>
                  </div>
                  {!t.isSystem && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Pencil className="h-4 w-4" />}
                        className="flex-1"
                        onClick={() => {
                          setEditingTemplate(t);
                          setTemplateForm({
                            name: t.name,
                            description: t.description || '',
                            auditType: t.auditType || 'internal',
                            framework: t.framework || '',
                          });
                          setCreateOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        className="flex-1"
                        onClick={() => {
                          if (window.confirm(`Archive "${t.name}"?`)) {
                            deleteTemplate.mutate(t.id);
                          }
                        }}
                        loading={deleteTemplate.isPending && deleteTemplate.variables === t.id}
                      >
                        Archive
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditingTemplate(null);
        }}
        title={editingTemplate ? 'Edit Audit Template' : 'Create Audit Template'}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                setEditingTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveTemplate.mutate()}
              loading={saveTemplate.isPending}
              disabled={!templateForm.name.trim()}
            >
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={templateForm.name}
            onChange={(event) =>
              setTemplateForm((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
          <Textarea
            label="Description"
            value={templateForm.description}
            onChange={(event) =>
              setTemplateForm((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
          />
          <Select
            label="Audit Type"
            value={templateForm.auditType}
            options={AUDIT_TYPE_OPTS}
            onChange={(value) =>
              setTemplateForm((current) => ({ ...current, auditType: value }))
            }
          />
          <Select
            label="Framework"
            value={templateForm.framework}
            options={FRAMEWORK_OPTS}
            onChange={(value) =>
              setTemplateForm((current) => ({ ...current, framework: value }))
            }
            clearable
          />
        </div>
      </Dialog>

      <Dialog
        open={Boolean(selectedTemplate)}
        onClose={() => setSelectedTemplate(null)}
        title="Create Audit from Template"
        description={selectedTemplate?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => createAudit.mutate()}
              loading={createAudit.isPending}
              disabled={!auditForm.name.trim()}
            >
              Create Audit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="template-audit-name">Audit Name</Label>
            <Input
              id="template-audit-name"
              value={auditForm.name}
              onChange={(event) =>
                setAuditForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="date"
              label="Planned Start"
              value={auditForm.plannedStartDate}
              onChange={(event) =>
                setAuditForm((current) => ({
                  ...current,
                  plannedStartDate: event.target.value,
                }))
              }
            />
            <Input
              type="date"
              label="Planned End"
              value={auditForm.plannedEndDate}
              onChange={(event) =>
                setAuditForm((current) => ({
                  ...current,
                  plannedEndDate: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
