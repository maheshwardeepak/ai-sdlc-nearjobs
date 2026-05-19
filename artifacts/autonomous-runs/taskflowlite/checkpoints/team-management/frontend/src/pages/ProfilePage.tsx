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