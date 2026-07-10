import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X } from 'lucide-react';
import api, { frameworksApi, usersApi } from '@/lib/api';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CategoryChip,
  FieldHint,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';

const CATEGORY_OPTIONS = [
  { value: 'access_control', label: 'Access Control' },
  { value: 'network_security', label: 'Network Security' },
  { value: 'data_protection', label: 'Data Protection' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'business_continuity', label: 'Business Continuity' },
  { value: 'asset_management', label: 'Asset Management' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'change_management', label: 'Change Management' },
  { value: 'vendor_management', label: 'Vendor Management' },
  { value: 'physical_security', label: 'Physical Security' },
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

interface Framework {
  id: string;
  name: string;
  type?: string;
}

interface User {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
}

interface ControlFormState {
  controlId: string;
  title: string;
  description: string;
  category: string;
  frameworkIds: string[];
  status: string;
  testingFrequency: string;
  guidance: string;
  ownerId: string;
  tags: string;
}

const INITIAL: ControlFormState = {
  controlId: '',
  title: '',
  description: '',
  category: 'access_control',
  frameworkIds: [],
  status: 'not_started',
  testingFrequency: 'quarterly',
  guidance: '',
  ownerId: '',
  tags: '',
};

interface FieldErrors {
  controlId?: string;
  title?: string;
  category?: string;
}

export default function ControlNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ControlFormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { data: frameworks } = useQuery<Framework[]>({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((res) => res.data.users ?? []),
  });

  const setField = <K extends keyof ControlFormState>(key: K, value: ControlFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const toggleFramework = (id: string) => {
    setForm((prev) => ({
      ...prev,
      frameworkIds: prev.frameworkIds.includes(id)
        ? prev.frameworkIds.filter((x) => x !== id)
        : [...prev.frameworkIds, id],
    }));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post('/api/controls', payload);
      return res.data as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      navigate(`/controls/${data.id}`);
    },
  });

  const submitting = createMutation.isPending;

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.controlId.trim()) next.controlId = 'Control ID is required.';
    if (!form.title.trim()) next.title = 'Title is required.';
    if (!form.category) next.category = 'Category is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const tagList = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      controlId: form.controlId.trim(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      frameworkIds: form.frameworkIds,
      status: form.status,
      testingFrequency: form.testingFrequency,
      guidance: form.guidance.trim() || undefined,
      ownerId: form.ownerId || undefined,
      tags: tagList,
    };

    createMutation.mutate(payload);
  };

  const submitError = createMutation.error as {
    response?: { data?: { message?: string } };
    message?: string;
  } | null;
  const submitErrorMessage = submitError?.response?.data?.message ?? submitError?.message ?? null;

  const ownerOptions = [
    { value: '', label: 'Unassigned' },
    ...(users ?? []).map((u) => ({
      value: u.id,
      label: u.displayName || u.email || u.id,
    })),
  ];

  const frameworkList = frameworks ?? [];

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <Link
        to="/controls"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Controls
      </Link>

      <PageHeader
        title="New Control"
        description="Define a new control, map it to frameworks, and assign ownership."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <Label htmlFor="controlId" required>
                  Control ID
                </Label>
                <Input
                  id="controlId"
                  type="text"
                  placeholder="e.g., AC-002"
                  value={form.controlId}
                  onChange={(e) => setField('controlId', e.target.value)}
                  invalid={!!errors.controlId}
                />
                {errors.controlId && <FieldHint error>{errors.controlId}</FieldHint>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="title" required>
                  Title
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Multi-Factor Authentication"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  invalid={!!errors.title}
                />
                {errors.title && <FieldHint error>{errors.title}</FieldHint>}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="What does this control do and why does it exist?"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category" required>
                Category
              </Label>
              <Select
                value={form.category}
                onChange={(v) => setField('category', v)}
                options={CATEGORY_OPTIONS}
                invalid={!!errors.category}
              />
              {errors.category && <FieldHint error>{errors.category}</FieldHint>}
            </div>
            <div>
              <Label>Framework mapping</Label>
              {frameworkList.length === 0 ? (
                <FieldHint>No frameworks available. Create a framework first.</FieldHint>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {frameworkList.map((fw) => {
                    const selected = form.frameworkIds.includes(fw.id);
                    return (
                      <button
                        key={fw.id}
                        type="button"
                        onClick={() => toggleFramework(fw.id)}
                        aria-pressed={selected}
                        className={`inline-flex items-center gap-1 rounded-md transition-opacity ${
                          selected ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <CategoryChip value={fw.name} />
                        {selected && <X className="h-3 w-3 text-surface-700" />}
                      </button>
                    );
                  })}
                </div>
              )}
              <FieldHint>Click to add or remove framework mappings.</FieldHint>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Implementation</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onChange={(v) => setField('status', v)}
                  options={STATUS_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="testingFrequency">Testing Frequency</Label>
                <Select
                  value={form.testingFrequency}
                  onChange={(v) => setField('testingFrequency', v)}
                  options={FREQUENCY_OPTIONS}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="guidance">Guidance</Label>
              <Textarea
                id="guidance"
                rows={4}
                placeholder="Implementation guidance, test procedures, evidence expectations…"
                value={form.guidance}
                onChange={(e) => setField('guidance', e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div>
              <Label htmlFor="ownerId">Owner</Label>
              <Select
                value={form.ownerId}
                onChange={(v) => setField('ownerId', v)}
                options={ownerOptions}
                searchable={ownerOptions.length > 7}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                type="text"
                placeholder="comma, separated, tags"
                value={form.tags}
                onChange={(e) => setField('tags', e.target.value)}
              />
              <FieldHint>Separate multiple tags with commas.</FieldHint>
            </div>
          </CardBody>
        </Card>

        {submitErrorMessage && (
          <Card className="border-red-200">
            <CardBody density="cozy">
              <p className="text-small text-red-700">{submitErrorMessage}</p>
            </CardBody>
          </Card>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/controls')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Create Control
          </Button>
        </div>
      </form>
    </div>
  );
}
