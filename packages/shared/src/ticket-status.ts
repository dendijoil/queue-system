/**
 * Siklus status tiket. Sumber kebenaran untuk transisi yang sah;
 * dipakai engine, API, dan UI. Lihat docs/PRD-dan-spesifikasi-teknis.md
 * bagian "Siklus status tiket".
 */
export const TICKET_STATUSES = [
  'RESERVED',
  'WAITING',
  'CALLED',
  'SERVING',
  'PARKED',
  'DONE',
  'NO_SHOW',
  'CANCELLED',
  'EXPIRED',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Status yang masih menunggu atau sedang diproses. */
export const ACTIVE_STATUSES = [
  'RESERVED',
  'WAITING',
  'CALLED',
  'SERVING',
  'PARKED',
] as const satisfies readonly TicketStatus[];

/** Status akhir: tiket tidak bisa berubah lagi. */
export const FINAL_STATUSES = [
  'DONE',
  'NO_SHOW',
  'CANCELLED',
  'EXPIRED',
] as const satisfies readonly TicketStatus[];

export type TicketAction =
  | 'check_in'
  | 'call'
  | 'recall'
  | 'start'
  | 'return'
  | 'park'
  | 'unpark'
  | 'complete'
  | 'transfer'
  | 'no_show'
  | 'cancel'
  | 'expire';

export const TICKET_TRANSITIONS: Readonly<
  Record<TicketAction, { readonly from: readonly TicketStatus[]; readonly to: TicketStatus }>
> = {
  check_in: { from: ['RESERVED'], to: 'WAITING' },
  call: { from: ['WAITING'], to: 'CALLED' },
  recall: { from: ['CALLED'], to: 'CALLED' },
  start: { from: ['CALLED'], to: 'SERVING' },
  return: { from: ['CALLED'], to: 'WAITING' },
  park: { from: ['CALLED', 'SERVING'], to: 'PARKED' },
  unpark: { from: ['PARKED'], to: 'CALLED' },
  complete: { from: ['SERVING'], to: 'DONE' },
  transfer: { from: ['SERVING'], to: 'WAITING' },
  no_show: { from: ['CALLED', 'PARKED'], to: 'NO_SHOW' },
  cancel: { from: ['RESERVED', 'WAITING'], to: 'CANCELLED' },
  expire: { from: ['RESERVED', 'WAITING', 'PARKED'], to: 'EXPIRED' },
};

export class InvalidTransitionError extends Error {
  readonly code = 'INVALID_TRANSITION';

  constructor(
    readonly from: TicketStatus,
    readonly action: TicketAction,
  ) {
    super(`Aksi "${action}" tidak berlaku untuk tiket berstatus ${from}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canApply(from: TicketStatus, action: TicketAction): boolean {
  return TICKET_TRANSITIONS[action].from.includes(from);
}

/** Status hasil aksi; melempar InvalidTransitionError bila tidak sah. */
export function nextStatus(from: TicketStatus, action: TicketAction): TicketStatus {
  if (!canApply(from, action)) throw new InvalidTransitionError(from, action);
  return TICKET_TRANSITIONS[action].to;
}

export function isFinal(status: TicketStatus): boolean {
  return (FINAL_STATUSES as readonly TicketStatus[]).includes(status);
}
