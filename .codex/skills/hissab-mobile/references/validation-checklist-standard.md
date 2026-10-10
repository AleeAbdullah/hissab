# Validation Checklist Standard

Choose the strongest relevant checks for the risk. Application testing is manual; the repository intentionally does not maintain a test runner or conventional test files.

## Commands

Run frontend commands from `code/fe`:

- Regenerate API code after backend/OpenAPI changes: `pnpm api:generate`
- Strict TypeScript: `pnpm type-check`
- ESLint and repository boundaries: `pnpm lint`
- Formatting check: `pnpm format:check`
- Refresh concurrency: `pnpm check:refresh`
- API error normalization: `pnpm check:api-errors`
- Balance simplification: `pnpm check:simplify`

Run `pnpm api:generate` for frontend verification when the backend contract may have changed, even if the generated diff is expected to be empty. Never hand-edit generated output.

## Runnable Check Policy

- Do not introduce Jest, Vitest, fixtures, snapshots, or a conventional test suite unless the product owner changes the repository contract.
- For new non-trivial pure parsing, branching, concurrency, money, security, or data-integrity logic, follow the existing `scripts/check-*.mjs` pattern: one small Node `assert` check and a package script.
- Trivial composition, copy, and styling changes do not need a new check.
- Temporary diagnostic files must not remain in the final diff.

## Risk-Based Selection

- Skill/docs only: skill validator, link/path inspection, and final diff review.
- Component/style/copy: type-check, lint, formatting, plus light/dark, large-text, and iOS/Android visual checks when available.
- Form/parser/money: type-check, lint, relevant `check:*` script, and manual valid/invalid/boundary inputs.
- API/contract: backend `pnpm verify`, frontend API generation, type-check, lint, and manual success/error/auth-expiry flows.
- Auth/session/local data: type-check, lint, refresh check, and manual cold start, logout, account switch, expired session, and cache isolation.
- Navigation/modal: type-check, lint, and manual iOS/Android deep navigation, back/dismiss, keyboard, and discard behavior.
- Realtime/push: type-check, lint, reconnect/invalidation checks, and physical-device permission/foreground/background/logout verification.
- Financial mutation: backend verify, API generation, type-check, lint, focused check script where applicable, and manual idempotency, stale version, repeated tap, error preservation, balance/activity refresh, and overpayment warning.

## Manual Mobile Matrix

Verify affected states on every available target:

1. iOS and Android
2. Light and dark appearance
3. Text scaling up to 200%
4. Keyboard shown, safe areas, rotation/orientation constraints, and back behavior
5. Slow network, offline, server error, and retry
6. Empty, populated, loading, refreshing, disabled, and permission-denied states
7. Repeated taps and interrupted navigation

## Reporting

- Report each command and manual flow actually performed and whether it passed.
- State why a relevant simulator, device, backend, or manual check was not run.
- Separate pre-existing failures from failures caused by the change.
- Inspect `git diff` and generated artifacts before handoff. Confirm no secrets, user data, debug logging, temporary checks, or unrelated edits remain.
