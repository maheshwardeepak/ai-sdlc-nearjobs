import { useState, type FormEvent } from 'react';
import { tasksApi } from '../../api/tasks';
import type { Task, TaskPriority, TaskStatus } from '../../types/task';
import type { TeamMember } from '../../api/teams';
import './Modal.css';

interface Props {
  teamId: number;
  members: TeamMember[];
  task: Task | null;
  onClose: () => void;
  onCreated: (task: Task) => void;
  onUpdated: (task: Task) => void;
}

export function TaskFormModal({ teamId, members, task, onClose, onCreated, onUpdated }: Props) {
  const isEdit = task != null;
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [dueDate, setDueDate] = useState<string>(task?.dueDate ? task.dueDate.slice(0, 10) : '');
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId != null ? String(task.assigneeId) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || null,
        assigneeId: assigneeId ? Number(assigneeId) : null,
      };
      if (isEdit && task) {
        const updated = await tasksApi.update(task.id, payload);
        onUpdated(updated);
      } else {
        const created = await tasksApi.create({ ...payload, teamId });
        onCreated(created);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit task' : 'Create task'}>
        <header className="modal-header">
          <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="alert-error">{error}</div>}
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </label>
          <div className="form-row">
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </label>
            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Due Date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label>
              Assignee
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.username}</option>
                ))}
              </select>
            </label>
          </div>
          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : (isEdit ? 'Save' : 'Create')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}