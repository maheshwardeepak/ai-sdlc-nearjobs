import "@testing-library/jest-dom";

// ===== AI MERGE APPEND =====

import '@testing-library/jest-dom';

// ===== AI MERGE APPEND =====

import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
});

// ===== AI MERGE APPEND =====

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage for jsdom
if (!('localStorage' in globalThis)) {
  const store: Record<string, string> = {};
  // @ts-ignore
  globalThis.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: () => null,
    length: 0,
  };
}

// Silence axios in tests by default
vi.mock('axios', async () => {
  const actual: any = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: () => ({
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        patch: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      }),
    },
  };
});