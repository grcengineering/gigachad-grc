import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CommentsPanelProps {
  entityType: string;
  entityId: string;
}

export default function CommentsPanel({ entityType, entityId }: CommentsPanelProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => commentsApi.list(entityType, entityId).then((res) => res.data),
    enabled: !!entityId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      commentsApi.create({ entityType, entityId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, isResolved }: { id: string; isResolved: boolean }) =>
      commentsApi.update(id, { isResolved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createMutation.mutate({ content: newComment.trim() });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    createMutation.mutate({ content: replyContent.trim(), parentId });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="w-5 h-5 text-surface-400" />
        <h3 className="text-sm font-semibold text-surface-100">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || createMutation.isPending}
          className="btn-primary px-3"
        >
          <PaperAirplaneIcon className="w-4 h-4" />
        </button>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-4 text-surface-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-surface-500 text-sm">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment: any) => (
            <div
              key={comment.id}
              className={clsx(
                'p-3 rounded-lg',
                comment.isResolved ? 'bg-surface-800/50' : 'bg-surface-800'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-200">
                      {comment.author?.displayName || 'Unknown'}
                    </span>
                    <span className="text-xs text-surface-500">
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.isResolved && (
                      <span className="badge badge-success text-xs">Resolved</span>
                    )}
                  </div>
                  <p className="text-sm text-surface-300">{comment.content}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => resolveMutation.mutate({
                      id: comment.id,
                      isResolved: !comment.isResolved,
                    })}
                    className={clsx(
                      'p-1 rounded hover:bg-surface-700 transition-colors',
                      comment.isResolved ? 'text-green-400' : 'text-surface-500'
                    )}
                    title={comment.isResolved ? 'Unresolve' : 'Mark as resolved'}
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                  {comment.authorId === user?.id && (
                    <button
                      onClick={() => deleteMutation.mutate(comment.id)}
                      className="p-1 rounded text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {comment.replies?.length > 0 && (
                <div className="mt-3 ml-4 pl-3 border-l-2 border-surface-700 space-y-2">
                  {comment.replies.map((reply: any) => (
                    <div key={reply.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-surface-300">
                          {reply.author?.displayName || 'Unknown'}
                        </span>
                        <span className="text-xs text-surface-500">
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-surface-400">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="input flex-1 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyContent.trim()}
                    className="btn-primary px-2 py-1 text-sm"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="p-1 text-surface-500 hover:text-surface-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="mt-2 text-xs text-surface-500 hover:text-surface-300"
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

