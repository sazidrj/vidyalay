import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export function getTenantClient(schoolId: number) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          args.where = { ...(args.where as Record<string, unknown>), schoolId }
          return query(args)
        },
        async findFirst({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          args.where = { ...(args.where as Record<string, unknown>), schoolId }
          return query(args)
        },
        async count({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          args.where = { ...(args.where as Record<string, unknown>), schoolId }
          return query(args)
        },
        async create({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          const data = args.data as Record<string, unknown>
          args.data = { ...data, schoolId }
          return query(args)
        },
      },
    },
  })
}
