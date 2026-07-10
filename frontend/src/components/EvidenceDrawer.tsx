import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ExternalLink,
  FileText,
  Calendar,
  Folder,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Download,
  FileImage,
  FileSpreadsheet,
  FileType,
  File as FileIcon,
  Maximize2,
} from 'lucide-react';
import { evidenceApi } from '@/lib/api';
import { Button, Badge, Drawer, Skeleton, type BadgeVariant } from '@/components/ui';

interface EvidenceDetail {
  id: string;
  title: string;
  description?: string;
  type: string;
  source?: string;
  status: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  validFrom?: string;
  validUntil?: string;
  isExpired?: boolean;
  tags?: string[];
  category?: string;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  version?: number;
  collectedAt?: string;
  createdAt: string;
  controlLinks?: Array<{
    id: string;
    control: { id: string; controlId: string; title: string };
    implementation?: { status?: string };
  }>;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  approved: 'success',
  pending_review: 'warning',
  rejected: 'danger',
  expired: 'danger',
};

interface EvidenceDrawerProps {
  evidenceId: string | null;
  open: boolean;
  onClose: () => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function EvidenceDrawer({ evidenceId, open, onClose }: EvidenceDrawerProps) {
  const navigate = useNavigate();
  const [previewError, setPreviewError] = useState(false);

  const { data: evidence, isLoading } = useQuery<EvidenceDetail>({
    queryKey: ['evidence', evidenceId],
    queryFn: () => evidenceApi.get(evidenceId!).then((res) => res.data),
    enabled: !!evidenceId && open,
  });

  if (!evidenceId) return null;

  const openFullPage = () => {
    onClose();
    navigate(`/evidence/${evidenceId}`);
  };

  const handleDownload = () => {
    if (!evidenceId) return;
    window.open(`/api/evidence/${evidenceId}/download`, '_blank');
  };

  const expiresSoon =
    evidence?.validUntil &&
    !evidence.isExpired &&
    new Date(evidence.validUntil).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        isLoading || !evidence ? (
          <Skeleton className="h-5 w-64" />
        ) : (
          <span className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-surface-500 shrink-0" />
            <span className="truncate">{evidence.title}</span>
          </span>
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {evidence?.filename && (
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleDownload}
            >
              Download
            </Button>
          )}
          <Button leftIcon={<ExternalLink className="h-4 w-4" />} onClick={openFullPage}>
            Open full page
          </Button>
        </>
      }
    >
      {isLoading || !evidence ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20" />
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status / metadata */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[evidence.status] ?? 'neutral'} dot size="md" className="capitalize">
              {evidence.status.replace(/_/g, ' ')}
            </Badge>
            {evidence.isExpired && (
              <Badge variant="danger" className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Expired
              </Badge>
            )}
            {expiresSoon && (
              <Badge variant="warning" className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expiring soon
              </Badge>
            )}
            <Badge variant="neutral" size="sm" className="capitalize">{evidence.type}</Badge>
            {evidence.source && (
              <span className="text-xs text-surface-500 inline-flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span className="capitalize">{evidence.source}</span>
              </span>
            )}
          </div>

          {/* Preview */}
          {evidence.filename && (
            <Section title="Preview">
              <EvidencePreview
                evidenceId={evidence.id}
                filename={evidence.filename}
                mimeType={evidence.mimeType}
                previewError={previewError}
                onPreviewError={() => setPreviewError(true)}
                onOpenFull={openFullPage}
                onDownload={handleDownload}
              />
            </Section>
          )}

          {/* Description */}
          {evidence.description && (
            <Section title="Description">
              <p className="text-body text-surface-800 whitespace-pre-wrap leading-relaxed">
                {evidence.description}
              </p>
            </Section>
          )}

          {/* File / lifecycle meta */}
          <Section title="File & Lifecycle">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-surface-200 bg-surface-50/60 p-3">
              {evidence.filename && (
                <MetaField
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Filename"
                  value={<span className="font-mono text-xs">{evidence.filename}</span>}
                />
              )}
              {evidence.size !== undefined && (
                <MetaField
                  icon={<Database className="h-3.5 w-3.5" />}
                  label="Size"
                  value={formatSize(evidence.size)}
                />
              )}
              {evidence.category && (
                <MetaField
                  icon={<Folder className="h-3.5 w-3.5" />}
                  label="Category"
                  value={<span className="capitalize">{evidence.category}</span>}
                />
              )}
              {evidence.version !== undefined && (
                <MetaField
                  icon={<Database className="h-3.5 w-3.5" />}
                  label="Version"
                  value={`v${evidence.version}`}
                />
              )}
              {evidence.collectedAt && (
                <MetaField
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Collected"
                  value={new Date(evidence.collectedAt).toLocaleDateString()}
                />
              )}
              {evidence.validUntil && (
                <MetaField
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Valid until"
                  value={
                    <span
                      className={
                        evidence.isExpired
                          ? 'text-red-700 font-medium'
                          : expiresSoon
                            ? 'text-amber-700 font-medium'
                            : ''
                      }
                    >
                      {new Date(evidence.validUntil).toLocaleDateString()}
                    </span>
                  }
                />
              )}
            </div>
          </Section>

          {/* Review */}
          {(evidence.reviewedAt || evidence.reviewNotes) && (
            <Section title="Review">
              <div className="rounded-md border border-surface-200 bg-surface-50/60 p-3 space-y-2">
                {evidence.reviewedAt && (
                  <p className="text-small text-surface-700 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Reviewed {new Date(evidence.reviewedAt).toLocaleDateString()}
                  </p>
                )}
                {evidence.reviewNotes && (
                  <p className="text-small text-surface-700 whitespace-pre-wrap">{evidence.reviewNotes}</p>
                )}
              </div>
            </Section>
          )}

          {/* Linked controls */}
          {evidence.controlLinks && evidence.controlLinks.length > 0 && (
            <Section title="Linked Controls" count={evidence.controlLinks.length}>
              <div className="space-y-1.5">
                {evidence.controlLinks.slice(0, 6).map((link) => (
                  <Link
                    key={link.id}
                    to={`/controls/${link.control.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-surface-200 bg-white px-3 py-2 hover:border-surface-300 hover:bg-surface-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-brand-700">{link.control.controlId}</span>
                      </div>
                      <p className="text-small text-surface-800 truncate mt-0.5">{link.control.title}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-surface-500 shrink-0" />
                  </Link>
                ))}
                {evidence.controlLinks.length > 6 && (
                  <p className="text-xs text-surface-500 pl-1">
                    +{evidence.controlLinks.length - 6} more — open full page to see all.
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* Tags */}
          {evidence.tags && evidence.tags.length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {evidence.tags.map((tag) => (
                  <Badge key={tag} variant="neutral" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider inline-flex items-center gap-1.5">
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-surface-500 font-mono tabular-nums">{count}</span>
          )}
        </h3>
      </div>
      {children}
    </div>
  );
}

function MetaField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-surface-500 uppercase tracking-wider mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-small text-surface-800 font-medium">{value}</div>
    </div>
  );
}

function getFileKind(mime?: string): 'image' | 'pdf' | 'text' | 'spreadsheet' | 'doc' | 'other' {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (
    mime.startsWith('text/') ||
    ['application/json', 'application/xml', 'application/javascript', 'application/yaml'].includes(mime)
  ) {
    return 'text';
  }
  if (
    [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ].includes(mime)
  ) {
    return 'spreadsheet';
  }
  if (
    [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(mime)
  ) {
    return 'doc';
  }
  return 'other';
}

function fileKindIcon(kind: ReturnType<typeof getFileKind>) {
  switch (kind) {
    case 'image':
      return FileImage;
    case 'pdf':
      return FileText;
    case 'spreadsheet':
      return FileSpreadsheet;
    case 'doc':
      return FileType;
    case 'text':
      return FileText;
    default:
      return FileIcon;
  }
}

function EvidencePreview({
  evidenceId,
  filename,
  mimeType,
  previewError,
  onPreviewError,
  onOpenFull,
  onDownload,
}: {
  evidenceId: string;
  filename: string;
  mimeType?: string;
  previewError: boolean;
  onPreviewError: () => void;
  onOpenFull: () => void;
  onDownload: () => void;
}) {
  const kind = getFileKind(mimeType);
  const Icon = fileKindIcon(kind);
  const previewUrl = `/api/evidence/${evidenceId}/preview`;

  // Non-previewable / errored: file card with download CTA
  if (previewError || kind === 'other' || kind === 'doc' || kind === 'spreadsheet') {
    return (
      <div className="rounded-md border border-surface-200 bg-surface-50/60 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-white border border-surface-200 shrink-0">
            <Icon className="h-6 w-6 text-surface-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-small text-surface-900 font-medium truncate" title={filename}>
              {filename}
            </p>
            <p className="text-xs text-surface-600 mt-0.5">
              {mimeType ? `${mimeType} · ` : ''}Inline preview not supported for this file type
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <span className="text-surface-500">·</span>
              <button
                type="button"
                onClick={onOpenFull}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open full page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <div className="relative group rounded-md border border-surface-200 overflow-hidden bg-surface-50/60">
        <img
          src={previewUrl}
          alt={filename}
          className="block max-h-80 w-full object-contain bg-white cursor-zoom-in"
          onError={onPreviewError}
          onClick={onOpenFull}
        />
        <button
          type="button"
          onClick={onOpenFull}
          className="absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-md bg-white/90 backdrop-blur-sm border border-surface-200 text-surface-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          aria-label="Open full preview"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="rounded-md border border-surface-200 overflow-hidden bg-white">
        <iframe
          src={previewUrl}
          title={filename}
          className="block w-full h-[420px]"
          onError={onPreviewError}
        />
      </div>
    );
  }

  // text/json/etc — show in scrollable pre, fetched as text
  return <TextPreview previewUrl={previewUrl} onError={onPreviewError} />;
}

function TextPreview({ previewUrl, onError }: { previewUrl: string; onError: () => void }) {
  const { data, isLoading } = useQuery<string>({
    queryKey: ['evidence-text-preview', previewUrl],
    queryFn: () =>
      fetch(previewUrl)
        .then((r) => {
          if (!r.ok) throw new Error('preview failed');
          return r.text();
        })
        .catch((e) => {
          onError();
          throw e;
        }),
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (!data) return null;

  return (
    <div className="rounded-md border border-surface-200 overflow-hidden bg-white">
      <pre className="text-xs text-surface-800 p-3 max-h-80 overflow-auto whitespace-pre-wrap font-mono">
        {data.slice(0, 8000)}
        {data.length > 8000 && '\n\n…truncated. Open full page to see all.'}
      </pre>
    </div>
  );
}
