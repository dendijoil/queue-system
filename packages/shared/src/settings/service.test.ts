import { describe, expect, it } from 'vitest';
import { resolveServiceSettings, serviceSettingsSchema } from './service.js';

describe('service settings', () => {
  it('mengisi semua default dari objek kosong', () => {
    const s = serviceSettingsSchema.parse({});
    expect(s.numberFormat).toEqual({ prefix: 'A', digits: 3, startAt: 1 });
    expect(s.priorityStrategy).toBe('HEAD_START');
    expect(s.remote).toEqual({ mode: 'HOLD_PLACE', checkinGraceMin: 15 });
    expect(s.recall.maxCalls).toBe(3);
    expect(s.autoNoShow.enabled).toBe(false);
    expect(s.dailyQuota).toBeNull();
  });

  it('lapisan bawah menimpa lapisan atas per kunci', () => {
    const tenant = { recall: { maxCalls: 2 }, targets: { waitAlertMin: 20 } };
    const branch = { targets: { serviceTargetMin: 8 } };
    const service = { numberFormat: { prefix: 'B' }, recall: { minIntervalSec: 60 } };

    const s = resolveServiceSettings(tenant, branch, service);

    expect(s.numberFormat.prefix).toBe('B');
    expect(s.numberFormat.digits).toBe(3);
    expect(s.recall).toEqual({ maxCalls: 2, minIntervalSec: 60 });
    expect(s.targets).toEqual({ waitAlertMin: 20, serviceTargetMin: 8 });
  });

  it('nilai undefined berarti ikut lapisan di atasnya', () => {
    const s = resolveServiceSettings({ dailyQuota: 50 }, { dailyQuota: undefined });
    expect(s.dailyQuota).toBe(50);
  });

  it('menolak nilai di luar pilihan', () => {
    expect(() => resolveServiceSettings({ priorityStrategy: 'RANDOM' })).toThrow();
    expect(() => resolveServiceSettings({ numberFormat: { digits: 9 } })).toThrow();
  });
});
