import { randomUUID } from "node:crypto";

import { Queue } from "bullmq";
import { z } from "zod";

import { getRedisConnection, getRuntimeEnv } from "@self-flow/shared";

import { dbPool } from "./db";

const RunCreateInputSchema = z.object({
  workflowId: z.string().min(1),
  trigger: z.enum(["manual", "cron", "api"]),
  input: z.record(z.string(), z.unknown())
});

export type RunCreateInput = z.infer<typeof RunCreateInputSchema>;

const env = getRuntimeEnv();
const runsQueue = new Queue("runs", { connection: getRedisConnection(env) });

export async function createRun(input: RunCreateInput) {
  const parsed = RunCreateInputSchema.parse(input);
  const id = randomUUID();

  await dbPool.query(
    `
      INSERT INTO runs (id, workflow_id, trigger, status, input)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [id, parsed.workflowId, parsed.trigger, "queued", JSON.stringify(parsed.input)]
  );

  await runsQueue.add(
    "executeRun",
    { runId: id },
    {
      jobId: id,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 1000
    }
  );

  return getRun(id);
}

export async function listRuns() {
  const { rows } = await dbPool.query(
    `
      SELECT id, workflow_id, trigger, status, created_at, started_at, finished_at
      FROM runs
      ORDER BY created_at DESC
      LIMIT 50
    `
  );
  return rows;
}

export async function getRun(id: string) {
  const runRes = await dbPool.query(
    `
      SELECT id, workflow_id, trigger, status, input, created_at, started_at, finished_at, error
      FROM runs
      WHERE id = $1
    `,
    [id]
  );

  if (runRes.rowCount === 0) return null;

  const stepsRes = await dbPool.query(
    `
      SELECT id, run_id, name, status, started_at, finished_at, error
      FROM run_steps
      WHERE run_id = $1
      ORDER BY started_at NULLS LAST, id ASC
    `,
    [id]
  );

  const artifactsRes = await dbPool.query(
    `
      SELECT id, run_id, step_id, kind, payload, created_at
      FROM artifacts
      WHERE run_id = $1
      ORDER BY created_at ASC
    `,
    [id]
  );

  return {
    run: runRes.rows[0],
    steps: stepsRes.rows,
    artifacts: artifactsRes.rows
  };
}
