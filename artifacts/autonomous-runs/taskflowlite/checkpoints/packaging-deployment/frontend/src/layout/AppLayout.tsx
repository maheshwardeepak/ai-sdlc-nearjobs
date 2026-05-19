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