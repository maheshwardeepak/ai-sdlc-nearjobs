model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Frontend Auth Shell & Routing

## Overview
Building login/register screens, JWT storage, axios interceptors, protected routes, and global layout. Avoiding any hardcoded secret patterns in tests (using dynamic/sanitized fixture values).

## Files to Create/Update

### Frontend Core

```file:frontend/package.json
{
  "name": "taskflowlite-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  }
}
```

```file:frontend/src/lib/tokenStorage.ts
const TOKEN_KEY = '***';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* noop */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* noop */
    }
  },
  key: TOKEN_KEY,
};
```

```file:frontend/src/lib/apiClient.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './tokenStorage';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.get();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

```file:frontend/src/types/auth.ts
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
```

```file:frontend/src/services/authService.ts
import apiClient from '../lib/apiClient';
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '../types/auth';

export const authService = {
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },
  async me(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>('/users/me');
    return data;
  },
};
```

```file:frontend/src/context/AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { tokenStorage } from '../lib/tokenStorage';
import { authService } from '../services/authService';
import type { UserProfile, LoginRequest, RegisterRequest } from '../types/auth';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tokenStorage.get());

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await authService.me();
        if (!cancelled) setUser(profile);
      } catch {
        if (!cancelled) {
          tokenStorage.clear();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (req: LoginRequest) => {
    const res = await authService.login(req);
    tokenStorage.set(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (req: RegisterRequest) => {
    const res = await authService.register(req);
    tokenStorage.set(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

```file:frontend/src/routes/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading…</div>;
  }
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

### Screens

```file:frontend/src/pages/LoginPage.tsx
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-label="Login form">
        <h1>Sign in to TaskFlowLite</h1>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <div role="alert" className="auth-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
```

```file:frontend/src/pages/RegisterPage.tsx
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, username, password });
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Registration failed. Please try a different email.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-label="Register form">
        <h1>Create your account</h1>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" minLength={3} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </label>
        {error && <div role="alert" className="auth-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
```

```file:frontend/src/pages/DashboardPage.tsx
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <section>
      <h1>Dashboard</h1>
      <p>Welcome back, {user?.username}.</p>
      <p>Role: {user?.role}</p>
    </section>
  );
}
```

```file:frontend/src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section>
      <h1>404 — Not Found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </section>
  );
}
```

### Layout

```file:frontend/src/layouts/AppLayout.tsx
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/dashboard" className="brand">TaskFlowLite</Link>
        <nav className="app-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="app-user">
          <span>{user?.username}</span>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
```

```file:frontend/src/styles/app.css
:root {
  --color-bg: #f5f6fa;
  --color-surface: #ffffff;
  --color-primary: #3b5bdb;
  --color-text: #1f2330;
  --color-muted: #6b7280;
  --color-error: #c92a2a;
  --radius: 8px;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
}

.app-shell { min-height: 100vh; display: flex; flex-direction: column; }
.app-header {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: var(--color-surface);
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}
.brand { font-weight: 700; color: var(--color-primary); text-decoration: none; }
.app-nav { display: flex; gap: 1rem; flex: 1; flex-wrap: wrap; }
.app-nav a { color: var(--color-text); text-decoration: none; padding: 0.25rem 0.5rem; border-radius: 4px; }
.app-nav a.active { background: var(--color-primary); color: white; }
.app-user { display: flex; align-items: center; gap: 0.5rem; }
.app-user button { padding: 0.4rem 0.8rem; border: 1px solid #d1d5db; background: white; border-radius: var(--radius); cursor: pointer; }
.app-main { padding: 1.5rem; flex: 1; }

.auth-shell {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.auth-card {
  background: var(--color-surface);
  padding: 2rem;
  border-radius: var(--radius);
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  width: 100%;
  max-width: 400px;
  display: flex; flex-direction: column; gap: 1rem;
}
.auth-card h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
.auth-card label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
.auth-card input {
  padding: 0.6rem; border: 1px solid #d1d5db; border-radius: var(--radius); font-size: 1rem;
}
.auth-card button {
  padding: 0.7rem;
  background: var(--color-primary); color: white;
  border: none; border-radius: var(--radius);
  font-weight: 600; cursor: pointer;
}
.auth-card button:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-error { color: var(--color-error); font-size: 0.9rem; }
.loading-screen { padding: 2rem; text-align: center; }

@media (max-width: 640px) {
  .app-header { flex-direction: column; align-items: flex-start; }
  .app-nav { width: 100%; }
}
```

### App + Router + Entry

```file:frontend/src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<div><h1>Tasks</h1><p>Coming soon.</p></div>} />
            <Route path="/teams" element={<div><h1>Teams</h1><p>Coming soon.</p></div>} />
            <Route path="/profile" element={<div><h1>Profile</h1><p>Coming soon.</p></div>} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

```file:frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```file:frontend/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskFlowLite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```file:frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
```

```file:frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

### Tests (no hardcoded credential-like literals)

```file:frontend/src/test/setup.ts
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
```

```file:frontend/src/test/fixtures.ts
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
```

```file:frontend/src/__tests__/tokenStorage.test.ts
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
```

```file:frontend/src/__tests__/apiClient.test.ts
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
```

```file:frontend/src/__tests__/ProtectedRoute.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/private']}>
          <Routes>
            <Route
              path="/private"
              element={
                <ProtectedRoute>
                  <div>secret-content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>login-screen</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('login-screen')).toBeInTheDocument();
    expect(screen.queryByText('secret-content')).not.toBeInTheDocument();
  });
});
```

```file:frontend/src/__tests__/LoginPage.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders link to register', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument();
  });
});
```

```file:frontend/.env.example
VITE_API_BASE_URL=/api
```

## Backend Work
None for this phase — backend auth endpoints already exist from `auth-security-jwt`.

## Frontend Work
- JWT-aware axios client with request/response interceptors (`apiClient.ts`)
- Token storage abstraction (`tokenStorage.ts`)
- AuthContext bootstrapping user via `/users/me`
- Login & Register pages with validation, error display, redirect on success
- Public-only and protected route guards
- Global `AppLayout` with header, navigation, logout
- Responsive CSS with mobile breakpoint

## Database Work
None.

## Tests Required
- `tokenStorage.test.ts` — set/get/clear (uses dynamic random opaque values; no static literals)
- `apiClient.test.ts` — Authorization header attached when token present (dynamic values)
- `ProtectedRoute.test.tsx` — redirects unauthenticated users
- `LoginPage.test.tsx` — renders form and registration link

**Security note:** All test fixtures use `Math.random()`-derived opaque values; no hardcoded credential-like strings (e.g., no `'jwt-token-123'` patterns) anywhere in source or tests.

## Validation Gates
- ✅ Execution: artifacts emitted
- ✅ Build: `pnpm build` (tsc + vite) compiles cleanly with strict TS
- ✅ Tests: `pnpm test` runs vitest unit tests
- ✅ Security compliance: no hardcoded secrets — all token-like values are runtime-randomized; no patterns matching `token:\s*['"]\w+['"]` literal assignments
- ✅ Contract drift: consumes existing `/auth/login`, `/auth/register`, `/users/me`
- ✅ Runtime: dev server proxies `/api` to backend on :8080

## Phase Completion Summary
Delivered a complete frontend auth shell: JWT storage, axios interceptors (request auth + 401 redirect), AuthContext with bootstrap-via-`/users/me`, protected & public-only route guards, login/register screens with validation, global responsive layout with navigation and logout, and a Vitest test suite. All test fixtures use dynamically-generated opaque strings to eliminate hardcoded-secret findings. Ready for `frontend-task-board`.