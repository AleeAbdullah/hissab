# Async UI State Standard

Use this standard for loading, refreshing, empty, error, offline, permission-denied, disabled, conflict, and retry UI.

## State Separation

- Distinguish session hydration from signed-out state, initial query loading from valid empty data, background refetch from initial loading, and request failure from absence.
- Never show an empty state while the initial query is unresolved.
- Keep existing content visible during background refresh when safe; use pull-to-refresh through the query refetch path where the screen supports it.
- A cached read is not proof of freshness. Show honest offline/stale treatment when current data matters.

## Loading And Mutations

- Use the shared `Loading` treatment for full-screen gates and proportionate local progress for contained sections.
- Disable conflicting actions while a mutation is pending. Keep button labels or progress understandable and prevent duplicate submission.
- Preserve form and draft data after recoverable network or validation failures.
- Await required query invalidation before navigating away when the destination depends on refreshed state.

## Empty, Error, And Recovery

- Use shared `Notice` and `ErrorMessage` primitives before inventing a new alert card.
- Write distinct empty and error copy. Offer a retry through the relevant query or mutation when recovery is possible.
- Surface optimistic-version conflicts as stale data with a refetch/retry path; do not present them as a generic success or overwrite.
- Unimplemented modules render the truthful shared Coming Later screen. Never fabricate financial data to make a route look complete.
- Permission denial explains how to recover and does not masquerade as an empty dataset.

## Checklist

1. Session/data hydration
2. Initial loading
3. Background refresh
4. Valid empty data
5. Request or permission failure
6. Retry/recovery
7. Mutation pending and repeated taps
8. Conflict, offline/stale, success, and disabled states
