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