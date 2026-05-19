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