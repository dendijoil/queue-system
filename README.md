<div align="center">

# queue-system

**A headless, multi-tenant customer queue engine with a realtime integration API.**

One engine for clinics, hospitals, banks, public service offices, workshops, and retail.<br>
Every queue rule, label, layout, and voice announcement is configured from the admin dashboard, with no code changes.

[![CI](https://github.com/dendijoil/queue-system/actions/workflows/ci.yml/badge.svg)](https://github.com/dendijoil/queue-system/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node-24%20LTS-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RLS-4169E1?logo=postgresql&logoColor=white)

[Overview](#overview) ·
[Architecture](#architecture) ·
[Getting started](#getting-started) ·
[Integration API](#integration-api) ·
[Documentation](#documentation)

</div>

> [!NOTE]
> **Status: early foundation.** The monorepo, the ticket state machine, the settings model, the database schema with tenant isolation (RLS), the API health checks, and the base SDK are in place and tested. The engine features are being built according to the release plan in the [PRD](docs/PRD-dan-spesifikasi-teknis.md#rencana-rilis).

## Overview

queue-system is a **queue engine first and an app second**. Everything goes through one public API: issuing tickets, calling the next customer, tracking status, and reporting. The built-in kiosk, counter, display, and admin apps are simply its first clients. Other systems use the same engine: hospital information systems, booking apps, mobile apps, WhatsApp bots, and third-party signage.

The engine guarantees that:

- **A ticket is called by exactly one counter**, even when several counters press _Call next_ at the same time (`FOR UPDATE SKIP LOCKED`).
- **Ordering is fair.** Tickets go FIFO, plus priority classes that get a configurable head start ([ADR-004](docs/adr/004-aturan-prioritas.md)).
- **Every state change is published in realtime** over WebSocket and webhooks, and no event is lost even if the API crashes right after a commit ([ADR-003](docs/adr/003-outbox-dispatcher.md)).
- **Tenants are fully isolated**, both in application code and by PostgreSQL Row-Level Security ([ADR-002](docs/adr/002-multi-tenant-rls.md)).

### Key features

| Area                   | What it does                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ticketing**          | Atomic numbering per service, configurable number formats, daily quotas, service hours, holidays, and a configurable day rollover ([ADR-006](docs/adr/006-pergantian-hari.md)) |
| **Counter operations** | Call next, call a specific ticket, recall, start, complete, no-show, park/unpark, return, and transfer to another service, counter, or staff member                            |
| **Remote tickets**     | Tickets taken from outside the branch stay `RESERVED` until the customer checks in ([ADR-005](docs/adr/005-reserved-check-in.md))                                              |
| **Wait estimates**     | Per-service EWMA of service time, divided across the counters that are currently open                                                                                          |
| **Multi-tenancy**      | Platform → Tenant → Branch → Service/Counter, with per-plan quotas so that one tenant cannot slow down another                                                                 |
| **Configuration**      | Layered settings (system default → industry template → tenant → branch → service) with change history, rollback, and live propagation in ≤ 5 s                                 |
| **Integration**        | REST API v1 (OpenAPI 3.1), WebSocket stream with replay, signed webhooks with retries, and a TypeScript SDK                                                                    |
| **Devices**            | Kiosk with thermal ticket printing, TV displays with recorded voice announcements, heartbeats, and remote commands                                                             |
| **Resilience**         | An emergency mode for when a branch loses its internet connection ([ADR-007](docs/adr/007-mode-darurat-offline.md))                                                            |

### Industry templates

New tenants pick a template that pre-fills labels, sample services, priority classes, and defaults. Everything in it can be edited afterwards.

| Template                  | Counter label    | Sample services                                |
| ------------------------- | ---------------- | ---------------------------------------------- |
| Clinic / hospital         | Clinic, Room     | Registration, General clinic, Dental, Pharmacy |
| Bank / finance            | Teller, CS       | Teller, Customer service, Loans                |
| Public service office     | Counter          | Registration, Document pickup, Information     |
| Workshop / service center | Desk, Bay        | Light service, Heavy service, Warranty claim   |
| Retail / pickup           | Cashier, Counter | Order pickup, Returns                          |
| General                   | Counter          | Service A                                      |

## Architecture

Every client, whether built-in or external, talks to the same API. **Commands go in through REST `/v1`. Changes come out through WebSocket and webhooks.** PostgreSQL is the single source of truth, and events are published only by the dispatcher, after the transaction has committed.

![Architecture](docs/diagrams/arsitektur.png)

### Ticket lifecycle

`RESERVED` · `WAITING` · `CALLED` · `SERVING` · `PARKED` → `DONE` · `NO_SHOW` · `CANCELLED` · `EXPIRED`

All transitions are defined in one place ([`packages/shared/src/ticket-status.ts`](packages/shared/src/ticket-status.ts)). Anything else is rejected with `409 INVALID_TRANSITION`.

![Ticket lifecycle](docs/diagrams/siklus-status-tiket.png)

### Tech stack

| Layer       | Choice                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Language    | TypeScript (strict) everywhere                                                                                |
| Runtime     | Node.js 24 LTS                                                                                                |
| API         | Fastify 5, with Zod for validation and contracts (OpenAPI 3.1)                                                |
| Database    | PostgreSQL 16+ with Row-Level Security, Drizzle ORM + drizzle-kit                                             |
| Realtime    | Native WebSocket (RFC 6455) with an SSE fallback, not Socket.IO ([ADR-001](docs/adr/001-websocket-native.md)) |
| Cache / bus | Redis 7: pub/sub between gateways, rate limits, and idempotency keys                                          |
| Jobs        | BullMQ (webhooks, notifications) and node-cron (end-of-day jobs)                                              |
| Frontend    | React 19 + Vite                                                                                               |
| Tests       | Vitest, with PGlite for in-process PostgreSQL                                                                 |
| Monorepo    | pnpm workspaces + Turborepo                                                                                   |
| Deployment  | Docker Compose + Caddy (HTTPS), in the cloud or on-prem                                                       |

## Project structure

```
apps/
  api/        Fastify: REST /v1, WebSocket gateway (planned), queue engine, DB schema + migrations
  worker/     Outbox dispatcher, webhook delivery, scheduled jobs (planned)
  kiosk/      React + Vite: take a ticket, print it          → :5173
  counter/    React + Vite: operator console                  → :5174
  display/    React + Vite: TV display with announcements     → :5175
  admin/      React + Vite: admin dashboard                   → :5176
packages/
  shared/     Ticket state machine, event catalog, settings schemas (Zod)
  sdk/        @antrian/sdk: REST client + webhook verification
infra/        docker-compose for local PostgreSQL and Redis
docs/         PRD & technical spec, ADRs, diagrams
```

## Getting started

### Prerequisites

- **Node.js 24 LTS** (see [`.nvmrc`](.nvmrc); minimum 22.12)
- **pnpm 12**, enabled with Corepack: `corepack enable`
- **Docker Desktop**, for local PostgreSQL and Redis

### Setup

```bash
git clone https://github.com/dendijoil/queue-system.git
cd queue-system

pnpm install
cp .env.example apps/api/.env      # Windows: copy .env.example apps\api\.env
pnpm infra:up                      # start PostgreSQL + Redis
pnpm build
pnpm db:migrate                    # apply migrations to the local database
pnpm dev                           # API on :3000, web apps on :5173–5176
```

Check that the API is up at <http://localhost:3000/health> and <http://localhost:3000/health/ready>.

### Environment variables

Set these in `apps/api/.env`:

| Variable       | Default                                             | Description                  |
| -------------- | --------------------------------------------------- | ---------------------------- |
| `PORT`         | `3000`                                              | HTTP port for the API        |
| `HOST`         | `0.0.0.0`                                           | Bind address                 |
| `LOG_LEVEL`    | `info`                                              | pino log level               |
| `DATABASE_URL` | `postgres://antrian:antrian@localhost:5432/antrian` | PostgreSQL connection string |
| `REDIS_URL`    | `redis://localhost:6379`                            | Redis connection string      |

### Scripts

| Command                             | Description                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev`                          | Run every app in development mode                                                   |
| `pnpm build`                        | Build every package and app                                                         |
| `pnpm typecheck`                    | Type-check with TypeScript                                                          |
| `pnpm test`                         | Unit tests and tenant isolation tests (in-process PostgreSQL via PGlite, no Docker) |
| `pnpm lint`                         | ESLint                                                                              |
| `pnpm format` / `pnpm format:check` | Prettier                                                                            |
| `pnpm db:generate`                  | Generate a new migration from `apps/api/src/db/schema.ts`                           |
| `pnpm db:migrate`                   | Apply migrations to `DATABASE_URL`                                                  |
| `pnpm infra:up` / `pnpm infra:down` | Start or stop local PostgreSQL and Redis                                            |

## Integration API

> [!IMPORTANT]
> The endpoints below are the **target contract** from the [technical spec](docs/PRD-dan-spesifikasi-teknis.md#bagian-c--api-integrasi). Only `/health` and `/health/ready` are live right now.

### Principles

- **API-first.** The OpenAPI 3.1 spec is generated from the Zod schemas, with interactive docs at `/docs`.
- **Versioned in the path.** Everything lives under `/v1`. Breaking changes go to `/v2`, and `/v1` stays supported for at least 12 months.
- **Write via REST, listen via stream.** Commands are idempotent REST calls. WebSocket and webhooks only carry outbound events.
- **At-least-once delivery.** Every event has a unique `id` and a monotonically increasing `seq`, so receivers can drop duplicates and restore order.
- **Language-agnostic.** Standard WebSocket with JSON messages, so PHP, Java, Go, and .NET systems need no special library.

### Authentication

Each integrating system is registered as a **client app** and gets an API key (`qe_live_…` or `qe_test_…`) with scopes such as `tickets:write`, `tickets:read`, `counters:operate`, `stream:subscribe`, and `webhooks:manage`. Send it as `Authorization: Bearer <api_key>`. Keys can be restricted to specific branches and IP addresses.

### Create a ticket

```http
POST /v1/tickets
Authorization: Bearer qe_live_xxx
Idempotency-Key: 7f3c2a1e-9b4d-4c11-8e2a-1d5f6b7c8d90
Content-Type: application/json

{
  "branchId": "br_01",
  "serviceId": "svc_general",
  "externalRef": "RM-00123",
  "customer": { "name": "Budi", "phone": "+6281234567890" }
}
```

```json
{
  "id": "tkt_01JD8XK2M4",
  "displayNo": "A-012",
  "status": "WAITING",
  "position": 5,
  "etaSec": 720,
  "statusUrl": "https://antrian.example.com/t/tkt_01JD8XK2M4"
}
```

`externalRef` is unique per client app per day, so a duplicate registration in the source system never creates two tickets.

### Realtime stream

Browsers and mobile apps never hold an API key. Their backend requests a short-lived, single-use stream token (`POST /v1/stream/tokens`) and hands it to the client:

```json
// client → server  (wss://<host>/v1/stream?token=st_…)
{ "type": "subscribe", "reqId": "1", "channels": ["branch:br_01"], "since": 10230 }

// server → client
{ "type": "subscribed", "reqId": "1", "channels": ["branch:br_01"], "lastSeq": 10235 }
{ "type": "event", "channel": "branch:br_01", "event": { "specversion": "1.0", "seq": 10231, "type": "ticket.called", "...": "..." } }
```

Events use a [CloudEvents 1.0](https://cloudevents.io/) envelope and are kept for 7 days for replay. The available channels are `branch:{id}`, `service:{id}`, `counter:{id}`, `ticket:{id}`, and `display:{id}`. The full event catalog lives in [`packages/shared/src/events.ts`](packages/shared/src/events.ts).

### Webhooks

Webhooks are signed with `X-Queue-Signature: t=<unix>,v1=<hex>`, where `v1` is `HMAC-SHA256(secret, t + "." + rawBody)`. Failed deliveries are retried after 30 s, 2 min, 10 min, 1 h, 6 h, and 24 h.

### SDK

```ts
import { QueueClient } from '@antrian/sdk';
import { verifyWebhook } from '@antrian/sdk/webhook';

const q = new QueueClient({ baseUrl: 'https://antrian.example.com', apiKey: process.env.QE_KEY! });

const ticket = await q.tickets.create(
  { branchId: 'br_01', serviceId: 'svc_general', externalRef: 'RM-00123' },
  { idempotencyKey: crypto.randomUUID() },
);
```

## Multi-tenancy and the database

- Every tenant-owned table has a `tenant_id` column and an RLS policy named `<table>_tenant_isolation` ([ADR-002](docs/adr/002-multi-tenant-rls.md)).
- All application data access **must** go through `withTenant(db, tenantId, tx => …)` in [`apps/api/src/db/tenant.ts`](apps/api/src/db/tenant.ts).
- The tenant is never read from the request body or query. It always comes from a verified identity: a JWT claim, an API key, a device token, or a stream token.
- RLS is forced (`FORCE ROW LEVEL SECURITY`), so it also applies to the table owner, but **not** to superusers. In staging and production, the app must connect with a role that has neither `SUPERUSER` nor `BYPASSRLS` (e.g. `app_rw`).

> [!WARNING]
> The `antrian` user in [`infra/docker-compose.dev.yml`](infra/docker-compose.dev.yml) is a superuser. That's why tenant isolation is verified with `pnpm test`, not against the local Docker database.

## Documentation

| Document                                                            | Contents                                                                                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [PRD & technical specification](docs/PRD-dan-spesifikasi-teknis.md) | Product requirements, data model, queue engine design, integration API, security, release plan |
| [Architecture Decision Records](docs/adr/README.md)                 | Why each key architectural decision was made                                                   |
| [Diagrams](docs/diagrams/)                                          | Architecture and ticket lifecycle                                                              |

> The PRD and ADRs are written in Indonesian.

### Architecture decisions

| ADR                                         | Decision                                                             |
| ------------------------------------------- | -------------------------------------------------------------------- |
| [001](docs/adr/001-websocket-native.md)     | Realtime uses native WebSocket, not Socket.IO                        |
| [002](docs/adr/002-multi-tenant-rls.md)     | Multi-tenancy with one shared database + Row-Level Security          |
| [003](docs/adr/003-outbox-dispatcher.md)    | Events are delivered through a transactional outbox + one dispatcher |
| [004](docs/adr/004-aturan-prioritas.md)     | Priority classes with a configurable head start per service          |
| [005](docs/adr/005-reserved-check-in.md)    | Remote tickets stay `RESERVED` until check-in                        |
| [006](docs/adr/006-pergantian-hari.md)      | Day rollover time, number series, and 24-hour services               |
| [007](docs/adr/007-mode-darurat-offline.md) | Emergency mode when a branch loses internet                          |

## Roadmap

- [ ] **0 · Foundation** _(in progress)_: monorepo ✓, DB schema with `tenant_id` + RLS ✓, `withTenant` ✓, isolation tests in CI ✓; auth, staging, and observability still to do
- [ ] **1 · Queue engine:** number series, state machine, call-next with priorities and targeted transfers, quotas and hours, outbox + dispatcher, load tests
- [ ] **2 · Integration:** REST v1 + OpenAPI, WebSocket gateway with resume, webhooks with retries, full SDK, sandbox
- [ ] **3 · Built-in clients:** kiosk + printing, counter app, display + audio, per-tenant branding
- [ ] **4 · Admin & platform dashboards:** layered settings, templates, previews, history, reports, live monitoring, 2FA, data protection
- [ ] **5 · Pilot:** penetration test, 2 real tenants, training
- [ ] **Phase 2:** self-service signup + billing, custom domains, developer portal, WhatsApp notifications, offline kiosk series

## Contributing

1. Create a branch from `main`: `git checkout -b feat/short-description`.
2. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:` …).
3. Make sure `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` passes locally.
4. Open a pull request. CI runs the same checks on every PR and on every push to `main`.

Architecture changes need a new ADR in [`docs/adr/`](docs/adr/README.md). Accepted ADRs are never edited; a new ADR supersedes the old one.

## License

No license has been chosen yet. Until one is added, all rights are reserved.
