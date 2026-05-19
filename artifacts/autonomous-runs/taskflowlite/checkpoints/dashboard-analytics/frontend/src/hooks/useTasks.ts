import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateTaskPayload,
  Task,
  TaskListFilters,
  TaskStatus,
  UpdateTaskPayload,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
  updateTaskStatus,
} from "../api/tasks";

const tasksKey = (filters: TaskListFilters) => ["tasks", filters] as const;

export function useTasks(filters: TaskListFilters = {}) {
  return useQuery({
    queryKey: tasksKey(filters),
    queryFn: () => listTasks(filters),
  });
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => getTask(id as number),
    enabled: id != null,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTaskPayload }) =>
      updateTask(id, payload),
    onSuccess: (task: Task) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.setQueryData(["task", task.id], task);
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}