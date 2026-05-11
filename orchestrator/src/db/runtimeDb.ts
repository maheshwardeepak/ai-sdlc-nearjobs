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

export async function recordFactoryExecution(input: {
  projectName: string | null;
  status: string;
  planVersion?: number;
}) {
  const result = await runtimeDb.query(
    `
    INSERT INTO factory_executions (
      project_name,
      status,
      plan_version
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [
      input.projectName,
      input.status,
      input.planVersion ?? null
    ]
  );

  return result.rows[0];
}

export async function listFactoryExecutions(limit = 20) {
  const result = await runtimeDb.query(
    `
    SELECT *
    FROM factory_executions
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function recordAgentRun(input: {
  executionId?: number | null;
  agent: string;
  role?: string | null;
  workerId?: string | null;
  status: string;
  outputFile?: string | null;
}) {
  const result = await runtimeDb.query(
    `
    INSERT INTO agent_runs (
      execution_id,
      agent,
      role,
      worker_id,
      status,
      output_file,
      finished_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now())
    RETURNING *
    `,
    [
      input.executionId ?? null,
      input.agent,
      input.role ?? null,
      input.workerId ?? null,
      input.status,
      input.outputFile ?? null
    ]
  );

  return result.rows[0];
}

export async function listAgentRuns(limit = 20) {
  const result = await runtimeDb.query(
    `
    SELECT *
    FROM agent_runs
    ORDER BY started_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function recordVerificationRun(input: {
  executionId?: number | null;
  checkName: string;
  success: boolean;
  logFile?: string | null;
}) {
  const result = await runtimeDb.query(
    `
    INSERT INTO verification_runs (
      execution_id,
      check_name,
      success,
      log_file
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [
      input.executionId ?? null,
      input.checkName,
      input.success,
      input.logFile ?? null
    ]
  );

  return result.rows[0];
}

export async function listVerificationRuns(limit = 20) {
  const result = await runtimeDb.query(
    `
    SELECT *
    FROM verification_runs
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}
