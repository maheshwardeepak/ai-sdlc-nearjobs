import { useEffect, useState } from 'react';
import { tasksApi } from '../../api/tasks';
import type { Task, Comment, ActivityLog } from '../../types/task';
import type { TeamMember } from '../../api/teams';
import { CommentList } from './CommentList';
import { ActivityTimeline } from './ActivityTimeline';
import './TaskDetailDrawer.css';

interface Props {
  taskId: number;
  members: TeamMember[];
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDeleted: (taskId: number) => void;
  onChanged: (task: Task) => void;
}

type Tab = 'comments' | 'activity';

export function TaskDetailDrawer({ taskId, members, onClose, onEdit, onDeleted, onChanged }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [tab, setTab] = useState<Tab>('comments');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      tasksApi.get(taskId),
      tasksApi.listComments(taskId),
      tasksApi.listActivity(taskId),
    ])
      .then(([t, c, a]) => {
        if (cancelled) return;
        setTask(t);
        setComments(c);
        setActivity(a);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load task'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [taskId]);

  const refreshActivity = async () => {
    try {
      const a = await tasksApi.listActivity(taskId);
      setActivity(a);
    } catch { /* ignore */ }
  };

  const handleAssigneeChange = async (assigneeId: number | null) => {
    if (!task) return;
    try {
      const updated = await tasksApi.updateAssignee(task.id, assigneeId);
      setTask(updated);
      onChanged(updated);
      refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reassign');
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('Delete this task?')) return;
    try {
      await tasksApi.remove(task.id);
      onDeleted(task.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleCommentAdded = (c: Comment) => {
    setComments((prev) => [...prev, c]);
    refreshActivity();
  };

  const handleCommentUpdated = (c: Comment) => {
    setComments((prev) => prev.map((x) => (x.id === c.id ? c : x)));
  };

  const handleCommentDeleted = (id: number) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    refreshActivity();
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Task details">
        <header className="drawer-header">
          <h2>{task ? task.title : 'Loading…'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        {error && <div className="alert-error">{error}</div>}
        {loading && <div className="drawer-loading">Loading…</div>}

        {task && (
          <>
            <div className="drawer-meta">
              <div className="meta-row">
                <span className="meta-label">Status</span>
                <span className={`status-badge status-${task.status}`}>{task.status.replace('_', ' ')}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Priority</span>
                <span>{task.priority}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Due</span>
                <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Assignee</span>
                <select
                  value={task.assigneeId != null ? String(task.assigneeId) : ''}
                  onChange={(e) => handleAssigneeChange(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.username}</option>
                  ))}
                </select>
              </div>
              {task.description && (
                <div className="meta-description">
                  <span className="meta-label">Description</span>
                  <p>{task.description}</p>
                </div>
              )}
              <div className="drawer-actions">
                <button className="btn-secondary" onClick={() => onEdit(task)}>Edit</button>
                <button className="btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>

            <div className="drawer-tabs">
              <button
                className={tab === 'comments' ? 'tab active' : 'tab'}
                onClick={() => setTab('comments')}
              >
                Comments ({comments.length})
              </button>
              <button
                className={tab === 'activity' ? 'tab active' : 'tab'}
                onClick={() => setTab('activity')}
              >
                Activity ({activity.length})
              </button>
            </div>

            <div className="drawer-tab-content">
              {tab === 'comments' && (
                <CommentList
                  taskId={task.id}
                  comments={comments}
                  onAdded={handleCommentAdded}
                  onUpdated={handleCommentUpdated}
                  onDeleted={handleCommentDeleted}
                />
              )}
              {tab === 'activity' && <ActivityTimeline activity={activity} />}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}