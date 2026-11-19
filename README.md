# queue-system

Queue engine antrian pelanggan yang serbaguna, multi-tenant, dan headless. Satu engine dipakai klinik, bank, kantor layanan, bengkel, atau ritel; semua aturan antrian diatur dari dashboard admin. Sistem lain tersambung lewat REST API v1, WebSocket, dan webhook.

- PRD & spesifikasi teknis: [`docs/PRD-dan-spesifikasi-teknis.md`](docs/PRD-dan-spesifikasi-teknis.md)
- Keputusan arsitektur: [`docs/adr/`](docs/adr/README.md)

> Status: **kerangka awal.** Struktur monorepo, state machine tiket, model pengaturan, skema database dengan isolasi tenant (RLS), health check API, dan SDK dasar sudah ada dan teruji. Fitur engine dikerjakan mengikuti rencana rilis di PRD.

## Struktur

```
apps/
  api/        Fastify: REST /v1, (nanti) WebSocket gateway, queue engine, skema DB + migrasi
  worker/     (nanti) dispatcher outbox, webhook, job terjadwal
  kiosk/      React + Vite, port 5173
  counter/    React + Vite, aplikasi loket, port 5174
  display/    React + Vite, layar TV, port 5175
  admin/      React + Vite, dashboard admin, port 5176
packages/
  shared/     State machine tiket, katalog event, skema pengaturan (Zod)
  sdk/        @antrian/sdk: klien REST + verifikasi webhook
infra/        docker-compose untuk PostgreSQL dan Redis lokal
docs/         PRD, ADR, diagram
```

## Prasyarat

- Node.js 24 LTS (lihat `.nvmrc`; minimal 22.12)
- pnpm 12, aktifkan lewat Corepack: `corepack enable`
- Docker Desktop, untuk PostgreSQL dan Redis lokal

## Mulai

```bash
pnpm install
cp .env.example apps/api/.env      # Windows: copy .env.example apps\api\.env
pnpm infra:up                      # PostgreSQL + Redis
pnpm build
pnpm db:migrate                    # terapkan migrasi ke database lokal
pnpm dev                           # API di :3000, aplikasi web di :5173–5176
```

Cek API: <http://localhost:3000/health> dan <http://localhost:3000/health/ready>.

## Perintah

| Perintah                            | Fungsi                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Jalankan semua app dalam mode pengembangan                                            |
| `pnpm build`                        | Build semua package dan app                                                           |
| `pnpm typecheck`                    | Pemeriksaan tipe TypeScript                                                           |
| `pnpm test`                         | Unit test + tes isolasi tenant (PostgreSQL in-process via PGlite, tidak perlu Docker) |
| `pnpm lint`                         | ESLint                                                                                |
| `pnpm format` / `pnpm format:check` | Prettier                                                                              |
| `pnpm db:generate`                  | Buat migrasi baru dari `apps/api/src/db/schema.ts`                                    |
| `pnpm db:migrate`                   | Terapkan migrasi ke `DATABASE_URL`                                                    |
| `pnpm infra:up` / `pnpm infra:down` | Nyalakan/matikan PostgreSQL dan Redis lokal                                           |

## Catatan database

- Setiap tabel milik tenant punya `tenant_id` dan kebijakan RLS `<tabel>_tenant_isolation` ([ADR-002](docs/adr/002-multi-tenant-rls.md)).
- Semua akses data dari aplikasi wajib lewat `withTenant(db, tenantId, tx => …)` di `apps/api/src/db/tenant.ts`.
- RLS dipaksa (`FORCE ROW LEVEL SECURITY`) sehingga berlaku juga untuk pemilik tabel, tetapi **tidak** untuk superuser. Di staging dan produksi, aplikasi harus tersambung dengan role tanpa `SUPERUSER`/`BYPASSRLS` (mis. `app_rw`). User `antrian` di `infra/docker-compose.dev.yml` adalah superuser, jadi isolasi tenant diuji lewat `pnpm test`, bukan lewat database lokal itu.

## CI

GitHub Actions (`.github/workflows/ci.yml`) menjalankan format check, lint, build, typecheck, dan test di setiap push ke `main` dan setiap pull request.
