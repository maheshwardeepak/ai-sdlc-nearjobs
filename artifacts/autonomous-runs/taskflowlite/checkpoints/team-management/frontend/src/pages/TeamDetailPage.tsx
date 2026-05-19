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