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