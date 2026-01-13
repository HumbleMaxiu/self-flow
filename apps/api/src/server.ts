import Fastify from "fastify";
import { z } from "zod";

import { prisma } from "@self-flow/shared";

import { registerRoutes } from "./routes";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787)
});

const env = EnvSchema.parse(process.env);

const server = Fastify({
  logger: true
});

await registerRoutes(server);

await prisma.$connect();
server.addHook("onClose", async () => {
  await prisma.$disconnect();
});

await server.listen({ port: env.PORT, host: "0.0.0.0" });
