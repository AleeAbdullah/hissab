# Hissab

Hissab is a mobile app for tracking shared expenses and manual personal finances. It records who paid, who owes, and how people settle; it does not hold or transfer money.

The repository contains an Expo mobile app and a NestJS API. The API implements authentication, profiles, sessions, connections and blocks, equal-privilege groups and invitations, immutable shared expenses, computed balances, external settlements, activity, notifications, manual reminders, realtime invalidation, Expo push delivery, manual personal finance, account export, and account deletion. Receipt attachments and password-reset email delivery are intentionally deferred.

## Repository

```text
code/
  be/       NestJS API and PostgreSQL schema
  fe/       Expo mobile application
mockups/    HTML visual references and their variant builders
AGENTS.md   Product, architecture, and implementation contract
```

`AGENTS.md` is the persistent source of truth for contributors and AI coding sessions. The mockups express visual intent; code and API contracts define current runtime behavior.

## Requirements

- Node.js 20+
- pnpm 10+
- PostgreSQL 14+
- Xcode or Android Studio for native development

## Backend

```bash
cd code/be
pnpm install
cp .env.example .env
docker run --name hissab-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hissab \
  -p 5433:5432 \
  -v hissab-postgres-data:/var/lib/postgresql/data \
  -d postgres:14
pnpm db:migrate
pnpm start:dev
```

- Health: `http://localhost:3000/health/live` and `/health/ready`
- Swagger: `http://localhost:3000/docs`
- OpenAPI: `http://localhost:3000/docs/openapi.json`

### Implemented API

All authenticated mutations require an `Idempotency-Key` header. Money is sent as a currency-neutral integer minor-unit string. Each user selects one of `PKR`, `USD`, `GBP`, `EUR`, `AED`, or `SAR` in Settings only to choose the symbol displayed by their frontend; that preference never changes, converts, or scopes financial records.

| Area             | Routes                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Home             | `/v1/home`                                                                                                                 |
| Groups           | `/v1/groups`, `/v1/groups/:groupId`, membership and invitation routes, leave, and archive                                  |
| Shared expenses  | `/v1/shared-expense-categories`, `/v1/ledgers/:ledgerId/expenses`, `/v1/expenses/:expenseId`                               |
| Balances         | `/v1/balances`, `/v1/ledgers/:ledgerId/balances`                                                                           |
| Settlements      | `/v1/ledgers/:ledgerId/settlements`, `/v1/settlements/:settlementId`                                                       |
| Personal finance | `/v1/personal/categories`, `/v1/personal/transactions`, `/v1/personal/transactions/:transactionId`, `/v1/personal/reports` |
| Activity         | `/v1/activity`                                                                                                             |
| Notifications    | `/v1/notifications`, `/v1/notification-preferences`, `/v1/notification-devices`                                            |
| Reminders        | `/v1/ledgers/:ledgerId/reminders`                                                                                          |
| Account data     | `/v1/account/export`, `/v1/account/deletion`                                                                               |

Expense, settlement, and personal-transaction edits use optimistic `expectedVersion` values and immutable replacement history. Deletions create auditable tombstones. Settlement records describe external payments; Hissab never moves money.

Personal reports default to the user's saved owed-share mode, can switch to cash out of pocket, combine manual transactions with shared-expense allocations, exclude settlements, and group calendar periods in the user's saved timezone.

The generated OpenAPI document is the authoritative route and request contract. `code/be/bruno/` contains matching requests for manual API verification; select its `Local` environment and populate the access token and resource IDs.

Run durable notification and Expo push delivery in a separate process with `OUTBOX_ENABLED=true pnpm start:worker:dev`. Expo push is disabled by default; set `EXPO_PUSH_ENABLED=true` and, when enhanced Expo push security is enabled for the project, set `EXPO_PUSH_ACCESS_TOKEN`.

Realtime clients connect to the Socket.IO `/events` namespace with websocket transport and an access token in `auth.accessToken`. The server emits `invalidate` metadata; if its database listener drops, it emits `resync` and disconnects sockets so reconnecting clients refetch authoritative HTTP data. Realtime delivery has no replay buffer.

Manual balance reminders require the sender to have a positive balance and the recipient a negative balance in the same active ledger. The same sender-recipient-ledger tuple has a rolling 24-hour cooldown.

Account export downloads a versioned JSON snapshot without session secrets, device tokens, IP addresses, outbox events, idempotency records, or other users' email addresses. Account deletion requires the current password, exact `DELETE` confirmation, and an idempotency key. It is blocked by any nonzero ledger balance or active group membership; successful deletion immediately revokes sessions and anonymizes personal data while retaining the immutable financial audit trail.

### Reconciliation

Operators can audit immutable financial history and account lifecycle state directly against PostgreSQL:

```bash
cd code/be
pnpm reconcile
pnpm reconcile -- --json
```

The command uses one repeatable-read, read-only snapshot and never repairs data. It exits `0` when clean, `1` when it finds invariant violations, and `2` for configuration, connection, or query failures. Human and JSON output include at most 20 UUID-only samples per check; run it with a database credential limited to read access where practical.

Useful checks:

```bash
pnpm format
pnpm verify
pnpm db:generate
pnpm db:check
pnpm db:studio
```

## Mobile app

```bash
cd code/fe
pnpm install
pnpm api:generate
pnpm start
```

The default API URL is `127.0.0.1:3000` on iOS and `10.0.2.2:3000` on Android. Set `EXPO_PUBLIC_API_URL` to override it.

Useful checks:

```bash
pnpm type-check
pnpm lint
pnpm check:refresh
```

Open `mockups/00-index.html` to browse the visual reference screens. Rebuild them with `python3 mockups/_build/build.py`.
