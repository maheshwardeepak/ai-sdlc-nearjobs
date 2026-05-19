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