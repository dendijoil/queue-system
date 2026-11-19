# ADR-001: Realtime memakai WebSocket native, bukan Socket.IO

- Status: Accepted
- Tanggal: 2026-11-18
- Pengambil keputusan: Dendi

## Konteks

Engine dipakai oleh aplikasi bawaan (kiosk, loket, display, admin) **dan** oleh sistem lain milik tenant: SIMRS, aplikasi booking, aplikasi mobile, bot WhatsApp, signage pihak ketiga. Sistem-sistem itu dibangun dengan bahasa yang berbeda-beda (PHP, Java, Go, .NET, JS). Semua butuh menerima perubahan status tiket kurang dari 1 detik setelah terjadi.

## Opsi

1. **Socket.IO.** Room, reconnect, dan fallback sudah tersedia. Tetapi Socket.IO memakai protokol sendiri di atas WebSocket, jadi klien wajib memakai library Socket.IO. Library resmi untuk bahasa non-JS terbatas dan versinya harus cocok dengan server.
2. **WebSocket native (RFC 6455) + protokol JSON sendiri.** Bisa dipakai dari bahasa apa pun dengan library WebSocket standar. Room, resume, dan heartbeat harus kita buat sendiri.
3. **Server-Sent Events (SSE) saja.** Sederhana, lewat HTTP biasa, mudah melewati proxy. Hanya satu arah, dan subscribe/unsubscribe harus lewat request terpisah.
4. **MQTT.** Cocok untuk perangkat IoT, tetapi butuh broker tambahan dan asing bagi kebanyakan developer web.

## Keputusan

Opsi 2: WebSocket native dengan `@fastify/websocket` (`ws`), ditambah SSE sebagai fallback untuk jaringan yang memblokir WebSocket.

- Perintah tetap lewat REST. WebSocket hanya untuk event keluar, sehingga validasi dan idempotensi ada di satu tempat.
- Protokol JSON yang kita definisikan: `subscribe`, `unsubscribe`, `ping`/`pong`, `event`, `error`, dengan `seq` untuk resume (detail di spek, Bagian C).
- Event antar instance API disebar lewat Redis pub/sub.

## Konsekuensi

- Integrator bahasa apa pun bisa tersambung tanpa library khusus.
- Kita harus membangun dan menguji sendiri: reconnect + resume, heartbeat, backpressure, kode tutup. SDK JS (`@antrian/sdk`) membungkus ini untuk klien JS.
- Aplikasi bawaan memakai protokol yang sama dengan integrator, sehingga protokolnya teruji setiap hari.
