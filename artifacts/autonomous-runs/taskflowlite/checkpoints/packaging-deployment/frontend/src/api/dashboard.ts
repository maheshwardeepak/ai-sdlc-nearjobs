import { apiClient } from './client';

export interface GlobalDashboard {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  unassigned: number;
  myOpenTasks?: number;
}

export async function getGlobalDashboard(): Promise<GlobalDashboard> {
  const { data } = await apiClient.get('/api/dashboard');
  return data;
}