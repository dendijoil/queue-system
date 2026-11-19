-- Role aplikasi untuk development lokal (ADR-002).
--
-- `antrian` (POSTGRES_USER, superuser) hanya dipakai untuk migrasi.
-- API tersambung sebagai `app_rw`: bukan superuser dan tanpa BYPASSRLS,
-- jadi RLS benar-benar berlaku seperti di staging dan produksi.
--
-- Postgres hanya menjalankan skrip ini saat volume data masih kosong.
-- Untuk database lama: pnpm infra:reset, lalu pnpm infra:up dan pnpm db:migrate.

CREATE ROLE app_rw LOGIN PASSWORD 'app_rw' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

GRANT CONNECT ON DATABASE antrian TO app_rw;
GRANT USAGE ON SCHEMA public TO app_rw;

-- Tabel dan sequence yang nanti dibuat migrasi (sebagai antrian) otomatis bisa dipakai app_rw.
ALTER DEFAULT PRIVILEGES FOR ROLE antrian IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE antrian IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_rw;
