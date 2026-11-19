/**
 * Worker: akan menjalankan dispatcher outbox (ADR-003), pengiriman webhook (BullMQ),
 * job tutup layanan, tidak-hadir otomatis, dan peringatan waktu tunggu.
 * Saat ini baru kerangka proses dengan shutdown yang rapi.
 */
const log = (msg: string) => console.log(`[worker] ${new Date().toISOString()} ${msg}`);

log('berjalan; belum ada job terdaftar');
const keepAlive = setInterval(() => {}, 60_000);

function shutdown(signal: string) {
  log(`menerima ${signal}, berhenti`);
  clearInterval(keepAlive);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
