# API And TanStack Query Standard

Use this standard for backend requests, generated OpenAPI code, response contracts, queries, mutations, pagination, errors, or cache invalidation.

## Contract Ownership

- Define backend request schemas in the backend and regenerate `src/api/generated/**` with `pnpm api:generate`.
- Never hand-edit generated files or duplicate generated request types.
- Define frontend response contracts once in `src/api/contracts.ts`; feature API helpers use those contracts at the request boundary.
- Call generated SDK functions only from feature API modules or shared transport infrastructure, not screens and presentation components.
- Route authenticated calls through `request()` and public calls through `publicRequest()` in `src/api/transport.ts`.

## Query Rules

- Export stable query option objects/functions from feature `api.ts` files. Include every ID, cursor, date range, type, category, filter, or mode that changes returned data in the query key.
- Keep query functions small, typed, and free of presentation mapping.
- Use TanStack Query for server state. Do not mirror response records into component state, context, or local persistence except for the approved dehydrated read cache.
- Distinguish initial loading, background refresh, valid empty data, and request failure in the UI.
- Pagination cursors are opaque. Pass them through unchanged and do not derive ordering assumptions from them.

## Mutation Rules

- Mutations do not retry automatically. Every write sends an `Idempotency-Key`; generate it at the API boundary for each logical mutation attempt.
- Financial replacements and tombstones send the current `expectedVersion` and surface conflicts instead of overwriting newer state.
- Disable duplicate submission while pending. Preserve form data after recoverable errors.
- After success, invalidate or update every affected authoritative query: the entity/detail, ledger/activity list, balances, home/report summaries, and notification surfaces as applicable.
- Await invalidation when navigation or draft cleanup depends on refreshed server state.
- Do not add optimistic state for financial writes unless the product explicitly requires it and rollback/conflict behavior is defined.

## Transport Rules

- Keep API URL selection, authentication, one-time refresh retry, credential clearing, and error normalization centralized in `transport.ts`.
- Preserve the single-flight refresh lock: concurrent `401` responses share one refresh attempt.
- Retry the original request at most once after refresh. A second `401` clears credentials.
- Convert backend error shapes to `ApiError` once. Screens render the normalized message and do not parse transport-specific response objects.

## Contract Change Checklist

1. Backend DTO and generated OpenAPI
2. `pnpm api:generate` output
3. `src/api/contracts.ts`
4. Feature API helper and query key
5. Pure form/payload mapper
6. All consuming screens/components
7. Invalidation, pagination, realtime, and local-cache implications
