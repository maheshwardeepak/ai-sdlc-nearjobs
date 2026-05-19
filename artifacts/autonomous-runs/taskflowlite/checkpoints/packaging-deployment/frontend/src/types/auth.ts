export type UserRole = 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}