import type { FastifyInstance } from "fastify";

import { healthzRoutes } from "./healthz";
import { runsRoutes } from "./runs";

export async function registerRoutes(server: FastifyInstance) {
  await server.register(healthzRoutes);
  await server.register(runsRoutes, { prefix: "/api" });
}

