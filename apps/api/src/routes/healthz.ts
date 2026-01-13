import type { FastifyPluginAsync } from "fastify";

export const healthzRoutes: FastifyPluginAsync = async (server) => {
  server.get("/healthz", async () => ({ ok: true }));
};

