# Hissab

Hissab is a mobile app for tracking shared expenses and manual personal finances. It records who paid, who owes, and how people settle; it does not hold or transfer money.

The repository contains an Expo mobile app and a NestJS API. Authentication, profiles, sessions, connection discovery, friend requests, direct connections, and blocking are implemented. Groups, expenses, balances, settlements, activity, and personal-finance reporting are under development.

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

The outbox worker can run with `OUTBOX_ENABLED=true pnpm start:worker:dev`; delivery handlers are not implemented yet.

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
