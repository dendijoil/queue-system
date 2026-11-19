import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TenantTx = PgTransaction<PgQueryResultHKT, any>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Jalankan `fn` dalam transaksi yang terikat ke satu tenant (ADR-002).
 * set_config(..., true) setara SET LOCAL: berlaku hanya di transaksi ini,
 * jadi aman dipakai dengan connection pool.
 */
export async function withTenant<T>(
  db: AnyPgDatabase,
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) throw new Error('tenantId harus UUID');
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx as TenantTx);
  });
}
