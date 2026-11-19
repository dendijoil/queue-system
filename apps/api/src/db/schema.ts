import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { TICKET_STATUSES } from '@antrian/shared';

/**
 * Isolasi tenant (ADR-002): setiap tabel milik tenant memakai kebijakan ini.
 * Tenant aktif disetel per transaksi lewat `withTenant()` (set_config lokal).
 * Bila tenant belum disetel, tidak ada baris yang terlihat atau bisa ditulis.
 */
const currentTenant = sql`nullif(current_setting('app.tenant_id', true), '')::uuid`;
const tenantIsolation = (table: string) =>
  pgPolicy(`${table}_tenant_isolation`, {
    as: 'permissive',
    for: 'all',
    using: sql`tenant_id = ${currentTenant}`,
    withCheck: sql`tenant_id = ${currentTenant}`,
  });

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  status: text('status', { enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
    .notNull()
    .default('ACTIVE'),
  createdAt: createdAt(),
});

export const branches = pgTable(
  'branches',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    timezone: text('timezone').notNull().default('Asia/Jakarta'),
    createdAt: createdAt(),
  },
  (t) => [index('branches_tenant_idx').on(t.tenantId), tenantIsolation('branches')],
);

export const services = pgTable(
  'services',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    name: text('name').notNull(),
    code: text('code').notNull(),
    prefix: text('prefix').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    avgServiceSec: integer('avg_service_sec').notNull().default(300),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('services_branch_code_uq').on(t.tenantId, t.branchId, t.code),
    tenantIsolation('services'),
  ],
);

export const ticketSeries = pgTable(
  'ticket_series',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').primaryKey().defaultRandom(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastNumber: integer('last_number').notNull().default(0),
    isCurrent: boolean('is_current').notNull().default(true),
  },
  (t) => [
    uniqueIndex('ticket_series_one_current_uq')
      .on(t.tenantId, t.serviceId)
      .where(sql`${t.isCurrent}`),
    tenantIsolation('ticket_series'),
  ],
);

export const tickets = pgTable(
  'tickets',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    seriesId: uuid('series_id')
      .notNull()
      .references(() => ticketSeries.id),
    number: integer('number').notNull(),
    displayNo: text('display_no').notNull(),
    businessDate: date('business_date').notNull(),
    status: text('status', { enum: TICKET_STATUSES }).notNull(),
    priorityClassId: uuid('priority_class_id'),
    channel: text('channel', {
      enum: ['KIOSK', 'API', 'WEB', 'MOBILE', 'WA', 'ADMIN', 'OFFLINE'],
    }).notNull(),
    externalRef: text('external_ref'),
    counterId: uuid('counter_id'),
    targetCounterId: uuid('target_counter_id'),
    targetUserId: uuid('target_user_id'),
    queuedAt: timestamp('queued_at', { withTimezone: true }).notNull().defaultNow(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull().defaultNow(),
    reservedAt: timestamp('reserved_at', { withTimezone: true }),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    calledAt: timestamp('called_at', { withTimezone: true }),
    servingAt: timestamp('serving_at', { withTimezone: true }),
    parkedAt: timestamp('parked_at', { withTimezone: true }),
    doneAt: timestamp('done_at', { withTimezone: true }),
    callCount: integer('call_count').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('tickets_series_number_uq').on(t.tenantId, t.serviceId, t.seriesId, t.number),
    index('tickets_call_next_idx').on(t.tenantId, t.branchId, t.serviceId, t.status, t.effectiveAt),
    uniqueIndex('tickets_one_active_per_counter_uq')
      .on(t.counterId)
      .where(sql`${t.status} in ('CALLED', 'SERVING')`),
    tenantIsolation('tickets'),
  ],
);

export const ticketEvents = pgTable(
  'ticket_events',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').primaryKey().defaultRandom(),
    seq: bigint('seq', { mode: 'number' }),
    ticketId: uuid('ticket_id').references(() => tickets.id),
    type: text('type').notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    payload: jsonb('payload').notNull().default({}),
    createdAt: createdAt(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  },
  (t) => [
    index('ticket_events_undispatched_idx')
      .on(t.createdAt)
      .where(sql`${t.dispatchedAt} is null`),
    tenantIsolation('ticket_events'),
  ],
);
