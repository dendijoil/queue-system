import { z } from 'zod';

/** Katalog event (docs: Bagian C, "Format event"). */
export const EVENT_TYPES = [
  'ticket.created',
  'ticket.reserved',
  'ticket.checked_in',
  'ticket.called',
  'ticket.recalled',
  'ticket.almost_called',
  'ticket.serving',
  'ticket.parked',
  'ticket.done',
  'ticket.no_show',
  'ticket.returned',
  'ticket.transferred',
  'ticket.cancelled',
  'ticket.expired',
  'counter.opened',
  'counter.closed',
  'counter.paused',
  'counter.resumed',
  'queue.stats',
  'queue.sla_breached',
  'device.offline',
  'device.online',
  'config.updated',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Amplop event, kompatibel CloudEvents 1.0 (JSON). */
export const eventEnvelopeSchema = z.object({
  specversion: z.literal('1.0'),
  id: z.string().min(1),
  seq: z.number().int().nonnegative(),
  type: z.enum(EVENT_TYPES),
  source: z.string().min(1),
  time: z.iso.datetime({ offset: true }),
  datacontenttype: z.literal('application/json'),
  data: z.record(z.string(), z.unknown()),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
