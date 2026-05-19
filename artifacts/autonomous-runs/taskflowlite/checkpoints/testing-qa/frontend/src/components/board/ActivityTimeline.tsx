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