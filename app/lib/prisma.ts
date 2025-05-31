import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development (hot-reload fix)
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
