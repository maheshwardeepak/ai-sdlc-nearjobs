import { apiClient } from './client';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerUsername: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  roleInTeam: string;
  joinedAt: string;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface AddMemberRequest {
  userId: string;
  roleInTeam?: string;
}

export const teamsApi = {
  list: () => apiClient.get<Team[]>('/api/teams').then(r => r.data),

  get: (id: string) =>
    apiClient.get<Team>(`/api/teams/${id}`).then(r => r.data),

  create: (body: CreateTeamRequest) =>
    apiClient.post<Team>('/api/teams', body).then(r => r.data),

  update: (id: string, body: UpdateTeamRequest) =>
    apiClient.patch<Team>(`/api/teams/${id}`, body).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete<void>(`/api/teams/${id}`).then(r => r.data),

  listMembers: (id: string) =>
    apiClient.get<TeamMember[]>(`/api/teams/${id}/members`).then(r => r.data),

  addMember: (id: string, body: AddMemberRequest) =>
    apiClient.post<TeamMember>(`/api/teams/${id}/members`, body).then(r => r.data),

  removeMember: (id: string, userId: string) =>
    apiClient.delete<void>(`/api/teams/${id}/members/${userId}`).then(r => r.data),
};

// ===== AI MERGE APPEND =====

import { api } from './client';

export interface TeamSummary {
  id: number;
  name: string;
  description?: string | null;
}

export interface TeamMember {
  id: number;
  userId: number;
  username: string;
  email: string;
  roleInTeam?: string;
}

export const teamsApi = {
  list: async (): Promise<TeamSummary[]> => {
    const { data } = await api.get<TeamSummary[]>('/api/teams');
    return data;
  },
  get: async (id: number): Promise<TeamSummary> => {
    const { data } = await api.get<TeamSummary>(`/api/teams/${id}`);
    return data;
  },
  members: async (id: number): Promise<TeamMember[]> => {
    const { data } = await api.get<TeamMember[]>(`/api/teams/${id}/members`);
    return data;
  },
};