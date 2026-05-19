import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '../ProfilePage';

vi.mock('../../api/users', () => ({
  getMe: vi.fn(),
  updateMe: vi.fn(),
}));

import { getMe } from '../../api/users';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue({
      id: 7, email: 'u@example.com', username: 'user7', role: 'MEMBER',
    });
  });

  it('loads user profile', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue('user7')).toBeInTheDocument());
    expect(screen.getByDisplayValue('u@example.com')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toBeInTheDocument();
  });
});