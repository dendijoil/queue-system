import type { TicketStatus } from '@antrian/shared';

export interface QueueClientOptions {
  /** Alamat engine, mis. https://antrian.example.com */
  baseUrl: string;
  /** API key client app (qe_live_… atau qe_test_…). Jangan dipakai di browser. */
  apiKey: string;
  /** Implementasi fetch kustom (opsional, untuk tes atau runtime lain). */
  fetch?: typeof fetch;
}

export interface CreateTicketInput {
  branchId: string;
  serviceId: string;
  priorityClassId?: string | null;
  externalRef?: string;
  customer?: { name?: string; phone?: string };
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Ticket {
  id: string;
  displayNo: string;
  status: TicketStatus;
  position?: number;
  etaSec?: number;
  statusUrl?: string;
}

export interface RequestOptions {
  /** Wajib untuk perintah yang mengubah data; gunakan UUID baru per perintah. */
  idempotencyKey?: string;
}

export class QueueApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'QueueApiError';
  }
}

export class QueueClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: QueueClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  readonly tickets = {
    create: (input: CreateTicketInput, options: RequestOptions = {}) =>
      this.request<Ticket>('POST', '/v1/tickets', input, options),
    get: (id: string) => this.request<Ticket>('GET', `/v1/tickets/${encodeURIComponent(id)}`),
  };

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload: unknown =
      res.status === 204 ? undefined : await res.json().catch(() => undefined);
    if (!res.ok) {
      const err = (payload as { error?: { code?: string; message?: string } } | undefined)?.error;
      throw new QueueApiError(
        res.status,
        err?.code ?? 'HTTP_ERROR',
        err?.message ?? res.statusText,
      );
    }
    return payload as T;
  }
}
