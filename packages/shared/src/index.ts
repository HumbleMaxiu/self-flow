export type Brand<T, B extends string> = T & { readonly __brand: B };

export { prisma } from "./platform/db";
export { Prisma } from "./platform/db";
export { getRuntimeEnv } from "./platform/env";
export { getRedisConnection } from "./platform/redis";
