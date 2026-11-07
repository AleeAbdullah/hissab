---
name: hissab-mobile
description: Use when changing or reviewing the Tally Stick Expo frontend, especially Expo Router screens, native tabs or modals, generated API contracts, TanStack Query, authentication, local drafts or cache, realtime, notifications, financial forms, theming, or accessibility.
---

# Tally Stick Mobile

## Overview

Trace the requested behavior from its Expo Router entry through feature UI, form/domain logic, API contract, server-state cache, local recovery data, and native lifecycle. Treat running code, database constraints, and generated OpenAPI as current behavior; `AGENTS.md` defines product boundaries and target behavior; `mockups/` defines visual intent only.

Use the versions, dependencies, and commands in `code/fe/package.json`. Use `pnpm`. Preserve the existing stack unless the task requires a change.

## Always Apply

- Read `AGENTS.md` before changing behavior. Do not guess an open product-owner decision or use stale mockup copy as a business rule.
- Keep `src/app/**` route files focused on navigation and composition. Put reusable UI, API calls, validation, mapping, and domain logic in their owning feature.
- Reuse `src/components/ui*`, feature components, API helpers, query definitions, formatters, and nearby patterns before adding code.
- Use the generated client for request shapes and `src/api/contracts.ts` for frontend response contracts. Never hand-edit `src/api/generated/**`.
- Keep server state in TanStack Query, ephemeral interaction state local, secrets in Expo SecureStore, and recoverable cache/drafts user-scoped and versioned.
- Preserve currency-neutral integer minor units. Parse and calculate exact values with strings and `BigInt`, never floating point.
- Every mutation must carry an idempotency key. Financial edits must preserve optimistic versions and immutable ledger/revision behavior.
- Prefer native navigation chrome and platform-owned controls. Use the approved shared app dialog for app-owned prompts (KAN-4). Keep controls truthful, accessible, theme-aware, keyboard-safe, and usable at 200% text scaling.
- Make the smallest coherent change. Fix shared root causes at their owning boundary and avoid speculative abstractions.
- Automated test suites are intentionally absent. Use the repository checks and proportionate manual iOS/Android verification.

## Workflow

1. Start from the concrete route, feature component, API helper, or reported symptom.
2. Trace route → feature component/form → feature API → generated request type and response contract → affected queries, local data, and realtime invalidation.
3. Read the matching standards below before editing.
4. Search for callers and neighboring implementations; reuse the nearest established pattern.
5. Check the requested behavior against `AGENTS.md`, current runtime behavior, backend constraints, and generated OpenAPI. Surface conflicts instead of silently choosing.
6. Implement at the narrowest owning boundary. Regenerate API output only through `pnpm api:generate`.
7. Validate using the risk-based checklist and report exactly what ran and what remains unverified.

## Repo Landmarks

- `code/fe/src/app/`: Expo Router route groups for auth, tabs, shared detail flows, and modals.
- `code/fe/src/features/<domain>/`: feature API helpers, forms, providers, presentation logic, and feature components.
- `code/fe/src/components/ui.tsx` and `src/components/ui/`: shared primitives and accessibility behavior.
- `code/fe/src/api/generated/`: generated OpenAPI client and types; read-only.
- `code/fe/src/api/contracts.ts`: the single frontend response-contract layer.
- `code/fe/src/api/transport.ts`: base URL, authentication, refresh, request retry, errors, and idempotency keys.
- `code/fe/src/features/local-data/`: versioned, per-user query cache and drafts.
- `code/fe/src/lib/theme.ts`, `global.css`, and `tailwind.config.js`: semantic theme boundary.
- `mockups/`: visual source; Python builders are editable sources for generated mockup HTML.

Read [`references/repo-map.md`](./references/repo-map.md) when ownership or placement is unclear.

## Standards Reference Matrix

- File placement and feature boundaries: [`references/feature-boundary-standard.md`](./references/feature-boundary-standard.md)
- API, generated contracts, and TanStack Query: [`references/api-query-standard.md`](./references/api-query-standard.md)
- Type ownership: [`references/type-ownership-standard.md`](./references/type-ownership-standard.md)
- Authentication, sessions, and security: [`references/auth-security-standard.md`](./references/auth-security-standard.md)
- Local cache, drafts, and offline behavior: [`references/local-data-standard.md`](./references/local-data-standard.md)
- Forms and financial integrity: [`references/forms-financial-standard.md`](./references/forms-financial-standard.md)
- Routes, tabs, modals, and native behavior: [`references/navigation-native-standard.md`](./references/navigation-native-standard.md)
- Realtime and notifications: [`references/realtime-notifications-standard.md`](./references/realtime-notifications-standard.md)
- Loading, empty, error, and fallback UI: [`references/async-ui-state-standard.md`](./references/async-ui-state-standard.md)
- UI composition, theme, and accessibility: [`references/ui-accessibility-standard.md`](./references/ui-accessibility-standard.md)
- Validation and handoff: [`references/validation-checklist-standard.md`](./references/validation-checklist-standard.md)

## Change Impact Reminders

- API field: backend DTO/OpenAPI, generated client, `contracts.ts`, feature API, form mapper, consumers, query invalidation, local cache compatibility, activity/realtime effects.
- Financial write: membership and amount validation, integer sums, idempotency, expected version, immutable revision/posting behavior, mutation pending/error state, authoritative refetch.
- Route: route group, typed params, stack/tab registration, auth gate, back behavior, modal entry, notification/deep-link target.
- Session behavior: SecureStore, refresh lock, request retry, user-scoped cache cleanup, realtime reconnection, push-device ownership, redirect.
- Persisted data: user partition, version, expiry, hydration gate, corrupt-data fallback, logout/account-switch cleanup, sensitive-data exclusion.
- UI: semantic tokens, light/dark appearance, platform touch target, text scaling, screen-reader label/state, keyboard, empty/error/loading/disabled behavior.

## Validation

Follow [`references/validation-checklist-standard.md`](./references/validation-checklist-standard.md). Choose checks by risk instead of running commands mechanically. Never claim simulator, device, service, or manual verification that was not performed.
