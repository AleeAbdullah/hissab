# Hissab repository contract

This file applies to the entire repository. Read it before changing product behavior, data models, API contracts, routes, or UI.

## Sources of truth

Use this precedence:

1. Running code, database constraints, and generated OpenAPI define current behavior.
2. This file defines product boundaries, target behavior, and implementation rules.
3. `mockups/` defines visual intent and state variants, not backend availability.

Do not silently resolve conflicts. Keep current behavior safe, report the conflict, and update this file only after the product owner decides. Git history contains superseded research and design documents; do not restore them as active specifications.

## Product contract

- Hissab records debts and settlements. It never holds, sends, or converts money.
- Keep exactly five tabs: Friends, Groups, Activity, Personal, Account.
- Shared and Personal are separate contexts. Shared activity must not silently become a personal transaction or vice versa.
- Never combine different currencies into one total. Show totals per currency.
- The v1 currency allowlist is PKR, USD, GBP, EUR, AED, and SAR. Reject other currencies at API and database trust boundaries.
- The target shared-expense model supports multiple payers and Equal or Exact splits only.
- Shared-expense APIs operate on both direct friend ledgers and group ledgers.
- Shared expenses use a fixed system category list in v1. User- and group-defined shared categories are out of scope.
- Shared-expense system categories are Food & Drink, Groceries, Transport, Accommodation, Utilities, Entertainment, Shopping, Healthcare, and Other.
- Every shared expense must reference one approved system category.
- Percentage and share-based splits are post-v1.
- A settlement records an external payment; it does not execute one.
- Any active ledger member may record a settlement between two active members. Only the recorder may edit or tombstone it.
- Settlement edits use optimistic versions and reversal-plus-replacement history. Ledger and currency are immutable across revisions.
- The backend accepts overpayments as credit without a confirmation gate. Overpayment warnings are an app responsibility.
- Authoritative balances are computed from immutable ledger postings, grouped by ledger, user, and currency; do not persist mutable balance projections.
- Debt simplification is read-only, optional, and scoped to one currency.
- Group types are not part of v1.
- Group invitations are in-app only and target existing Hissab users. An invited user cannot participate until they explicitly accept.
- Groups have no roles. Every active member has the same group-management privileges.
- Leaving a group and archiving a group are blocked by unsettled balances. Users cannot be removed from groups.
- Any active group member may update the group, invite users, cancel invitations, or archive a fully settled group.
- Invitees may accept or decline. A new invitation may be sent after a previous invitation reaches a terminal state.
- Groups cannot be hard-deleted. The last settled member leaving archives the group automatically.
- Personal reports default to the user's owed share. A toggle may show cash out of pocket.
- Settlements are excluded from personal income and expense reports.

## Current implementation boundary

Implemented now:

- health, authentication, users, idempotency, and an outbox skeleton;
- registration, sign-in, password reset primitives, and password change;
- profile, preferences, session listing, and session revocation;
- exact-email user discovery, friend requests, direct connections, blocking, and unblocking;
- group creation, reads, name updates, equal-privilege membership, invitations, leaving, and archival;
- fixed shared-expense categories and immutable shared expenses for direct and group ledgers;
- computed per-ledger, per-user, per-currency balance APIs and lifecycle guards;
- immutable external settlement records with reversal-based edits and tombstone deletion.

Incomplete or intentionally unavailable:

- password-reset email delivery;
- outbox delivery handlers;
- personal transactions and categories, attachments, activity queries, and notifications;
- query persistence, offline financial writes, and local SQLite drafts.

Routes for unimplemented modules must show an honest Coming Later state. Never invent financial data to make a screen look complete.

## Target v1

Build only when the relevant work is requested:

- groups, membership administration rules, and invitations;
- multi-payer expenses with immutable payer and split allocations;
- per-currency balances, settlements, edit/delete flows, and activity;
- realtime updates, push notifications, and reminders;
- manual personal income and expenses, categories, and reports;
- receipt attachments;
- cached reads and local drafts;
- export, account deletion, and reconciliation tooling.

Explicitly post-v1 or out of scope:

- OAuth or social login;
- percentage or share-based splits;
- bank linking, transaction import, or payment execution;
- foreign-exchange conversion;
- budgets, savings, investments, or net worth;
- recurring shared expenses;
- receipt OCR;
- biometric app lock;
- subscription billing;
- restoring deleted expenses;
- a web client.

## Financial invariants

- Store monetary values as integers in minor units with an explicit ISO currency.
- For every expense, payer allocations must sum to the total and participant splits must sum to the total.
- Expense payers and participants are independent active-member sets. A user's net posting is paid minus owed; the same user may appear in either or both sets, and zero allocations are omitted.
- Equal splits use integer floor division in minor units. Assign remainder units one at a time to participants in ascending user-ID order.
- Every shared expense must have at least one participant with a positive owed allocation. Omit zero-value participant allocations.
- Validate money and membership rules at API and database trust boundaries, not only in UI.
- Financial events and allocation snapshots are immutable.
- Editing a financial record creates a reversal and replacement; it does not rewrite history.
- Deletion is a soft delete or tombstone and remains auditable.
- Every mutation requires an idempotency key.
- Financial edits require an optimistic version and must surface conflicts.
- Any active ledger member may create a shared expense. Only the expense creator may edit or tombstone it.
- An expense's ledger and currency are immutable across revisions.
- Overpayment is allowed. Warn before confirmation and represent the result as credit.
- Overpayment confirmation is enforced by the app, not by settlement APIs.
- Duplicate personal transactions may trigger a warning but must never be auto-merged.
- Financial writes require a network connection. Cached reads and local drafts may be added later, but queued automatic financial mutations are not allowed.
- Account deletion is blocked by unresolved balances or required memberships. Once allowed, anonymize personal data while retaining the financial audit trail.

## API and security

- Regenerate `code/fe/src/api/generated/` with `pnpm api:generate`; never hand-edit it.
- Define backend response contracts once in `code/fe/src/api/contracts.ts`. Do not duplicate DTO layers.
- Use idempotency and authorization on all mutations, including retries.
- Exact-email discovery must not reveal whether arbitrary addresses have accounts beyond the approved neutral result. Current discovery is rate-limited to 120 requests per minute.
- Store session secrets only in `expo-secure-store`; never persist them in query caches or logs.
- Passwords require at least 12 characters.
- Password-reset tokens expire after 60 minutes.
- Password change invalidates sessions; clear local credentials and return to sign-in.
- Registration sends the device timezone and an explicitly chosen currency.

## Frontend rules

- Use TanStack Query for server state. In-memory query state is current behavior; SQLite persistence is deferred.
- Keep route files focused on composition. Reuse existing components and hooks before adding helpers.
- Use the generated client for request shapes and the shared response contracts for parsing.
- A visible control must work or be visibly disabled with truthful copy.
- Native dialogs own confirmation and destructive-action prompts.
- Use native platform chrome and predictive-back behavior where supported.
- Use `Hissab` capitalization everywhere.
- Friends may show connection state and authoritative per-currency balances; never combine currencies.
- Session screens must not infer device location from unavailable data.
- “Revoke other sessions” is one backend mutation, not a client loop.
- Terms and Privacy controls remain non-interactive until real URLs are approved.

## Design and accessibility

- `mockups/` is the only retained visual reference. Its Python builders are the editable source for generated HTML variants.
- Do not treat stale mockup copy as a business rule. Runtime facts in this file and code take precedence.
- Copper is the locked primary brand and action color: `#A83A1B`. Use Ink `#1D1D1B` for core text and Paper `#F7F3EC` for warm light surfaces.
- Reserve green `#2E7D59` for positive money and success states; it is not a second brand color.
- Apply the Copper/Paper system group by group as mockups are reviewed. It is implemented in Authentication, Friends, Groups, and Shared expenses.
- Use a 4-point spacing grid: 20-point page gutters, 16-point card gaps and field padding, and 32-point major sections. Controls use 12-point radii, cards use 16, sheets/dialogs use 20, and visible button bodies are 32 points high with a 48 dp/44 pt minimum touch region.
- Center inline navigation titles against the screen, not between unequal leading and trailing controls. Keep tab-root large titles left-aligned.
- Use serif typography only for the Hissab wordmark and editorial welcome heading. Keep product UI in a sans serif: page titles 32/38, body 16/24, supporting text 15/22, and labels 12/16.
- Use Paper as the canvas, near-white cards, thin warm dividers, and no card shadows. Primary actions are filled Copper; secondary actions are Copper outlines; green, amber, and red stay semantic.
- Support light and dark appearance.
- Minimum touch targets are 44 points on iOS and 48 dp on Android.
- Support text scaling to 200% without hiding essential actions or values.
- Do not communicate positive/negative money or status using color alone.
- Charts require a textual equivalent.
- The current icon and splash assets are temporary until final brand approval.

## Open product-owner decisions

Do not guess these:

- final wordmark and app icon;
- attachment types, limits, upload lifecycle, and background behavior;
- personal-transaction concurrency rules;
- activity filters, reminder wording/cooldown, and duplicate-warning heuristic;
- export format/delivery and deletion confirmation credentials;
- Terms and Privacy URLs;
- localization, RTL, and tablet support.

## Verification

Automated test files and test runners are intentionally not maintained. Product testing is manual.

Backend changes:

```bash
cd code/be
pnpm verify
```

Frontend changes:

```bash
cd code/fe
pnpm api:generate
pnpm type-check
pnpm lint
pnpm check:refresh
```

Manually verify affected mobile flows on both available iOS and Android targets. Rebuild mockups with `python3 mockups/_build/build.py` after changing their builders or shared styles.
