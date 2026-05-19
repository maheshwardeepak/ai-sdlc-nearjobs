import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '../TaskCard';
import type { Task } from '../../../types/task';

const task: Task = {
  id: 1,
  title: 'Implement board',
  status: 'TODO',
  priority: 'HIGH',
  dueDate: null,
  teamId: 1,
  assigneeId: 2,
  assignee: { id: 2, username: 'bob', email: 'b@x' },
  createdById: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TaskCard', () => {
  it('renders title, priority, assignee', () => {
    render(
      <TaskCard task={task} currentStatus="TODO" onClick={() => {}} onStatusChange={() => {}} />
    );
    expect(screen.getByText('Implement board')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('triggers status change without firing onClick', () => {
    const onClick = vi.fn();
    const onStatusChange = vi.fn();
    render(
      <TaskCard task={task} currentStatus="TODO" onClick={onClick} onStatusChange={onStatusChange} />
    );
    fireEvent.change(screen.getByLabelText(/change status/i), { target: { value: 'DONE' } });
    expect(onStatusChange).toHaveBeenCalledWith('DONE');
    expect(onClick).not.toHaveBeenCalled();
  });
});