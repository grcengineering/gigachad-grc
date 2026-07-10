import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/lib/api';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FieldHint,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';

const CATEGORY_OPTIONS = [
  { value: 'saas', label: 'SaaS' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'software_vendor', label: 'Software Vendor' },
  { value: 'hardware_vendor', label: 'Hardware Vendor' },
  { value: 'cloud_provider', label: 'Cloud Provider' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
];

const TIER_OPTIONS = [
  { value: 'tier_1', label: 'Tier 1 (Critical)' },
  { value: 'tier_2', label: 'Tier 2 (High)' },
  { value: 'tier_3', label: 'Tier 3 (Medium)' },
  { value: 'tier_4', label: 'Tier 4 (Low)' },
];

const RISK_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const DATA_ACCESS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'internal', label: 'Internal' },
  { value: 'customer', label: 'Customer' },
  { value: 'sensitive', label: 'Sensitive' },
];

interface VendorFormState {
  name: string;
  website: string;
  description: string;
  category: string;
  criticalityTier: string;
  inherentRisk: string;
  dataAccess: string;
  primaryContactName: string;
  primaryContactEmail: string;
  contractStart: string;
  contractEnd: string;
}

const INITIAL: VendorFormState = {
  name: '',
  website: '',
  description: '',
  category: 'saas',
  criticalityTier: 'tier_3',
  inherentRisk: 'medium',
  dataAccess: 'none',
  primaryContactName: '',
  primaryContactEmail: '',
  contractStart: '',
  contractEnd: '',
};

interface FieldErrors {
  name?: string;
  category?: string;
  website?: string;
  primaryContactEmail?: string;
  contractEnd?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}([/?#].*)?$/i;

export default function VendorNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<VendorFormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});

  const dateError = useMemo(() => {
    if (!form.contractStart || !form.contractEnd) return undefined;
    if (form.contractEnd < form.contractStart) {
      return 'Contract end must be on or after contract start.';
    }
    return undefined;
  }, [form.contractStart, form.contractEnd]);

  const setField = <K extends keyof VendorFormState>(key: K, value: VendorFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post('/api/vendors', payload);
      return res.data as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      navigate(`/vendors/${data.id}`);
    },
  });

  const submitting = createMutation.isPending;

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = 'Vendor name is required.';
    if (!form.category) next.category = 'Category is required.';
    if (form.website.trim() && !URL_RE.test(form.website.trim())) {
      next.website = 'Enter a valid URL (e.g., https://example.com).';
    }
    if (form.primaryContactEmail.trim() && !EMAIL_RE.test(form.primaryContactEmail.trim())) {
      next.primaryContactEmail = 'Enter a valid email address.';
    }
    if (dateError) next.contractEnd = dateError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      website: form.website.trim() || undefined,
      description: form.description.trim() || undefined,
      category: form.category,
      criticalityTier: form.criticalityTier,
      inherentRisk: form.inherentRisk,
      dataAccess: form.dataAccess,
      primaryContactName: form.primaryContactName.trim() || undefined,
      primaryContactEmail: form.primaryContactEmail.trim() || undefined,
      contractStart: form.contractStart || undefined,
      contractEnd: form.contractEnd || undefined,
    };

    createMutation.mutate(payload);
  };

  const submitError = createMutation.error as
    | { response?: { data?: { message?: string } }; message?: string }
    | null;
  const submitErrorMessage =
    submitError?.response?.data?.message ?? submitError?.message ?? null;

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <Link
        to="/vendors"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vendors
      </Link>

      <PageHeader
        title="New Vendor"
        description="Onboard a new third-party vendor with risk tiering and contract details."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Vendor Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Acme Corp"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                invalid={!!errors.name}
              />
              {errors.name && <FieldHint error>{errors.name}</FieldHint>}
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => setField('website', e.target.value)}
                invalid={!!errors.website}
              />
              {errors.website && <FieldHint error>{errors.website}</FieldHint>}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="What does this vendor do for your organization?"
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
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk &amp; Tier</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="criticalityTier">Criticality Tier</Label>
                <Select
                  value={form.criticalityTier}
                  onChange={(v) => setField('criticalityTier', v)}
                  options={TIER_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="inherentRisk">Inherent Risk</Label>
                <Select
                  value={form.inherentRisk}
                  onChange={(v) => setField('inherentRisk', v)}
                  options={RISK_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="dataAccess">Data Access</Label>
                <Select
                  value={form.dataAccess}
                  onChange={(v) => setField('dataAccess', v)}
                  options={DATA_ACCESS_OPTIONS}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contract &amp; Contact</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryContactName">Primary Contact Name</Label>
                <Input
                  id="primaryContactName"
                  type="text"
                  placeholder="Jane Doe"
                  value={form.primaryContactName}
                  onChange={(e) => setField('primaryContactName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="primaryContactEmail">Primary Contact Email</Label>
                <Input
                  id="primaryContactEmail"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.primaryContactEmail}
                  onChange={(e) => setField('primaryContactEmail', e.target.value)}
                  invalid={!!errors.primaryContactEmail}
                />
                {errors.primaryContactEmail && (
                  <FieldHint error>{errors.primaryContactEmail}</FieldHint>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractStart">Contract Start</Label>
                <Input
                  id="contractStart"
                  type="date"
                  value={form.contractStart}
                  onChange={(e) => setField('contractStart', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contractEnd">Contract End</Label>
                <Input
                  id="contractEnd"
                  type="date"
                  value={form.contractEnd}
                  onChange={(e) => setField('contractEnd', e.target.value)}
                  invalid={!!(errors.contractEnd || dateError)}
                />
                {(errors.contractEnd || dateError) && (
                  <FieldHint error>{errors.contractEnd ?? dateError}</FieldHint>
                )}
              </div>
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
            onClick={() => navigate('/vendors')}
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
            Create Vendor
          </Button>
        </div>
      </form>
    </div>
  );
}
