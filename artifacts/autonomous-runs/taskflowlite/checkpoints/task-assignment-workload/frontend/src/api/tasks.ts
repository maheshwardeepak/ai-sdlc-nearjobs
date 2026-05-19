import { apiClient } from "./client";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  teamId: number;
  assigneeId?: number | null;
  assigneeUsername?: string | null;
  createdById: number;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  teamId: number;
  assigneeId?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  assigneeId?: number;
}

export interface TaskListFilters {
  teamId?: number;
  status?: TaskStatus;
  assigneeId?: number;
  unassigned?: boolean;
}

export async function listTasks(filters: TaskListFilters = {}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters.teamId != null) params.set("teamId", String(filters.teamId));
  if (filters.status) params.set("status", filters.status);
  if (filters.assigneeId != null) params.set("assigneeId", String(filters.assigneeId));
  if (filters.unassigned) params.set("unassigned", "true");
  const qs = params.toString();
  const { data } = await apiClient.get<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
  return data;
}

export async function getTask(id: number): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/api/tasks/${id}`);
  return data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>("/api/tasks", payload);
  return data;
}

export async function updateTask(id: number, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/api/tasks/${id}`, payload);
  return data;
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/api/tasks/${id}/status`, { status });
  return data;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}