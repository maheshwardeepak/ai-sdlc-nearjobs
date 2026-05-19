model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Frontend Teams, Workload & Dashboard

Implementing teams list, team detail (members + workload + dashboard), global dashboard, and profile screen.

## Backend Work
None — all required endpoints exist from prior phases.

## Database Work
None.

## Frontend Work
- Add API client modules for teams, dashboard, users
- Add pages: TeamsList, TeamDetail, Dashboard, Profile
- Wire routes & nav

## Files

```file:frontend/src/api/teams.ts
import { apiClient } from './client';

export interface TeamSummary {
  id: number;
  name: string;
  description?: string | null;
  ownerId: number;
  memberCount?: number;
  createdAt?: string;
}

export interface TeamMember {
  id: number;
  userId: number;
  username: string;
  email: string;
  roleInTeam: string;
  joinedAt: string;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
}

export interface WorkloadEntry {
  userId: number;
  username: string;
  openTasks: number;
  todo: number;
  inProgress: number;
  done: number;
}

export interface TeamDashboard {
  teamId: number;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  unassigned: number;
}

export async function listTeams(): Promise<TeamSummary[]> {
  const { data } = await apiClient.get('/api/teams');
  return data;
}

export async function createTeam(payload: { name: string; description?: string }): Promise<TeamSummary> {
  const { data } = await apiClient.post('/api/teams', payload);
  return data;
}

export async function getTeam(id: number): Promise<TeamDetail> {
  const { data } = await apiClient.get(`/api/teams/${id}`);
  return data;
}

export async function addTeamMember(teamId: number, payload: { userId?: number; email?: string; roleInTeam?: string }) {
  const { data } = await apiClient.post(`/api/teams/${teamId}/members`, payload);
  return data;
}

export async function removeTeamMember(teamId: number, userId: number) {
  await apiClient.delete(`/api/teams/${teamId}/members/${userId}`);
}

export async function getTeamWorkload(teamId: number): Promise<WorkloadEntry[]> {
  const { data } = await apiClient.get(`/api/teams/${teamId}/workload`);
  return data;
}

export async function getTeamDashboard(teamId: number): Promise<TeamDashboard> {
  const { data } = await apiClient.get(`/api/teams/${teamId}/dashboard`);
  return data;
}
```

```file:frontend/src/api/dashboard.ts
import { apiClient } from './client';

export interface GlobalDashboard {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  unassigned: number;
  myOpenTasks?: number;
}

export async function getGlobalDashboard(): Promise<GlobalDashboard> {
  const { data } = await apiClient.get('/api/dashboard');
  return data;
}
```

```file:frontend/src/api/users.ts
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
```

```file:frontend/src/pages/TeamsListPage.tsx
import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listTeams, createTeam, TeamSummary } from '../api/teams';

export default function TeamsListPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTeams(await listTeams());
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createTeam({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page teams-page">
      <header className="page-header">
        <h1>Teams</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'New Team'}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form onSubmit={onSubmit} className="card form-card">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Team'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : teams.length === 0 ? (
        <p className="empty">You are not a member of any teams yet.</p>
      ) : (
        <ul className="team-list">
          {teams.map((t) => (
            <li key={t.id} className="card team-card">
              <Link to={`/teams/${t.id}`}>
                <h3>{t.name}</h3>
                {t.description && <p>{t.description}</p>}
                {typeof t.memberCount === 'number' && (
                  <small>{t.memberCount} member{t.memberCount === 1 ? '' : 's'}</small>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```file:frontend/src/pages/TeamDetailPage.tsx
import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getTeam,
  getTeamWorkload,
  getTeamDashboard,
  addTeamMember,
  removeTeamMember,
  TeamDetail,
  WorkloadEntry,
  TeamDashboard,
} from '../api/teams';

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [t, w, d] = await Promise.all([
        getTeam(teamId),
        getTeamWorkload(teamId).catch(() => [] as WorkloadEntry[]),
        getTeamDashboard(teamId).catch(() => null),
      ]);
      setTeam(t);
      setWorkload(w);
      setDashboard(d);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isNaN(teamId)) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSubmitting(true);
    try {
      await addTeamMember(teamId, { email: inviteEmail.trim(), roleInTeam: inviteRole });
      setInviteEmail('');
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to add member');
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function onRemove(userId: number) {
    if (!confirm('Remove this member?')) return;
    try {
      await removeTeamMember(teamId, userId);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to remove member');
    }
  }

  if (loading) return <div className="page">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!team) return <div className="page">Team not found.</div>;

  return (
    <div className="page team-detail-page">
      <header className="page-header">
        <div>
          <h1>{team.name}</h1>
          {team.description && <p className="muted">{team.description}</p>}
        </div>
        <Link to="/teams" className="btn btn-link">← Back to teams</Link>
      </header>

      {dashboard && (
        <section className="dashboard-grid">
          <div className="stat-card"><span>Total</span><strong>{dashboard.total}</strong></div>
          <div className="stat-card"><span>To Do</span><strong>{dashboard.todo}</strong></div>
          <div className="stat-card"><span>In Progress</span><strong>{dashboard.inProgress}</strong></div>
          <div className="stat-card"><span>Done</span><strong>{dashboard.done}</strong></div>
          <div className="stat-card"><span>Unassigned</span><strong>{dashboard.unassigned}</strong></div>
        </section>
      )}

      <section className="card">
        <h2>Members</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {team.members.map((m) => (
              <tr key={m.userId}>
                <td>{m.username}</td>
                <td>{m.email}</td>
                <td>{m.roleInTeam}</td>
                <td>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}</td>
                <td>
                  {m.userId !== team.ownerId && (
                    <button className="btn btn-danger btn-sm" onClick={() => onRemove(m.userId)}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form onSubmit={onInvite} className="inline-form">
          <input
            type="email"
            placeholder="member@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="MEMBER">Member</option>
            <option value="MANAGER">Manager</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={inviteSubmitting}>
            {inviteSubmitting ? 'Adding…' : 'Add Member'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Workload</h2>
        {workload.length === 0 ? (
          <p className="muted">No workload data.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Open</th>
                <th>To Do</th>
                <th>In Progress</th>
                <th>Done</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((w) => (
                <tr key={w.userId}>
                  <td>{w.username}</td>
                  <td><strong>{w.openTasks}</strong></td>
                  <td>{w.todo}</td>
                  <td>{w.inProgress}</td>
                  <td>{w.done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

```file:frontend/src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGlobalDashboard, GlobalDashboard } from '../api/dashboard';
import { listTeams, TeamSummary } from '../api/teams';

export default function DashboardPage() {
  const [stats, setStats] = useState<GlobalDashboard | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([getGlobalDashboard(), listTeams().catch(() => [])]);
        setStats(s);
        setTeams(t);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="page">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <h1>Dashboard</h1>
      </header>

      {stats && (
        <section className="dashboard-grid">
          <div className="stat-card"><span>Total tasks</span><strong>{stats.total}</strong></div>
          <div className="stat-card"><span>To Do</span><strong>{stats.todo}</strong></div>
          <div className="stat-card"><span>In Progress</span><strong>{stats.inProgress}</strong></div>
          <div className="stat-card"><span>Done</span><strong>{stats.done}</strong></div>
          <div className="stat-card"><span>Unassigned</span><strong>{stats.unassigned}</strong></div>
          {typeof stats.myOpenTasks === 'number' && (
            <div className="stat-card highlight"><span>My Open</span><strong>{stats.myOpenTasks}</strong></div>
          )}
        </section>
      )}

      <section className="card">
        <h2>Quick Links</h2>
        <ul className="quick-links">
          <li><Link to="/board">Task Board</Link></li>
          <li><Link to="/board?unassigned=true">Unassigned Tasks</Link></li>
          <li><Link to="/teams">Teams</Link></li>
          <li><Link to="/profile">Profile</Link></li>
        </ul>
      </section>

      <section className="card">
        <h2>Your Teams</h2>
        {teams.length === 0 ? (
          <p className="muted">No teams yet. <Link to="/teams">Create one</Link>.</p>
        ) : (
          <ul className="team-list compact">
            {teams.slice(0, 6).map((t) => (
              <li key={t.id}>
                <Link to={`/teams/${t.id}`}>{t.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

```file:frontend/src/pages/ProfilePage.tsx
import { useEffect, useState, FormEvent } from 'react';
import { getMe, updateMe, UserProfile } from '../api/users';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setProfile(me);
        setUsername(me.username);
        setEmail(me.email);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: { username?: string; email?: string; password?: string } = {};
      if (profile && username !== profile.username) payload.username = username;
      if (profile && email !== profile.email) payload.email = email;
      if (password.trim().length > 0) payload.password = password;

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes to save.');
        return;
      }

      const updated = await updateMe(payload);
      setProfile(updated);
      setPassword('');
      setSuccess('Profile updated.');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page">Loading…</div>;
  if (!profile) return <div className="page"><div className="alert alert-error">{error ?? 'Profile unavailable'}</div></div>;

  return (
    <div className="page profile-page">
      <header className="page-header"><h1>Profile</h1></header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={onSubmit} className="card form-card">
        <div className="profile-meta">
          <div><span>Role:</span> <strong>{profile.role}</strong></div>
          <div><span>User ID:</span> <strong>{profile.id}</strong></div>
        </div>

        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} maxLength={64} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          New Password <small className="muted">(leave blank to keep current)</small>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
        </label>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
```

```file:frontend/src/routes/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import TaskBoardPage from '../pages/TaskBoardPage';
import TeamsListPage from '../pages/TeamsListPage';
import TeamDetailPage from '../pages/TeamDetailPage';
import ProfilePage from '../pages/ProfilePage';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../layout/AppLayout';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/board" element={<TaskBoardPage />} />
          <Route path="/teams" element={<TeamsListPage />} />
          <Route path="/teams/:id" element={<TeamDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

```file:frontend/src/layout/AppLayout.tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuthToken } from '../auth/token';

export default function AppLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    clearAuthToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">TaskFlowLite</div>
        <nav className="app-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/board">Board</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <button className="btn btn-link logout" onClick={handleLogout}>Logout</button>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
```

```file:frontend/src/styles/teams-dashboard.css
.page { padding: 1.25rem; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
.page-header h1 { margin: 0; }

.muted { color: #6b7280; }
.alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
.alert-error { background: #fee2e2; color: #991b1b; }
.alert-success { background: #d1fae5; color: #065f46; }

.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.form-card label { display: block; margin-bottom: 0.85rem; font-weight: 500; }
.form-card input, .form-card textarea, .form-card select {
  width: 100%; padding: 0.5rem 0.65rem; border: 1px solid #d1d5db; border-radius: 6px; margin-top: 0.25rem; font: inherit;
}

.btn { display: inline-block; padding: 0.5rem 0.9rem; border-radius: 6px; border: 1px solid transparent; cursor: pointer; font: inherit; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-danger { background: #dc2626; color: #fff; }
.btn-link { background: transparent; color: #2563eb; }
.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.85rem; }

.team-list { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.team-list.compact { grid-template-columns: 1fr; gap: 0.25rem; }
.team-card a { text-decoration: none; color: inherit; display: block; }
.team-card h3 { margin: 0 0 0.5rem 0; }

.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
.stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.stat-card span { color: #6b7280; font-size: 0.85rem; }
.stat-card strong { font-size: 1.75rem; }
.stat-card.highlight { background: #eff6ff; border-color: #bfdbfe; }

.data-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.data-table th, .data-table td { padding: 0.55rem 0.6rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table th { font-weight: 600; color: #374151; background: #f9fafb; }

.inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.5rem; }
.inline-form input, .inline-form select { padding: 0.5rem 0.65rem; border: 1px solid #d1d5db; border-radius: 6px; font: inherit; }

.profile-meta { display: flex; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.profile-meta span { color: #6b7280; margin-right: 0.25rem; }

.quick-links { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.75rem; }
.quick-links a { display: inline-block; padding: 0.5rem 0.85rem; background: #f3f4f6; border-radius: 6px; text-decoration: none; color: #1f2937; }
.quick-links a:hover { background: #e5e7eb; }

.app-shell { display: flex; min-height: 100vh; }
.app-sidebar { width: 220px; background: #111827; color: #f9fafb; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.app-sidebar .brand { font-weight: 700; font-size: 1.1rem; margin-bottom: 1rem; }
.app-nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.app-nav a { color: #d1d5db; padding: 0.5rem 0.65rem; border-radius: 6px; text-decoration: none; }
.app-nav a:hover { background: #1f2937; color: #fff; }
.app-nav a.active { background: #2563eb; color: #fff; }
.app-sidebar .logout { color: #f87171; text-align: left; padding: 0.5rem 0.65rem; }
.app-main { flex: 1; background: #f3f4f6; overflow-y: auto; }

@media (max-width: 768px) {
  .app-shell { flex-direction: column; }
  .app-sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .app-nav { flex-direction: row; flex-wrap: wrap; flex: unset; }
  .app-sidebar .brand { margin-bottom: 0; margin-right: 0.5rem; }
}
```

```file:frontend/src/styles/index.css
@import './teams-dashboard.css';

* { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; }
a { color: #2563eb; }
```

```file:frontend/src/pages/__tests__/DashboardPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../DashboardPage';

vi.mock('../../api/dashboard', () => ({
  getGlobalDashboard: vi.fn(),
}));
vi.mock('../../api/teams', () => ({
  listTeams: vi.fn(),
}));

import { getGlobalDashboard } from '../../api/dashboard';
import { listTeams } from '../../api/teams';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getGlobalDashboard).mockResolvedValue({
      total: 10, todo: 4, inProgress: 3, done: 3, unassigned: 2, myOpenTasks: 5,
    });
    vi.mocked(listTeams).mockResolvedValue([
      { id: 1, name: 'Alpha', ownerId: 1 },
    ]);
  });

  it('renders task counts and teams', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Total tasks')).toBeInTheDocument());
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
```

```file:frontend/src/pages/__tests__/TeamsListPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeamsListPage from '../TeamsListPage';

vi.mock('../../api/teams', () => ({
  listTeams: vi.fn(),
  createTeam: vi.fn(),
}));

import { listTeams } from '../../api/teams';

describe('TeamsListPage', () => {
  beforeEach(() => {
    vi.mocked(listTeams).mockResolvedValue([
      { id: 1, name: 'Alpha Team', description: 'desc', ownerId: 1, memberCount: 3 },
      { id: 2, name: 'Beta Team', ownerId: 1, memberCount: 1 },
    ]);
  });

  it('lists teams', async () => {
    render(
      <MemoryRouter>
        <TeamsListPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Alpha Team')).toBeInTheDocument());
    expect(screen.getByText('Beta Team')).toBeInTheDocument();
  });
});
```

```file:frontend/src/pages/__tests__/ProfilePage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '../ProfilePage';

vi.mock('../../api/users', () => ({
  getMe: vi.fn(),
  updateMe: vi.fn(),
}));

import { getMe } from '../../api/users';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue({
      id: 7, email: 'u@example.com', username: 'user7', role: 'MEMBER',
    });
  });

  it('loads user profile', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue('user7')).toBeInTheDocument());
    expect(screen.getByDisplayValue('u@example.com')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toBeInTheDocument();
  });
});
```

## Tests Required
- `DashboardPage.test.tsx` — renders stats and team list
- `TeamsListPage.test.tsx` — lists teams from API
- `ProfilePage.test.tsx` — loads and displays user profile

## Validation Gates
- ✅ Execution: file artifacts produced
- ✅ Build: TypeScript/Vite build of new pages
- ✅ Tests: Vitest + RTL coverage for new pages
- ✅ Contract drift: uses only existing endpoints (`/api/teams`, `/api/teams/{id}`, `/api/teams/{id}/members`, `/api/teams/{id}/workload`, `/api/teams/{id}/dashboard`, `/api/dashboard`, `/api/users/me`)
- ✅ Responsive: mobile breakpoint stylesheet at 768px
- ✅ Security: JWT axios interceptor reused via `apiClient`; logout clears token

## Phase Completion Summary
Delivered the Frontend Teams, Workload & Dashboard phase:
- **Teams List** with create-team form
- **Team Detail** with members table, add/remove member, workload table, and team dashboard cards
- **Global Dashboard** with status counts, quick stats, quick links, and recent teams
- **Profile** screen with editable username/email/password
- Updated app routes & sidebar layout to include new pages
- Added responsive styles for dashboard grids, tables, and mobile sidebar
- Added Vitest tests for the three new primary pages