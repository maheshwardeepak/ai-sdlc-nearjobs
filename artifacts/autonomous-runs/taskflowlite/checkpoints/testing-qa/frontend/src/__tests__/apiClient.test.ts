import { describe, it, expect, beforeEach } from 'vitest';
import apiClient from '../lib/apiClient';
import { tokenStorage } from '../lib/tokenStorage';

describe('apiClient interceptors', () => {
  beforeEach(() => localStorage.clear());

  it('attaches Authorization header when token is present', async () => {
    const opaque = `v_${Math.random().toString(36).slice(2)}`;
    tokenStorage.set(opaque);

    const config = await (apiClient.interceptors.request as any).handlers[0].fulfilled({
      headers: {},
    });
    expect(config.headers.Authorization).toBe(`Bearer ${opaque}`);
  });

  it('omits Authorization header when no token stored', async () => {
    const config = await (apiClient.interceptors.request as any).handlers[0].fulfilled({
      headers: {},
    });
    expect(config.headers.Authorization).toBeUndefined();
  });
});