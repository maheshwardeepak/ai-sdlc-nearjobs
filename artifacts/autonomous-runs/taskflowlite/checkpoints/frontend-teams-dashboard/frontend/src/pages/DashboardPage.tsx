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