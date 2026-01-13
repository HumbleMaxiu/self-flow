import { randomUUID } from "node:crypto";

import { Queue } from "bullmq";
import { z } from "zod";

import {
  Prisma,
  SelfFlow,
  getRedisConnection,
  getRuntimeEnv,
  prisma
} from "@self-flow/shared";

const RunCreateInputSchema = z.object({
  workflowId: z.string().min(1),
  trigger: z.enum(["manual", "cron", "api"]),
  input: z.record(z.string(), z.unknown())
});

export type RunCreateInput = SelfFlow.Runs.CreateInput;

const env = getRuntimeEnv();
const runsQueue = new Queue("runs", { connection: getRedisConnection(env) });

export async function createRun(input: RunCreateInput) {
  const parsed = RunCreateInputSchema.parse(input);
  const id = randomUUID();
  const inputJson = JSON.parse(JSON.stringify(parsed.input)) as Prisma.InputJsonValue;

  await prisma.run.create({
    data: {
      id,
      workflowId: parsed.workflowId,
      trigger: parsed.trigger,
      status: "queued",
      input: inputJson
    }
  });

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
  const runs = await prisma.run.findMany({
    select: {
      id: true,
      workflowId: true,
      trigger: true,
      status: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return runs.map((run) => ({
    id: run.id,
    workflow_id: run.workflowId,
    trigger: run.trigger,
    status: run.status,
    created_at: run.createdAt,
    started_at: run.startedAt,
    finished_at: run.finishedAt
  })) satisfies SelfFlow.Runs.ListRow[];
}

export async function getRun(id: string) {
  const run = await prisma.run.findUnique({
    where: { id },
    select: {
      id: true,
      workflowId: true,
      trigger: true,
      status: true,
      input: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      error: true
    }
  });

  if (!run) return null;

  const steps = await prisma.runStep.findMany({
    where: { runId: id },
    select: {
      id: true,
      runId: true,
      name: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      error: true
    },
    orderBy: [{ startedAt: "asc" }, { id: "asc" }]
  });

  const artifacts = await prisma.artifact.findMany({
    where: { runId: id },
    select: {
      id: true,
      runId: true,
      stepId: true,
      kind: true,
      payload: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });

  const sortedSteps = steps.slice().sort((a, b) => {
    if (!a.startedAt && !b.startedAt) return a.id.localeCompare(b.id);
    if (!a.startedAt) return 1;
    if (!b.startedAt) return -1;
    const delta = a.startedAt.getTime() - b.startedAt.getTime();
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });

  return {
    run: {
      id: run.id,
      workflow_id: run.workflowId,
      trigger: run.trigger,
      status: run.status,
      input: run.input,
      created_at: run.createdAt,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      error: run.error
    },
    steps: sortedSteps.map((step) => ({
      id: step.id,
      run_id: step.runId,
      name: step.name,
      status: step.status,
      started_at: step.startedAt,
      finished_at: step.finishedAt,
      error: step.error
    })),
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      run_id: artifact.runId,
      step_id: artifact.stepId,
      kind: artifact.kind,
      payload: artifact.payload,
      created_at: artifact.createdAt
    }))
  } satisfies SelfFlow.Runs.GetResult;
}
