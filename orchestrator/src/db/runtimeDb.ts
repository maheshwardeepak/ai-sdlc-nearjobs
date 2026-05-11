import { Pool } from "pg";

export const runtimeDb = new Pool({
  connectionString:
    process.env.RUNTIME_DATABASE_URL ||
    "postgres://postgres:postgres@localhost:55432/ai_sdlc_factory"
});

export async function initRuntimeDb() {
  await runtimeDb.query(`
    CREATE TABLE IF NOT EXISTS factory_executions (
      id SERIAL PRIMARY KEY,
      project_name TEXT,
      status TEXT NOT NULL,
      plan_version INTEGER,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await runtimeDb.query(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id SERIAL PRIMARY KEY,
      execution_id INTEGER REFERENCES factory_executions(id),
      agent TEXT NOT NULL,
      role TEXT,
      worker_id TEXT,
      status TEXT NOT NULL,
      output_file TEXT,
      started_at TIMESTAMPTZ DEFAULT now(),
      finished_at TIMESTAMPTZ
    );
  `);

  await runtimeDb.query(`
    CREATE TABLE IF NOT EXISTS verification_runs (
      id SERIAL PRIMARY KEY,
      execution_id INTEGER REFERENCES factory_executions(id),
      check_name TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      log_file TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  return { success: true };
}
