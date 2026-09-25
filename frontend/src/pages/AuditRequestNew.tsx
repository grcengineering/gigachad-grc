import { type FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button, Input, PageHeader, Select, Textarea } from '@/components/ui';

interface Audit {
  id: string;
  auditId: string;
  name: string;
}

const CATEGORY_OPTIONS = [
  { value: 'control_documentation', label: 'Control Documentation' },
  { value: 'policy', label: 'Policy' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'interview', label: 'Interview' },
  { value: 'access', label: 'Access' },
  { value: 'walkthrough', label: 'Walkthrough' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function AuditRequestNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    auditId: '',
    title: '',
    description: '',
    category: 'evidence',
    priority: 'medium',
    dueDate: '',
    requirementRef: '',
  });

  const audits = useQuery<Audit[]>({
    queryKey: ['audits', 'request-options'],
    queryFn: async () => {
      const response = await api.get('/api/audits');
      return Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post('/api/audit-requests', {
          ...form,
          dueDate: form.dueDate || undefined,
          requirementRef: form.requirementRef || undefined,
        })
      ).data,
    onSuccess: (request) => {
      toast.success('Audit request created');
      navigate(`/audit-requests/${request.id}`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to create audit request'),
  });

  const set = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <Link
        to="/audit-requests"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Audit Requests
      </Link>
      <PageHeader
        title="New Audit Request"
        description="Request evidence, documentation, access, or an interview for an active audit."
      />
      <form onSubmit={submit} className="card p-6 space-y-5">
        <Select
          label="Audit"
          value={form.auditId}
          onChange={(value) => set('auditId', value)}
          options={(audits.data ?? []).map((audit) => ({
            value: audit.id,
            label: `${audit.auditId} — ${audit.name}`,
          }))}
          placeholder={audits.isLoading ? 'Loading audits…' : 'Select an audit'}
          required
        />
        {!audits.isLoading && !audits.data?.length && (
          <p className="text-sm text-amber-700">
            Create an audit before adding requests. <Link to="/audits/new">Create audit</Link>
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Category"
            value={form.category}
            onChange={(value) => set('category', value)}
            options={CATEGORY_OPTIONS}
            required
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(value) => set('priority', value)}
            options={PRIORITY_OPTIONS}
            required
          />
        </div>
        <Input
          label="Title"
          value={form.title}
          onChange={(event) => set('title', event.target.value)}
          required
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => set('description', event.target.value)}
          rows={5}
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Requirement Reference"
            value={form.requirementRef}
            onChange={(event) => set('requirementRef', event.target.value)}
          />
          <Input
            type="date"
            label="Due Date"
            value={form.dueDate}
            onChange={(event) => set('dueDate', event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-surface-200 pt-4">
          <Link to="/audit-requests">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={create.isPending} disabled={!audits.data?.length}>
            Create Request
          </Button>
        </div>
      </form>
    </div>
  );
}
