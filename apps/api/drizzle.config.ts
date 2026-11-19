import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// Turbo hanya meneruskan MIGRATION_DATABASE_URL (passThroughEnv di turbo.json),
// jadi untuk development lokal baca apps/api/.env langsung.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Migrasi butuh role pemilik tabel, bukan role aplikasi app_rw (ADR-002).
    url: process.env.MIGRATION_DATABASE_URL ?? 'postgres://antrian:antrian@localhost:5432/antrian',
  },
});
