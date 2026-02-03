import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { evidenceApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import EntityAuditHistory from '@/components/EntityAuditHistory';
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
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';

type TabType = 'details' | 'history';

const TYPE_ICONS: Record<string, any> = {
  screenshot: PhotoIcon,
  document: DocumentTextIcon,
  default: DocumentTextIcon,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending_review: { label: 'Pending Review', color: 'text-yellow-400 bg-yellow-400/10', icon: ClockIcon },
  approved: { label: 'Approved', color: 'text-green-400 bg-green-400/10', icon: CheckCircleIcon },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10', icon: XCircleIcon },
  expired: { label: 'Expired', color: 'text-surface-400 bg-surface-400/10', icon: CalendarIcon },
};

export default function EvidenceDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');

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
    } catch {
      toast.error('Failed to get download URL');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SkeletonDetailHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonDetailSection title />
            <SkeletonDetailSection title />
          </div>
          <div className="space-y-6">
            <SkeletonDetailSection title />
            <SkeletonDetailSection title />
          </div>
        </div>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-400">Evidence not found</p>
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
          className="inline-flex items-center text-sm text-surface-400 hover:text-surface-100 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Evidence
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-surface-800 rounded-lg">
              <Icon className="w-8 h-8 text-surface-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-100">{evidence.title}</h1>
              <p className="text-surface-400 mt-1">{evidence.filename}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={clsx('badge', statusConfig.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </span>
                <span className="badge badge-neutral capitalize">{evidence.type}</span>
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
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Preview</h2>
            {isPreviewable ? (
              <div className="border border-surface-800 rounded-lg overflow-hidden bg-surface-950">
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
                      className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
                    sandbox="allow-scripts allow-same-origin"
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
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Description</h2>
              <p className="text-surface-300">{evidence.description}</p>
            </div>
          )}

          {/* Linked Controls */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">Linked Controls</h2>
              <span className="badge badge-neutral">
                {evidence.controlLinks?.length || 0} control(s)
              </span>
            </div>
            {(evidence?.controlLinks?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {evidence?.controlLinks?.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg group"
                  >
                    <Link
                      to={`/controls/${link.control?.id}`}
                      className="flex items-center gap-3 flex-1 hover:bg-surface-700 -m-3 p-3 rounded-lg transition-colors"
                    >
                      <LinkIcon className="w-5 h-5 text-brand-400" />
                      <div className="flex-1">
                        <p className="text-sm font-mono text-brand-400">
                          {link.control?.controlId}
                        </p>
                        <p className="text-sm text-surface-300">
                          {link.control?.title}
                        </p>
                      </div>
                    </Link>
                    {hasPermission('evidence:write') && (
                      <button
                        onClick={() => unlinkMutation.mutate(link.control?.id)}
                        disabled={unlinkMutation.isPending}
                        className="p-1 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Review</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="w-4 h-4 text-surface-500" />
                  <span className="text-surface-400">Reviewed by:</span>
                  <span className="text-surface-200">{evidence.reviewedBy || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-surface-500" />
                  <span className="text-surface-400">Reviewed on:</span>
                  <span className="text-surface-200">
                    {new Date(evidence.reviewedAt).toLocaleDateString()}
                  </span>
                </div>
                {evidence.reviewNotes && (
                  <div className="mt-3 p-3 bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 mb-1">Notes:</p>
                    <p className="text-sm text-surface-300">{evidence.reviewNotes}</p>
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
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-surface-500">File Size</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  {formatFileSize(evidence.size)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">File Type</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  {evidence.mimeType || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Source</dt>
                <dd className="text-sm text-surface-200 mt-1 capitalize">
                  {evidence.source}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Collected</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  {evidence.collectedAt ? new Date(evidence.collectedAt).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Valid From</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  {evidence.validFrom ? new Date(evidence.validFrom).toLocaleDateString() : '—'}
                </dd>
              </div>
              {evidence.validUntil && (
                <div>
                  <dt className="text-xs text-surface-500">Valid Until</dt>
                  <dd className="text-sm text-surface-200 mt-1">
                    {new Date(evidence.validUntil).toLocaleDateString()}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-surface-500">Version</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  v{evidence.version}
                </dd>
              </div>
            </dl>
          </div>

          {/* Tags */}
          {(evidence?.tags?.length ?? 0) > 0 && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-100 mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {evidence?.tags?.map((tag: string) => (
                  <span key={tag} className="badge badge-neutral text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Folder */}
          {evidence.folder && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-100 mb-4">Folder</h3>
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-surface-400" />
                <span className="text-sm text-surface-200">{evidence.folder.name}</span>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Audit</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-surface-500">Created</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  {new Date(evidence.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Last Updated</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  {new Date(evidence.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="card overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-surface-700 px-4">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={clsx(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'details'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200 hover:border-surface-600'
              )}
            >
              <DocumentTextIcon className="w-4 h-4" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={clsx(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'history'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200 hover:border-surface-600'
              )}
            >
              <ClockIcon className="w-4 h-4" />
              History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-100">File Information</h3>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-xs text-surface-500">File Name</dt>
                  <dd className="text-sm text-surface-200 mt-1">{evidence.filename}</dd>
                </div>
                <div>
                  <dt className="text-xs text-surface-500">File Size</dt>
                  <dd className="text-sm text-surface-200 mt-1">{formatFileSize(evidence.size)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-surface-500">MIME Type</dt>
                  <dd className="text-sm text-surface-200 mt-1">{evidence.mimeType || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-surface-500">Version</dt>
                  <dd className="text-sm text-surface-200 mt-1">v{evidence.version}</dd>
                </div>
              </dl>
            </div>
          )}
          {activeTab === 'history' && (
            <EntityAuditHistory entityType="evidence" entityId={id!} />
          )}
        </div>
      </div>

      {/* Review Modal */}
      {isReviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsReviewing(false)} />
          <div className="relative bg-surface-900 border border-surface-800 rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Review Evidence</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="input mt-1"
                  rows={3}
                  placeholder="Add review notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setIsReviewing(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => reviewMutation.mutate({ status: 'rejected', notes: reviewNotes })}
                isLoading={reviewMutation.isPending}
              >
                Reject
              </Button>
              <Button
                onClick={() => reviewMutation.mutate({ status: 'approved', notes: reviewNotes })}
                isLoading={reviewMutation.isPending}
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {isLightboxOpen && isImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-lg transition-colors z-10"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          {/* Download button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="absolute top-4 right-16 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-lg transition-colors z-10"
            title="Download"
          >
            <ArrowDownTrayIcon className="w-6 h-6" />
          </button>

          {/* Image container */}
          <div 
            className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/api/evidence/${evidence.id}/preview`}
              alt={evidence.title}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Image title */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
              <p className="text-white font-medium">{evidence.title}</p>
              <p className="text-white/60 text-sm">{evidence.filename}</p>
            </div>
          </div>

          {/* Keyboard hint */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">ESC</kbd> or click anywhere to close
          </p>
        </div>
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
        <div className="animate-spin w-6 h-6 border-2 border-surface-700 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>Failed to load preview</p>
      </div>
    );
  }

  return (
    <pre className="p-4 text-sm text-surface-300 overflow-auto max-h-[500px] font-mono whitespace-pre-wrap break-words">
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
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        const parsedSheets = workbook.worksheets.map((worksheet) => {
          const data: any[][] = [];
          worksheet.eachRow((row) => {
            const rowData: any[] = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
              rowData.push(cell.value);
            });
            data.push(rowData);
          });
          return {
            name: worksheet.name,
            data,
          };
        });
        
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
        <div className="animate-spin w-6 h-6 border-2 border-surface-700 rounded-full border-t-brand-500"></div>
        <span className="ml-2 text-surface-400">Loading spreadsheet...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>Failed to load spreadsheet: {error}</p>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];

  return (
    <div className="overflow-hidden">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 p-2 bg-surface-800 border-b border-surface-700 overflow-x-auto">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(index)}
              className={clsx(
                'px-3 py-1 text-sm rounded transition-colors whitespace-nowrap',
                activeSheet === index
                  ? 'bg-brand-500 text-white'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'
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
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-surface-800 font-semibold' : ''}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-3 py-2 border border-surface-700 text-surface-300 whitespace-nowrap"
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
        
        // Sanitize HTML to prevent XSS attacks from malicious documents
        const sanitizedHtml = DOMPurify.sanitize(result.value, {
          ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'span', 'div'],
          ALLOWED_ATTR: ['href', 'class', 'style'],
          ALLOW_DATA_ATTR: false,
        });
        setHtml(sanitizedHtml);
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
        <div className="animate-spin w-6 h-6 border-2 border-surface-700 rounded-full border-t-brand-500"></div>
        <span className="ml-2 text-surface-400">Loading document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>Failed to load document: {error}</p>
      </div>
    );
  }

  return (
    <div 
      className="p-6 prose prose-invert max-w-none overflow-auto max-h-[600px]
        prose-headings:text-surface-100 prose-p:text-surface-300 
        prose-strong:text-surface-200 prose-a:text-brand-400
        prose-ul:text-surface-300 prose-ol:text-surface-300
        prose-table:border-surface-700 prose-td:border-surface-700 prose-th:border-surface-700"
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}

