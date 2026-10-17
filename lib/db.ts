import "server-only";
import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: hot-reload re-evaluates this module
// on every edit, which would otherwise open a fresh pool of DB connections
// each time and exhaust them.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
