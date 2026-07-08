import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before creating Prisma Client.");
}

const adapter = new PrismaPg({ connectionString });
const clientCacheKey = Object.keys(Prisma.ModelName).sort().join("|");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClientCacheKey?: string;
};

export const prisma =
  globalForPrisma.prismaClientCacheKey === clientCacheKey
    ? (globalForPrisma.prisma ?? new PrismaClient({ adapter }))
    : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientCacheKey = clientCacheKey;
}
