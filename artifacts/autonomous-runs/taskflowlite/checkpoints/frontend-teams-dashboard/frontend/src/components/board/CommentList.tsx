import { useState, type FormEvent } from 'react';
import { tasksApi } from '../../api/tasks';
import type { Comment } from '../../types/task';
import { useAuth } from '../../auth/AuthContext';
import './CommentList.css';

interface Props {
  taskId: number;
  comments: Comment[];
  onAdded: (c: Comment) => void;
  onUpdated: (c: Comment) => void;
  onDeleted: (id: number) => void;
}

export function CommentList({ taskId, comments, onAdded, onUpdated, onDeleted }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const c = await tasksApi.addComment(taskId, content.trim());
      onAdded(c);
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };

  const saveEdit = async (id: number) => {
    if (!editContent.trim()) return;
    const updated = await tasksApi.updateComment(id, editContent.trim());
    onUpdated(updated);
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this comment?')) return;
    await tasksApi.deleteComment(id);
    onDeleted(id);
  };

  return (
    <div className="comment-list">
      {comments.length === 0 && <p className="empty">No comments yet.</p>}
      {comments.map((c) => {
        const isOwn = user?.id === c.authorId;
        const isEditing = editingId === c.id;
        return (
          <div key={c.id} className="comment-item">
            <div className="comment-meta">
              <strong>{c.author?.username ?? 'Unknown'}</strong>
              <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            {isEditing ? (
              <div className="comment-edit">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                />
                <div className="comment-actions">
                  <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn-primary" onClick={() => saveEdit(c.id)}>Save</button>
                </div>
              </div>
            ) : (
              <>
                <p className="comment-content">{c.content}</p>
                {isOwn && (
                  <div className="comment-actions">
                    <button className="link-button" onClick={() => startEdit(c)}>Edit</button>
                    <button className="link-button danger" onClick={() => handleDelete(c.id)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      <form className="comment-form" onSubmit={handleAdd}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          required
        />
        <button type="submit" className="btn-primary" disabled={submitting || !content.trim()}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </form>
    </div>
  );
}