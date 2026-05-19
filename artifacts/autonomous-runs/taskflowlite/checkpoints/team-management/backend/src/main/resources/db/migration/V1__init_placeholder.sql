-- Placeholder migration for scaffolding phase.
-- Real schema (users, teams, tasks, comments, activity_log) arrives in database-and-entities phase.
CREATE TABLE IF NOT EXISTS schema_bootstrap (
    id BIGSERIAL PRIMARY KEY,
    note VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_bootstrap (note) VALUES ('TaskFlowLite scaffolding initialized');

// ===== AI MERGE APPEND =====

-- Placeholder migration. Real schema introduced in database-and-entities phase.
CREATE TABLE IF NOT EXISTS schema_bootstrap (
    id SERIAL PRIMARY KEY,
    note VARCHAR(255) NOT NULL
);
INSERT INTO schema_bootstrap (note) VALUES ('TaskFlowLite scaffold initialized');