# ADR-003: Event dikirim lewat transactional outbox + satu dispatcher

- Status: Accepted
- Tanggal: 2026-11-18
- Pengambil keputusan: Dendi

## Konteks

Setiap perubahan status tiket harus sampai ke display, loket, sistem eksternal (WebSocket), dan webhook. Kalau API menyimpan ke database lalu crash sebelum mengirim event, sistem lain tidak akan tahu tiket sudah dipanggil. Klien juga butuh urutan event yang bisa diandalkan (`seq`) untuk mendeteksi event yang terlewat dan melakukan resume.

## Opsi

1. **Kirim event langsung setelah commit.** Paling sederhana, tetapi event hilang kalau proses mati di antara commit dan kirim.
2. **Transactional outbox + dispatcher.** Event ditulis ke tabel `ticket_events` dalam transaksi yang sama dengan perubahan data, lalu proses terpisah menerbitkannya. Tidak ada event yang hilang; pengiriman at-least-once.
3. **Change Data Capture (logical replication / Debezium).** Andal dan tidak mengubah kode tulis, tetapi menambah komponen berat (Kafka/Debezium) yang terlalu besar untuk skala ini.
4. **Redis Streams sebagai log event utama.** Cepat, tetapi tulis ke Postgres dan Redis tidak bisa atomik, sehingga kembali ke masalah opsi 1.

## Keputusan

Opsi 2.

1. Setiap perubahan status menulis baris ke `ticket_events` dalam transaksi yang sama.
2. Dispatcher di `apps/worker` dibangunkan `LISTEN/NOTIFY`, dengan polling 1 detik sebagai cadangan. Hanya satu dispatcher aktif, dijaga `pg_advisory_lock`; instance cadangan mengambil alih kalau yang aktif mati.
3. Dispatcher memberi `seq` saat menerbitkan, sehingga urutan `seq` sama dengan urutan kirim (urutan `id` saat insert tidak dipakai karena transaksi bisa commit tidak berurutan).
4. Event diterbitkan ke Redis pub/sub (untuk WebSocket gateway) dan antrian BullMQ (untuk webhook), lalu `dispatched_at` diisi.

## Konsekuensi

- Tidak ada event hilang; penerima harus siap menerima duplikat dan membuangnya lewat `id`.
- Jeda tambahan sekitar puluhan milidetik antara commit dan event terkirim; masih jauh di bawah target 1 detik.
- Satu dispatcher menjadi batas throughput. Untuk skala MVP ini cukup; kalau nanti kurang, dispatcher dibagi per kelompok tenant dengan `seq` per tenant.
- `ticket_events` sekaligus menjadi log audit dan sumber replay 7 hari, sehingga tabelnya perlu dipartisi per bulan dan dibersihkan sesuai retensi.
