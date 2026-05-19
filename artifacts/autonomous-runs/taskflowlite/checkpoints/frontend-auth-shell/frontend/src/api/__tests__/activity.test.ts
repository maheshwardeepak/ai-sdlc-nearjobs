import { describe, it, expect } from 'vitest';
import { describeActivity, type ActivityLogDto } from '../activity';

const base: ActivityLogDto = {
  id: 1,
  taskId: 1,
  actorId: 1,
  actorUsername: 'alice',
  action: '',
  field: null,
  oldValue: null,
  newValue: null,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('describeActivity', () => {
  it('describes task creation', () => {
    expect(describeActivity({ ...base, action: 'TASK_CREATED' }))
      .toBe('alice created the task');
  });

  it('describes status change', () => {
    expect(describeActivity({
      ...base, action: 'STATUS_CHANGED', oldValue: 'TODO', newValue: 'DONE',
    })).toBe('alice changed status from TODO to DONE');
  });

  it('describes assignee change with unassigned fallback', () => {
    expect(describeActivity({
      ...base, action: 'ASSIGNEE_CHANGED', oldValue: null, newValue: '7',
    })).toBe('alice changed assignee from unassigned to 7');
  });

  it('describes comment events', () => {
    expect(describeActivity({ ...base, action: 'COMMENT_CREATED' }))
      .toBe('alice added a comment');
    expect(describeActivity({ ...base, action: 'COMMENT_DELETED' }))
      .toBe('alice deleted a comment');
  });
});