import { apiClient } from './client';

export interface MemberWorkload {
  userId: number;
  username: string;
  email: string;
  todo: number;
  inProgress: number;
  done: number;
  openTasks: number;
  totalTasks: number;
}

export interface TeamWorkload {
  teamId: number;
  teamName: string;
  unassignedOpenTasks: number;
  members: MemberWorkload[];
}

export async function getTeamWorkload(teamId: number): Promise<TeamWorkload> {
  const { data } = await apiClient.get<TeamWorkload>(`/api/teams/${teamId}/workload`);
  return data;
}