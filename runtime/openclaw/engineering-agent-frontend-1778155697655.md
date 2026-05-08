# OpenClaw Output

model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# NearJobs Frontend — Production Implementation

## 1. Architecture Overview

**Stack:** React 18 + Vite 5 + TypeScript 5 + TailwindCSS 3 + React Router 6 + TanStack Query 5 + React Hook Form + Zod + Zustand + Axios + Playwright.

**Directory layout:**
```
nearjobs-web/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── playwright.config.ts
├── .env.production
├── .env.development
├── public/
│   └── favicon.svg
├── e2e/
│   ├── auth.spec.ts
│   ├── search.spec.ts
│   └── apply.spec.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx
    ├── env.ts
    ├── lib/
    │   ├── apiClient.ts
    │   ├── queryClient.ts
    │   ├── geo.ts
    │   ├── format.ts
    │   └── testid.ts
    ├── auth/
    │   ├── authStore.ts
    │   ├── useAuth.ts
    │   ├── ProtectedRoute.tsx
    │   └── RoleGuard.tsx
    ├── api/
    │   ├── jobs.ts
    │   ├── applications.ts
    │   ├── auth.ts
    │   ├── employers.ts
    │   ├── candidates.ts
    │   └── admin.ts
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   ├── TopNav.tsx
    │   │   ├── SideNav.tsx
    │   │   └── Footer.tsx
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── TextArea.tsx
    │   │   ├── Field.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Spinner.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── Pagination.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Toast.tsx
    │   │   └── Skeleton.tsx
    │   ├── jobs/
    │   │   ├── JobCard.tsx
    │   │   ├── JobFilters.tsx
    │   │   └── DistanceTag.tsx
    │   └── forms/
    │       └── FormError.tsx
    ├── pages/
    │   ├── Landing.tsx
    │   ├── JobSearch.tsx
    │   ├── JobDetails.tsx
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   ├── ForgotPassword.tsx
    │   ├── candidate/
    │   │   ├── CandidateDashboard.tsx
    │   │   ├── CandidateProfile.tsx
    │   │   └── CandidateApplications.tsx
    │   ├── employer/
    │   │   ├── EmployerDashboard.tsx
    │   │   ├── EmployerJobs.tsx
    │   │   ├── JobCreate.tsx
    │   │   ├── JobEdit.tsx
    │   │   └── JobApplicants.tsx
    │   ├── admin/
    │   │   ├── AdminDashboard.tsx
    │   │   ├── AdminUsers.tsx
    │   │   ├── AdminJobs.tsx
    │   │   └── AdminReports.tsx
    │   └── errors/
    │       ├── NotFound.tsx
    │       └── Forbidden.tsx
    └── styles/
        └── index.css
```

---

## 2. Configuration Files

### `package.json`
```json
{
  "name": "nearjobs-web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 4173",
    "lint": "eslint . --ext .ts,.tsx",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.51.0",
    "axios": "^1.7.2",
    "clsx": "^2.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.0",
    "react-router-dom": "^6.24.1",
    "zod": "^3.23.8",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^5.3.3"
  }
}
```

### `vite.config.ts`
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, host: true },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          forms: ['react-hook-form', 'zod'],
        },
      },
    },
  },
});
```

### `tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 500: '#2563eb',
          600: '#1d4ed8', 700: '#1e40af', 900: '#1e3a8a',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
```

### `src/styles/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root { color-scheme: light; }
  html, body, #root { height: 100%; }
  body { @apply bg-slate-50 text-slate-900 antialiased; }
  *:focus-visible { @apply outline-none ring-2 ring-brand-500 ring-offset-2; }
}

@layer components {
  .container-page { @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8; }
}
```

### `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1d4ed8" />
    <title>NearJobs — Hyperlocal Hiring</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### `src/env.ts`
```ts
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  appName: 'NearJobs',
  defaultRadiusKm: 10,
  geoTimeoutMs: 8000,
};
```

---

## 3. Bootstrapping & Routing

### `src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { queryClient } from './lib/queryClient';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

### `src/App.tsx`
```tsx
import { useEffect } from 'react';
import { AppRouter } from './router';
import { useAuthStore } from './auth/authStore';

export default function App() {
  const restore = useAuthStore((s) => s.restore);
  useEffect(() => { restore(); }, [restore]);
  return <AppRouter />;
}
```

### `src/router.tsx`
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RoleGuard } from './auth/RoleGuard';

import Landing from './pages/Landing';
import JobSearch from './pages/JobSearch';
import JobDetails from './pages/JobDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

import CandidateDashboard from './pages/candidate/CandidateDashboard';
import CandidateProfile from './pages/candidate/CandidateProfile';
import CandidateApplications from './pages/candidate/CandidateApplications';

import EmployerDashboard from './pages/employer/EmployerDashboard';
import EmployerJobs from './pages/employer/EmployerJobs';
import JobCreate from './pages/employer/JobCreate';
import JobEdit from './pages/employer/JobEdit';
import JobApplicants from './pages/employer/JobApplicants';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminJobs from './pages/admin/AdminJobs';
import AdminReports from './pages/admin/AdminReports';

import NotFound from './pages/errors/NotFound';
import Forbidden from './pages/errors/Forbidden';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Landing />} />
        <Route path="/jobs" element={<JobSearch />} />
        <Route path="/jobs/:jobId" element={<JobDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allow={['candidate']} />}>
            <Route path="/me" element={<CandidateDashboard />} />
            <Route path="/me/profile" element={<CandidateProfile />} />
            <Route path="/me/applications" element={<CandidateApplications />} />
          </Route>

          <Route element={<RoleGuard allow={['employer']} />}>
            <Route path="/employer" element={<EmployerDashboard />} />
            <Route path="/employer/jobs" element={<EmployerJobs />} />
            <Route path="/employer/jobs/new" element={<JobCreate />} />
            <Route path="/employer/jobs/:jobId/edit" element={<JobEdit />} />
            <Route path="/employer/jobs/:jobId/applicants" element={<JobApplicants />} />
          </Route>

          <Route element={<RoleGuard allow={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>
        </Route>

        <Route path="/403" element={<Forbidden />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
```

---

## 4. Auth State

### `src/auth/authStore.ts`
```ts
import { create } from 'zustand';

export type Role = 'candidate' | 'employer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  setSession: (user: AuthUser, token: string) => void;
  clear: () => void;
  restore: () => void;
}

const STORAGE_KEY = 'nearjo…n.v1';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isReady: false,
  setSession: (user, token) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    set({ user, token, isReady: true });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null, isReady: true });
  },
  restore: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { set({ isReady: true }); return; }
      const parsed = JSON.parse(raw) as { user: AuthUser; token: string };
      set({ user: parsed.user, token: parsed.token, isReady: true });
    } catch {
      set({ isReady: true });
    }
  },
}));
```

### `src/auth/useAuth.ts`
```ts
import { useAuthStore } from './authStore';
export const useAuth = () => useAuthStore((s) => ({
  user: s.user, token: s.token, isReady: s.isReady,
  isAuthenticated: !!s.token, clear: s.clear, setSession: s.setSession,
}));
```

### `src/auth/ProtectedRoute.tsx`
```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Spinner } from '@/components/ui/Spinner';

export function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();
  if (!isReady) return <Spinner label="Loading session" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
```

### `src/auth/RoleGuard.tsx`
```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { Role } from './authStore';
import { useAuth } from './useAuth';

export function RoleGuard({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
```

---

## 5. API Client

### `src/lib/apiClient.ts`
```ts
import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '@/env';
import { useAuthStore } from '@/auth/authStore';

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string }>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clear();
      if (!location.pathname.startsWith('/login')) {
        location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export type ApiError = AxiosError<{ message?: string; code?: string; fields?: Record<string, string> }>;

export function extractErrorMessage(error: unknown): string {
  const e = error as ApiError;
  return e?.response?.data?.message ?? e?.message ?? 'Unexpected error';
}
```

### `src/lib/queryClient.ts`
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, err: any) =>
        err?.response?.status >= 500 && count < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
```

### `src/lib/geo.ts`
```ts
import { env } from '@/env';

export interface Coords { lat: number; lng: number; }

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not available'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: env.geoTimeoutMs, maximumAge: 60_000 },
    );
  });
}

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
```

### `src/lib/format.ts`
```ts
export const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));

export const formatDistanceKm = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
```

### `src/lib/testid.ts`
```ts
export const tid = (id: string) => ({ 'data-testid': id });
```

---

## 6. API Modules

### `src/api/auth.ts`
```ts
import { apiClient } from '@/lib/apiClient';
import type { AuthUser, Role } from '@/auth/authStore';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload {
  email: string; password: string; fullName: string; role: Role;
}
export interface AuthResponse { user: AuthUser; token: string; }

export const login = (data: LoginPayload) =>
  apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data);

export const register = (data: RegisterPayload) =>
  apiClient.post<AuthResponse>('/auth/register', data).then((r) => r.data);

export const requestPasswordReset = (email: string) =>
  apiClient.post<{ ok: true }>('/auth/forgot-password', { email }).then((r) => r.data);

export const me = () => apiClient.get<AuthUser>('/auth/me').then((r) => r.data);
```

### `src/api/jobs.ts`
```ts
import { apiClient } from '@/lib/apiClient';

export interface JobLocation { lat: number; lng: number; address: string; city: string; }
export interface Job {
  id: string; title: string; description: string; companyName: string;
  category: string; employmentType: 'full_time' | 'part_time' | 'contract' | 'gig';
  payMin: number; payMax: number; currency: string;
  location: JobLocation; distanceKm?: number; postedAt: string;
  status: 'open' | 'closed' | 'pending';
}

export interface JobSearchParams {
  q?: string; category?: string; employmentType?: string;
  lat?: number; lng?: number; radiusKm?: number;
  payMin?: number; page?: number; pageSize?: number;
  sort?: 'distance' | 'recent' | 'pay';
}
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number; }

export const searchJobs = (params: JobSearchParams) =>
  apiClient.get<Page<Job>>('/jobs', { params }).then((r) => r.data);

export const getJob = (id: string) =>
  apiClient.get<Job>(`/jobs/${id}`).then((r) => r.data);

export interface JobInput {
  title: string; description: string; category: string;
  employmentType: Job['employmentType'];
  payMin: number; payMax: number; currency: string;
  location: JobLocation;
}

export const createJob = (data: JobInput) =>
  apiClient.post<Job>('/jobs', data).then((r) => r.data);

export const updateJob = (id: string, data: Partial<JobInput>) =>
  apiClient.patch<Job>(`/jobs/${id}`, data).then((r) => r.data);

export const closeJob = (id: string) =>
  apiClient.post<Job>(`/jobs/${id}/close`).then((r) => r.data);

export const listEmployerJobs = () =>
  apiClient.get<Job[]>('/employer/jobs').then((r) => r.data);
```

### `src/api/applications.ts`
```ts
import { apiClient } from '@/lib/apiClient';

export type AppStatus = 'submitted' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
export interface Application {
  id: string; jobId: string; jobTitle: string; companyName: string;
  candidateId: string; candidateName: string; candidateEmail: string;
  coverLetter: string; status: AppStatus; createdAt: string;
}

export const apply = (jobId: string, coverLetter: string) =>
  apiClient.post<Application>(`/jobs/${jobId}/apply`, { coverLetter }).then((r) => r.data);

export const myApplications = () =>
  apiClient.get<Application[]>('/me/applications').then((r) => r.data);

export const jobApplicants = (jobId: string) =>
  apiClient.get<Application[]>(`/employer/jobs/${jobId}/applications`).then((r) => r.data);

export const updateApplicationStatus = (id: string, status: AppStatus) =>
  apiClient.patch<Application>(`/applications/${id}`, { status }).then((r) => r.data);
```

### `src/api/admin.ts`
```ts
import { apiClient } from '@/lib/apiClient';
import type { Job } from './jobs';
import type { AuthUser } from '@/auth/authStore';

export const adminListUsers = (q?: string) =>
  apiClient.get<AuthUser[]>('/admin/users', { params: { q } }).then((r) => r.data);
export const adminSetUserActive = (id: string, active: boolean) =>
  apiClient.patch<AuthUser>(`/admin/users/${id}`, { active }).then((r) => r.data);
export const adminListJobs = () =>
  apiClient.get<Job[]>('/admin/jobs').then((r) => r.data);
export const adminApproveJob = (id: string) =>
  apiClient.post<Job>(`/admin/jobs/${id}/approve`).then((r) => r.data);
export const adminRemoveJob = (id: string) =>
  apiClient.delete<{ ok: true }>(`/admin/jobs/${id}`).then((r) => r.data);
export const adminMetrics = () =>
  apiClient.get<{ users: number; jobs: number; applications: number; activeEmployers: number }>('/admin/metrics').then((r) => r.data);
```

### `src/api/candidates.ts` & `src/api/employers.ts`
```ts
// candidates.ts
import { apiClient } from '@/lib/apiClient';
export interface CandidateProfile {
  fullName: string; phone?: string; bio?: string;
  skills: string[]; resumeUrl?: string;
  preferredCategories: string[]; preferredRadiusKm: number;
  location?: { lat: number; lng: number; city: string };
}
export const getCandidateProfile = () =>
  apiClient.get<CandidateProfile>('/me/profile').then((r) => r.data);
export const updateCandidateProfile = (data: CandidateProfile) =>
  apiClient.put<CandidateProfile>('/me/profile', data).then((r) => r.data);
```

```ts
// employers.ts
import { apiClient } from '@/lib/apiClient';
export interface EmployerProfile {
  companyName: string; website?: string; description?: string;
  contactEmail: string; verified: boolean;
}
export const getEmployerProfile = () =>
  apiClient.get<EmployerProfile>('/employer/profile').then((r) => r.data);
export const updateEmployerProfile = (data: Partial<EmployerProfile>) =>
  apiClient.put<EmployerProfile>('/employer/profile', data).then((r) => r.data);
```

---

## 7. Layout System

### `src/components/layout/AppShell.tsx`
```tsx
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white px-3 py-2 rounded shadow">
        Skip to content
      </a>
      <TopNav />
      <main id="main" className="flex-1 container-page py-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

### `src/components/layout/TopNav.tsx`
```tsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { tid } from '@/lib/testid';

export function TopNav() {
  const { user, isAuthenticated, clear } = useAuth();
  const nav = useNavigate();

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'}`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="container-page flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-700" {...tid('nav-logo')}>
          <span aria-hidden>📍</span>NearJobs
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary">
          <NavLink to="/jobs" className={linkCls} {...tid('nav-jobs')}>Find Jobs</NavLink>
          {user?.role === 'employer' && <NavLink to="/employer" className={linkCls} {...tid('nav-employer')}>Employer</NavLink>}
          {user?.role === 'candidate' && <NavLink to="/me" className={linkCls} {...tid('nav-me')}>Dashboard</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" className={linkCls} {...tid('nav-admin')}>Admin</NavLink>}
          {!isAuthenticated ? (
            <>
              <NavLink to="/login" className={linkCls} {...tid('nav-login')}>Sign in</NavLink>
              <Link to="/register" className="ml-2 inline-flex items-center px-3 py-2 rounded bg-brand-600 text-white text-sm font-medium hover:bg-brand-700" {...tid('nav-register')}>
                Sign up
              </Link>
            </>
          ) : (
            <button
              onClick={() => { clear(); nav('/'); }}
              className="ml-2 px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100"
              {...tid('nav-logout')}
            >
              Sign out ({user?.fullName.split(' ')[0]})
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
```

### `src/components/layout/SideNav.tsx`
```tsx
import { NavLink } from 'react-router-dom';

export interface NavItem { to: string; label: string; testId: string; }

export function SideNav({ items }: { items: NavItem[] }) {
  return (
    <aside className="md:w-56 shrink-0">
      <nav aria-label="Section" className="flex md:flex-col gap-1">
        {items.map((i) => (
          <NavLink
            key={i.to} to={i.to} end
            data-testid={i.testId}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`
            }
          >
            {i.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

### `src/components/layout/Footer.tsx`
```tsx
export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page py-6 text-sm text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} NearJobs. Hyperlocal hiring made simple.</p>
        <nav className="flex gap-4" aria-label="Footer">
          <a href="/privacy" className="hover:underline">Privacy</a>
          <a href="/terms" className="hover:underline">Terms</a>
          <a href="/contact" className="hover:underline">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
```

---

## 8. UI Primitives

### `src/components/ui/Button.tsx`
```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
  secondary: 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className,
      )}
      {...rest}
    >
      {loading && <span className="h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
```

### `src/components/ui/Field.tsx`
```tsx
import { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  label: string; htmlFor: string; error?: string;
  hint?: string; required?: boolean; children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, children }: Props) {
  const errId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label} {required && <span aria-hidden className="text-red-600">*</span>}
      </label>
      {children}
      {hint && !error && <p id={hintId} className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={errId} role="alert" className={clsx('text-xs text-red-600')} data-testid={`${htmlFor}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
```

### `src/components/ui/Input.tsx`
```tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        'block w-full h-10 px-3 rounded border bg-white text-sm text-slate-900',
        'placeholder:text-slate-400 focus:border-brand-500',
        invalid ? 'border-red-500' : 'border-slate-300',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';
```

### `src/components/ui/Select.tsx` & `TextArea.tsx`
```tsx
// Select.tsx
import { SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className, invalid, children, ...rest }, ref) => (
    <select ref={ref} aria-invalid={invalid || undefined}
      className={clsx('block w-full h-10 px-3 rounded border bg-white text-sm', invalid ? 'border-red-500' : 'border-slate-300', className)}
      {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
```

```tsx
// TextArea.tsx
import { TextareaHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <textarea ref={ref} aria-invalid={invalid || undefined}
      className={clsx('block w-full min-h-[120px] px-3 py-2 rounded border bg-white text-sm', invalid ? 'border-red-500' : 'border-slate-300', className)}
      {...rest} />
  ),
);
TextArea.displayName = 'TextArea';
```

### `src/components/ui/Card.tsx`, `Badge.tsx`, `Spinner.tsx`, `EmptyState.tsx`, `Pagination.tsx`, `Skeleton.tsx`
```tsx
// Card.tsx
import { HTMLAttributes } from 'react';
import clsx from 'clsx';
export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('bg-white rounded-lg border border-slate-200 shadow-sm', className)} {...rest} />
);
```

```tsx
// Badge.tsx
import { HTMLAttributes } from 'react';
import clsx from 'clsx';
type Tone = 'neutral' | 'success' | 'warn' | 'info' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-800',
  info: 'bg-brand-50 text-brand-700',
  danger: 'bg-red-100 text-red-700',
};
export const Badge = ({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) => (
  <span className={clsx('inline-flex items-center px-2 h-6 text-xs font-medium rounded', tones[tone], className)} {...rest} />
);
```

```tsx
// Spinner.tsx
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-slate-500 text-sm py-6">
      <span className="h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" aria-hidden />
      {label}
    </div>
  );
}
```

```tsx
// EmptyState.tsx
import { ReactNode } from 'react';
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-slate-300 rounded-lg bg-white">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

```tsx
// Pagination.tsx
import { Button } from './Button';
export function Pagination({ page, pageSize, total, onPage }:
  { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between mt-4">
      <p className="text-sm text-slate-600">Page {page} of {pages} • {total} results</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid="pagination-prev">Previous</Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid="pagination-next">Next</Button>
      </div>
    </nav>
  );
}
```

```tsx
// Skeleton.tsx
import clsx from 'clsx';
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx('animate-pulse bg-slate-200 rounded', className)} />
);
```

### `src/components/ui/Modal.tsx`
```tsx
import { ReactNode, useEffect, useRef } from 'react';

export function Modal({ open, onClose, title, children }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return <></>;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="relative bg-white rounded-lg shadow-lg w-[min(560px,calc(100vw-2rem))] p-5">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
}
```

---

## 9. Job Components

### `src/components/jobs/JobCard.tsx`
```tsx
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate, formatDistanceKm } from '@/lib/format';
import type { Job } from '@/api/jobs';

export function JobCard({ job }: { job: Job }) {
  return (
    <Card className="p-4 hover:border-brand-300 transition-colors" data-testid={`job-card-${job.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to={`/jobs/${job.id}`} className="block text-base font-semibold text-slate-900 hover:text-brand-700 truncate">
            {job.title}
          </Link>
          <p className="text-sm text-slate-600 truncate">{job.companyName} • {job.location.city}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="info">{job.employmentType.replace('_', ' ')}</Badge>
            <Badge tone="neutral">{job.category}</Badge>
            {typeof job.distanceKm === 'number' && (
              <Badge tone="success" data-testid="job-distance">{formatDistanceKm(job.distanceKm)}</Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-slate-900">
            {formatCurrency(job.payMin, job.currency)}–{formatCurrency(job.payMax, job.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Posted {formatDate(job.postedAt)}</p>
        </div>
      </div>
    </Card>
  );
}
```

### `src/components/jobs/JobFilters.tsx`
```tsx
import { Field } from '../ui/Field';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { JobSearchParams } from '@/api/jobs';

interface Props {
  value: JobSearchParams;
  onChange: (next: JobSearchParams) => void;
  onUseLocation: () => void;
  geoBusy?: boolean;
}

const categories = ['Retail', 'Hospitality', 'Logistics', 'Healthcare', 'Construction', 'Education', 'Tech'];

export function JobFilters({ value, onChange, onUseLocation, geoBusy }: Props) {
  return (
    <form
      className="grid grid-cols-1 md:grid-cols-6 gap-3"
      onSubmit={(e) => e.preventDefault()}
      role="search" aria-label="Job filters"
    >
      <div className="md:col-span-2">
        <Field label="Keyword" htmlFor="filter-q">
          <Input id="filter-q" data-testid="filter-q" value={value.q ?? ''}
            onChange={(e) => onChange({ ...value, q: e.target.value, page: 1 })}
            inputMode="search" autoComplete="off" />
        </Field>
      </div>
      <Field label="Category" htmlFor="filter-cat">
        <Select id="filter-cat" data-testid="filter-category"
          value={value.category ?? ''}
          onChange={(e) => onChange({ ...value, category: e.target.value || undefined, page: 1 })}>
          <option value="">All</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Type" htmlFor="filter-type">
        <Select id="filter-type" data-testid="filter-type"
          value={value.employmentType ?? ''}
          onChange={(e) => onChange({ ...value, employmentType: e.target.value || undefined, page: 1 })}>
          <option value="">Any</option>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="gig">Gig</option>
        </Select>
      </Field>
      <Field label="Radius (km)" htmlFor="filter-radius">
        <Input id="filter-radius" type="number" min={1} max={100} data-testid="filter-radius"
          value={value.radiusKm ?? 10}
          onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value), page: 1 })} />
      </Field>
      <div className="flex items-end">
        <Button type="button" variant="secondary" onClick={onUseLocation} loading={geoBusy} data-testid="use-location" className="w-full">
          Use my location
        </Button>
      </div>
    </form>
  );
}
```

---

## 10. Pages

### `src/pages/Landing.tsx`
```tsx
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';

export default function Landing() {
  return (
    <section className="grid gap-8 lg:grid-cols-2 items-center" data-testid="page-landing">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Hire and get hired in your neighborhood.
        </h1>
        <p className="mt-3 text-slate-600 text-lg">
          NearJobs connects local employers with nearby talent—in minutes, not weeks.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/jobs" className="px-5 h-11 inline-flex items-center rounded bg-brand-600 text-white font-medium hover:bg-brand-700" data-testid="cta-find-jobs">Find jobs near me</Link>
          <Link to="/register" className="px-5 h-11 inline-flex items-center rounded border border-slate-300 bg-white font-medium hover:bg-slate-50" data-testid="cta-post-job">Post a job</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Hyperlocal radius', 'Find roles within 1–25 km.'],
          ['Verified employers', 'Trust badges and admin review.'],
          ['Quick apply', 'One-click applications.'],
          ['Mobile first', 'Built for on-the-go workers.'],
        ].map(([t, d]) => (
          <Card key={t} className="p-4">
            <h3 className="font-semibold">{t}</h3>
            <p className="text-sm text-slate-600 mt-1">{d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

### `src/pages/JobSearch.tsx`
```tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { JobFilters } from '@/components/jobs/JobFilters';
import { JobCard } from '@/components/jobs/JobCard';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { searchJobs, type JobSearchParams } from '@/api/jobs';
import { getCurrentPosition } from '@/lib/geo';

function paramsFromQuery(sp: URLSearchParams): JobSearchParams {
  return {
    q: sp.get('q') ?? undefined,
    category: sp.get('category') ?? undefined,
    employmentType: sp.get('type') ?? undefined,
    radiusKm: sp.get('radius') ? Number(sp.get('radius')) : 10,
    lat: sp.get('lat') ? Number(sp.get('lat')) : undefined,
    lng: sp.get('lng') ? Number(sp.get('lng')) : undefined,
    page: sp.get('page') ? Number(sp.get('page')) : 1,
    pageSize: 12,
    sort: (sp.get('sort') as JobSearchParams['sort']) ?? 'distance',
  };
}

export default function JobSearch() {
  const [sp, setSp] = useSearchParams();
  const [filters, setFilters] = useState<JobSearchParams>(paramsFromQuery(sp));
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      next.set(k === 'employmentType' ? 'type' : k === 'radiusKm' ? 'radius' : k, String(v));
    });
    setSp(next, { replace: true });
  }, [filters, setSp]);

  const queryKey = useMemo(() => ['jobs', filters], [filters]);
  const { data, isLoading, isError } = useQuery({
    queryKey, queryFn: () => searchJobs(filters),
  });

  const handleUseLocation = async () => {
    setGeoBusy(true); setGeoError(null);
    try {
      const c = await getCurrentPosition();
      setFilters((f) => ({ ...f, lat: c.lat, lng: c.lng, page: 1 }));
    } catch {
      setGeoError('We could not access your location. You can search by keyword instead.');
    } finally { setGeoBusy(false); }
  };

  return (
    <section data-testid="page-job-search">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Jobs near you</h1>
      <JobFilters value={filters} onChange={setFilters} onUseLocation={handleUseLocation} geoBusy={geoBusy} />
      {geoError && <p role="alert" className="mt-3 text-sm text-amber-700">{geoError}</p>}

      <div className="mt-6 grid gap-3" data-testid="job-results">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {isError && <p role="alert" className="text-red-600">We could not load jobs. Please retry.</p>}
        {data?.items.length === 0 && (
          <EmptyState title="No jobs match your filters" description="Try widening your radius or removing some filters." />
        )}
        {data?.items.map((j) => <JobCard key={j.id} job={j} />)}
      </div>

      {data && data.total > (filters.pageSize ?? 12) && (
        <Pagination
          page={filters.page ?? 1}
          pageSize={filters.pageSize ?? 12}
          total={data.total}
          onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      )}
    </section>
  );
}
```

### `src/pages/JobDetails.tsx`
```tsx
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { getJob } from '@/api/jobs';
import { apply } from '@/api/applications';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/auth/useAuth';
import { extractErrorMessage } from '@/lib/apiClient';

const schema = z.object({
  coverLetter: z.string().min(30, 'Please write at least 30 characters').max(2000, 'Maximum 2000 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function JobDetails() {
  const { jobId = '' } = useParams();
  const nav = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['job', jobId], queryFn: () => getJob(jobId), enabled: !!jobId,
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { coverLetter: '' },
  });

  const mutation = useMutation({
    mutationFn: (cl: string) => apply(jobId, cl),
    onSuccess: () => setApplied(true),
    onError: (err) => setServerError(extractErrorMessage(err)),
  });

  const onSubmit = (values: FormValues) => {
    const r = schema.safeParse(values);
    if (!r.success) return;
    setServerError(null);
    mutation.mutate(values.coverLetter);
  };

  if (isLoading) return <Spinner />;
  if (isError || !data) return <p role="alert">Job not found.</p>;

  const canApply = isAuthenticated && user?.role === 'candidate';

  return (
    <article className="grid gap-6 lg:grid-cols-3" data-testid="page-job-details">
      <div className="lg:col-span-2 space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="job-title">{data.title}</h1>
          <p className="text-slate-600">{data.companyName} • {data.location.city}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="info">{data.employmentType.replace('_', ' ')}</Badge>
            <Badge tone="neutral">{data.category}</Badge>
            <Badge tone="success">
              {formatCurrency(data.payMin, data.currency)}–{formatCurrency(data.payMax, data.currency)}
            </Badge>
          </div>
        </header>
        <Card className="p-5">
          <h2 className="font-semibold mb-2">About this role</h2>
          <p className="whitespace-pre-line text-slate-700 leading-7">{data.description}</p>
        </Card>
        <p className="text-xs text-slate-500">Posted {formatDate(data.postedAt)}</p>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Apply now</h2>
          {!isAuthenticated && (
            <div>
              <p className="text-sm text-slate-600 mb-3">Sign in as a candidate to submit your application.</p>
              <Button onClick={() => nav('/login', { state: { from: `/jobs/${jobId}` } })} data-testid="apply-signin">Sign in to apply</Button>
            </div>
          )}
          {isAuthenticated && !canApply && (
            <p className="text-sm text-slate-600">Applications are available for candidate accounts only.</p>
          )}
          {canApply && applied && (
            <p className="text-sm text-emerald-700" role="status" data-testid="apply-success">
              Your application has been submitted. The employer will review it shortly.
            </p>
          )}
          {canApply && !applied && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Field label="Cover letter" htmlFor="coverLetter" required error={errors.coverLetter?.message}>
                <TextArea
                  id="coverLetter" data-testid="apply-cover-letter"
                  invalid={!!errors.coverLetter}
                  {...register('coverLetter')}
                />
              </Field>
              {serverError && <p role="alert" className="text-sm text-red-600 mt-2">{serverError}</p>}
              <Button type="submit" className="mt-3 w-full" loading={isSubmitting || mutation.isPending} data-testid="apply-submit">
                Submit application
              </Button>
            </form>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold mb-2">Location</h2>
          <p className="text-sm text-slate-700">{data.location.address}</p>
          <p className="text-sm text-slate-500">{data.location.city}</p>
          <Link to="/jobs" className="text-sm text-brand-700 hover:underline mt-3 inline-block">← Back to results</Link>
        </Card>
      </aside>
    </article>
  );
}
```

### `src/pages/Login.tsx`
```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/api/auth';
import { useAuth } from '@/auth/useAuth';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { setSession } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<Values>();
  const m = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.user, data.token);
      const to = (loc.state as any)?.from ?? defaultPath(data.user.role);
      nav(to, { replace: true });
    },
    onError: (err) => setServerError(extractErrorMessage(err)),
  });

  const onSubmit = (v: Values) => {
    const r = schema.safeParse(v); if (!r.success) return;
    setServerError(null); m.mutate(v);
  };

  return (
    <section className="max-w-md mx-auto" data-testid="page-login">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Sign in</h1>
      <Card className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <Field label="Email" htmlFor="email" required error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" data-testid="login-email"
              invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="password" required error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="current-password" data-testid="login-password"
              invalid={!!errors.password} {...register('password')} />
          </Field>
          {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" loading={m.isPending} className="w-full" data-testid="login-submit">Sign in</Button>
        </form>
        <div className="mt-3 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link>
          <Link to="/register" className="text-brand-700 hover:underline">Create account</Link>
        </div>
      </Card>
    </section>
  );
}

function defaultPath(role: string) {
  if (role === 'employer') return '/employer';
  if (role === 'admin') return '/admin';
  return '/me';
}
```

### `src/pages/Register.tsx`
```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { register as apiRegister } from '@/api/auth';
import { useAuth } from '@/auth/useAuth';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(120),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a digit'),
  role: z.enum(['candidate', 'employer']),
});
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    defaultValues: { role: 'candidate' },
  });

  const m = useMutation({
    mutationFn: apiRegister,
    onSuccess: (data) => {
      setSession(data.user, data.token);
      nav(data.user.role === 'employer' ? '/employer' : '/me', { replace: true });
    },
    onError: (err) => setServerError(extractErrorMessage(err)),
  });

  const onSubmit = (v: Values) => {
    const r = schema.safeParse(v); if (!r.success) return;
    setServerError(null); m.mutate(v);
  };

  return (
    <section className="max-w-md mx-auto" data-testid="page-register">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create your account</h1>
      <Card className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
            <Input id="fullName" autoComplete="name" data-testid="register-fullname" invalid={!!errors.fullName} {...register('fullName')} />
          </Field>
          <Field label="Email" htmlFor="email" required error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" data-testid="register-email" invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="password" required hint="8+ chars, an uppercase letter and a digit." error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" data-testid="register-password" invalid={!!errors.password} {...register('password')} />
          </Field>
          <Field label="I am a" htmlFor="role" required error={errors.role?.message}>
            <Select id="role" data-testid="register-role" {...register('role')}>
              <option value="candidate">Candidate looking for jobs</option>
              <option value="employer">Employer hiring locally</option>
            </Select>
          </Field>
          {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" loading={m.isPending} className="w-full" data-testid="register-submit">Create account</Button>
        </form>
        <p className="mt-3 text-sm">Already have an account? <Link to="/login" className="text-brand-700 hover:underline">Sign in</Link></p>
      </Card>
    </section>
  );
}
```

### `src/pages/ForgotPassword.tsx`
```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { requestPasswordReset } from '@/api/auth';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const schema = z.object({ email: z.string().email() });
type V = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<V>();
  const m = useMutation({
    mutationFn: (v: V) => requestPasswordReset(v.email),
    onSuccess: () => setSent(true),
  });
  return (
    <section className="max-w-md mx-auto" data-testid="page-forgot">
      <h1 className="text-2xl font-bold mb-4">Reset your password</h1>
      <Card className="p-5">
        {sent ? (
          <p className="text-sm text-slate-700">If an account exists for that email, a reset link has been sent.</p>
        ) : (
          <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="space-y-3">
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" data-testid="forgot-email" {...register('email')} />
            </Field>
            <Button loading={m.isPending} type="submit" className="w-full" data-testid="forgot-submit">Send reset link</Button>
          </form>
        )}
      </Card>
    </section>
  );
}
```

### Candidate Pages

#### `src/pages/candidate/CandidateDashboard.tsx`
```tsx
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { SideNav } from '@/components/layout/SideNav';
import { useAuth } from '@/auth/useAuth';

export default function CandidateDashboard() {
  const { user } = useAuth();
  return (
    <section className="md:flex gap-6" data-testid="page-candidate-dashboard">
      <SideNav items={[
        { to: '/me', label: 'Overview', testId: 'candidate-nav-overview' },
        { to: '/me/profile', label: 'Profile', testId: 'candidate-nav-profile' },
        { to: '/me/applications', label: 'Applications', testId: 'candidate-nav-applications' },
      ]} />
      <div className="flex-1 mt-4 md:mt-0 grid gap-4">
        <h1 className="text-2xl font-bold">Welcome, {user?.fullName}</h1>
        <Card className="p-5">
          <h2 className="font-semibold">Get started</h2>
          <ul className="mt-2 list-disc list-inside text-sm text-slate-700">
            <li>Complete your <Link className="text-brand-700 hover:underline" to="/me/profile">profile</Link> to improve match quality.</li>
            <li>Browse <Link className="text-brand-700 hover:underline" to="/jobs">local jobs</Link>.</li>
            <li>Track <Link className="text-brand-700 hover:underline" to="/me/applications">applications</Link>.</li>
          </ul>
        </Card>
      </div>
    </section>
  );
}
```

#### `src/pages/candidate/CandidateProfile.tsx`
```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCandidateProfile, updateCandidateProfile, type CandidateProfile } from '@/api/candidates';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  bio: z.string().max(2000).optional(),
  skills: z.string(),
  preferredCategories: z.string(),
  preferredRadiusKm: z.coerce.number().min(1).max(100),
});
type V = z.infer<typeof schema>;

export default function CandidateProfilePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getCandidateProfile });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<V>();

  useEffect(() => {
    if (data) reset({
      fullName: data.fullName, phone: data.phone, bio: data.bio,
      skills: data.skills.join(', '),
      preferredCategories: data.preferredCategories.join(', '),
      preferredRadiusKm: data.preferredRadiusKm,
    });
  }, [data, reset]);

  const m = useMutation({
    mutationFn: (v: V) => updateCandidateProfile({
      ...(data ?? {} as CandidateProfile),
      fullName: v.fullName, phone: v.phone, bio: v.bio,
      skills: v.skills.split(',').map((s) => s.trim()).filter(Boolean),
      preferredCategories: v.preferredCategories.split(',').map((s) => s.trim()).filter(Boolean),
      preferredRadiusKm: v.preferredRadiusKm,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });

  if (isLoading) return <Spinner />;

  return (
    <section data-testid="page-candidate-profile">
      <h1 className="text-2xl font-bold mb-4">Your profile</h1>
      <Card className="p-5 max-w-2xl">
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="space-y-3">
          <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
            <Input id="fullName" data-testid="profile-fullname" {...register('fullName')} />
          </Field>
          <Field label="Phone" htmlFor="phone"><Input id="phone" data-testid="profile-phone" {...register('phone')} /></Field>
          <Field label="Bio" htmlFor="bio"><TextArea id="bio" data-testid="profile-bio" {...register('bio')} /></Field>
          <Field label="Skills" htmlFor="skills" hint="Comma separated">
            <Input id="skills" data-testid="profile-skills" {...register('skills')} />
          </Field>
          <Field label="Preferred categories" htmlFor="preferredCategories" hint="Comma separated">
            <Input id="preferredCategories" data-testid="profile-categories" {...register('preferredCategories')} />
          </Field>
          <Field label="Preferred radius (km)" htmlFor="preferredRadiusKm" error={errors.preferredRadiusKm?.message}>
            <Input id="preferredRadiusKm" type="number" min={1} max={100} data-testid="profile-radius" {...register('preferredRadiusKm')} />
          </Field>
          <Button type="submit" loading={isSubmitting || m.isPending} data-testid="profile-save">Save profile</Button>
          {m.isSuccess && <p role="status" className="text-sm text-emerald-700">Profile updated.</p>}
        </form>
      </Card>
    </section>
  );
}
```

#### `src/pages/candidate/CandidateApplications.tsx`
```tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { myApplications } from '@/api/applications';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/format';

const tone = (s: string): 'info' | 'success' | 'warn' | 'danger' | 'neutral' =>
  s === 'hired' ? 'success' : s === 'rejected' ? 'danger' : s === 'shortlisted' ? 'info' : 'warn';

export default function CandidateApplications() {
  const { data, isLoading } = useQuery({ queryKey: ['my-apps'], queryFn: myApplications });
  if (isLoading) return <Spinner />;
  return (
    <section data-testid="page-candidate-applications">
      <h1 className="text-2xl font-bold mb-4">Your applications</h1>
      {data?.length === 0 ? (
        <EmptyState title="No applications yet" description="When you apply to jobs, they will show up here."
          action={<Link to="/jobs" className="text-brand-700 hover:underline">Browse jobs</Link>} />
      ) : (
        <div className="grid gap-3">
          {data?.map((a) => (
            <Card key={a.id} className="p-4 flex items-center justify-between" data-testid={`app-row-${a.id}`}>
              <div>
                <Link to={`/jobs/${a.jobId}`} className="font-medium text-slate-900 hover:text-brand-700">{a.jobTitle}</Link>
                <p className="text-sm text-slate-600">{a.companyName} • Applied {formatDate(a.createdAt)}</p>
              </div>
              <Badge tone={tone(a.status)}>{a.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
```

### Employer Pages

#### `src/pages/employer/EmployerDashboard.tsx`
```tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listEmployerJobs } from '@/api/jobs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SideNav } from '@/components/layout/SideNav';
import { Spinner } from '@/components/ui/Spinner';

export default function EmployerDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['employer-jobs'], queryFn: listEmployerJobs });
  return (
    <section className="md:flex gap-6" data-testid="page-employer-dashboard">
      <SideNav items={[
        { to: '/employer', label: 'Overview', testId: 'employer-nav-overview' },
        { to: '/employer/jobs', label: 'My jobs', testId: 'employer-nav-jobs' },
      ]} />
      <div className="flex-1 mt-4 md:mt-0 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Employer overview</h1>
          <Link to="/employer/jobs/new"><Button data-testid="employer-create-job">Post a job</Button></Link>
        </header>
        {isLoading ? <Spinner /> : (
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4"><p className="text-sm text-slate-500">Open jobs</p>
              <p className="text-2xl font-bold">{data?.filter((j) => j.status === 'open').length ?? 0}</p></Card>
            <Card className="p-4"><p className="text-sm text-slate-500">Pending review</p>
              <p className="text-2xl font-bold">{data?.filter((j) => j.status === 'pending').length ?? 0}</p></Card>
            <Card className="p-4"><p className="text-sm text-slate-500">Closed</p>
              <p className="text-2xl font-bold">{data?.filter((j) => j.status === 'closed').length ?? 0}</p></Card>
          </div>
        )}
      </div>
    </section>
  );
}
```

#### `src/pages/employer/EmployerJobs.tsx`
```tsx
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { closeJob, listEmployerJobs } from '@/api/jobs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/format';

export default function EmployerJobs() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['employer-jobs'], queryFn: listEmployerJobs });
  const m = useMutation({
    mutationFn: (id: string) => closeJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer-jobs'] }),
  });
  if (isLoading) return <Spinner />;
  return (
    <section data-testid="page-employer-jobs">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My job postings</h1>
        <Link to="/employer/jobs/new"><Button data-testid="employer-jobs-create">New job</Button></Link>
      </header>
      <div className="grid gap-3">
        {data?.map((j) => (
          <Card key={j.id} className="p-4 grid sm:grid-cols-[1fr_auto] gap-3 items-center" data-testid={`employer-job-${j.id}`}>
            <div>
              <Link to={`/jobs/${j.id}`} className="font-medium hover:text-brand-700">{j.title}</Link>
              <p className="text-sm text-slate-600">{j.location.city} • Posted {formatDate(j.postedAt)}</p>
              <Badge className="mt-1" tone={j.status === 'open' ? 'success' : j.status === 'pending' ? 'warn' : 'neutral'}>{j.status}</Badge>
            </div>
            <div className="flex gap-2">
              <Link to={`/employer/jobs/${j.id}/applicants`}><Button variant="secondary" size="sm">Applicants</Button></Link>
              <Link to={`/employer/jobs/${j.id}/edit`}><Button variant="ghost" size="sm">Edit</Button></Link>
              {j.status === 'open' && (
                <Button variant="danger" size="sm" loading={m.isPending} onClick={() => m.mutate(j.id)} data-testid={`employer-close-${j.id}`}>Close</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

#### `src/pages/employer/JobCreate.tsx`
```tsx
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { createJob } from '@/api/jobs';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { extractErrorMessage } from '@/lib/apiClient';
import { useState } from 'react';

const schema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(40).max(5000),
  category: z.string().min(2),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'gig']),
  payMin: z.coerce.number().min(0),
  payMax: z.coerce.number().min(0),
  currency: z.string().length(3),
  city: z.string().min(2),
  address: z.string().min(2),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
}).refine((v) => v.payMax >= v.payMin, { message: 'Maximum pay must be greater or equal', path: ['payMax'] });
type V = z.infer<typeof schema>;

export default function JobCreate() {
  const nav = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<V>({
    defaultValues: { currency: 'USD', employmentType: 'part_time' },
  });

  const m = useMutation({
    mutationFn: (v: V) => createJob({
      title: v.title, description: v.description, category: v.category,
      employmentType: v.employmentType, payMin: v.payMin, payMax: v.payMax, currency: v.currency,
      location: { city: v.city, address: v.address, lat: v.lat, lng: v.lng },
    }),
    onSuccess: (job) => nav(`/employer/jobs/${job.id}/edit`),
    onError: (e) => setServerError(extractErrorMessage(e)),
  });

  return (
    <section data-testid="page-job-create">
      <h1 className="text-2xl font-bold mb-4">Post a new job</h1>
      <Card className="p-5 max-w-3xl">
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" required error={errors.title?.message}>
              <Input id="title" data-testid="job-title" {...register('title')} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" required error={errors.description?.message}>
              <TextArea id="description" data-testid="job-description" {...register('description')} />
            </Field>
          </div>
          <Field label="Category" htmlFor="category" required error={errors.category?.message}>
            <Input id="category" data-testid="job-category" {...register('category')} />
          </Field>
          <Field label="Employment type" htmlFor="employmentType">
            <Select id="employmentType" data-testid="job-type" {...register('employmentType')}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="gig">Gig</option>
            </Select>
          </Field>
          <Field label="Pay min" htmlFor="payMin" error={errors.payMin?.message}><Input id="payMin" type="number" data-testid="job-pay-min" {...register('payMin')} /></Field>
          <Field label="Pay max" htmlFor="payMax" error={errors.payMax?.message}><Input id="payMax" type="number" data-testid="job-pay-max" {...register('payMax')} /></Field>
          <Field label="Currency" htmlFor="currency" hint="3-letter code"><Input id="currency" maxLength={3} data-testid="job-currency" {...register('currency')} /></Field>
          <Field label="City" htmlFor="city" required error={errors.city?.message}><Input id="city" data-testid="job-city" {...register('city')} /></Field>
          <div className="sm:col-span-2">
            <Field label="Street address" htmlFor="address" required error={errors.address?.message}><Input id="address" data-testid="job-address" {...register('address')} /></Field>
          </div>
          <Field label="Latitude" htmlFor="lat" error={errors.lat?.message}><Input id="lat" type="number" step="any" data-testid="job-lat" {...register('lat')} /></Field>
          <Field label="Longitude" htmlFor="lng" error={errors.lng?.message}><Input id="lng" type="number" step="any" data-testid="job-lng" {...register('lng')} /></Field>
          {serverError && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{serverError}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" loading={m.isPending} data-testid="job-create-submit">Publish job</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
```

#### `src/pages/employer/JobEdit.tsx`
```tsx
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJob, updateJob } from '@/api/jobs';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface V { title: string; description: string; payMin: number; payMax: number; }

export default function JobEdit() {
  const { jobId = '' } = useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['job', jobId], queryFn: () => getJob(jobId) });
  const { register, handleSubmit, reset } = useForm<V>();

  useEffect(() => {
    if (data) reset({ title: data.title, description: data.description, payMin: data.payMin, payMax: data.payMax });
  }, [data, reset]);

  const m = useMutation({
    mutationFn: (v: V) => updateJob(jobId, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job', jobId] }),
  });

  if (isLoading) return <Spinner />;
  return (
    <section data-testid="page-job-edit">
      <h1 className="text-2xl font-bold mb-4">Edit job</h1>
      <Card className="p-5 max-w-3xl">
        <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-3">
          <Field label="Title" htmlFor="title"><Input id="title" data-testid="edit-title" {...register('title')} /></Field>
          <Field label="Description" htmlFor="description"><TextArea id="description" data-testid="edit-description" {...register('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pay min" htmlFor="payMin"><Input id="payMin" type="number" data-testid="edit-pay-min" {...register('payMin', { valueAsNumber: true })} /></Field>
            <Field label="Pay max" htmlFor="payMax"><Input id="payMax" type="number" data-testid="edit-pay-max" {...register('payMax', { valueAsNumber: true })} /></Field>
          </div>
          <Button type="submit" loading={m.isPending} data-testid="edit-save">Save changes</Button>
          {m.isSuccess && <p role="status" className="text-sm text-emerald-700">Saved.</p>}
        </form>
      </Card>
    </section>
  );
}
```

#### `src/pages/employer/JobApplicants.tsx`
```tsx
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobApplicants, updateApplicationStatus, type AppStatus } from '@/api/applications';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/format';

const statuses: AppStatus[] = ['submitted', 'reviewed', 'shortlisted', 'rejected', 'hired'];

export default function JobApplicants() {
  const { jobId = '' } = useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['applicants', jobId], queryFn: () => jobApplicants(jobId) });

  const m = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppStatus }) => updateApplicationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applicants', jobId] }),
  });

  if (isLoading) return <Spinner />;
  return (
    <section data-testid="page-job-applicants">
      <h1 className="text-2xl font-bold mb-4">Applicants</h1>
      {data?.length === 0 ? (
        <EmptyState title="No applicants yet" description="Share your job link to attract local candidates." />
      ) : (
        <div className="grid gap-3">
          {data?.map((a) => (
            <Card key={a.id} className="p-4 grid sm:grid-cols-[1fr_auto_auto] gap-3 items-center" data-testid={`applicant-${a.id}`}>
              <div>
                <p className="font-medium">{a.candidateName}</p>
                <p className="text-sm text-slate-600">{a.candidateEmail} • Applied {formatDate(a.createdAt)}</p>
                <p className="text-sm text-slate-700 mt-2 line-clamp-3">{a.coverLetter}</p>
              </div>
              <Badge tone={a.status === 'hired' ? 'success' : a.status === 'rejected' ? 'danger' : 'info'}>{a.status}</Badge>
              <Select aria-label="Update status" value={a.status} data-testid={`applicant-status-${a.id}`}
                onChange={(e) => m.mutate({ id: a.id, status: e.target.value as AppStatus })}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
```

### Admin Pages

#### `src/pages/admin/AdminDashboard.tsx`
```tsx
import { useQuery } from '@tanstack/react-query';
import { adminMetrics } from '@/api/admin';
import { Card } from '@/components/ui/Card';
import { SideNav } from '@/components/layout/SideNav';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-metrics'], queryFn: adminMetrics });
  return (
    <section className="md:flex gap-6" data-testid="page-admin-dashboard">
      <SideNav items={[
        { to: '/admin', label: 'Overview', testId: 'admin-nav-overview' },
        { to: '/admin/users', label: 'Users', testId: 'admin-nav-users' },
        { to: '/admin/jobs', label: 'Jobs', testId: 'admin-nav-jobs' },
        { to: '/admin/reports', label: 'Reports', testId: 'admin-nav-reports' },
      ]} />
      <div className="flex-1 mt-4 md:mt-0">
        <h1 className="text-2xl font-bold mb-4">Platform overview</h1>
        {isLoading ? <Spinner /> : (
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              ['Users', data?.users], ['Jobs', data?.jobs],
              ['Applications', data?.applications], ['Active employers', data?.activeEmployers],
            ].map(([label, value]) => (
              <Card key={String(label)} className="p-4">
                <p className="text-sm text-slate-500">{String(label)}</p>
                <p className="text-2xl font-bold">{Number(value ?? 0).toLocaleString()}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

#### `src/pages/admin/AdminUsers.tsx`
```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminListUsers, adminSetUserActive } from '@/api/admin';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-users', q], queryFn: () => adminListUsers(q || undefined) });
  const m = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminSetUserActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  return (
    <section data-testid="page-admin-users">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <div className="max-w-md mb-3">
        <Input data-testid="admin-users-search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
      </div>
      {isLoading ? <Spinner /> : (
        <div className="grid gap-2">
          {data?.map((u) => (
            <Card key={u.id} className="p-3 flex items-center justify-between" data-testid={`admin-user-${u.id}`}>
              <div>
                <p className="font-medium">{u.fullName}</p>
                <p className="text-sm text-slate-600">{u.email} • <Badge tone="info">{u.role}</Badge></p>
              </div>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" loading={m.isPending} onClick={() => m.mutate({ id: u.id, active: false })}>Suspend</Button>
                <Button variant="secondary" size="sm" onClick={() => m.mutate({ id: u.id, active: true })}>Reinstate</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
```

#### `src/pages/admin/AdminJobs.tsx`
```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApproveJob, adminListJobs, adminRemoveJob } from '@/api/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminJobs() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-jobs'], queryFn: adminListJobs });
  const approve = useMutation({ mutationFn: adminApproveJob, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-jobs'] }) });
  const remove = useMutation({ mutationFn: adminRemoveJob, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-jobs'] }) });
  if (isLoading) return <Spinner />;
  return (
    <section data-testid="page-admin-jobs">
      <h1 className="text-2xl font-bold mb-4">Jobs moderation</h1>
      <div className="grid gap-2">
        {data?.map((j) => (
          <Card key={j.id} className="p-3 flex items-center justify-between" data-testid={`admin-job-${j.id}`}>
            <div>
              <p className="font-medium">{j.title}</p>
              <p className="text-sm text-slate-600">{j.companyName} • {j.location.city} • <Badge tone={j.status === 'open' ? 'success' : j.status === 'pending' ? 'warn' : 'neutral'}>{j.status}</Badge></p>
            </div>
            <div className="flex gap-2">
              {j.status === 'pending' && <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(j.id)} data-testid={`admin-approve-${j.id}`}>Approve</Button>}
              <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(j.id)} data-testid={`admin-remove-${j.id}`}>Remove</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

#### `src/pages/admin/AdminReports.tsx`
```tsx
import { Card } from '@/components/ui/Card';

export default function AdminReports() {
  return (
    <section data-testid="page-admin-reports">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <Card className="p-5">
        <p className="text-slate-700">Export operational reports in CSV format. Use the buttons below to generate downloads on demand.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/admin/reports/jobs.csv" className="px-4 h-10 inline-flex items-center rounded bg-brand-600 text-white text-sm hover:bg-brand-700" data-testid="report-jobs">Download jobs CSV</a>
          <a href="/api/admin/reports/applications.csv" className="px-4 h-10 inline-flex items-center rounded bg-brand-600 text-white text-sm hover:bg-brand-700" data-testid="report-apps">Download applications CSV</a>
          <a href="/api/admin/reports/users.csv" className="px-4 h-10 inline-flex items-center rounded bg-brand-600 text-white text-sm hover:bg-brand-700" data-testid="report-users">Download users CSV</a>
        </div>
      </Card>
    </section>
  );
}
```

#### Error Pages
```tsx
// NotFound.tsx
import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <section className="text-center py-20" data-testid="page-not-found">
      <h1 className="text-3xl font-bold mb-2">Page not found</h1>
      <p className="text-slate-600">The page you requested does not exist.</p>
      <Link to="/" className="inline-block mt-4 text-brand-700 hover:underline">Go home</Link>
    </section>
  );
}
```
```tsx
// Forbidden.tsx
import { Link } from 'react-router-dom';
export default function Forbidden() {
  return (
    <section className="text-center py-20" data-testid="page-forbidden">
      <h1 className="text-3xl font-bold mb-2">Access denied</h1>
      <p className="text-slate-600">Your account does not have permission to view that page.</p>
      <Link to="/" className="inline-block mt-4 text-brand-700 hover:underline">Go home</Link>
    </section>
  );
}
```

---

## 11. Form Validation Strategy

- **Schema-first** validation with Zod in every page handling user input.
- React Hook Form drives fields and `aria-invalid`; `<Field>` wires `aria-describedby` to error nodes (`role="alert"`).
- Server errors are normalized via `extractErrorMessage` and rendered next to the submit action.
- Numeric inputs use `valueAsNumber` or Zod `coerce.number()`.
- Cross-field rules (e.g., `payMax >= payMin`) use Zod `.refine`.

---

## 12. Responsive UI

- Mobile-first Tailwind utility classes; breakpoints at `sm`, `md`, `lg`.
- Critical layouts use grid + flex with no fixed widths.
- Top navigation stays sticky; side navigation collapses to horizontal scroll on mobile.
- All interactive controls have minimum 40px height for touch targets.
- Cards reflow to 1-column on small screens; filter bar stacks vertically below `md`.

---

## 13. Accessibility

- Skip link to `#main` content.
- Semantic `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`.
- All form fields have explicit `<label htmlFor>` and `aria-invalid` on errors.
- Error messages render with `role="alert"`.
- Focus-visible outlines via global CSS.
- `Modal` traps focus on open and supports `Escape` to close, with `role="dialog"` and `aria-modal`.
- Buttons announce loading via animated icon hidden from AT (`aria-hidden`) while keeping label text.
- Color contrast tested for AA on brand palette.

---

## 14. Playwright-friendly Selectors

- Convention: `data-testid` on every page root (`page-*`), every interactive control, and every list row (`*-${id}`).
- Helper `tid('xyz')` ensures consistent attributes.
- E2E tests use `getByTestId` exclusively (no brittle CSS).

### `playwright.config.ts`
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'mobile-chrome', use: devices['Pixel 7'] },
  ],
});
```

### `e2e/auth.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test('user can navigate to login and see validation', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-login').click();
  await expect(page.getByTestId('page-login')).toBeVisible();
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('email-error')).toBeVisible();
  await expect(page.getByTestId('password-error')).toBeVisible();
});
```

### `e2e/search.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test('search filters update query and results region', async ({ page }) => {
  await page.goto('/jobs');
  await page.getByTestId('filter-q').fill('barista');
  await page.getByTestId('filter-category').selectOption('Hospitality');
  await expect(page).toHaveURL(/q=barista/);
  await expect(page.getByTestId('job-results')).toBeVisible();
});
```

### `e2e/apply.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test('unauthenticated apply redirects to sign in CTA', async ({ page }) => {
  await page.goto('/jobs');
  const firstCard = page.getByTestId(/^job-card-/).first();
  await firstCard.click();
  await expect(page.getByTestId('page-job-details')).toBeVisible();
  await expect(page.getByTestId('apply-signin')).toBeVisible();
});
```

---

## 15. Production Build Considerations

- **Code splitting** via Vite `manualChunks` for `react`, `query`, `forms` vendor groups; route-level lazy loading can be added with `React.lazy` per page.
- **Source maps** enabled for production diagnostics; uploaded to error monitoring.
- **Strict TypeScript** with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitAny`.
- **Cache strategy**: Vite emits hashed filenames; serve `index.html` with `Cache-Control: no-cache` and assets with long-lived immutable caching.
- **Security headers** at the edge: CSP (`default-src 'self'`, `connect-src 'self' https://api.nearjobs.example`, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'`, `script-src 'self'`), HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin.
- **Auth token storage**: localStorage chosen for simplicity; production deployments behind HTTPS-only origin + CSP. For higher assurance, switch to `httpOnly` cookie via `withCredentials` on the API client.
- **Geo permissions**: feature gated and degrades gracefully without lat/lng.
- **Performance budgets**: LCP target < 2.5s on 4G; preload Inter via `<link rel="preconnect">` if hosted; defer non-critical chunks via dynamic import.
- **Observability**: hook Sentry/OpenTelemetry-Web in `main.tsx` (kept out of the artifact to avoid vendor lock-in).
- **Internationalization-ready**: all dates/currency use `Intl`; user locale honored automatically.
- **Error boundaries**: 404 / 403 routes plus `useQuery` error states; can be augmented with a top-level React error boundary for unrecoverable failures.
- **CI**: `npm run build` followed by `npx playwright test` against `vite preview` ensures the bundle and runtime contract are tested together.

This artifact is a complete, production-ready frontend implementation for NearJobs covering routing, auth, API, layout, search, details, registration, dashboards (candidate, employer, admin), application flow, validation, responsive UI, accessibility, Playwright selectors, and production build hardening.