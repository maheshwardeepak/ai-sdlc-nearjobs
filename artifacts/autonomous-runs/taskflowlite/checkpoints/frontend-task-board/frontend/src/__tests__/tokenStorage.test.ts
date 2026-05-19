import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage } from '../lib/tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no value stored', () => {
    expect(tokenStorage.get()).toBeNull();
  });

  it('persists and retrieves an opaque value', () => {
    const opaque = `v_${Math.random().toString(36).slice(2)}`;
    tokenStorage.set(opaque);
    expect(tokenStorage.get()).toBe(opaque);
  });

  it('clears stored value', () => {
    tokenStorage.set(`v_${Math.random().toString(36).slice(2)}`);
    tokenStorage.clear();
    expect(tokenStorage.get()).toBeNull();
  });
});