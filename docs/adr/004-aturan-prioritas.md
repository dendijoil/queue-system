# ADR-004: Aturan pemanggilan tiket prioritas

- Status: Accepted
- Tanggal: 2026-11-19
- Pengambil keputusan: Dendi

## Konteks

Engine dipakai banyak jenis usaha. Masing-masing punya kelompok yang didahulukan: lansia, difabel, ibu hamil, nasabah prioritas, pasien darurat, pelanggan janji temu. Prioritas mutlak (`is_priority DESC`) membuat tiket biasa bisa tertahan tanpa batas di cabang yang ramai tiket prioritas. Aturannya harus bisa diatur di dashboard admin, bukan ditanam di kode.

## Opsi

1. **Prioritas mutlak.** Mudah dijelaskan; tiket biasa bisa tertahan tanpa batas.
2. **Batas beruntun** (maks. K tiket prioritas berturut-turut). Perlu state dan lock tambahan per layanan.
3. **Keunggulan waktu (head start).** Tiket prioritas dianggap datang X menit lebih awal. Tanpa state tambahan, dan tiket biasa paling lama tertahan X menit oleh tiket prioritas yang datang belakangan.
4. **Skor gabungan.** Paling fleksibel, sulit dijelaskan ke pelanggan dan operator.

## Keputusan

- Prioritas berbentuk **kelas prioritas** yang diatur tenant (bukan boolean). Setiap kelas punya: nama, **keunggulan waktu dalam menit**, siapa yang boleh memberikan (pelanggan di kiosk, atau hanya petugas), dan apakah perlu verifikasi petugas.
- Setiap layanan memilih strategi: **Keunggulan waktu** (default) atau **Mutlak**. Strategi Mutlak setara keunggulan waktu yang sangat besar, jadi engine cukup memakai satu mekanisme.
- Urutan memakai kolom `tickets.effective_at = queued_at − keunggulan_waktu_kelas`. Untuk tiket tanpa kelas, `effective_at = queued_at`.
- `effective_at` dihitung saat tiket masuk `WAITING` dan dihitung ulang saat transfer, dengan pengaturan layanan tujuan dan `queued_at` asli.
- Perubahan pengaturan prioritas hanya berlaku untuk tiket baru; posisi tiket yang sudah antre tidak berubah.
- Default dari template industri, mis. klinik: Darurat 60 menit, Lansia/Difabel/Ibu hamil 15 menit.

```sql
-- urutan pada call-next
ORDER BY COALESCE(cs.priority, 0) ASC, t.effective_at ASC, t.queued_at ASC
```

## Konsekuensi

- Tabel `priority_classes`; `tickets.is_priority` diganti `priority_class_id` + `effective_at`.
- Indeks `(tenant_id, branch_id, service_id, status, effective_at)`.
- Laporan menampilkan waktu tunggu per kelas prioritas, agar tenant bisa menilai apakah nilai keunggulan waktunya tepat.
