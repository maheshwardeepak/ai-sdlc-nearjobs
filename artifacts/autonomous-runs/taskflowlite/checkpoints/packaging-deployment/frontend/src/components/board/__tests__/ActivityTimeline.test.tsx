import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimeline } from '../ActivityTimeline';
import type { ActivityLog } from '../../../types/task';

describe('ActivityTimeline', () => {
  it('renders empty state', () => {
    render(<ActivityTimeline activity={[]} />);
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  it('renders formatted activity entries', () => {
    const activity: ActivityLog[] = [
      {
        id: 1,
        taskId: 10,
        actorId: 5,
        actor: { id: 5, username: 'alice', email: 'a@x' },
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'TODO',
        newValue: 'IN_PROGRESS',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        taskId: 10,
        actorId: 5,
        actor: { id: 5, username: 'alice', email: 'a@x' },
        action: 'TASK_CREATED',
        createdAt: new Date(Date.now() - 1000).toISOString(),
      },
    ];
    render(<ActivityTimeline activity={activity} />);
    expect(screen.getByText(/alice changed status/i)).toBeInTheDocument();
    expect(screen.getByText(/alice created this task/i)).toBeInTheDocument();
  });
});