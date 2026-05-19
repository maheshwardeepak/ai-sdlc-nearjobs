-- Ensure (team_id, user_id) uniqueness for team membership (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_team_members_team_user'
    ) THEN
        ALTER TABLE team_members
            ADD CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);