import { describe, expect, it } from 'vitest';
import {
  InvalidTransitionError,
  TICKET_TRANSITIONS,
  canApply,
  isFinal,
  nextStatus,
  type TicketAction,
} from './ticket-status.js';

describe('ticket state machine', () => {
  it.each([
    ['RESERVED', 'check_in', 'WAITING'],
    ['WAITING', 'call', 'CALLED'],
    ['CALLED', 'recall', 'CALLED'],
    ['CALLED', 'start', 'SERVING'],
    ['CALLED', 'return', 'WAITING'],
    ['CALLED', 'park', 'PARKED'],
    ['SERVING', 'park', 'PARKED'],
    ['PARKED', 'unpark', 'CALLED'],
    ['SERVING', 'complete', 'DONE'],
    ['SERVING', 'transfer', 'WAITING'],
    ['CALLED', 'no_show', 'NO_SHOW'],
    ['PARKED', 'no_show', 'NO_SHOW'],
    ['RESERVED', 'cancel', 'CANCELLED'],
    ['WAITING', 'cancel', 'CANCELLED'],
    ['RESERVED', 'expire', 'EXPIRED'],
    ['WAITING', 'expire', 'EXPIRED'],
    ['PARKED', 'expire', 'EXPIRED'],
  ] as const)('%s --%s--> %s', (from, action, to) => {
    expect(nextStatus(from, action)).toBe(to);
  });

  it('menolak transisi yang tidak ada di tabel', () => {
    expect(() => nextStatus('WAITING', 'complete')).toThrow(InvalidTransitionError);
    expect(() => nextStatus('DONE', 'call')).toThrow(InvalidTransitionError);
    expect(canApply('SERVING', 'cancel')).toBe(false);
  });

  it('status akhir tidak punya transisi keluar', () => {
    for (const status of ['DONE', 'NO_SHOW', 'CANCELLED', 'EXPIRED'] as const) {
      expect(isFinal(status)).toBe(true);
      for (const action of Object.keys(TICKET_TRANSITIONS) as TicketAction[]) {
        expect(canApply(status, action)).toBe(false);
      }
    }
  });
});
