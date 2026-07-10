import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PhotoIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  FolderIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button, Dialog, Textarea } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';

const TYPE_ICONS: Record<string, any> = {
  screenshot: PhotoIcon,
  document: DocumentTextIcon,
  default: DocumentTextIcon,
};

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon: any }> = {
  pending_review: { label: 'Pending Review', variant: 'warning', icon: ClockIcon },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircleIcon },
  rejected: { label: 'Rejected', variant: 'danger', icon: XCircleIcon },
  expired: { label: 'Expired', variant: 'neutral', icon: CalendarIcon },
};

export default function EvidenceDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { data: evidence, isLoading } = useQuery({
    queryKey: ['evidence', id],
    queryFn: () => evidenceApi.get(id!).then((res) => res.data),
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: (data: { status: string; notes: string }) =>
      evidenceApi.review(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', id] });
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      toast.success('Evidence reviewed');
      setIsReviewing(false);
      setReviewNotes('');
    },
    onError: () => {
      toast.error('Failed to review evidence');
    },
  });

  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    
    if (isLightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent scrolling when lightbox is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  const unlinkMutation = useMutation({
    mutationFn: (controlId: string) => evidenceApi.unlink(id!, controlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', id] });
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast.success('Control unlinked');
    },
    onError: () => {
      toast.error('Failed to unlink control');
    },
  });

  const handleDownload = async () => {
    try {
      const response = await evidenceApi.getDownloadUrl(id!);
      const url = response.data.url;
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to get download URL');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-surface-300 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-600">Evidence not found</p>
      </div>
    );
  }

  const Icon = TYPE_ICONS[evidence.type] || TYPE_ICONS.default;
  const statusConfig = STATUS_CONFIG[evidence.status] || STATUS_CONFIG.pending_review;
  const StatusIcon = statusConfig.icon;

  // Check if file is previewable
  const isImage = evidence.mimeType?.startsWith('image/');
  const isPDF = evidence.mimeType === 'application/pdf';
  const isText = evidence.mimeType?.startsWith('text/') || 
    ['application/json', 'application/xml', 'application/javascript'].includes(evidence.mimeType);
  const isExcel = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ].includes(evidence.mimeType);
  const isWord = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ].includes(evidence.mimeType);
  const isPreviewable = isImage || isPDF || isText || isExcel || isWord;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          to="/evidence"
          className="inline-flex items-center text-sm text-surface-600 hover:text-surface-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Evidence
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-surface-100 rounded-lg">
              <Icon className="w-8 h-8 text-surface-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">{evidence.title}</h1>
              <p className="text-surface-600 mt-1">{evidence.filename}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={statusConfig.variant}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <Badge variant="neutral">{evidence.type}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
              Download
            </Button>
            {hasPermission('evidence:review') && evidence.status === 'pending_review' && (
              <Button onClick={() => setIsReviewing(true)}>
                Review
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Preview</h2>
            {isPreviewable ? (
              <div className="border border-surface-200 rounded-lg overflow-hidden bg-surface-50">
                {isImage && (
                  <div className="relative group">
                    <img
                      src={`/api/evidence/${evidence.id}/preview`}
                      alt={evidence.title}
                      className="max-w-full max-h-[500px] mx-auto cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setIsLightboxOpen(true)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      onClick={() => setIsLightboxOpen(true)}
                      className="absolute top-3 right-3 p-2 bg-white/30 hover:bg-black/70 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Expand image"
                    >
                      <ArrowsPointingOutIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {isPDF && (
                  <iframe
                    src={`/api/evidence/${evidence.id}/preview`}
                    className="w-full h-[600px]"
                    title={evidence.title}
                  />
                )}
                {isText && (
                  <TextPreview evidenceId={evidence.id} />
                )}
                {isExcel && (
                  <ExcelPreview evidenceId={evidence.id} />
                )}
                {isWord && (
                  <WordPreview evidenceId={evidence.id} />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-surface-500">
                <Icon className="w-16 h-16 mb-4" />
                <p>Preview not available for this file type</p>
                <p className="text-sm mt-1">Click download to view the file</p>
              </div>
            )}
          </div>

          {/* Description */}
          {evidence.description && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-surface-900 mb-4">Description</h2>
              <p className="text-surface-700">{evidence.description}</p>
            </div>
          )}

          {/* Linked Controls */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900">Linked Controls</h2>
              <Badge variant="neutral" capitalize={false}>
                {evidence.controlLinks?.length || 0} control(s)
              </Badge>
            </div>
            {evidence.controlLinks?.length > 0 ? (
              <div className="space-y-2">
                {evidence.controlLinks.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 bg-surface-100 rounded-lg group"
                  >
                    <Link
                      to={`/controls/${link.control?.id}`}
                      className="flex items-center gap-3 flex-1 hover:bg-surface-200 -m-3 p-3 rounded-lg transition-colors"
                    >
                      <LinkIcon className="w-5 h-5 text-brand-700" />
                      <div className="flex-1">
                        <p className="text-sm font-mono text-brand-700">
                          {link.control?.controlId}
                        </p>
                        <p className="text-sm text-surface-700">
                          {link.control?.title}
                        </p>
                      </div>
                    </Link>
                    {hasPermission('evidence:write') && (
                      <button
                        onClick={() => unlinkMutation.mutate(link.control?.id)}
                        disabled={unlinkMutation.isPending}
                        className="p-1 text-surface-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Unlink control"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500 text-sm">
                This evidence is not linked to any controls
              </p>
            )}
          </div>

          {/* Review History */}
          {evidence.reviewedAt && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-surface-900 mb-4">Review</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="w-4 h-4 text-surface-500" />
                  <span className="text-surface-600">Reviewed by:</span>
                  <span className="text-surface-800">{evidence.reviewedBy || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-surface-500" />
                  <span className="text-surface-600">Reviewed on:</span>
                  <span className="text-surface-800">
                    {new Date(evidence.reviewedAt).toLocaleDateString()}
                  </span>
                </div>
                {evidence.reviewNotes && (
                  <div className="mt-3 p-3 bg-surface-100 rounded-lg">
                    <p className="text-sm text-surface-500 mb-1">Notes:</p>
                    <p className="text-sm text-surface-700">{evidence.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-surface-500">File Size</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  {formatFileSize(evidence.size)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">File Type</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  {evidence.mimeType || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Source</dt>
                <dd className="text-sm text-surface-800 mt-1 capitalize">
                  {evidence.source}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Collected</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  {new Date(evidence.collectedAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Valid From</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  {new Date(evidence.validFrom).toLocaleDateString()}
                </dd>
              </div>
              {evidence.validUntil && (
                <div>
                  <dt className="text-xs text-surface-500">Valid Until</dt>
                  <dd className="text-sm text-surface-800 mt-1">
                    {new Date(evidence.validUntil).toLocaleDateString()}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-surface-500">Version</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  v{evidence.version}
                </dd>
              </div>
            </dl>
          </div>

          {/* Tags */}
          {evidence.tags?.length > 0 && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {evidence.tags.map((tag: string) => (
                  <Badge key={tag} variant="neutral" size="sm" capitalize={false}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Folder */}
          {evidence.folder && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-4">Folder</h3>
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-surface-600" />
                <span className="text-sm text-surface-800">{evidence.folder.name}</span>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">Audit</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-surface-500">Created</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  {new Date(evidence.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Last Updated</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  {new Date(evidence.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog
        open={isReviewing}
        onClose={() => setIsReviewing(false)}
        size="sm"
        title="Review Evidence"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReviewing(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => reviewMutation.mutate({ status: 'rejected', notes: reviewNotes })}
              disabled={reviewMutation.isPending}
            >
              Reject
            </Button>
            <Button
              onClick={() => reviewMutation.mutate({ status: 'approved', notes: reviewNotes })}
              disabled={reviewMutation.isPending}
            >
              Approve
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Notes (optional)</label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Add review notes..."
            />
          </div>
        </div>
      </Dialog>

      {/* Image Lightbox Modal */}
      {isImage && (
        <Dialog
          open={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          size="xl"
          className="max-w-[95vw] bg-transparent border-0 shadow-none"
        >
          <div
            className="relative flex items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-0 right-0 p-2 text-white/70 hover:text-white bg-white/30 hover:bg-black/70 rounded-lg transition-colors z-10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Download button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="absolute top-0 right-12 p-2 text-white/70 hover:text-white bg-white/30 hover:bg-black/70 rounded-lg transition-colors z-10"
              title="Download"
            >
              <ArrowDownTrayIcon className="w-6 h-6" />
            </button>

            {/* Image container */}
            <div
              className="relative max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`/api/evidence/${evidence.id}/preview`}
                alt={evidence.title}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />

              {/* Image title */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
                <p className="text-surface-900 font-medium">{evidence.title}</p>
                <p className="text-surface-900/60 text-sm">{evidence.filename}</p>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function TextPreview({ evidenceId }: { evidenceId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/evidence/${evidenceId}/preview`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load preview');
        const text = await res.text();
        setContent(text);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [evidenceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-surface-300 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Failed to load preview</p>
      </div>
    );
  }

  return (
    <pre className="p-4 text-sm text-surface-700 overflow-auto max-h-[500px] font-mono whitespace-pre-wrap break-words">
      {content}
    </pre>
  );
}

function ExcelPreview({ evidenceId }: { evidenceId: string }) {
  const [sheets, setSheets] = useState<{ name: string; data: any[][] }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExcel = async () => {
      try {
        const response = await fetch(`/api/evidence/${evidenceId}/preview`);
        if (!response.ok) throw new Error('Failed to load file');
        
        const arrayBuffer = await response.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const parsedSheets = workbook.SheetNames.map((name) => ({
          name,
          data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }) as any[][],
        }));
        
        setSheets(parsedSheets);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadExcel();
  }, [evidenceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-surface-300 rounded-full border-t-brand-500"></div>
        <span className="ml-2 text-surface-600">Loading spreadsheet...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Failed to load spreadsheet: {error}</p>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];

  return (
    <div className="overflow-hidden">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 p-2 bg-surface-100 border-b border-surface-300 overflow-x-auto">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(index)}
              className={clsx(
                'px-3 py-1 text-sm rounded transition-colors whitespace-nowrap',
                activeSheet === index
                  ? 'bg-brand-500 text-white'
                  : 'text-surface-600 hover:text-surface-800 hover:bg-surface-200'
              )}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full text-sm">
          <tbody>
            {currentSheet?.data.slice(0, 100).map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-surface-100 font-semibold' : ''}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-3 py-2 border border-surface-300 text-surface-700 whitespace-nowrap"
                  >
                    {cell?.toString() || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {currentSheet?.data.length > 100 && (
          <p className="text-center py-2 text-surface-500 text-sm">
            Showing first 100 rows of {currentSheet.data.length}
          </p>
        )}
      </div>
    </div>
  );
}

function WordPreview({ evidenceId }: { evidenceId: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWord = async () => {
      try {
        const response = await fetch(`/api/evidence/${evidenceId}/preview`);
        if (!response.ok) throw new Error('Failed to load file');
        
        const arrayBuffer = await response.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        setHtml(result.value);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadWord();
  }, [evidenceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-surface-300 rounded-full border-t-brand-500"></div>
        <span className="ml-2 text-surface-600">Loading document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Failed to load document: {error}</p>
      </div>
    );
  }

  return (
    <div 
      className="p-6 prose prose-invert max-w-none overflow-auto max-h-[600px]
        prose-headings:text-surface-900 prose-p:text-surface-700 
        prose-strong:text-surface-800 prose-a:text-brand-700
        prose-ul:text-surface-700 prose-ol:text-surface-700
        prose-table:border-surface-300 prose-td:border-surface-300 prose-th:border-surface-300"
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}

