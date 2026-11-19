import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify';

export type ReadinessCheck = () => Promise<void>;

export interface BuildServerOptions {
  logger?: FastifyServerOptions['logger'];
  /** Dependensi yang wajib sehat sebelum menerima trafik, mis. postgres dan redis. */
  readinessChecks?: Record<string, ReadinessCheck>;
}

/** Format error seragam: { error: { code, message } } */
function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

export function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  const checks = options.readinessChecks ?? {};

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/health/ready', async (_req, reply) => {
    const results = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          await check();
          return [name, 'ok'] as const;
        } catch {
          return [name, 'fail'] as const;
        }
      }),
    );
    const failed = results.some(([, state]) => state === 'fail');
    return reply
      .code(failed ? 503 : 200)
      .send({ status: failed ? 'unavailable' : 'ok', checks: Object.fromEntries(results) });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send(errorBody('NOT_FOUND', `Route ${req.method} ${req.url} tidak ditemukan`));
  });

  app.setErrorHandler<FastifyError>((err, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    reply
      .code(status)
      .send(
        errorBody(
          err.code ?? (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST'),
          status >= 500 ? 'Terjadi kesalahan pada server' : err.message,
        ),
      );
  });

  return app;
}
