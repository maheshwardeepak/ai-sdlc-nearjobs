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

// ===== AI MERGE APPEND =====

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