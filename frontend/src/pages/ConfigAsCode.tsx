import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Textarea,
} from '@/components/ui';

interface ConfigAsCodePayload {
  yaml: string;
  schema?: Record<string, unknown> | null;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

function diffLines(before: string, after: string): { type: 'add' | 'remove' | 'same'; text: string }[] {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const result: { type: 'add' | 'remove' | 'same'; text: string }[] = [];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i += 1) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) {
      if (b !== undefined) result.push({ type: 'same', text: b });
    } else {
      if (b !== undefined) result.push({ type: 'remove', text: b });
      if (a !== undefined) result.push({ type: 'add', text: a });
    }
  }
  return result;
}

export default function ConfigAsCode() {
  const queryClient = useQueryClient();
  const [yaml, setYaml] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const { data, isLoading } = useQuery<ConfigAsCodePayload>({
    queryKey: ['config-as-code'],
    queryFn: async () => {
      const res = await api.get('/api/config-as-code');
      const payload = res.data?.data ?? res.data;
      return {
        yaml: typeof payload?.yaml === 'string' ? payload.yaml : '',
        schema: payload?.schema ?? null,
      };
    },
  });

  useEffect(() => {
    if (data) setYaml(data.yaml);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (next: string) => api.put('/api/config-as-code', { yaml: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config-as-code'] }),
  });

  const validateMutation = useMutation<ValidationResult, unknown, string>({
    mutationFn: async (next: string) => {
      try {
        const res = await api.post('/api/config-as-code/validate', { yaml: next });
        const payload = res.data?.data ?? res.data;
        return {
          valid: payload?.valid ?? true,
          errors: payload?.errors ?? [],
        };
      } catch {
        return { valid: false, errors: ['Unable to validate against server.'] };
      }
    },
    onSuccess: (result) => setValidation(result),
  });

  const isDirty = useMemo(() => yaml !== (data?.yaml ?? ''), [yaml, data]);
  const diff = useMemo(() => (isDirty ? diffLines(data?.yaml ?? '', yaml) : []), [isDirty, data, yaml]);

  const schemaText = useMemo(() => {
    if (!data?.schema) return '# No schema returned by the server.';
    try {
      return JSON.stringify(data.schema, null, 2);
    } catch {
      return '# Schema could not be serialized.';
    }
  }, [data?.schema]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Config as Code"
        description="Manage GRC configuration as YAML. Validate and save changes from this editor."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              loading={validateMutation.isPending}
              onClick={() => validateMutation.mutate(yaml)}
            >
              Validate
            </Button>
            <Button
              loading={saveMutation.isPending}
              disabled={!isDirty || isLoading}
              onClick={() => saveMutation.mutate(yaml)}
            >
              Save
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card density="cozy">
          <CardHeader className="px-0 pt-0">
            <div>
              <CardTitle>YAML configuration</CardTitle>
              <CardDescription>Edit the configuration. Click Save to apply.</CardDescription>
            </div>
            {validation && (
              <Badge variant={validation.valid ? 'success' : 'danger'} dot>
                {validation.valid ? 'Valid' : 'Invalid'}
              </Badge>
            )}
          </CardHeader>
          <CardBody density="cozy" className="px-0 pb-0 space-y-3">
            <Textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              placeholder="# Paste or edit your YAML here"
              rows={24}
              className="font-mono text-small min-h-[420px]"
              spellCheck={false}
            />
            {validation && !validation.valid && validation.errors && validation.errors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-small text-red-800">
                <p className="font-medium flex items-center gap-1.5">
                  <CheckBadgeIcon className="h-4 w-4" />
                  Validation errors
                </p>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {validation.errors.map((err, i) => (
                    <li key={i} className="font-mono text-xs">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>

        <Card density="cozy">
          <CardHeader className="px-0 pt-0">
            <div>
              <CardTitle>Schema</CardTitle>
              <CardDescription>Read-only view of the expected configuration shape.</CardDescription>
            </div>
          </CardHeader>
          <CardBody density="cozy" className="px-0 pb-0">
            <pre className="rounded-md border border-surface-200 bg-white p-3 font-mono text-xs text-surface-800 overflow-auto min-h-[420px] max-h-[600px]">
              {schemaText}
            </pre>
          </CardBody>
        </Card>
      </div>

      <Card density="cozy">
        <CardHeader className="px-0 pt-0">
          <div>
            <CardTitle>Diff vs current</CardTitle>
            <CardDescription>
              {isDirty ? 'Pending changes are highlighted below.' : 'No pending changes.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0">
          {isDirty ? (
            <div className="rounded-md border border-surface-200 bg-white overflow-hidden">
              <div className="font-mono text-xs">
                {diff.map((line, idx) => {
                  if (line.type === 'add') {
                    return (
                      <div
                        key={idx}
                        className="px-3 py-0.5 bg-emerald-50 text-emerald-800 whitespace-pre-wrap"
                      >
                        + {line.text}
                      </div>
                    );
                  }
                  if (line.type === 'remove') {
                    return (
                      <div
                        key={idx}
                        className="px-3 py-0.5 bg-red-50 text-red-800 whitespace-pre-wrap"
                      >
                        - {line.text}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="px-3 py-0.5 text-surface-700 whitespace-pre-wrap"
                    >
                      {'  '}
                      {line.text}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-small text-surface-600">
              Edit the YAML above to see a diff against the saved configuration.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
