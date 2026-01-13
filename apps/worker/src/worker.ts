import { randomUUID } from "node:crypto";

import { Worker } from "bullmq";
import { z } from "zod";

import {
  createDbPool,
  ensureDbSchema,
  getRedisConnection,
  getRuntimeEnv
} from "@self-flow/shared";

const RuntimeWorkerEnvSchema = z.object({
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5)
});

const runtimeEnv = getRuntimeEnv();
const workerEnv = RuntimeWorkerEnvSchema.parse(process.env);

const dbPool = createDbPool(runtimeEnv.DATABASE_URL);

await ensureDbSchema(dbPool);

const JobDataSchema = z.object({
  runId: z.string().uuid()
});

const worker = new Worker(
  "runs",
  async (job) => {
    const { runId } = JobDataSchema.parse(job.data);

    const runRes = await dbPool.query(
      `SELECT status FROM runs WHERE id = $1`,
      [runId]
    );
    if (runRes.rowCount === 0) {
      throw new Error("Run not found");
    }
    if (runRes.rows[0]?.status === "succeeded") {
      return { skipped: true };
    }

    await dbPool.query(
      `
        UPDATE runs
        SET status = 'running',
            started_at = COALESCE(started_at, now()),
            error = NULL
        WHERE id = $1
      `,
      [runId]
    );

    const stepId = randomUUID();
    await dbPool.query(
      `
        INSERT INTO run_steps (id, run_id, name, status, started_at)
        VALUES ($1, $2, $3, $4, now())
      `,
      [stepId, runId, "noop.execute", "running"]
    );

    const artifactId = randomUUID();
    await dbPool.query(
      `
        INSERT INTO artifacts (id, run_id, step_id, kind, payload)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        artifactId,
        runId,
        stepId,
        "worker_log",
        JSON.stringify({
          message: "M1 noop execution completed",
          attempt: job.attemptsMade + 1
        })
      ]
    );

    await dbPool.query(
      `
        UPDATE run_steps
        SET status = 'succeeded',
            finished_at = now(),
            error = NULL
        WHERE id = $1
      `,
      [stepId]
    );

    await dbPool.query(
      `
        UPDATE runs
        SET status = 'succeeded',
            finished_at = now(),
            error = NULL
        WHERE id = $1
      `,
      [runId]
    );

    return { ok: true };
  },
  {
    connection: getRedisConnection(runtimeEnv),
    concurrency: workerEnv.WORKER_CONCURRENCY
  }
);

worker.on("failed", async (job, err) => {
  const parsed = JobDataSchema.safeParse(job?.data);
  if (!parsed.success) return;

  await dbPool.query(
    `
      UPDATE runs
      SET status = 'failed',
          finished_at = now(),
          error = $2::jsonb
      WHERE id = $1
    `,
    [
      parsed.data.runId,
      JSON.stringify({
        message: err.message,
        name: err.name
      })
    ]
  );
});

await worker.waitUntilReady();

