import { PrismaClient } from '@prisma/client';
import { encryptFieldsInData, decryptFieldsInResult } from './crypto-pii';

function otimizarDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes('neon.tech') && !url.hostname.includes('-pooler')) {
      url.hostname = url.hostname.replace(/^([^.]+)/, '$1-pooler');
    }
    if (url.hostname.includes('-pooler')) {
      if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');
      if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5');
      if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20');
      if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '15');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const PII_RANDOM = ['matricula'];

function createPrismaClient() {
  const pooledUrl = otimizarDatabaseUrl(process.env.DATABASE_URL);
  const baseClient = new PrismaClient({
    ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  return baseClient.$extends({
    query: {
      user: {
        async findUnique({ args, query }) {
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
        async findUniqueOrThrow({ args, query }) {
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
        async findFirst({ args, query }) {
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
        async findFirstOrThrow({ args, query }) {
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
        async findMany({ args, query }) {
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
        async create({ args, query }) {
          args.data = encryptFieldsInData(args.data, [], PII_RANDOM);
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
        async update({ args, query }) {
          args.data = encryptFieldsInData(args.data, [], PII_RANDOM);
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
        async upsert({ args, query }) {
          args.create = encryptFieldsInData(args.create, [], PII_RANDOM);
          args.update = encryptFieldsInData(args.update, [], PII_RANDOM);
          return decryptFieldsInResult(await query(args), PII_RANDOM);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

export const prisma = globalThis.prisma || createPrismaClient();

globalThis.prisma = prisma;
export default prisma;
