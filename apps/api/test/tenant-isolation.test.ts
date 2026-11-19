import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../src/db/schema.js';
import { withTenant } from '../src/db/tenant.js';

/**
 * Tes isolasi tenant (ADR-002) terhadap migrasi asli, memakai PostgreSQL in-process (PGlite).
 * Aplikasi berjalan sebagai role tanpa BYPASSRLS, sama seperti produksi.
 */
const TENANT_A = '00000000-0000-4000-8000-00000000000a';
const TENANT_B = '00000000-0000-4000-8000-00000000000b';

const pg = new PGlite();
const db = drizzle(pg, { schema });

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await pg.exec(`
    create role app_rw nologin;
    grant usage on schema public to app_rw;
    grant select, insert, update, delete on all tables in schema public to app_rw;
  `);
  await db.insert(schema.tenants).values([
    { id: TENANT_A, slug: 'tenant-a', name: 'Tenant A' },
    { id: TENANT_B, slug: 'tenant-b', name: 'Tenant B' },
  ]);
  await db.insert(schema.branches).values([
    { tenantId: TENANT_A, name: 'Cabang A' },
    { tenantId: TENANT_B, name: 'Cabang B' },
  ]);
  await pg.exec('set role app_rw');
});

afterAll(async () => {
  await pg.close();
});

describe('isolasi tenant dengan RLS', () => {
  it('hanya melihat data tenant yang aktif', async () => {
    const rows = await withTenant(db, TENANT_A, (tx) => tx.select().from(schema.branches));
    expect(rows.map((r) => r.name)).toEqual(['Cabang A']);
  });

  it('tanpa tenant aktif tidak ada data yang terlihat', async () => {
    const rows = await db.select().from(schema.branches);
    expect(rows).toHaveLength(0);
  });

  it('tidak bisa menulis data untuk tenant lain', async () => {
    await expect(
      withTenant(db, TENANT_A, (tx) =>
        tx.insert(schema.branches).values({ tenantId: TENANT_B, name: 'Susupan' }),
      ),
    ).rejects.toThrow();
  });

  it('pengaturan tenant tidak bocor ke transaksi berikutnya', async () => {
    await withTenant(db, TENANT_B, (tx) => tx.select().from(schema.branches));
    const rows = await db.select().from(schema.branches);
    expect(rows).toHaveLength(0);
  });

  it('menolak tenantId yang bukan UUID', async () => {
    await expect(withTenant(db, "x' or 1=1", async () => 1)).rejects.toThrow('UUID');
  });
});
