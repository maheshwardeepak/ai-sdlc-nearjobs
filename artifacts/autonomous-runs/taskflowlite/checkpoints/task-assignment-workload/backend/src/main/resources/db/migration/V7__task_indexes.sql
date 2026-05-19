-- Indexes to support common task filters introduced in task-crud phase
CREATE INDEX IF NOT EXISTS idx_tasks_team_status ON tasks (team_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_assignee ON tasks (team_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);