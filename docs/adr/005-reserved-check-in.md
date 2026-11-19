# ADR-005: Tiket remote berstatus RESERVED sampai check-in

- Status: Accepted
- Tanggal: 2026-11-19
- Pengambil keputusan: Dendi

## Konteks

Tiket bisa dibuat dari luar lokasi: lewat API oleh SIMRS, aplikasi booking, aplikasi mobile, bot WhatsApp, atau halaman web antrian online. Kalau tiket seperti itu langsung `WAITING`, loket memanggil orang yang belum datang, no-show naik, dan estimasi waktu tunggu meleset. Di sisi lain, nilai utama antrian online adalah "ambil antrian dari rumah tanpa kehilangan urutan". Kebutuhan tiap jenis usaha berbeda, jadi perilakunya harus bisa diatur.

## Opsi

1. **Langsung `WAITING`.** Sederhana; masalah di atas tetap terjadi.
2. **`RESERVED`, urutan dihitung saat check-in.** Adil bagi yang hadir, tetapi tidak ada manfaat mengambil tiket lebih awal.
3. **`RESERVED` dengan menyimpan urutan.** Tiket remote dihitung dalam posisi; `call-next` hanya memilih yang sudah hadir; saat check-in tepat waktu, urutan aslinya dipakai.

## Keputusan

Status **`RESERVED`** untuk tiket dari luar lokasi, dengan pengaturan per layanan **Tiket remote**:

| Pilihan | Perilaku |
| --- | --- |
| Tidak diizinkan | API menolak tiket remote untuk layanan ini (`409 REMOTE_NOT_ALLOWED`) |
| Simpan urutan (default) | Urutan asli dipakai bila check-in paling lambat pada perkiraan waktu dipanggil + masa tenggang (default 15 menit). Lewat dari itu, urutan dihitung dari waktu check-in |
| Urut saat check-in | Urutan selalu dihitung dari waktu check-in |

Pengaturan pendukung: masa tenggang check-in (menit), batas kedaluwarsa `RESERVED` (menit setelah perkiraan dipanggil, atau saat tutup layanan), dan apakah check-in boleh dilakukan pelanggan sendiri.

Cara check-in: scan QR tiket di kiosk; oleh petugas di aplikasi loket atau admin; lewat API `POST /v1/tickets/:id/check-in`; fase 2 otomatis berdasarkan lokasi di aplikasi mobile.

Transisi: `RESERVED → WAITING` (check-in), `RESERVED → CANCELLED`, `RESERVED → EXPIRED`. Event: `ticket.reserved`, `ticket.checked_in`.

## Konsekuensi

- Kolom `tickets.reserved_at`, `checked_in_at`.
- Posisi dan estimasi pelanggan dihitung dari tiket `WAITING` dan `RESERVED` yang masih berlaku di depannya.
- `ticket.almost_called` juga dikirim untuk tiket `RESERVED`, karena pelanggan remote paling butuh pengingat untuk berangkat.
- Laporan menambah tingkat check-in tiket remote dan selisih waktu ambil tiket ke check-in.
