# ADR-006: Jam pergantian hari, seri nomor, dan layanan 24 jam

- Status: Accepted
- Tanggal: 2026-11-19
- Pengambil keputusan: Dendi

## Konteks

Desain awal memakai `business_date` per cabang untuk penomoran, filter `call-next`, dan laporan sekaligus, dengan job tutup hari di jam tutup cabang. Ini gagal untuk layanan 24 jam atau shift malam:

- Tiket pukul 23.55 tidak terlihat oleh `call-next` pukul 00.05 karena `business_date` sudah berganti.
- Nomor reset di tengah malam, sehingga A-001 kemarin yang masih menunggu bertabrakan dengan A-001 hari ini di layar.
- Tidak ada jam tutup, sehingga tiket tidak pernah di-expire, atau malah ter-expire saat pelanggan masih menunggu.

## Opsi

1. **Tengah malam kalender.** Masalah di atas tetap ada.
2. **Jam tutup cabang.** Tidak berlaku untuk layanan 24 jam.
3. **Pengaturan per layanan + seri nomor + pemisahan fungsi `business_date`.**

## Keputusan

Opsi 3.

- Jam layanan diatur per layanan: **ikut cabang** (default), **jadwal sendiri**, atau **24 jam**. Jam pergantian hari diatur per cabang (default `00:00`).
- `business_date` = tanggal hari layanan saat tiket dibuat. Dipakai **hanya untuk laporan dan kuota harian**.
- `call-next` dan posisi **tidak** memfilter `business_date`; tiket yang melewati pergantian hari tetap terpanggil.
- Penomoran memakai **seri** (`ticket_series`). Pada jam pergantian hari, seri baru dimulai **hanya bila** layanan tidak punya tiket aktif (`RESERVED`, `WAITING`, `CALLED`, `SERVING`, `PARKED`). Kalau masih ada, nomor dilanjutkan dan seri baru dimulai begitu antrian kosong. Pengaturan "Reset nomor": **harian** (default) atau **tidak pernah**.
- Saat layanan tutup, tiket tersisa diperlakukan sesuai pengaturan **Saat layanan tutup**: **expire** (default) atau **tetap antre** (dibawa ke hari berikutnya). Layanan 24 jam tidak pernah meng-expire tiket.

## Konsekuensi

- Unik nomor menjadi `(tenant_id, service_id, series_id, number)`.
- Indeks `call-next` tidak diawali `business_date`.
- Job tutup layanan berjalan per layanan, bukan per cabang, dan memperhitungkan kalender hari libur.
