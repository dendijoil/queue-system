import { z } from 'zod';
import { mergeSettingLayers } from './resolve.js';

/**
 * Pengaturan layanan beserta default (PRD: "Konfigurasi di dashboard admin" → Layanan).
 * Skema ini dipakai untuk validasi API, nilai default, dan form dashboard.
 */
export const serviceSettingsSchema = z.object({
  numberFormat: z
    .object({
      prefix: z.string().min(1).max(3).default('A'),
      digits: z.number().int().min(2).max(4).default(3),
      startAt: z.number().int().min(0).default(1),
    })
    .prefault({}),
  numberReset: z.enum(['DAILY', 'NEVER']).default('DAILY'),
  hours: z
    .object({
      mode: z.enum(['FOLLOW_BRANCH', 'CUSTOM', 'ALWAYS_OPEN']).default('FOLLOW_BRANCH'),
      stopIssuingBeforeCloseMin: z.number().int().min(0).default(0),
    })
    .prefault({}),
  dailyQuota: z.number().int().positive().nullable().default(null),
  onClose: z.enum(['EXPIRE', 'CARRY_OVER']).default('EXPIRE'),
  priorityStrategy: z.enum(['HEAD_START', 'STRICT']).default('HEAD_START'),
  remote: z
    .object({
      mode: z.enum(['DISALLOWED', 'HOLD_PLACE', 'CHECKIN_ORDER']).default('HOLD_PLACE'),
      checkinGraceMin: z.number().int().min(0).default(15),
    })
    .prefault({}),
  recall: z
    .object({
      maxCalls: z.number().int().min(1).max(10).default(3),
      minIntervalSec: z.number().int().min(0).default(30),
    })
    .prefault({}),
  autoNoShow: z
    .object({
      enabled: z.boolean().default(false),
      afterMin: z.number().int().min(1).default(5),
    })
    .prefault({}),
  startServing: z.enum(['MANUAL', 'ON_CALL']).default('MANUAL'),
  targets: z
    .object({
      waitAlertMin: z.number().int().min(1).default(15),
      serviceTargetMin: z.number().int().min(1).default(10),
    })
    .prefault({}),
  customerData: z.enum(['NONE', 'PHONE_OPTIONAL', 'PHONE_REQUIRED']).default('NONE'),
  reminderPosition: z.number().int().min(1).default(3),
});

export type ServiceSettings = z.infer<typeof serviceSettingsSchema>;
export type ServiceSettingsInput = z.input<typeof serviceSettingsSchema>;

/** Nilai efektif pengaturan layanan dari lapisan-lapisan pengaturan. */
export function resolveServiceSettings(
  ...layers: Array<Record<string, unknown> | undefined>
): ServiceSettings {
  return serviceSettingsSchema.parse(mergeSettingLayers(...layers));
}
