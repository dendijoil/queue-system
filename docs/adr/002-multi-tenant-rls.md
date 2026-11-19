# ADR-002: Multi-tenant dengan satu database + Row-Level Security

- Status: Accepted
- Tanggal: 2026-11-19
- Pengambil keputusan: Dendi

## Konteks

Engine akan dipakai banyak organisasi (tenant) di satu instalasi cloud. Target MVP sekitar 50 tenant. Data satu tenant tidak boleh pernah terlihat tenant lain, tetapi biaya operasional (migrasi, backup, monitoring) harus tetap rendah untuk tim kecil.

## Opsi

1. **Satu database, satu skema, kolom `tenant_id` + PostgreSQL Row-Level Security (RLS).** Paling murah dioperasikan: satu migrasi, satu backup. Isolasi dijaga database, tetapi kesalahan konfigurasi RLS berdampak ke semua tenant.
2. **Skema per tenant.** Isolasi lebih kuat. Migrasi harus dijalankan untuk setiap skema, dan koneksi pool menjadi rumit saat tenant bertambah.
3. **Database per tenant.** Isolasi paling kuat dan tenant besar bisa dipindah sendiri. Biaya dan kerumitan operasional paling tinggi.

## Keputusan

Opsi 1 untuk MVP.

- Setiap tabel milik tenant punya `tenant_id`; RLS diaktifkan dan dipaksa (`FORCE ROW LEVEL SECURITY`) dengan kebijakan `tenant_isolation`.
- Setiap request menjalankan `SET LOCAL app.tenant_id` di awal transaksi. `SET LOCAL` (bukan `SET`) dipakai agar aman di connection pool mode transaksi.
- Di kode, semua akses data lewat `withTenant(tenantId, tx => …)`; query di luar wrapper ditolak lint rule.
- Aplikasi memakai role `app_rw` tanpa `BYPASSRLS`. Hanya role `worker` dan role migrasi yang boleh melewati RLS.
- Tenant hanya ditentukan dari identitas terverifikasi (JWT, API key, device token, stream token), tidak pernah dari input request.
- Kolom `tenants.db_shard` disiapkan agar tenant besar bisa dipindah ke database sendiri (opsi 3) tanpa mengubah API.

## Konsekuensi

- Satu kebijakan RLS yang salah bisa membocorkan data. Mitigasi: tes isolasi otomatis di CI untuk setiap endpoint (akses lintas tenant harus `404`), dan review wajib untuk migrasi yang menyentuh kebijakan RLS.
- Semua indeks dan foreign key diawali `tenant_id`, sehingga skema sedikit lebih panjang.
- Satu tenant yang sangat ramai bisa memengaruhi tenant lain. Mitigasi: kuota per paket, rate limit per tenant, dan batas konkurensi webhook per tenant.
- Restore satu tenant tidak bisa dengan restore database biasa. Perlu tool ekspor/impor per tenant (lihat spek, bagian pemulihan bencana).
