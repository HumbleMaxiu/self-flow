import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { createRun, getRun, listRuns } from "../services/runs";

export const runsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/runs", async () => {
    const runs = await listRuns();
    return { runs };
  });

  server.get("/runs/:id", async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(req.params);

    const run = await getRun(id);
    if (!run) {
      return reply.code(404).send({ message: "Run not found" });
    }

    return run;
  });

  server.post("/runs", async (req, reply) => {
    const bodySchema = z
      .object({
        workflowId: z.string().min(1),
        trigger: z.enum(["manual", "cron", "api"]).default("manual"),
        input: z.record(z.string(), z.unknown()).default({})
      })
      .strict();

    const body = bodySchema.parse(req.body);
    const run = await createRun(body);
    reply.code(201);
    return run;
  });
};

