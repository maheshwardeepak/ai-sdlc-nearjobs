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