# Local Data And Offline Standard

Use this standard for persisted query reads, form drafts, filesystem data, hydration, logout cleanup, or offline behavior.

## Ownership And Isolation

- `features/local-data/store.ts` owns versioned file envelopes under the Expo document directory.
- Partition every cached value and draft by authenticated user ID. Encode user IDs and keys before using them as path segments.
- Clear the previous user's directory on logout or identity change. Recheck the active session before delayed writes.
- Persist only explicitly approved, non-secret query roots. Tokens, credentials, device tokens, idempotency data, and sensitive transient responses never enter the cache.

## Cache Behavior

- The persisted TanStack Query cache is a recovery/read optimization, not a second source of truth.
- Hydrate before rendering authenticated consumers, then refetch according to query policy.
- Store a cache timestamp and reject expired snapshots. Ignore incompatible or corrupt versions safely.
- Clear the in-memory query client when the authenticated user changes so records cannot cross accounts.
- Debounce writes, cancel timers on cleanup, and flush only when the active identity still matches.

## Draft Behavior

- Use stable, domain-scoped draft keys containing the immutable owner, such as a ledger ID.
- Save user-entered form values, not authoritative balances or derived server records.
- Preserve drafts across recoverable navigation/app interruptions. Within an active session, clear only after successful submission or explicit discard confirmation through the shared app dialog. Session cleanup follows the [authentication standard](auth-security-standard.md).
- A full disk, corrupt file, or unavailable recovery store must not block the core online flow.

## Offline Boundary

- Cached reads may be shown only with honest stale/offline behavior when freshness matters.
- Financial writes require a network connection. Never queue automatic expense, settlement, or personal-transaction mutations.
- Do not invent conflict reconciliation. Add queued writes only after product rules define idempotency, ordering, expiry, and user-visible conflict resolution.

## Change Checklist

1. User partition and key stability
2. Data version and expiry
3. Hydration gate
4. Corrupt/full-disk fallback
5. Timer/subscription cleanup
6. Logout/account-switch clearing
7. Secret and sensitive-data exclusion
