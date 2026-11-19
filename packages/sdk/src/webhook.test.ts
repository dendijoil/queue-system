import { describe, expect, it } from 'vitest';
import { signWebhook, verifyWebhook } from './webhook.js';

const secret = 'whsec_test';
const body = JSON.stringify({ type: 'ticket.called', seq: 1 });
const now = 1_763_432_102;

describe('verifyWebhook', () => {
  it('menerima tanda tangan yang benar', () => {
    const header = signWebhook(body, secret, now);
    expect(verifyWebhook(body, header, secret, { nowSec: now })).toBe(true);
  });

  it('menolak body yang diubah', () => {
    const header = signWebhook(body, secret, now);
    expect(verifyWebhook(body + ' ', header, secret, { nowSec: now })).toBe(false);
  });

  it('menolak timestamp kedaluwarsa', () => {
    const header = signWebhook(body, secret, now - 301);
    expect(verifyWebhook(body, header, secret, { nowSec: now })).toBe(false);
  });

  it('menolak header rusak tanpa melempar error', () => {
    expect(verifyWebhook(body, undefined, secret)).toBe(false);
    expect(verifyWebhook(body, 'garbage', secret, { nowSec: now })).toBe(false);
    expect(verifyWebhook(body, `t=${now},v1=abc`, secret, { nowSec: now })).toBe(false);
  });
});
