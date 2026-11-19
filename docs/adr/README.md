# Architecture Decision Records (ADR)

ADR mencatat **kenapa** sebuah keputusan arsitektur diambil. Kebutuhan produk (**apa** yang dibangun) ada di [`../PRD-dan-spesifikasi-teknis.md`](../PRD-dan-spesifikasi-teknis.md).

## Aturan

- Satu keputusan = satu file `NNN-judul-singkat.md`, nomor tidak pernah dipakai ulang.
- Status: **Proposed** (menunggu keputusan) → **Accepted** (berlaku) → **Superseded by ADR-NNN** (diganti) atau **Rejected**.
- ADR yang sudah Accepted tidak diedit isinya. Kalau keputusan berubah, buat ADR baru yang menggantikannya, lalu ubah status ADR lama.
- Setelah ADR Proposed menjadi Accepted, perbarui PRD/spek agar sesuai.

## Daftar

| No | Keputusan | Status | Tanggal |
| --- | --- | --- | --- |
| [001](001-websocket-native.md) | Realtime memakai WebSocket native, bukan Socket.IO | Accepted | 2026-11-18 |
| [002](002-multi-tenant-rls.md) | Multi-tenant dengan satu database + Row-Level Security | Accepted | 2026-11-19 |
| [003](003-outbox-dispatcher.md) | Event dikirim lewat transactional outbox + satu dispatcher | Accepted | 2026-11-18 |
| [004](004-aturan-prioritas.md) | Kelas prioritas dengan keunggulan waktu, bisa diatur per layanan | Accepted | 2026-11-19 |
| [005](005-reserved-check-in.md) | Tiket remote berstatus RESERVED sampai check-in | Accepted | 2026-11-19 |
| [006](006-pergantian-hari.md) | Jam pergantian hari, seri nomor, dan layanan 24 jam | Accepted | 2026-11-19 |
| [007](007-mode-darurat-offline.md) | Mode darurat saat internet cabang putus | Accepted | 2026-11-19 |

## Template

```markdown
# ADR-NNN: Judul keputusan

- Status: Proposed
- Tanggal: YYYY-MM-DD
- Pengambil keputusan: ...

## Konteks
Masalah dan batasan yang memaksa keputusan ini.

## Opsi
1. Opsi A — kelebihan / kekurangan
2. Opsi B — ...

## Keputusan
Opsi yang dipilih dan alasannya.

## Konsekuensi
Dampak positif, dampak negatif, dan pekerjaan lanjutan.
```
