import Fastify from "fastify";
import { z } from "zod";

import { ensureDbSchema } from "@self-flow/shared";

import { dbPool } from "./services/db";
import { registerRoutes } from "./routes";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787)
});

const env = EnvSchema.parse(process.env);

const server = Fastify({
  logger: true
});

await registerRoutes(server);

await ensureDbSchema(dbPool);

await server.listen({ port: env.PORT, host: "0.0.0.0" });
