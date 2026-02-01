import { PrismaClient } from '@/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

// Use prisma/dev.db as per Prisma documentation
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

// Create a type for the Prisma Client instance
type PrismaClientInstance = InstanceType<typeof PrismaClient>;

declare global {
  var prismaGlobal: PrismaClientInstance | undefined;
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
