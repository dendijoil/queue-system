import { describe, expect, it } from 'vitest';
import { QueueApiError, QueueClient } from './index.js';

function fakeFetch(status: number, payload: unknown, calls: Request[] = []) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(new Request(input, init));
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

describe('QueueClient', () => {
  it('mengirim API key dan Idempotency-Key saat membuat tiket', async () => {
    const calls: Request[] = [];
    const client = new QueueClient({
      baseUrl: 'https://antrian.example.com/',
      apiKey: 'qe_test_123',
      fetch: fakeFetch(201, { id: 't1', displayNo: 'A-001', status: 'RESERVED' }, calls),
    });

    const ticket = await client.tickets.create(
      { branchId: 'br_01', serviceId: 'svc_a', externalRef: 'RM-1' },
      { idempotencyKey: 'key-1' },
    );

    expect(ticket.displayNo).toBe('A-001');
    const req = calls[0]!;
    expect(req.url).toBe('https://antrian.example.com/v1/tickets');
    expect(req.headers.get('authorization')).toBe('Bearer qe_test_123');
    expect(req.headers.get('idempotency-key')).toBe('key-1');
  });

  it('mengubah respons error menjadi QueueApiError', async () => {
    const client = new QueueClient({
      baseUrl: 'https://antrian.example.com',
      apiKey: 'k',
      fetch: fakeFetch(409, { error: { code: 'SERVICE_CLOSED', message: 'Layanan tutup' } }),
    });

    await expect(client.tickets.create({ branchId: 'b', serviceId: 's' })).rejects.toMatchObject({
      status: 409,
      code: 'SERVICE_CLOSED',
    });
    await expect(client.tickets.get('x')).rejects.toBeInstanceOf(QueueApiError);
  });
});
