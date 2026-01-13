import { z } from "zod";

const RuntimeEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .default("postgresql://self_flow:self_flow@localhost:5432/self_flow"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379)
});

export type RuntimeEnv = z.infer<typeof RuntimeEnvSchema>;

export function getRuntimeEnv(
  input: NodeJS.ProcessEnv = process.env
): RuntimeEnv {
  return RuntimeEnvSchema.parse(input);
}

