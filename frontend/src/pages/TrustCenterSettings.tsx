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
  Textarea,
} from '@/components/ui';

type Visibility = 'private' | 'nda_required' | 'public';

interface TrustSection {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface TrustCenterSettings {
  companyName: string;
  logoUrl: string;
  brandColor: string;
  visibility: Visibility;
  customDomain: string;
  ndaRequired: boolean;
  ndaTemplate: string;
  sections: TrustSection[];
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

const DEFAULT_SETTINGS: TrustCenterSettings = {
  companyName: '',
  logoUrl: '',
  brandColor: '#10b981',
  visibility: 'nda_required',
  customDomain: '',
  ndaRequired: true,
  ndaTemplate: '',
  sections: DEFAULT_SECTIONS,
};

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private', description: 'Invite-only access' },
  { value: 'nda_required', label: 'NDA required', description: 'Visitors must accept the NDA' },
  { value: 'public', label: 'Public', description: 'Open to anyone' },
];

export default function TrustCenterSettings() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TrustCenterSettings>(DEFAULT_SETTINGS);

  const { data, isLoading } = useQuery<TrustCenterSettings>({
    queryKey: ['trust-center-settings'],
    queryFn: async () => {
      const res = await api.get('/api/trust-center/settings');
      const payload = res.data?.data ?? res.data;
      return {
        companyName: payload?.companyName ?? '',
        logoUrl: payload?.logoUrl ?? '',
        brandColor: payload?.brandColor ?? DEFAULT_SETTINGS.brandColor,
        visibility: (payload?.visibility as Visibility) ?? DEFAULT_SETTINGS.visibility,
        customDomain: payload?.customDomain ?? '',
        ndaRequired: payload?.ndaRequired ?? true,
        ndaTemplate: payload?.ndaTemplate ?? '',
        sections:
          Array.isArray(payload?.sections) && payload.sections.length > 0
            ? (payload.sections as TrustSection[])
            : DEFAULT_SECTIONS,
      };
    },
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: TrustCenterSettings) => api.put('/api/trust-center/settings', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trust-center-settings'] }),
  });

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(data), [draft, data]);

  const toggleSection = (id: string) => {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Trust Center Settings"
        description="Branding, visibility, NDA, and section configuration for your trust center."
        actions={
          <Button
            loading={saveMutation.isPending}
            disabled={!isDirty || isLoading}
            onClick={() => saveMutation.mutate(draft)}
          >
            Save changes
          </Button>
        }
      />

      <Card density="comfy">
        <CardHeader className="px-0 pt-0">
          <div>
            <CardTitle>Branding</CardTitle>
            <CardDescription>How your trust center looks to visitors.</CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0 space-y-4">
          <div>
            <Label htmlFor="tcs-company">Company name</Label>
            <Input
              id="tcs-company"
              value={draft.companyName}
              onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <Label htmlFor="tcs-logo">Logo URL</Label>
            <Input
              id="tcs-logo"
              value={draft.logoUrl}
              onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })}
              placeholder="https://cdn.example.com/logo.svg"
            />
          </div>
          <div>
            <Label htmlFor="tcs-color">Brand color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="tcs-color"
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
            <CardTitle>Visibility</CardTitle>
            <CardDescription>Who can view your trust center and at what domain.</CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0 space-y-4">
          <div>
            <Label htmlFor="tcs-visibility">Visibility</Label>
            <Select
              value={draft.visibility}
              onChange={(v) => setDraft({ ...draft, visibility: v as Visibility })}
              options={VISIBILITY_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="tcs-domain">Custom domain</Label>
            <Input
              id="tcs-domain"
              value={draft.customDomain}
              onChange={(e) => setDraft({ ...draft, customDomain: e.target.value })}
              placeholder="trust.example.com"
            />
          </div>
        </CardBody>
      </Card>

      <Card density="comfy">
        <CardHeader className="px-0 pt-0">
          <div>
            <CardTitle>NDA Config</CardTitle>
            <CardDescription>
              Require an NDA acceptance before showing private content.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0 space-y-4">
          <div className="rounded-lg border border-surface-200 bg-white p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-surface-900 font-medium">Require NDA</p>
              <p className="text-small text-surface-600 mt-1">
                Visitors must accept the NDA before viewing protected sections.
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
            <Label htmlFor="tcs-nda-template">NDA template</Label>
            <Textarea
              id="tcs-nda-template"
              value={draft.ndaTemplate}
              onChange={(e) => setDraft({ ...draft, ndaTemplate: e.target.value })}
              placeholder="Paste your NDA text here…"
              rows={8}
            />
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
    </div>
  );
}
