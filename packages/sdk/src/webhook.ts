import { createHmac, timingSafeEqual } from 'node:crypto';

export interface VerifyWebhookOptions {
  /** Toleransi umur timestamp dalam detik (default 300). */
  toleranceSec?: number;
  /** Waktu sekarang dalam detik, untuk tes. */
  nowSec?: number;
}

/**
 * Verifikasi header `X-Queue-Signature: t=<unix>,v1=<hex>`.
 * `v1` = HMAC-SHA256(secret, `${t}.${rawBody}`). Gunakan body mentah, bukan hasil JSON.parse.
 */
export function verifyWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  secret: string,
  options: VerifyWebhookOptions = {},
): boolean {
  if (!signatureHeader) return false;

  const parts = new Map<string, string>();
  for (const piece of signatureHeader.split(',')) {
    const idx = piece.indexOf('=');
    if (idx > 0) parts.set(piece.slice(0, idx).trim(), piece.slice(idx + 1).trim());
  }

  const t = Number(parts.get('t'));
  const v1 = parts.get('v1');
  if (!Number.isFinite(t) || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;

  const now = options.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > (options.toleranceSec ?? 300)) return false;

  const expected = createHmac('sha256', secret).update(`${t}.`).update(rawBody).digest();
  const received = Buffer.from(v1, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Buat header tanda tangan (dipakai engine dan untuk tes). */
export function signWebhook(rawBody: string, secret: string, timestampSec: number): string {
  const v1 = createHmac('sha256', secret).update(`${timestampSec}.${rawBody}`).digest('hex');
  return `t=${timestampSec},v1=${v1}`;
}
