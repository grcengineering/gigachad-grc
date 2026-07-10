import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageHeader,
  Select,
} from '@/components/ui';

type Visibility = 'private' | 'nda_required' | 'public';
type LoginMethod = 'email' | 'sso' | 'both';

interface TrustSection {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface TrustConfig {
  visibility: Visibility;
  customDomain: string;
  brandColor: string;
  sections: TrustSection[];
  ndaRequired: boolean;
  loginMethod: LoginMethod;
  sessionTimeoutMinutes: number;
}

const DEFAULT_SECTIONS: TrustSection[] = [
  {
    id: 'compliance',
    name: 'Compliance',
    description: 'Framework attestations and certifications.',
    enabled: true,
  },
  {
    id: 'policies',
    name: 'Policies',
    description: 'Published security and privacy policies.',
    enabled: true,
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Audit reports, SOC 2, ISO 27001 letters.',
    enabled: true,
  },
  {
    id: 'subprocessors',
    name: 'Subprocessors',
    description: 'List of subprocessors and data flows.',
    enabled: false,
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Overview of security program and controls.',
    enabled: true,
  },
];

const DEFAULT_CONFIG: TrustConfig = {
  visibility: 'nda_required',
  customDomain: '',
  brandColor: '#10b981',
  sections: DEFAULT_SECTIONS,
  ndaRequired: true,
  loginMethod: 'email',
  sessionTimeoutMinutes: 60,
};

const VISIBILITY_OPTIONS: { value: Visibility; label: string; description?: string }[] = [
  { value: 'private', label: 'Private', description: 'Invite-only access' },
  { value: 'nda_required', label: 'NDA required', description: 'Users must accept NDA' },
  { value: 'public', label: 'Public', description: 'Open to anyone' },
];

const LOGIN_OPTIONS: { value: LoginMethod; label: string }[] = [
  { value: 'email', label: 'Email + password' },
  { value: 'sso', label: 'SSO only' },
  { value: 'both', label: 'Email or SSO' },
];

export default function TrustConfiguration() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TrustConfig>(DEFAULT_CONFIG);

  const { data, isLoading } = useQuery<TrustConfig>({
    queryKey: ['trust-config'],
    queryFn: async () => {
      const res = await api.get('/api/trust-config');
      const payload = res.data?.data ?? res.data;
      return {
        visibility: (payload?.visibility as Visibility) ?? DEFAULT_CONFIG.visibility,
        customDomain: payload?.customDomain ?? '',
        brandColor: payload?.brandColor ?? DEFAULT_CONFIG.brandColor,
        sections:
          Array.isArray(payload?.sections) && payload.sections.length > 0
            ? (payload.sections as TrustSection[])
            : DEFAULT_SECTIONS,
        ndaRequired: payload?.ndaRequired ?? true,
        loginMethod: (payload?.loginMethod as LoginMethod) ?? 'email',
        sessionTimeoutMinutes: payload?.sessionTimeoutMinutes ?? 60,
      };
    },
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: TrustConfig) => api.put('/api/trust-config', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trust-config'] }),
  });

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(data), [draft, data]);

  const toggleSection = (id: string) => {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trust Center Configuration"
        description="Configure publishing, sections, and access for your public trust center."
        actions={
          <Button
            loading={saveMutation.isPending}
            disabled={!isDirty || isLoading}
            onClick={() => saveMutation.mutate(draft)}
          >
            Save
          </Button>
        }
      />

      <Card density="comfy">
        <CardHeader className="px-0 pt-0">
          <div>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>How your trust center is published and branded.</CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0 space-y-4">
          <div>
            <Label htmlFor="trust-visibility">Visibility</Label>
            <Select
              value={draft.visibility}
              onChange={(v) => setDraft({ ...draft, visibility: v as Visibility })}
              options={VISIBILITY_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="trust-domain">Custom domain</Label>
            <Input
              id="trust-domain"
              value={draft.customDomain}
              onChange={(e) => setDraft({ ...draft, customDomain: e.target.value })}
              placeholder="trust.example.com"
            />
          </div>
          <div>
            <Label htmlFor="trust-color">Brand color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="trust-color"
                value={draft.brandColor}
                onChange={(e) => setDraft({ ...draft, brandColor: e.target.value })}
                placeholder="#10b981"
                className="max-w-xs font-mono"
              />
              <div
                className="h-9 w-9 rounded-md border border-surface-300 shrink-0"
                style={{ backgroundColor: draft.brandColor }}
                aria-label="Brand color preview"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card density="comfy">
        <CardHeader className="px-0 pt-0">
          <div>
            <CardTitle>Sections</CardTitle>
            <CardDescription>
              Toggle which sections appear on your published trust center.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0">
          <div className="space-y-3">
            {draft.sections.map((section) => (
              <div
                key={section.id}
                className="rounded-lg border border-surface-200 bg-white p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-surface-900 font-medium">{section.name}</p>
                  <p className="text-small text-surface-600 mt-1">{section.description}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => toggleSection(section.id)}>
                  {section.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card density="comfy">
        <CardHeader className="px-0 pt-0">
          <div>
            <CardTitle>NDA & Auth</CardTitle>
            <CardDescription>Control access and authentication for visitors.</CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0 space-y-4">
          <div className="rounded-lg border border-surface-200 bg-white p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-surface-900 font-medium">NDA required</p>
              <p className="text-small text-surface-600 mt-1">
                Visitors must accept the NDA before viewing private content.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDraft({ ...draft, ndaRequired: !draft.ndaRequired })}
            >
              {draft.ndaRequired ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div>
            <Label htmlFor="trust-login">Login method</Label>
            <Select
              value={draft.loginMethod}
              onChange={(v) => setDraft({ ...draft, loginMethod: v as LoginMethod })}
              options={LOGIN_OPTIONS}
            />
          </div>

          <div>
            <Label htmlFor="trust-session">Session timeout (minutes)</Label>
            <Input
              id="trust-session"
              type="number"
              min={5}
              max={1440}
              value={draft.sessionTimeoutMinutes}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sessionTimeoutMinutes: Number(e.target.value) || 0,
                })
              }
              className="max-w-xs"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
