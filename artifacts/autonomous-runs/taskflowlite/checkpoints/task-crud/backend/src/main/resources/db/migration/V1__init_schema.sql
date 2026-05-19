-- TaskFlowLite initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN','MANAGER','MEMBER'))
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- =====================================================
-- TEAMS
-- =====================================================
CREATE TABLE teams (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    owner_id     BIGINT       NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_teams_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_teams_owner ON teams(owner_id);

-- =====================================================
-- TEAM_MEMBERS
-- =====================================================
CREATE TABLE team_members (
    id            BIGSERIAL PRIMARY KEY,
    team_id       BIGINT      NOT NULL,
    user_id       BIGINT      NOT NULL,
    role_in_team  VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_tm_team_user UNIQUE (team_id, user_id),
    CONSTRAINT chk_tm_role CHECK (role_in_team IN ('OWNER','MANAGER','MEMBER'))
);
CREATE INDEX idx_tm_team ON team_members(team_id);
CREATE INDEX idx_tm_user ON team_members(user_id);

-- =====================================================
-- TASKS
-- =====================================================
CREATE TABLE tasks (
    id             BIGSERIAL PRIMARY KEY,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    status         VARCHAR(20)  NOT NULL DEFAULT 'TODO',
    priority       VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    due_date       DATE,
    team_id        BIGINT,
    assignee_id    BIGINT,
    created_by_id  BIGINT       NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_tasks_team       FOREIGN KEY (team_id)       REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_assignee   FOREIGN KEY (assignee_id)   REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_tasks_status    CHECK (status   IN ('TODO','IN_PROGRESS','DONE')),
    CONSTRAINT chk_tasks_priority  CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT'))
);
CREATE INDEX idx_tasks_team     ON tasks(team_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status   ON tasks(status);
CREATE INDEX idx_tasks_creator  ON tasks(created_by_id);

-- =====================================================
-- COMMENTS
-- =====================================================
CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT      NOT NULL,
    author_id   BIGINT      NOT NULL,
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_comments_task   FOREIGN KEY (task_id)   REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_comments_task   ON comments(task_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- =====================================================
-- ACTIVITY_LOGS
-- =====================================================
CREATE TABLE activity_logs (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT      NOT NULL,
    actor_id    BIGINT      NOT NULL,
    action      VARCHAR(50) NOT NULL,
    field       VARCHAR(50),
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_act_task  FOREIGN KEY (task_id)  REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_act_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_act_task    ON activity_logs(task_id);
CREATE INDEX idx_act_actor   ON activity_logs(actor_id);
CREATE INDEX idx_act_created ON activity_logs(created_at);