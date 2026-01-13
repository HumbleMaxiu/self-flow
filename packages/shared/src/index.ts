export type Brand<T, B extends string> = T & { readonly __brand: B };

export { createDbPool, ensureDbSchema } from "./platform/db";
export { getRuntimeEnv } from "./platform/env";
export { getRedisConnection } from "./platform/redis";
