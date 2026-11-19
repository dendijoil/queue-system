export interface DbRole {
  name: string;
  superuser: boolean;
  bypassRls: boolean;
}

/** Menjalankan SQL mentah dan mengembalikan baris hasilnya; dibuat generik agar bisa diuji dengan PGlite. */
export type RawQuery = (sql: string) => Promise<Record<string, unknown>[]>;

const CURRENT_ROLE_SQL = `
  select rolname as name, rolsuper as superuser, rolbypassrls as bypass_rls
  from pg_roles
  where rolname = current_user
`;

export async function readDbRole(query: RawQuery): Promise<DbRole> {
  const [row] = await query(CURRENT_ROLE_SQL);
  if (!row) throw new Error('Tidak bisa membaca role database yang sedang dipakai');
  return {
    name: String(row.name),
    superuser: row.superuser === true,
    bypassRls: row.bypass_rls === true,
  };
}

/**
 * Tolak start bila role database bisa melewati RLS (ADR-002).
 * Superuser dan role dengan BYPASSRLS mengabaikan semua kebijakan RLS,
 * sehingga isolasi tenant hanya bergantung pada kode.
 */
export function assertRlsEnforced(role: DbRole): void {
  if (!role.superuser && !role.bypassRls) return;
  const reason = role.superuser ? 'adalah superuser' : 'punya atribut BYPASSRLS';
  throw new Error(
    `Role database "${role.name}" ${reason}, sehingga RLS tidak berlaku. ` +
      'Sambungkan API dengan role aplikasi (mis. app_rw) di DATABASE_URL; ' +
      'role pemilik tabel cukup dipakai untuk migrasi lewat MIGRATION_DATABASE_URL.',
  );
}
