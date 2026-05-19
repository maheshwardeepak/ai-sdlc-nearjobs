-- Optimize comment listing by task and by author
CREATE INDEX IF NOT EXISTS idx_comments_task_created ON comments(task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);