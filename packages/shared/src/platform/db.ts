import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../prisma/generated/prisma/client";

import { getRuntimeEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const env = getRuntimeEnv();
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "../../prisma/generated/prisma/client";
