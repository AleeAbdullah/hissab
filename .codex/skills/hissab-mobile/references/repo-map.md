# Tally Stick Mobile Repo Map

Use `code/fe/package.json`, configuration, and current code as the source of truth for versions, dependencies, and scripts. The frontend uses `pnpm`, Expo Router, strict TypeScript, NativeWind, TanStack Query, generated OpenAPI code, Expo SecureStore, and Socket.IO.

## Core Layout

- `code/fe/src/app/`: route composition only. `(auth)` owns unauthenticated screens, `(tabs)` owns the five tab roots and their stacks, `(shared)` owns cross-tab financial detail routes, and `(modals)` owns modal workflows.
- `code/fe/src/features/<domain>/`: domain API helpers, form builders, presentation functions, providers, drafts, and feature components.
- `code/fe/src/components/ui.tsx`: shared screen, card, row, field, notice, loading, and error primitives.
- `code/fe/src/components/ui/`: lower-level button, text, select, checkbox, radio, label, icon, and animation primitives.
- `code/fe/src/api/generated/`: output from `openapi-ts.config.ts`; never edit it manually.
- `code/fe/src/api/contracts.ts`: canonical frontend response contracts. Do not create a second DTO layer.
- `code/fe/src/api/transport.ts`: API URL, auth header, refresh retry, error normalization, and idempotency-key generation.
- `code/fe/src/api/session-store.ts`: in-memory session snapshot backed only by SecureStore.
- `code/fe/src/api/query-client.ts`: global TanStack Query policy.
- `code/fe/src/features/local-data/`: optional per-user persisted query reads and drafts.
- `code/fe/src/features/realtime/provider.tsx`: authenticated Socket.IO invalidation transport.
- `code/fe/src/lib/theme.ts`, `global.css`, `tailwind.config.js`: semantic color/token bridge.
- `code/fe/scripts/check-*.mjs`: small Node assertion checks for important pure or concurrency logic.
- `mockups/_build/`: editable Python builders for visual reference output.

## Ownership Rules

- Shared modules must not depend on route-private code.
- Keep one-screen helpers local until reuse is real; move them into the owning feature when multiple routes need them.
- Keep server state in feature API/query definitions, transient state near the component, and cross-screen draft state in an existing provider or user-scoped persistence only when required.
- Import generated request types from `src/api/generated/types.gen.ts` and response/domain contracts from `src/api/contracts.ts`.
- Do not add barrels, aliases, stores, providers, or wrapper hooks solely to shorten imports.

## Common Traces

- Screen data: route → `features/<domain>/api.ts` query definition → generated SDK call → `request()` → `contracts.ts` response type.
- Financial form: modal/edit route → feature editor → feature `form.ts` pure builder → feature API mutation → affected query invalidations.
- Authentication: auth screen → `features/auth/api.ts` → transport/session store → `SessionProvider` → route redirect and user-scoped cache lifecycle.
- Realtime: session token → `RealtimeProvider` socket → invalidation → TanStack Query authoritative refetch.
- Local recovery: authenticated user ID → cache/draft key → versioned file in Expo document storage → hydration gate → cleanup on identity change.

## Implementation Principles

- Make the smallest coherent change within the existing owner.
- Split files only when scanability, reuse, or lifecycle isolation materially improves.
- Prefer pure named parsers, mappers, formatters, and validators for meaningful transformations.
- Keep platform and network side effects at explicit boundaries with cleanup.
