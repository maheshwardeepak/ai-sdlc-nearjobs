// Test fixtures generated dynamically to avoid any static credential-like literals.
import type { AuthResponse, UserProfile } from '../types/auth';

function randomOpaque(prefix: string): string {
  const rand = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}

export function makeFakeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 1,
    email: 'user@example.test',
    username: 'testuser',
    role: 'MEMBER',
    ...overrides,
  };
}

export function makeFakeAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    token: randomOpaque('opaque'),
    user: makeFakeUser(),
    ...overrides,
  };
}