import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

describe('health endpoints', () => {
  let app: ReturnType<typeof buildServer>;
  afterEach(() => app.close());

  it('GET /health selalu ok', async () => {
    app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /health/ready 503 bila ada dependensi gagal', async () => {
    app = buildServer({
      readinessChecks: {
        postgres: async () => {},
        redis: async () => {
          throw new Error('down');
        },
      },
    });
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({
      status: 'unavailable',
      checks: { postgres: 'ok', redis: 'fail' },
    });
  });

  it('route tidak dikenal memakai format error seragam', async () => {
    app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
