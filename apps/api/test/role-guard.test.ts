import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertRlsEnforced, readDbRole, type RawQuery } from '../src/db/role-guard.js';

const pg = new PGlite();
const query: RawQuery = async (sql) => (await pg.query<Record<string, unknown>>(sql)).rows;

beforeAll(async () => {
  await pg.exec(`
    create role app_rw nologin;
    create role worker nologin bypassrls;
  `);
});

afterAll(async () => {
  await pg.close();
});

describe('guard role database (ADR-002)', () => {
  it('menolak superuser', async () => {
    await pg.exec('reset role');
    const role = await readDbRole(query);
    expect(role.superuser).toBe(true);
    expect(() => assertRlsEnforced(role)).toThrow('superuser');
  });

  it('menolak role dengan BYPASSRLS', async () => {
    await pg.exec('set role worker');
    const role = await readDbRole(query);
    expect(role).toEqual({ name: 'worker', superuser: false, bypassRls: true });
    expect(() => assertRlsEnforced(role)).toThrow('BYPASSRLS');
  });

  it('menerima role aplikasi biasa', async () => {
    await pg.exec('set role app_rw');
    const role = await readDbRole(query);
    expect(role).toEqual({ name: 'app_rw', superuser: false, bypassRls: false });
    expect(() => assertRlsEnforced(role)).not.toThrow();
  });
});
