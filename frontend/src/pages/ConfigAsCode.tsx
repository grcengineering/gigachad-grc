import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
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
  Skeleton,
  Textarea,
} from '@/components/ui';

interface ExportResponse {
  content: string;
  filename: string;
  resourceCount: number;
  resourceBreakdown: Record<string, number>;
}

interface PreviewResponse {
  toCreate: number;
  toUpdate: number;
  toDelete: number;
  noChange: number;
  hasConflicts: boolean;
  conflictCount: number;
  warnings: string[];
  errors: string[];
}

function diffLines(before: string, after: string) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const result: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let index = 0; index < max; index += 1) {
    const previous = beforeLines[index];
    const next = afterLines[index];
    if (previous === next) {
      if (previous !== undefined) result.push({ type: 'same', text: previous });
    } else {
      if (previous !== undefined) result.push({ type: 'remove', text: previous });
      if (next !== undefined) result.push({ type: 'add', text: next });
    }
  }
  return result;
}

const FILE_PATH = 'config-as-code.tf';

export default function ConfigAsCode() {
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const {
    data,
    isLoading,
    refetch: refreshExport,
  } = useQuery<ExportResponse>({
    queryKey: ['config-as-code', 'terraform-export'],
    queryFn: () =>
      api
        .post<ExportResponse>('/api/config-as-code/export', { format: 'terraform' })
        .then((response) => response.data),
  });

  useEffect(() => {
    if (data) {
      setContent(data.content);
      setPreview(null);
    }
  }, [data]);

  const previewMutation = useMutation({
    mutationFn: () =>
      api
        .post<PreviewResponse>('/api/config-as-code/files/preview', {
          path: FILE_PATH,
          content,
          format: 'terraform',
        })
        .then((response) => response.data),
    onSuccess: setPreview,
    onError: () => toast.error('Unable to preview configuration changes'),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      api.post('/api/config-as-code/files/apply', {
        path: FILE_PATH,
        content,
        format: 'terraform',
        commitMessage: 'Applied from Config as Code editor',
        conflictResolution: 'abort',
      }),
    onSuccess: async () => {
      toast.success('Configuration applied');
      await refreshExport();
    },
    onError: () => toast.error('Configuration was not applied'),
  });

  const isDirty = content !== (data?.content ?? '');
  const diff = useMemo(
    () => (isDirty ? diffLines(data?.content ?? '', content) : []),
    [content, data?.content, isDirty]
  );
  const canApply =
    isDirty &&
    !!preview &&
    preview.errors.length === 0 &&
    !preview.hasConflicts &&
    !previewMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Config as Code"
        description="Export, preview, and apply the platform's Terraform configuration."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              onClick={() => refreshExport()}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              loading={previewMutation.isPending}
              disabled={!isDirty}
              onClick={() => previewMutation.mutate()}
            >
              Preview changes
            </Button>
            <Button
              loading={applyMutation.isPending}
              disabled={!canApply}
              onClick={() => applyMutation.mutate()}
            >
              Apply
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card density="cozy" className="lg:col-span-2">
          <CardHeader className="px-0 pt-0">
            <div>
              <CardTitle>Terraform configuration</CardTitle>
              <CardDescription>
                Edit the live export, preview the plan, then apply conflict-checked changes.
              </CardDescription>
            </div>
            <Badge variant={isDirty ? 'warning' : 'success'} dot>
              {isDirty ? 'Modified' : 'Current'}
            </Badge>
          </CardHeader>
          <CardBody density="cozy" className="px-0 pb-0">
            {isLoading ? (
              <Skeleton className="h-[520px]" />
            ) : (
              <Textarea
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setPreview(null);
                }}
                rows={30}
                className="font-mono text-small min-h-[520px]"
                spellCheck={false}
              />
            )}
          </CardBody>
        </Card>

        <Card density="cozy">
          <CardHeader className="px-0 pt-0">
            <div>
              <CardTitle>Change plan</CardTitle>
              <CardDescription>Server-side preview of the current editor content.</CardDescription>
            </div>
          </CardHeader>
          <CardBody density="cozy" className="px-0 pb-0 space-y-4">
            {preview ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <PlanStat label="Create" value={preview.toCreate} />
                  <PlanStat label="Update" value={preview.toUpdate} />
                  <PlanStat label="Delete" value={preview.toDelete} />
                  <PlanStat label="Unchanged" value={preview.noChange} />
                </div>
                <Badge variant={preview.hasConflicts ? 'danger' : 'success'} dot>
                  {preview.hasConflicts ? `${preview.conflictCount} conflicts` : 'Safe to apply'}
                </Badge>
                {[...preview.errors, ...preview.warnings].length > 0 && (
                  <ul className="list-disc list-inside text-small text-surface-700 space-y-1">
                    {[...preview.errors, ...preview.warnings].map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <CheckBadgeIcon className="h-8 w-8 mx-auto text-surface-500" />
                <p className="text-small text-surface-600 mt-2">
                  Edit the configuration and preview changes to enable Apply.
                </p>
              </div>
            )}
            {data && (
              <p className="text-xs text-surface-500">
                Exported {data.resourceCount} resources from the backend.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card density="cozy">
        <CardHeader className="px-0 pt-0">
          <div>
            <CardTitle>Diff vs current</CardTitle>
            <CardDescription>
              {isDirty ? 'Pending editor changes.' : 'No pending changes.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody density="cozy" className="px-0 pb-0">
          {isDirty ? (
            <div className="rounded-md border border-surface-200 bg-white overflow-hidden font-mono text-xs">
              {diff.map((line, index) => (
                <div
                  key={`${index}-${line.type}`}
                  className={
                    line.type === 'add'
                      ? 'px-3 py-0.5 bg-emerald-50 text-emerald-800 whitespace-pre-wrap'
                      : line.type === 'remove'
                        ? 'px-3 py-0.5 bg-red-50 text-red-800 whitespace-pre-wrap'
                        : 'px-3 py-0.5 text-surface-700 whitespace-pre-wrap'
                  }
                >
                  {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
                  {line.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-small text-surface-600">The editor matches the current export.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function PlanStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface-100 p-3 text-center">
      <p className="text-h2 text-surface-900">{value}</p>
      <p className="text-xs text-surface-600">{label}</p>
    </div>
  );
}
