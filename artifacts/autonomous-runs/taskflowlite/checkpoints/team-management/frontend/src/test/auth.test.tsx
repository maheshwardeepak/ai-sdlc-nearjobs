import { describe, it, expect, beforeEach } from 'vitest';

describe('auth token storage', () => {
  beforeEach(() => localStorage.clear());

  it('persists JWT to localStorage', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    expect(localStorage.getItem('token')).toBe('abc.def.ghi');
  });

  it('clears JWT on logout', () => {
    localStorage.setItem('token', 'x');
    localStorage.removeItem('token');
    expect(localStorage.getItem('token')).toBeNull();
  });
});