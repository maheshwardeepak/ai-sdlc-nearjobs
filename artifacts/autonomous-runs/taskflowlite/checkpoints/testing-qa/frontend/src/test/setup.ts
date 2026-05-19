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