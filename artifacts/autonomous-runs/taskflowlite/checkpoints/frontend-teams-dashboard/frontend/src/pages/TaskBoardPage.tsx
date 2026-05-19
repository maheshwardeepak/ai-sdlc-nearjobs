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