import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only log queries in development — production logs would be too noisy
// and would also fail silently if the DB is unavailable.
const logConfig = process.env.NODE_ENV === 'development'
  ? (['query'] as const)
  : ([] as const)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [...logConfig],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
