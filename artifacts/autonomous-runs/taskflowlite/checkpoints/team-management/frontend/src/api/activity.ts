import { apiClient } from './client';

export interface ActivityLogDto {
  id: number;
  taskId: number;
  actorId: number | null;
  actorUsername: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export async function fetchTaskActivity(taskId: number): Promise<ActivityLogDto[]> {
  const res = await apiClient.get<ActivityLogDto[]>(`/api/tasks/${taskId}/activity`);
  return res.data;
}

export function describeActivity(a: ActivityLogDto): string {
  const who = a.actorUsername ?? 'system';
  switch (a.action) {
    case 'TASK_CREATED':
      return `${who} created the task`;
    case 'STATUS_CHANGED':
      return `${who} changed status from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'PRIORITY_CHANGED':
      return `${who} changed priority from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'DUE_DATE_CHANGED':
      return `${who} changed due date from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'ASSIGNEE_CHANGED':
      return `${who} changed assignee from ${a.oldValue ?? 'unassigned'} to ${a.newValue ?? 'unassigned'}`;
    case 'COMMENT_CREATED':
      return `${who} added a comment`;
    case 'COMMENT_DELETED':
      return `${who} deleted a comment`;
    default:
      return `${who} ${a.action}`;
  }
}