# Forms And Financial Integrity Standard

Use this standard for shared expenses, settlements, personal transactions, money input, dates, categories, allocations, edits, deletion, or financial warnings.

## Pure Form Boundary

- Keep input parsing, date normalization, initial values, allocation construction, sum checks, and request-payload mapping in the feature `form.ts` file.
- Builders return either a fully valid generated request DTO or a specific user-facing error. Editors render fields and call the builder; routes own mutation/navigation composition.
- Trim required text and remove empty optional values deliberately. Do not submit raw UI state when the API shape differs.
- Preserve entered values after server errors. Disable submission while pending and prevent repeated taps from creating new logical attempts.

## Exact Money

- Financial amounts are currency-neutral integer minor units. Display symbols come from the viewer's preference and never alter records.
- Parse decimal input with an explicit format and convert using strings/`BigInt`. Never use floating-point arithmetic or silently round invalid precision.
- Require positive totals and positive selected allocations. Omit zero allocations.
- Payer allocations and participant allocations must each sum exactly to the total before submission.
- Equal-split remainder assignment and all authoritative financial validation remain server responsibilities; the client may preview but cannot weaken them.

## Immutable Writes

- Every mutation sends one idempotency key for the logical attempt.
- Replacement and tombstone requests include the latest `expectedVersion`. Surface `409`/stale-version conflicts and refetch; never overwrite silently.
- A financial record's ledger/context remains immutable across revisions. Do not convert shared records into personal records or vice versa.
- Only approved actors may see edit/delete controls, but UI hiding never replaces backend authorization.
- After success, invalidate detail, ledger activity, balances, home/report summaries, and other affected authoritative queries.

## UX Rules

- Use the approved fixed category lists. Do not add custom, percentage, or share-based split UI without product approval.
- Use the shared Hissab dialog for destructive confirmations and app-owned overpayment warnings (KAN-4). Cancel/Back must preserve entered values and drafts. The backend accepts settlement credit without a confirmation flag.
- Duplicate personal-transaction warnings are an app concern, but the heuristic is an open decision: do not invent one.
- Dates and reports use the user's stored timezone. Do not infer timezone-sensitive grouping from device formatting alone when the API owns it.

## Change Checklist

1. Generated DTO and response contract
2. Parser/builder and initial values
3. Exact amount and allocation invariants
4. Category/context rules
5. Idempotency and expected version
6. Pending, warning, error, conflict, success, and discard states
7. Query invalidation and draft cleanup
8. Focused assertion check for non-trivial pure logic
