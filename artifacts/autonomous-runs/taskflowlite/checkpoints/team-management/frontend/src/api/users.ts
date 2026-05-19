import { apiClient } from './client';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getMe(): Promise<UserProfile> {
  const { data } = await apiClient.get('/api/users/me');
  return data;
}

export async function updateMe(payload: { username?: string; email?: string; password?: string }): Promise<UserProfile> {
  const { data } = await apiClient.patch('/api/users/me', payload);
  return data;
}

export async function listUsers(): Promise<UserProfile[]> {
  const { data } = await apiClient.get('/api/users');
  return data;
}