import { randomUUID } from "node:crypto";

import { Worker } from "bullmq";
import { z } from "zod";

import { Prisma, getRedisConnection, getRuntimeEnv, prisma } from "@self-flow/shared";

const RuntimeWorkerEnvSchema = z.object({
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5)
});

const runtimeEnv = getRuntimeEnv();
const workerEnv = RuntimeWorkerEnvSchema.parse(process.env);

await prisma.$connect();

const JobDataSchema = z.object({
  runId: z.string().uuid()
});

const worker = new Worker(
  "runs",
  async (job) => {
    const { runId } = JobDataSchema.parse(job.data);

    const run = await prisma.run.findUnique({
      where: { id: runId },
      select: { status: true, startedAt: true }
    });
    if (!run) {
      throw new Error("Run not found");
    }
    if (run.status === "succeeded") {
      return { skipped: true };
    }

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: "running",
        startedAt: run.startedAt ?? new Date(),
        error: Prisma.DbNull
      }
    });

    const stepId = randomUUID();
    await prisma.runStep.create({
      data: {
        id: stepId,
        runId,
        name: "noop.execute",
        status: "running",
        startedAt: new Date()
      }
    });

    const artifactId = randomUUID();
    await prisma.artifact.create({
      data: {
        id: artifactId,
        runId,
        stepId,
        kind: "worker_log",
        payload: {
          message: "M1 noop execution completed",
          attempt: job.attemptsMade + 1
        }
      }
    });

    await prisma.runStep.update({
      where: { id: stepId },
      data: {
        status: "succeeded",
        finishedAt: new Date(),
        error: Prisma.DbNull
      }
    });

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: "succeeded",
        finishedAt: new Date(),
        error: Prisma.DbNull
      }
    });

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

  try {
    await prisma.run.update({
      where: { id: parsed.data.runId },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: { message: err.message, name: err.name }
      }
    });
  } catch {
    return;
  }
});

await worker.waitUntilReady();
