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