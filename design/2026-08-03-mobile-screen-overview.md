# Hissab Mobile App — Designer Screen Overview

**Purpose:** Screen map for creating implementation-ready mobile mockups.  
**Platform:** Native iOS and Android, phone portrait first.  
**Visual direction:** Calm Ledger Precision—clear relationships, exact money, restrained surfaces, native controls.

## Product in one sentence

Hissab helps people track shared expenses and who owes whom, record settlements made outside the app, and optionally track personal income and spending.

## Main navigation

The signed-in app has exactly five tabs:

1. **Friends** — direct relationships and balances.
2. **Groups** — shared group ledgers and members.
3. **Activity** — chronological shared-expense changes.
4. **Personal** — manual personal transactions and reports.
5. **Account** — profile, security, preferences, export, and deletion.

Shared-expense creation is contextual. It is not a sixth tab or global floating action button.

## Priority key

- **P0:** Required for the core product workflow.
- **P1:** Required for a safe, credible v1 but designed after the core loop.
- **P2:** Secondary or awaiting a clearer product/API contract.

---

## 1. Authentication

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Welcome | Full screen | Product purpose, Create account, Sign in, and brief “records money; does not transfer it” message | P0 |
| Register | Full-screen form | Display name, email, password, default currency, timezone, password requirements, submit | P0 |
| Sign in | Full-screen form | Email, password, Sign in, Forgot password | P0 |
| Request password reset | Full-screen form | Email entry and neutral “instructions requested” confirmation | P0 |
| Set new password | Full-screen form | New password, confirmation, expired/invalid-link state, success back to Sign in | P0 |

Do not design email verification, social login, profile-photo setup, or a separate post-registration profile wizard.

---

## 2. Friends and connections

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Friends | Tab root/list | Friend identity, explicit per-currency relationship balance, pending-request entry, search, Add connection | P0 |
| Find/add connection | Modal or pushed screen | Search, identity results, selected person, Send request | P0, provisional data contract |
| Connection requests | Pushed screen/list | Incoming and outgoing sections; Accept/Decline for incoming, Cancel for outgoing; resolved states | P0 |
| Friend ledger | Detail screen | Friend identity, “You owe / owes you / Settled” by currency, Add expense, Settle up, Remind, recent expenses/payments | P0 |
| Friend safety/settings | Settings screen | Relationship details and Block action with consequences | P1 |
| Block confirmation | Form sheet/dialog | Person name, pending-request cancellation, direct-ledger archival, Block/Cancel | P1 |
| Blocked people | List | Blocked identity/date and Unblock action | P1 |

Do not expose raw user IDs. Friend removal and nicknames are not currently supported.

---

## 3. Groups

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Groups | Tab root/list | Group identity, per-currency balance preview, search, Create group | P0 |
| Create group | Full-screen modal/form | Name, optional image, provisional group type, initial members, Create | P0 |
| Edit group | Settings form | Name, optional image, provisional type | P1 |
| Select/invite members | Modal/list | Native search, identity rows, selected count, active/pending labels, confirm | P0, provisional data contract |
| Group ledger | Detail screen | Group identity, user balances by currency, recent expenses/payments, Add expense, Balances, Members, Settings | P0 |
| Group balances | Detail/list | “You owe / owes you” member relationships grouped by currency, Settle action | P0 |
| Simplified debts | Detail/list | Read-only payer → recipient suggestions by currency and explanation that history/balances are unchanged | P1 |
| Group members | Detail/list | Member identity, invited/active/left/removed status, owner/admin/member role, invite/manage actions | P0 |
| Change role | Form sheet/dialog | Current role, new role, consequence, confirm/cancel | P1 |
| Remove member | Form sheet/dialog | Member, consequence, blocked condition if applicable, confirm/cancel | P1 |
| Group settings | Settings screen | Identity, Simplify debts switch, members entry, Leave group | P1 |
| Leave group | Form sheet/dialog | Group name, consequence, unresolved-balance warning/blocked state | P1 |

Group type choices, invitation transport, ownership transfer, and leave/remove balance rules remain provisional.

---

## 4. Shared expense creation and maintenance

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Add shared expense | Full-screen modal | Persistent Shared context, amount/currency, description, payer summary, split summary, date, category, receipt, Total/Paid/Allocated reconciliation, Save shared expense | P0 |
| Choose friend/group context | Modal/list | Searchable Friends and Groups sections, current selection, explicit confirmation | P0 |
| Configure payers | Form sheet | One or multiple contributors, rows labelled Paid, running Paid/Total difference | P0 |
| Configure split | Form sheet | Equal/Exact selector, participant inclusion, rows labelled Owes, running Allocated/Total difference | P0 |
| Equal remainder explanation | Inline state or small sheet | Name who receives each extra minor unit so the total remains exact | P0 state |
| Currency picker | Modal/picker | ISO code and currency name; default/recent choices | P0 |
| Category picker | Modal/list | Expense-compatible categories, selected state | P0 |
| Receipt source | Action sheet/form sheet | Camera, photo library, continue without receipt | P1 |
| Receipt preview/upload | Modal/detail state | Preview, progress, retry, replace, remove, permission-denied path | P1 |
| Expense detail | Detail screen | Description, amount/currency/date/category, creator, payer breakdown, owed breakdown, receipt, activity/status/version, Edit/Delete | P0 |
| Edit expense | Full-screen modal | Same structure as Add with current values, change review, reconciliation, Save changes | P0 |
| Updated elsewhere | Banner/state | Nonblocking notice and Refresh action | P1 state |
| Version conflict | Review screen/sheet | Newer authoritative version, preserved local draft, Review latest, Discard, manually reapply | P1 |
| Delete expense review | Form sheet/dialog | Expense name, amount/currency, balance consequence, Delete/Cancel | P1 |
| Deleted expense detail | Detail state | Tombstone, reversal/history explanation, no Restore action | P1 |

The editor has no expense-note field. Equal and Exact are the only split methods. Paid and Owes must never share an ambiguous unlabeled column.

---

## 5. Settlements and reminders

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Choose balance | Modal/list | Counterparty, direction, one currency-specific balance | P0 |
| Record settlement | Full-screen modal/form | Direction, positive amount, date, current balance, “records money paid elsewhere” disclosure, review/save | P0 |
| Overpayment review | Form sheet/dialog | Current balance, entered amount, resulting credit and reversed debt direction, Record and create credit | P0 |
| Settlement success | Success/detail state | Recorded amount, counterparty, resulting balance, View payment/Done | P0 |
| Payment detail | Detail screen | From/to, amount, currency, date, status/version, balance context, Edit/Delete | P1 |
| Edit payment | Modal/form | Current payment values, financial consequence, Save changes | P1, provisional contract |
| Delete payment review | Form sheet/dialog | Payment amount/parties and reversal consequence | P1 |
| Reminder review | Form sheet | Recipient and currency-specific balance, message if later supported, Send | P1 |
| Reminder result | Success/error state | Sent confirmation, unavailable, failure, or rate-limit feedback | P1 |

Do not design payment execution, wallets, cards, or payment-note fields.

---

## 6. Activity

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Activity | Tab root/list | Chronological actor/action/context rows, amount/currency where relevant, timestamps, new/updated states, deep links | P1 |
| Activity search/filter | Pushed screen/header search | Search, event type and friend/group filters, chronological results, no-results state | P1, provisional contract |
| Realtime update | Banner/state | “New activity available” or “Updated elsewhere,” Refresh | P1 state |

---

## 7. Personal finance

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Personal dashboard | Tab root | Selected currency, Income, Spending, Net, recent manual transactions, report-mode label, Add transaction | P0 |
| Personal transactions | Pushed list | Manual entries grouped by month and currency; type/category/currency/period filters | P0 |
| Add personal transaction | Full-screen modal | Persistent Personal context, Income/Expense, amount, currency, category, description, optional source/notes/attachment, date, Save | P0 |
| Possible duplicate | Review sheet/screen | Candidate shared expense, comparison facts, Inspect candidate, Continue anyway, Back | P1 |
| Personal transaction detail | Detail screen | Type, amount/currency, category, description/source, date, notes, attachment, Edit/Delete | P0 |
| Edit personal transaction | Full-screen modal | Existing values and Save changes; concurrency behavior remains provisional | P0 |
| Delete personal review | Form sheet/dialog | Entry name/amount and reporting consequence, Delete/Cancel | P1 |
| Personal reports | Detail screen | One currency and period; Income, Spending, Net, category breakdown, monthly trend, exact textual values | P0 |
| Report-mode education | Form sheet | “Your share” and “Cash out of pocket” definitions, small example, Apply | P1 |
| Custom categories | Settings/list | System and custom categories; Add/Edit/Delete only if later confirmed | P2 |

Do not design bank accounts, imported transactions, budgets, savings, investments, or net worth.

---

## 8. Account and security

| Screen | Format | Purpose and essential content | Priority |
|---|---|---|---|
| Account | Tab root/settings | Profile summary and entries for Profile, Security, Notifications, Export, Delete account, Sign out | P0 |
| Edit profile | Settings form | Display name, default currency, timezone, report mode | P0 |
| Change password | Settings form | Current password, new password, confirmation, warning that all sessions end | P0 |
| Sessions/devices | List | Current marker, device name, user agent, created/last-used/expiry/revoked status, Revoke | P1 |
| Notifications | Settings list | Push master, expense activity, payment activity, reminders, OS permission states | P1 |
| Data export | Lifecycle screen | Included scope, Request export, processing, ready/download, failed, expired | P1, provisional contract |
| Delete-account eligibility | Lifecycle screen | Blocking balances and active memberships with direct resolution links | P1 |
| Delete-account confirmation | Deliberate confirmation | Anonymization explanation, preserved counterparty history, final Delete account/Cancel | P1 |

Do not design profile-photo editing or biometric app lock for v1.

---

## 9. Shared state mockups

The designer does not need to draw every state for every screen, but each recurring screen type needs a reusable state pattern.

### Required list states

- First-use/empty with one relevant action.
- Populated.
- Loading skeleton matching final geometry.
- Recoverable error with Retry.
- Search with no results.
- Offline cached read with saved timestamp.
- Updated/realtime data available.

### Required form states

- Empty/default.
- Partially completed.
- Invalid field.
- Financial mismatch with exact correction.
- Offline local draft.
- Saving with duplicate submission disabled.
- Ambiguous timeout/recovery.
- Success with resulting detail/balance.

### Required sensitive-action states

- Destructive confirmation.
- Blocked action with explanation.
- Permission denied with alternative.
- Version conflict with retained local draft.
- Overpayment with resulting credit.
- Account deletion blocked/eligible.

---

## 10. Core visual and interaction rules

- Always say “You owe Sam,” “Sam owes you,” or “Settled.” Do not rely on signs or color.
- Never combine currencies into one total.
- Use exact, tabular money values.
- Keep Shared and Personal context visible in titles, markers, actions, and success messages.
- Use the Total → Paid → Allocated reconciliation panel as the signature interaction.
- Use native navigation, headers, search, switches, date controls, alerts, and sheets.
- **Every grouped surface is an inset card, lists included.** One card per currency section, inset 16 from the screen edge, hairline dividers between rows inside it. Superseded the earlier "prefer full-width rows" rule on August 3, 2026 — see `finalization/04-decisions.md`.
- No purple-gradient fintech hero, excessive pills, decorative charts, or asymmetrical financial forms.
- Use calm motion only for save, reconciliation, refresh, and balance changes.
- Support 200% text, VoiceOver/TalkBack, Reduced Motion, and visible alternatives to gestures.

---

## 11. Recommended mockup order

1. Group ledger.
2. Add shared expense.
3. Configure payers.
4. Configure Equal and Exact splits.
5. Reconciliation mismatch and valid states.
6. Expense detail.
7. Group balances.
8. Record settlement and overpayment.
9. Friends and friend ledger.
10. Groups and member management.
11. Personal dashboard and personal-entry flow.
12. Personal reports and report-mode education.
13. Authentication.
14. Activity.
15. Account/security/lifecycle.
16. Offline, conflict, permission, and destructive exception states.

## Minimum high-fidelity set before implementation

At minimum, high-fidelity mockups should cover:

- The five-tab shell.
- Friends populated and empty.
- Friend ledger.
- Groups populated and empty.
- Group ledger.
- Add expense default, mismatch, multiple-payer, Equal, Exact, and success states.
- Expense detail, edit conflict, delete review, and deleted detail.
- Group balances.
- Standard, partial, exact, and overpayment settlement outcomes.
- Personal dashboard, entry, duplicate review, detail, reports, and report mode.
- Activity feed.
- Account, profile, password, sessions, deletion blocked, and deletion confirmation.
- Loading, offline, error, permission-denied, and 200%-text examples.

## Explicitly out of scope

Social login, email verification, bank linking/imports, payment execution, currency conversion, percentage/share splits, recurring shared expenses, OCR, budgets, savings goals, investments, net worth, subscriptions, expense restoration, profile photos, expense/payment notes, and a desktop/web product.

For full product, API, domain, and Expo-native constraints, use `design/2026-08-02-product-ux-ui-design-brief.md`.
