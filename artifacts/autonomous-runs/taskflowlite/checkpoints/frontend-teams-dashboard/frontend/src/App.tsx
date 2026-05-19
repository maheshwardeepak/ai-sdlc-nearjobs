import { useEffect, useState } from "react";
import { fetchHealth } from "./api/health";

export default function App() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    fetchHealth()
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("DOWN"));
  }, []);

  return (
    <main className="app-shell">
      <h1>TaskFlowLite</h1>
      <p>Lightweight task workflow for small teams.</p>
      <p data-testid="health-status">
        Backend health: <strong>{status}</strong>
      </p>
    </main>
  );
}

// ===== AI MERGE APPEND =====

import { useEffect, useState } from 'react';
import { api } from './lib/api';

export default function App() {
  const [status, setStatus] = useState<string>('checking...');

  useEffect(() => {
    api
      .get('/api/health')
      .then((r) => setStatus(r.data.status ?? 'unknown'))
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>TaskFlowLite</h1>
      <p>Backend health: {status}</p>
    </main>
  );
}

// ===== AI MERGE APPEND =====

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

// ===== AI MERGE APPEND =====

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TaskBoardPage } from './pages/TaskBoardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/board" replace />} />
            <Route path="/board" element={<TaskBoardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}