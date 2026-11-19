# ADR-007: Mode darurat saat internet cabang putus

- Status: Accepted
- Tanggal: 2026-11-19
- Pengambil keputusan: Dendi

## Konteks

Tenant cloud menjalankan kiosk, loket, dan display yang bergantung pada koneksi internet cabang. Kalau internet putus, pelanggan tidak bisa mengambil tiket dan loket tidak bisa memanggil. Gangguan ISP di jam layanan cukup sering, jadi perlu keputusan yang jelas.

## Opsi

1. **Prosedur manual saja.** Tanpa biaya; pengalaman pelanggan buruk dan data hilang.
2. **Jaringan cadangan di cabang** (dua ISP dengan failover, atau ISP + modem LTE). Murah dan menutup sebagian besar gangguan tanpa mengubah aplikasi.
3. **Seri nomor offline di kiosk.** Kiosk tetap mencetak tiket dari seri khusus, menyimpannya di perangkat, lalu menyinkronkan saat online.
4. **Edge node per cabang.** Bisa jalan penuh tanpa internet, tetapi ada dua sumber kebenaran, konflik sinkronisasi, dan masalah untuk integrasi yang menembak cloud.
5. **On-prem penuh untuk tenant itu.** Sudah didukung dengan image yang sama.

## Keputusan

Bertahap, tanpa edge node:

- **MVP:** jaringan cadangan menjadi bagian checklist onboarding cabang (dua jalur internet dengan failover otomatis, VLAN untuk perangkat antrian, UPS untuk router dan switch). Engine memantau heartbeat perangkat dan memberi peringatan bila cabang terputus.
- **MVP:** tampilan darurat. Saat koneksi putus lebih dari 10 detik, kiosk menampilkan pesan gangguan, loket menampilkan banner dan terus mencoba tersambung, display menampilkan "Panggilan dilakukan manual oleh petugas". Teks pesan diatur di dashboard.
- **Fase 2:** seri nomor offline di kiosk (pengaturan per layanan, default nonaktif).
  - Seri terpisah dengan penanda perangkat, mis. `A-X01`, agar tidak bentrok dengan nomor online.
  - Tiket disimpan di IndexedDB kiosk dengan id lokal unik.
  - Saat online, kiosk mengirim `POST /v1/tickets/offline-batch`; engine memasukkan tiket sebagai `WAITING` dengan `queued_at` asli dan `channel = OFFLINE`, idempoten berdasarkan id lokal.
- **On-prem** ditawarkan untuk tenant yang wajib berjalan tanpa internet.
- **Edge node ditolak** untuk saat ini karena kerumitan sinkronisasi dua arah tidak sebanding dengan manfaatnya.

## Konsekuensi

- Dokumentasi onboarding perlu checklist jaringan cabang dan contoh konfigurasi failover.
- Laporan menandai periode gangguan agar tidak merusak rata-rata waktu tunggu.
