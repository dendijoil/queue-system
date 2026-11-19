import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { buildServer } from './server.js';

const config = loadConfig();
const { client: sql } = createDb(config.DATABASE_URL);
const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

const app = buildServer({
  logger: { level: config.LOG_LEVEL },
  readinessChecks: {
    postgres: async () => {
      await sql`select 1`;
    },
    redis: async () => {
      await redis.ping();
    },
  },
});

async function shutdown(signal: string) {
  app.log.info({ signal }, 'menghentikan server');
  await app.close();
  await Promise.allSettled([sql.end({ timeout: 5 }), redis.quit()]);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await app.listen({ port: config.PORT, host: config.HOST });
