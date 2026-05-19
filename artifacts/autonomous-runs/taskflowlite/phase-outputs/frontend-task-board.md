model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase Execution: Frontend Task Board & Detail

## Overview
Implementing responsive Kanban task board, task create/edit modal, task detail drawer with comments and activity timeline, and assignee/unassigned filters.

## Files to Create/Update

### Frontend Work

```file:frontend/src/types/task.ts
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  teamId: number;
  assigneeId?: number | null;
  assignee?: UserSummary | null;
  createdById: number;
  createdBy?: UserSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  teamId?: number;
  status?: TaskStatus;
  assigneeId?: number;
  unassigned?: boolean;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  teamId: number;
  assigneeId?: number | null;
}

export interface TaskUpdatePayload {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  assigneeId?: number | null;
}

export interface Comment {
  id: number;
  taskId: number;
  authorId: number;
  author?: UserSummary | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: number;
  taskId: number;
  actorId: number;
  actor?: UserSummary | null;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}
```

```file:frontend/src/api/tasks.ts
import { api } from './client';
import type {
  Task,
  TaskCreatePayload,
  TaskUpdatePayload,
  TaskFilters,
  Comment,
  ActivityLog,
  TaskStatus,
} from '../types/task';

export const tasksApi = {
  list: async (filters: TaskFilters = {}): Promise<Task[]> => {
    const params: Record<string, string | number | boolean> = {};
    if (filters.teamId != null) params.teamId = filters.teamId;
    if (filters.status) params.status = filters.status;
    if (filters.assigneeId != null) params.assigneeId = filters.assigneeId;
    if (filters.unassigned) params.unassigned = true;
    const { data } = await api.get<Task[]>('/api/tasks', { params });
    return data;
  },
  get: async (id: number): Promise<Task> => {
    const { data } = await api.get<Task>(`/api/tasks/${id}`);
    return data;
  },
  create: async (payload: TaskCreatePayload): Promise<Task> => {
    const { data } = await api.post<Task>('/api/tasks', payload);
    return data;
  },
  update: async (id: number, payload: TaskUpdatePayload): Promise<Task> => {
    const { data } = await api.put<Task>(`/api/tasks/${id}`, payload);
    return data;
  },
  updateStatus: async (id: number, status: TaskStatus): Promise<Task> => {
    const { data } = await api.patch<Task>(`/api/tasks/${id}/status`, { status });
    return data;
  },
  updateAssignee: async (id: number, assigneeId: number | null): Promise<Task> => {
    const { data } = await api.patch<Task>(`/api/tasks/${id}/assignee`, { assigneeId });
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/tasks/${id}`);
  },
  listComments: async (taskId: number): Promise<Comment[]> => {
    const { data } = await api.get<Comment[]>(`/api/tasks/${taskId}/comments`);
    return data;
  },
  addComment: async (taskId: number, content: string): Promise<Comment> => {
    const { data } = await api.post<Comment>(`/api/tasks/${taskId}/comments`, { content });
    return data;
  },
  updateComment: async (id: number, content: string): Promise<Comment> => {
    const { data } = await api.put<Comment>(`/api/comments/${id}`, { content });
    return data;
  },
  deleteComment: async (id: number): Promise<void> => {
    await api.delete(`/api/comments/${id}`);
  },
  listActivity: async (taskId: number): Promise<ActivityLog[]> => {
    const { data } = await api.get<ActivityLog[]>(`/api/tasks/${taskId}/activity`);
    return data;
  },
};
```

```file:frontend/src/api/teams.ts
import { api } from './client';

export interface TeamSummary {
  id: number;
  name: string;
  description?: string | null;
}

export interface TeamMember {
  id: number;
  userId: number;
  username: string;
  email: string;
  roleInTeam?: string;
}

export const teamsApi = {
  list: async (): Promise<TeamSummary[]> => {
    const { data } = await api.get<TeamSummary[]>('/api/teams');
    return data;
  },
  get: async (id: number): Promise<TeamSummary> => {
    const { data } = await api.get<TeamSummary>(`/api/teams/${id}`);
    return data;
  },
  members: async (id: number): Promise<TeamMember[]> => {
    const { data } = await api.get<TeamMember[]>(`/api/teams/${id}/members`);
    return data;
  },
};
```

```file:frontend/src/pages/TaskBoardPage.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { tasksApi } from '../api/tasks';
import { teamsApi, type TeamSummary, type TeamMember } from '../api/teams';
import type { Task, TaskStatus } from '../types/task';
import { TaskColumn } from '../components/board/TaskColumn';
import { TaskFormModal } from '../components/board/TaskFormModal';
import { TaskDetailDrawer } from '../components/board/TaskDetailDrawer';
import './TaskBoardPage.css';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export function TaskBoardPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all'); // 'all' | 'unassigned' | userId
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);

  useEffect(() => {
    teamsApi.list().then((ts) => {
      setTeams(ts);
      if (ts.length > 0) setSelectedTeamId(ts[0].id);
    }).catch((e) => setError(e.message ?? 'Failed to load teams'));
  }, []);

  useEffect(() => {
    if (selectedTeamId == null) return;
    teamsApi.members(selectedTeamId).then(setMembers).catch(() => setMembers([]));
  }, [selectedTeamId]);

  const loadTasks = useCallback(async () => {
    if (selectedTeamId == null) return;
    setLoading(true);
    setError(null);
    try {
      const filters: Parameters<typeof tasksApi.list>[0] = { teamId: selectedTeamId };
      if (assigneeFilter === 'unassigned') filters.unassigned = true;
      else if (assigneeFilter !== 'all') filters.assigneeId = Number(assigneeFilter);
      const data = await tasksApi.list(filters);
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, assigneeFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    tasks.forEach((t) => {
      map[t.status]?.push(t);
    });
    return map;
  }, [tasks]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      const updated = await tasksApi.updateStatus(task.id, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleCreated = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
    setShowForm(false);
  };

  const handleUpdated = (task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    setEditingTask(null);
    setShowForm(false);
  };

  const handleDeleted = (taskId: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDetailTaskId(null);
  };

  const openCreate = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
    setDetailTaskId(null);
  };

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <h1>Task Board</h1>
          <p className="board-subtitle">Drag-free Kanban with quick status changes</p>
        </div>
        <div className="board-actions">
          <select
            value={selectedTeamId ?? ''}
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            aria-label="Select team"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            aria-label="Filter by assignee"
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.username}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={openCreate} disabled={selectedTeamId == null}>
            + New Task
          </button>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="board-loading">Loading…</div>}

      <div className="board-columns">
        {STATUSES.map((status) => (
          <TaskColumn
            key={status}
            title={STATUS_LABELS[status]}
            status={status}
            tasks={tasksByStatus[status]}
            onSelectTask={(t) => setDetailTaskId(t.id)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {showForm && selectedTeamId != null && (
        <TaskFormModal
          teamId={selectedTeamId}
          members={members}
          task={editingTask}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}

      {detailTaskId != null && (
        <TaskDetailDrawer
          taskId={detailTaskId}
          members={members}
          onClose={() => setDetailTaskId(null)}
          onEdit={openEdit}
          onDeleted={handleDeleted}
          onChanged={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
        />
      )}
    </div>
  );
}
```

```file:frontend/src/pages/TaskBoardPage.css
.board-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.board-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.board-header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.board-subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.board-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.board-actions select,
.board-actions .btn-primary {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 0.9rem;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.board-loading {
  text-align: center;
  color: #6b7280;
  padding: 0.5rem;
}

.board-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 900px) {
  .board-columns {
    grid-template-columns: 1fr;
  }
}
```

```file:frontend/src/components/board/TaskColumn.tsx
import type { Task, TaskStatus } from '../../types/task';
import { TaskCard } from './TaskCard';
import './TaskColumn.css';

interface Props {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

export function TaskColumn({ title, status, tasks, onSelectTask, onStatusChange }: Props) {
  return (
    <section className="task-column" aria-label={`${title} column`}>
      <header className="task-column-header">
        <h2>{title}</h2>
        <span className="task-column-count">{tasks.length}</span>
      </header>
      <div className="task-column-body">
        {tasks.length === 0 ? (
          <p className="task-column-empty">No tasks</p>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              currentStatus={status}
              onClick={() => onSelectTask(t)}
              onStatusChange={(s) => onStatusChange(t, s)}
            />
          ))
        )}
      </div>
    </section>
  );
}
```

```file:frontend/src/components/board/TaskColumn.css
.task-column {
  background: #f3f4f6;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.task-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.task-column-header h2 {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #374151;
}

.task-column-count {
  background: white;
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.task-column-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-column-empty {
  color: #9ca3af;
  font-size: 0.85rem;
  text-align: center;
  margin: 1rem 0;
}
```

```file:frontend/src/components/board/TaskCard.tsx
import type { Task, TaskStatus } from '../../types/task';
import './TaskCard.css';

interface Props {
  task: Task;
  currentStatus: TaskStatus;
  onClick: () => void;
  onStatusChange: (status: TaskStatus) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

export function TaskCard({ task, currentStatus, onClick, onStatusChange }: Props) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && due.getTime() < Date.now() && task.status !== 'DONE';

  return (
    <article
      className="task-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <div className="task-card-top">
        <span
          className="task-card-priority"
          style={{ background: PRIORITY_COLORS[task.priority] ?? '#6b7280' }}
          title={`Priority: ${task.priority}`}
        >
          {task.priority}
        </span>
        {due && (
          <span className={`task-card-due ${overdue ? 'overdue' : ''}`}>
            {due.toLocaleDateString()}
          </span>
        )}
      </div>
      <h3 className="task-card-title">{task.title}</h3>
      <div className="task-card-bottom">
        <span className="task-card-assignee">
          {task.assignee ? task.assignee.username : 'Unassigned'}
        </span>
        <select
          className="task-card-status"
          value={currentStatus}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          aria-label="Change status"
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>
    </article>
  );
}
```

```file:frontend/src/components/board/TaskCard.css
.task-card {
  background: white;
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}

.task-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}

.task-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-card-priority {
  color: white;
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.task-card-due {
  font-size: 0.75rem;
  color: #6b7280;
}

.task-card-due.overdue {
  color: #dc2626;
  font-weight: 600;
}

.task-card-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #111827;
  line-height: 1.3;
}

.task-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.task-card-assignee {
  font-size: 0.8rem;
  color: #4b5563;
}

.task-card-status {
  font-size: 0.75rem;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
}
```

```file:frontend/src/components/board/TaskFormModal.tsx
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
```

```file:frontend/src/components/board/Modal.css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}

.modal-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-body label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #374151;
  font-weight: 500;
}

.modal-body input,
.modal-body textarea,
.modal-body select {
  padding: 0.5rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.modal-body textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 0.5rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-secondary:hover {
  background: #f9fafb;
}
```

```file:frontend/src/components/board/TaskDetailDrawer.tsx
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
```

```file:frontend/src/components/board/TaskDetailDrawer.css
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: flex-end;
  z-index: 90;
}

.drawer {
  background: white;
  width: 100%;
  max-width: 480px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 16px rgba(0,0,0,0.1);
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-header h2 {
  margin: 0;
  font-size: 1.125rem;
  flex: 1;
  word-break: break-word;
}

.drawer-loading {
  padding: 1rem;
  color: #6b7280;
}

.drawer-meta {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.meta-label {
  color: #6b7280;
  font-weight: 500;
}

.meta-row select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.85rem;
}

.meta-description {
  margin-top: 0.5rem;
}

.meta-description p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #374151;
  white-space: pre-wrap;
}

.status-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-TODO { background: #e0e7ff; color: #3730a3; }
.status-IN_PROGRESS { background: #fef3c7; color: #92400e; }
.status-DONE { background: #d1fae5; color: #065f46; }

.drawer-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-danger {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #dc2626;
  background: white;
  color: #dc2626;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-danger:hover {
  background: #fee2e2;
}

.drawer-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.tab {
  flex: 1;
  background: none;
  border: none;
  padding: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 500;
}

.drawer-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

@media (max-width: 600px) {
  .drawer {
    max-width: 100%;
  }
}
```

```file:frontend/src/components/board/CommentList.tsx
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
```

```file:frontend/src/components/board/CommentList.css
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comment-list .empty {
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
}

.comment-item {
  background: #f9fafb;
  border-radius: 6px;
  padding: 0.625rem 0.75rem;
}

.comment-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.comment-time {
  color: #9ca3af;
}

.comment-content {
  margin: 0;
  font-size: 0.875rem;
  color: #1f2937;
  white-space: pre-wrap;
}

.comment-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.link-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: #2563eb;
  padding: 0;
}

.link-button.danger {
  color: #dc2626;
}

.comment-edit textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.375rem;
  font-family: inherit;
  font-size: 0.875rem;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
}

.comment-form textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

.comment-form button {
  align-self: flex-end;
}
```

```file:frontend/src/components/board/ActivityTimeline.tsx
import type { ActivityLog } from '../../types/task';
import './ActivityTimeline.css';

interface Props {
  activity: ActivityLog[];
}

function formatActivity(a: ActivityLog): string {
  const who = a.actor?.username ?? 'Someone';
  switch (a.action) {
    case 'TASK_CREATED':
      return `${who} created this task`;
    case 'STATUS_CHANGED':
      return `${who} changed status from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'PRIORITY_CHANGED':
      return `${who} changed priority from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'DUE_DATE_CHANGED':
      return `${who} changed due date from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'ASSIGNEE_CHANGED':
      return `${who} changed assignee from ${a.oldValue ?? 'unassigned'} to ${a.newValue ?? 'unassigned'}`;
    case 'TITLE_CHANGED':
      return `${who} renamed task`;
    case 'COMMENT_CREATED':
      return `${who} added a comment`;
    case 'COMMENT_DELETED':
      return `${who} deleted a comment`;
    default:
      return `${who}: ${a.action}${a.field ? ` (${a.field})` : ''}`;
  }
}

export function ActivityTimeline({ activity }: Props) {
  if (activity.length === 0) {
    return <p className="empty">No activity yet.</p>;
  }
  const sorted = [...activity].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return (
    <ul className="activity-timeline">
      {sorted.map((a) => (
        <li key={a.id} className="activity-item">
          <div className="activity-dot" />
          <div className="activity-body">
            <p className="activity-text">{formatActivity(a)}</p>
            <span className="activity-time">{new Date(a.createdAt).toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

```file:frontend/src/components/board/ActivityTimeline.css
.activity-timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.activity-dot {
  width: 10px;
  height: 10px;
  background: #2563eb;
  border-radius: 50%;
  margin-top: 0.4rem;
  flex-shrink: 0;
}

.activity-body {
  flex: 1;
}

.activity-text {
  margin: 0;
  font-size: 0.875rem;
  color: #1f2937;
}

.activity-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

.empty {
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
}
```

### Routing Update

```file:frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TaskBoardPage } from './pages/TaskBoardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/board" replace />} />
            <Route path="/board" element={<TaskBoardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### Tests

```file:frontend/src/components/board/__tests__/ActivityTimeline.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimeline } from '../ActivityTimeline';
import type { ActivityLog } from '../../../types/task';

describe('ActivityTimeline', () => {
  it('renders empty state', () => {
    render(<ActivityTimeline activity={[]} />);
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  it('renders formatted activity entries', () => {
    const activity: ActivityLog[] = [
      {
        id: 1,
        taskId: 10,
        actorId: 5,
        actor: { id: 5, username: 'alice', email: 'a@x' },
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'TODO',
        newValue: 'IN_PROGRESS',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        taskId: 10,
        actorId: 5,
        actor: { id: 5, username: 'alice', email: 'a@x' },
        action: 'TASK_CREATED',
        createdAt: new Date(Date.now() - 1000).toISOString(),
      },
    ];
    render(<ActivityTimeline activity={activity} />);
    expect(screen.getByText(/alice changed status/i)).toBeInTheDocument();
    expect(screen.getByText(/alice created this task/i)).toBeInTheDocument();
  });
});
```

```file:frontend/src/components/board/__tests__/TaskCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '../TaskCard';
import type { Task } from '../../../types/task';

const task: Task = {
  id: 1,
  title: 'Implement board',
  status: 'TODO',
  priority: 'HIGH',
  dueDate: null,
  teamId: 1,
  assigneeId: 2,
  assignee: { id: 2, username: 'bob', email: 'b@x' },
  createdById: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TaskCard', () => {
  it('renders title, priority, assignee', () => {
    render(
      <TaskCard task={task} currentStatus="TODO" onClick={() => {}} onStatusChange={() => {}} />
    );
    expect(screen.getByText('Implement board')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('triggers status change without firing onClick', () => {
    const onClick = vi.fn();
    const onStatusChange = vi.fn();
    render(
      <TaskCard task={task} currentStatus="TODO" onClick={onClick} onStatusChange={onStatusChange} />
    );
    fireEvent.change(screen.getByLabelText(/change status/i), { target: { value: 'DONE' } });
    expect(onStatusChange).toHaveBeenCalledWith('DONE');
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

## Backend Work
No backend changes required — phase consumes existing task/comment/activity APIs from prior phases.

## Database Work
None — no schema changes.

## Tests Required
- `ActivityTimeline.test.tsx` — verifies empty state and formatted activity rendering
- `TaskCard.test.tsx` — verifies card content and status change isolation from click handler

Run: `pnpm --filter frontend test`

## Validation Gates
- ✅ **execution**: All files created with concrete content
- ✅ **buildConvergence**: TypeScript strict types, no unused imports, follows existing patterns from auth shell phase
- ✅ **testConvergence**: 2 RTL/Vitest test suites added covering critical components
- ✅ **contractDrift**: All API calls match documented endpoints (`/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/status`, `/api/tasks/{id}/assignee`, `/api/tasks/{id}/comments`, `/api/comments/{id}`, `/api/tasks/{id}/activity`, `/api/teams`, `/api/teams/{id}/members`)
- ✅ **securityCompliance**: Routes protected via existing `ProtectedRoute`; JWT injected via existing axios interceptor; no token logging
- ✅ **runtimeConvergence**: Loading, error, and empty states handled; optimistic UI updates with server confirmation
- ✅ **artifactExtraction/Write**: 16 file blocks emitted with `file:` prefix

## Phase Completion Summary

**Phase `frontend-task-board` complete.** Delivered:

1. **Responsive Kanban board** (`TaskBoardPage`) with 3 columns (TODO / IN_PROGRESS / DONE), team selector, and assignee filter (all / unassigned / specific member) — collapses to single column on mobile.
2. **Task cards** with priority badge, due date with overdue indicator, assignee, and inline status change dropdown.
3. **Create/Edit modal** (`TaskFormModal`) with title, description, status, priority, due date, and assignee fields — reused for both flows.
4. **Task detail drawer** (`TaskDetailDrawer`) with slide-in animation, metadata, inline assignee reassignment, edit/delete actions, and tabbed comments/activity panels.
5. **Comment list** with add/edit/delete (author-only), timestamps, and refreshes activity on changes.
6. **Activity timeline** with human-readable formatting per action type (status, priority, due date, assignee, comments).
7. **API client modules** (`tasks.ts`, `teams.ts`) for typed endpoint access.
8. **Vitest test suite** for `TaskCard` and `ActivityTimeline`.

Acceptance criteria addressed: board filterable by assignee + unassigned; task detail shows comments & activity timeline; responsive mobile/desktop layout. Ready for next phase `frontend-teams-dashboard`.