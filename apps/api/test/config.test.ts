import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('memakai default untuk nilai opsional', () => {
    const c = loadConfig({
      DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
    });
    expect(c.PORT).toBe(3000);
    expect(c.LOG_LEVEL).toBe('info');
  });

  it('gagal dengan pesan jelas bila variabel wajib tidak ada', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });
});
