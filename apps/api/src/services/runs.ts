import { randomUUID } from "node:crypto";

import { Queue } from "bullmq";
import { z } from "zod";

import { Prisma, getRedisConnection, getRuntimeEnv, prisma } from "@self-flow/shared";

const RunCreateInputSchema = z.object({
  workflowId: z.string().min(1),
  trigger: z.enum(["manual", "cron", "api"]),
  input: z.record(z.string(), z.unknown())
});

export type RunCreateInput = z.infer<typeof RunCreateInputSchema>;

const env = getRuntimeEnv();
const runsQueue = new Queue("runs", { connection: getRedisConnection(env) });

type RunListModel = {
  id: string;
  workflowId: string;
  trigger: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

type RunModel = RunListModel & {
  input: unknown;
  error: unknown | null;
};

type RunStepModel = {
  id: string;
  runId: string;
  name: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: unknown | null;
};

type ArtifactModel = {
  id: string;
  runId: string;
  stepId: string | null;
  kind: string;
  payload: unknown;
  createdAt: Date;
};

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

  return (runs as RunListModel[]).map((run: RunListModel) => ({
    id: run.id,
    workflow_id: run.workflowId,
    trigger: run.trigger,
    status: run.status,
    created_at: run.createdAt,
    started_at: run.startedAt,
    finished_at: run.finishedAt
  }));
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

  const sortedSteps = (steps as RunStepModel[]).slice().sort((a: RunStepModel, b: RunStepModel) => {
    if (!a.startedAt && !b.startedAt) return a.id.localeCompare(b.id);
    if (!a.startedAt) return 1;
    if (!b.startedAt) return -1;
    const delta = a.startedAt.getTime() - b.startedAt.getTime();
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });

  return {
    run: {
      id: (run as RunModel).id,
      workflow_id: (run as RunModel).workflowId,
      trigger: (run as RunModel).trigger,
      status: (run as RunModel).status,
      input: (run as RunModel).input,
      created_at: (run as RunModel).createdAt,
      started_at: (run as RunModel).startedAt,
      finished_at: (run as RunModel).finishedAt,
      error: (run as RunModel).error
    },
    steps: sortedSteps.map((step: RunStepModel) => ({
      id: step.id,
      run_id: step.runId,
      name: step.name,
      status: step.status,
      started_at: step.startedAt,
      finished_at: step.finishedAt,
      error: step.error
    })),
    artifacts: (artifacts as ArtifactModel[]).map((artifact: ArtifactModel) => ({
      id: artifact.id,
      run_id: artifact.runId,
      step_id: artifact.stepId,
      kind: artifact.kind,
      payload: artifact.payload,
      created_at: artifact.createdAt
    }))
  };
}
