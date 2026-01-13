import { createDbPool, getRuntimeEnv } from "@self-flow/shared";

const env = getRuntimeEnv();
export const dbPool = createDbPool(env.DATABASE_URL);
