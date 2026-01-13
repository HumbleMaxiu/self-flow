import type { RuntimeEnv } from "./env";

export function getRedisConnection(env: RuntimeEnv) {
  return { host: env.REDIS_HOST, port: env.REDIS_PORT };
}

