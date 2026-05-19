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