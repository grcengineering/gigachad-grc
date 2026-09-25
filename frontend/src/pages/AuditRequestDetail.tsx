import { type FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  type BadgeVariant,
} from '@/components/ui';

interface Comment {
  id: string;
  content: string;
  authorName?: string;
  isInternal?: boolean;
  createdAt: string;
}

interface Evidence {
  id: string;
  title?: string;
  fileName?: string;
  evidenceId?: string;
}

interface AuditRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  requirementRef?: string;
  dueDate?: string;
  createdAt: string;
  audit?: { id: string; auditId: string; name: string };
  evidence?: Evidence[];
  comments?: Comment[];
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'clarification_needed', label: 'Clarification Needed' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'info',
  in_progress: 'warning',
  submitted: 'brand',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  clarification_needed: 'warning',
};

export default function AuditRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const queryKey = ['audit-request', id];

  const request = useQuery<AuditRequest>({
    queryKey,
    queryFn: async () => (await api.get(`/api/audit-requests/${id}`)).data,
    enabled: Boolean(id),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) =>
      (await api.patch(`/api/audit-requests/${id}`, { status })).data,
    onSuccess: () => {
      toast.success('Request status updated');
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['audit-requests'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to update request'),
  });

  const addComment = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/audit-requests/${id}/comments`, { content: comment })).data,
    onSuccess: () => {
      setComment('');
      toast.success('Comment added');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to add comment'),
  });

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (comment.trim()) addComment.mutate();
  };

  if (request.isLoading) return <Skeleton className="h-96" />;
  if (request.isError || !request.data) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title="Audit request unavailable"
        description="The request does not exist or is not accessible in this organization."
        action={
          <Link to="/audit-requests">
            <Button>Back to Audit Requests</Button>
          </Link>
        }
      />
    );
  }

  const data = request.data;
  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/audit-requests"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Audit Requests
      </Link>
      <PageHeader
        title={data.title}
        description={`Request ${data.requestNumber}`}
        meta={
          <>
            <Badge variant={STATUS_VARIANT[data.status] ?? 'neutral'} dot>
              {data.status.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={data.priority === 'critical' ? 'danger' : 'neutral'}>
              {data.priority} priority
            </Badge>
          </>
        }
        actions={
          <Select
            size="sm"
            fullWidth={false}
            className="w-52"
            value={data.status}
            options={STATUS_OPTIONS}
            onChange={(status) => updateStatus.mutate(status)}
            disabled={updateStatus.isPending}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="whitespace-pre-wrap text-surface-700">{data.description}</p>
            <dl className="grid gap-4 border-t border-surface-200 pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-surface-500">Audit</dt>
                <dd className="mt-1 text-surface-900">
                  {data.audit ? `${data.audit.auditId} — ${data.audit.name}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-surface-500">Category</dt>
                <dd className="mt-1 capitalize text-surface-900">
                  {data.category.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-surface-500">Requirement</dt>
                <dd className="mt-1 text-surface-900">{data.requirementRef || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-surface-500">Due Date</dt>
                <dd className="mt-1 text-surface-900">
                  {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence ({data.evidence?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardBody>
            {data.evidence?.length ? (
              <ul className="space-y-2">
                {data.evidence.map((item) => (
                  <li key={item.id} className="rounded border border-surface-200 p-3 text-sm">
                    {item.title || item.fileName || item.evidenceId || item.id}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-surface-500">No evidence has been attached.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comments ({data.comments?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <form onSubmit={submitComment} className="space-y-3">
            <Textarea
              aria-label="New comment"
              placeholder="Add context or ask for clarification…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
            />
            <Button
              type="submit"
              size="sm"
              leftIcon={<MessageSquare className="h-4 w-4" />}
              loading={addComment.isPending}
              disabled={!comment.trim()}
            >
              Add Comment
            </Button>
          </form>
          <div className="space-y-3 border-t border-surface-200 pt-4">
            {data.comments?.length ? (
              data.comments.map((item) => (
                <div key={item.id} className="rounded-lg bg-surface-50 p-3">
                  <div className="mb-1 flex justify-between gap-3 text-xs text-surface-500">
                    <span>{item.authorName || 'Platform user'}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-surface-800">{item.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-500">No comments yet.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
