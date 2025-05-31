import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Define a type for the global Prisma client to enable proper type checking
const globalForPrisma = global as unknown as { 
  prisma: ReturnType<typeof createPrismaClient> 
}

/**
 * Create a Prisma client with Accelerate enabled
 * This function allows us to create a consistent client with proper configurations
 */
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  return client.$extends(withAccelerate())
}

// Export a singleton instance of Prisma Client
export const prisma = globalForPrisma.prisma || createPrismaClient()

// In development, attach to global to prevent connection churn
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
