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

const AUDIT_TYPE_OPTIONS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'certification', label: 'Certification' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'internal_review', label: 'Internal Review' },
];

interface AuditFormState {
  auditType: string;
  name: string;
  framework: string;
  scope: string;
  plannedStartDate: string;
  plannedEndDate: string;
  leadAuditor: string;
  externalFirmName: string;
  externalFirmContact: string;
}

const INITIAL_STATE: AuditFormState = {
  auditType: 'internal',
  name: '',
  framework: '',
  scope: '',
  plannedStartDate: '',
  plannedEndDate: '',
  leadAuditor: '',
  externalFirmName: '',
  externalFirmContact: '',
};

interface FieldErrors {
  name?: string;
  auditType?: string;
  plannedEndDate?: string;
  externalFirmName?: string;
}

export default function AuditNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AuditFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});

  const showExternalFields = form.auditType === 'external';

  const dateError = useMemo(() => {
    if (!form.plannedStartDate || !form.plannedEndDate) return undefined;
    if (form.plannedEndDate < form.plannedStartDate) {
      return 'End date must be on or after start date.';
    }
    return undefined;
  }, [form.plannedStartDate, form.plannedEndDate]);

  const setField = <K extends keyof AuditFormState>(key: K, value: AuditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post('/api/audits', payload);
      return res.data as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      navigate(`/audits/${data.id}`);
    },
  });

  const submitting = createMutation.isPending;

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = 'Audit name is required.';
    if (!form.auditType) next.auditType = 'Audit type is required.';
    if (dateError) next.plannedEndDate = dateError;
    if (showExternalFields && !form.externalFirmName.trim()) {
      next.externalFirmName = 'External firm name is required for external audits.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      auditType: form.auditType,
      name: form.name.trim(),
      framework: form.framework.trim() || undefined,
      scope: form.scope.trim() || undefined,
      plannedStartDate: form.plannedStartDate || undefined,
      plannedEndDate: form.plannedEndDate || undefined,
      leadAuditor: form.leadAuditor.trim() || undefined,
      isExternal: showExternalFields,
    };
    if (showExternalFields) {
      payload.externalFirmName = form.externalFirmName.trim() || undefined;
      payload.externalFirmContact = form.externalFirmContact.trim() || undefined;
    }

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
        to="/audits"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Audits
      </Link>

      <PageHeader title="New Audit" description="Create a new compliance audit engagement." />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Details</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div>
              <Label htmlFor="auditType" required>
                Audit Type
              </Label>
              <Select
                value={form.auditType}
                onChange={(v) => setField('auditType', v)}
                options={AUDIT_TYPE_OPTIONS}
                invalid={!!errors.auditType}
              />
              {errors.auditType && <FieldHint error>{errors.auditType}</FieldHint>}
            </div>
            <div>
              <Label htmlFor="name" required>
                Audit Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., SOC 2 Type II 2026"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                invalid={!!errors.name}
              />
              {errors.name && <FieldHint error>{errors.name}</FieldHint>}
            </div>
            <div>
              <Label htmlFor="framework">Framework</Label>
              <Input
                id="framework"
                type="text"
                placeholder="e.g., SOC 2, ISO 27001, HIPAA"
                value={form.framework}
                onChange={(e) => setField('framework', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scope">Scope</Label>
              <Textarea
                id="scope"
                rows={4}
                placeholder="Describe the systems, processes, and locations in scope for this audit."
                value={form.scope}
                onChange={(e) => setField('scope', e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plannedStartDate">Planned Start Date</Label>
                <Input
                  id="plannedStartDate"
                  type="date"
                  value={form.plannedStartDate}
                  onChange={(e) => setField('plannedStartDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="plannedEndDate">Planned End Date</Label>
                <Input
                  id="plannedEndDate"
                  type="date"
                  value={form.plannedEndDate}
                  onChange={(e) => setField('plannedEndDate', e.target.value)}
                  invalid={!!(errors.plannedEndDate || dateError)}
                />
                {(errors.plannedEndDate || dateError) && (
                  <FieldHint error>{errors.plannedEndDate ?? dateError}</FieldHint>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardBody density="comfy" className="space-y-4">
            <div>
              <Label htmlFor="leadAuditor">Lead Auditor</Label>
              <Input
                id="leadAuditor"
                type="text"
                placeholder="Name or user identifier"
                value={form.leadAuditor}
                onChange={(e) => setField('leadAuditor', e.target.value)}
              />
            </div>
            {showExternalFields && (
              <>
                <div>
                  <Label htmlFor="externalFirmName" required>
                    External Firm Name
                  </Label>
                  <Input
                    id="externalFirmName"
                    type="text"
                    placeholder="e.g., Deloitte, EY, PwC"
                    value={form.externalFirmName}
                    onChange={(e) => setField('externalFirmName', e.target.value)}
                    invalid={!!errors.externalFirmName}
                  />
                  {errors.externalFirmName && <FieldHint error>{errors.externalFirmName}</FieldHint>}
                </div>
                <div>
                  <Label htmlFor="externalFirmContact">External Firm Contact</Label>
                  <Input
                    id="externalFirmContact"
                    type="text"
                    placeholder="Primary contact name or email"
                    value={form.externalFirmContact}
                    onChange={(e) => setField('externalFirmContact', e.target.value)}
                  />
                </div>
              </>
            )}
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
            onClick={() => navigate('/audits')}
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
            Create Audit
          </Button>
        </div>
      </form>
    </div>
  );
}
