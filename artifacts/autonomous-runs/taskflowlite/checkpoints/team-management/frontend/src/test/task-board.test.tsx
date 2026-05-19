import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

function TaskBoard({ tasks }: { tasks: Array<{ id: number; title: string; status: string }> }) {
  const cols = ['TODO', 'IN_PROGRESS', 'DONE'];
  return (
    <div>
      {cols.map(c => (
        <section key={c} aria-label={c}>
          <h3>{c}</h3>
          {tasks.filter(t => t.status === c).map(t => (
            <div key={t.id}>{t.title}</div>
          ))}
        </section>
      ))}
    </div>
  );
}

describe('TaskBoard', () => {
  it('renders three columns', () => {
    render(<TaskBoard tasks={[]} />);
    expect(screen.getByRole('region', { name: 'TODO' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'IN_PROGRESS' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'DONE' })).toBeInTheDocument();
  });

  it('renders task in matching column', () => {
    render(<TaskBoard tasks={[{ id: 1, title: 'Write tests', status: 'TODO' }]} />);
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });
});