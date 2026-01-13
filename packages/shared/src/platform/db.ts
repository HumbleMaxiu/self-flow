import type { Pool } from "pg";
import { Pool as PgPool } from "pg";

export function createDbPool(databaseUrl: string): Pool {
  return new PgPool({ connectionString: databaseUrl });
}

export async function ensureDbSchema(dbPool: Pool): Promise<void> {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS runs (
        id uuid PRIMARY KEY,
        workflow_id text NOT NULL,
        trigger text NOT NULL,
        status text NOT NULL,
        input jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        started_at timestamptz,
        finished_at timestamptz,
        error jsonb
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS run_steps (
        id uuid PRIMARY KEY,
        run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        name text NOT NULL,
        status text NOT NULL,
        started_at timestamptz,
        finished_at timestamptz,
        error jsonb
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id uuid PRIMARY KEY,
        run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        step_id uuid REFERENCES run_steps(id) ON DELETE SET NULL,
        kind text NOT NULL,
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_run_steps_run_id ON run_steps(run_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id);
    `);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

