# Hissab API

NestJS backend for Hissab. The
authoritative requirements live in
[`../../architecture/2026-07-31-expense-sharing-project-spec.md`](../../architecture/2026-07-31-expense-sharing-project-spec.md).

The Foundation phase includes the PostgreSQL schema, reversible baseline SQL,
password authentication with rotating refresh sessions, profile management,
connections and canonical direct ledgers, transactional idempotency, health
checks, and a leased transactional-outbox worker skeleton.

## Requirements

- Node.js 20 or newer
- pnpm 10
- PostgreSQL 14 or newer

## Setup

Run commands from the `code/be/` directory:

```sh
pnpm install
cp .env.example .env
docker run -d \
  --name hissab-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hissab \
  -p 5433:5432 \
  -v hissab-postgres-data:/var/lib/postgresql/data \
  postgres:16-alpine
pnpm db:migrate
pnpm start:dev
```

Use `docker stop hissab-postgres` and `docker start hissab-postgres` to stop
and restart PostgreSQL. The named volume keeps the database data.

Liveness and readiness are available at `http://localhost:3000/health/live`
and `http://localhost:3000/health/ready`.
Swagger UI is available at `http://localhost:3000/docs`, with the OpenAPI JSON
at `http://localhost:3000/docs/openapi.json`.

Run the standalone outbox worker in a second process:

```sh
OUTBOX_ENABLED=true pnpm start:worker:dev
```

The worker deliberately ships without delivery handlers in Foundation. Keep
it disabled until a later phase registers realtime, push, or email consumers.

## Quality checks

```sh
pnpm format
pnpm verify
```

## Drizzle commands

The typed schema is in `src/database/schema/`. The first migration is
`drizzle/0000_nifty_master_mold.sql`; its explicit rollback companion is
`drizzle/0000_nifty_master_mold.down.sql`.

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:studio
```

`DATABASE_URL` is required by all Drizzle commands. The rollback SQL is kept
explicit because Drizzle Kit does not provide automatic down migrations.

## API conventions

- API resources are prefixed with `/v1`; health routes are unprefixed.
- Protected routes require an access bearer token.
- Every mutation requires a 16–128 character URL-safe `Idempotency-Key`.
- Errors use a stable `{ error, requestId, timestamp }` envelope.
- Swagger is disabled by default in production and controlled by
  `SWAGGER_ENABLED` elsewhere.
