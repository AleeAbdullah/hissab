# Expo Router implementation handoff

The final HTML mockups in [`mockups/`](mockups/) are the visual implementation source. There is no Figma stage.
This document maps every mockup to runtime routes and records approved differences that future agents must not
silently “correct” back to the static HTML.

## Route structure

```text
src/app/
  _layout.tsx                         # providers + protected root Stack
  index.tsx                           # session-aware redirect only
  (auth)/
    _layout.tsx
    welcome.tsx
    register.tsx
    sign-in.tsx
    forgot-password.tsx
    reset-password.tsx
  (tabs)/
    _layout.tsx                       # exactly five native tabs
    friends/
      _layout.tsx
      index.tsx
      requests.tsx
      blocked.tsx
      [friendId]/
        index.tsx
        settings.tsx
    groups/
      _layout.tsx
      index.tsx
      [groupId]/
        index.tsx
        edit.tsx
        balances.tsx
        simplified-debts.tsx
        members.tsx
        settings.tsx
    activity/
      _layout.tsx
      index.tsx
      search.tsx
    personal/
      _layout.tsx
      index.tsx
      transactions.tsx
      reports.tsx
      [transactionId]/
        index.tsx
        edit.tsx
    account/
      _layout.tsx
      index.tsx
      profile.tsx
      change-password.tsx
      sessions.tsx
      notifications.tsx
      export.tsx
      delete-account.tsx
  (shared)/
    expense/[expenseId]/
      index.tsx
      edit.tsx
    payment/[paymentId]/
      index.tsx
      edit.tsx
  (modals)/
    _layout.tsx
    connection-new.tsx
    group-new.tsx
    members-select.tsx
    shared-expense.tsx
    payers.tsx
    split.tsx
    ledger-picker.tsx
    currency-picker.tsx
    category-picker.tsx
    receipt.tsx
    settlement.tsx
    reminder.tsx
    personal-transaction.tsx
    report-mode.tsx
```

Route files compose feature screens and navigation options only. Loading, error, offline, confirmation,
conflict, permission, upload and success branches stay inside their owning route or use a native dialog/sheet.

## Screen-by-screen map

| Mockup | Product surfaces | Runtime owner |
|---|---|---|
| `01-welcome.html` | A01 | `(auth)/welcome` |
| `02-register.html` | A02 | `(auth)/register` |
| `03-sign-in.html` | A04 | `(auth)/sign-in` |
| `04-password-recovery.html` | A05, A06 | `(auth)/forgot-password`, `(auth)/reset-password` |
| `05-friends.html` | F01 | `(tabs)/friends/index` |
| `06-add-connection.html` | F02 | `(modals)/connection-new` |
| `07-connection-requests.html` | F03, F04 | `(tabs)/friends/requests` |
| `08-friend-ledger.html` | F05 | `(tabs)/friends/[friendId]/index` |
| `09-friend-safety.html` | F06, F07, F08 | friend settings; block confirmation state; `friends/blocked` |
| `10-groups.html` | G01 | `(tabs)/groups/index` |
| `11-create-group.html` | G02 | `(modals)/group-new`, `groups/[groupId]/edit` |
| `12-select-members.html` | G03 | `(modals)/members-select` |
| `13-group-ledger.html` | G04 | `(tabs)/groups/[groupId]/index` |
| `14-group-balances.html` | G05, G06 | group `balances`, group `simplified-debts` |
| `15-group-members.html` | G07, G09 | group `members`; role/remove confirmation states |
| `16-group-settings.html` | G08 | group `settings`; leave confirmation state |
| `17-add-expense.html` | E01 | `(modals)/shared-expense` |
| `18-configure-payers.html` | E03 | `(modals)/payers` |
| `19-configure-split.html` | E04, E05, E06 | `(modals)/split` states |
| `20-expense-pickers.html` | E02, E07, E16 | ledger, currency and category picker modals |
| `21-receipt.html` | E08, E09 | `(modals)/receipt` states |
| `22-expense-detail.html` | E10, E13, E14 | `(shared)/expense/[expenseId]/index` states |
| `23-edit-expense.html` | E11, E12, E15 | expense `edit`; delete confirmation; conflict state |
| `24-record-settlement.html` | S01, S02, S03, S04 | `(modals)/settlement` states |
| `25-payment-detail.html` | S07, S08, S09 | payment detail, payment edit, delete confirmation |
| `26-reminders.html` | S05, S06 | `(modals)/reminder` states |
| `27-activity.html` | Y01, Y03 | `(tabs)/activity/index` states |
| `28-activity-search.html` | Y02 | `(tabs)/activity/search` |
| `29-personal-dashboard.html` | P01 | `(tabs)/personal/index` |
| `30-personal-transactions.html` | P02 | `(tabs)/personal/transactions` |
| `31-add-personal.html` | P03, P04 | `(modals)/personal-transaction` and duplicate-review state |
| `32-personal-detail.html` | P05, P06, P07 | personal detail, edit and delete confirmation |
| `33-personal-reports.html` | P08, P09 | personal `reports`, `(modals)/report-mode` |
| `34-account.html` | C01, C02, C03, C04 | account root, profile, change-password, sessions, notifications |
| `35-account-lifecycle.html` | C05, C06, C07 | account export and delete-account states |

`00-index.html` is documentation only and has no app route.

## Source boundaries

```text
src/
  api/
    generated/          # committed OpenAPI-generated operations; regenerate, do not hand-edit
    contracts.ts        # backend response types defined once in the app
    transport.ts        # base URL, auth, refresh, idempotency and error normalization
  components/           # design-system primitives and cross-feature patterns
  features/
    auth/
    connections/
    account/
    coming-later/
    ...                 # add a feature only when its first real screen is implemented
  theme/                # semantic light/dark tokens and type/layout constants
```

TanStack Query hooks live with their feature. Do not add repository interfaces, factories or a second DTO
layer. A feature may define a view model only when it actually combines or transforms transport data.

## Live versus placeholder scope

The foundation fully implements backend-supported auth, profile, session and connection surfaces. Friends shows
live connection identities and labels balances **Coming later** until balance APIs exist. Blocking remains
unavailable until the confirmation can show authoritative outstanding balances.

Every other mapped destination remains reachable through its natural visible control and renders the shared
`ComingLater` state with the real screen title and purpose. It never renders invented sample data.

## Data and mutation responsibilities

| Layer | Responsibility |
|---|---|
| Route/screen | Compose view state, navigation and accessibility focus |
| Presentation | Render and collect intent; never invent server balances |
| Feature query/mutation | Query keys, cache updates, retry policy and mutation lifecycle |
| Generated transport | Path, method and request serialization from OpenAPI |
| App contracts | Response types defined once for the current backend |
| SecureStore | Access/refresh tokens and session metadata only |
| Future SQLite | Persistent cached reads and local drafts when financial editors begin |

### Mutation sequence

1. Validate fields locally.
2. Freeze one UUID idempotency key for the logical attempt.
3. Disable duplicate submission and show the action-specific pending label.
4. Submit through the authenticated transport.
5. On success, invalidate/refetch affected authoritative queries.
6. On an ambiguous result, retain the key while status is checked; never invite a blind duplicate.
7. On `401`, attempt one refresh; if refresh fails, clear SecureStore and return to Sign in.

## Approved implementation deviations

The HTML mockups remain unchanged.

| Area | Approved runtime behavior |
|---|---|
| Design source | HTML mockups are final; no Figma file or review gate exists. |
| Product name | Use `Hissab` everywhere, including in-app copy and OS metadata. |
| Password rule | Backend wins: minimum 12 characters; no number-composition requirement. |
| Reset expiry | Backend default wins: display 60 minutes, not 30. |
| Connection lookup | Exact-email lookup is authenticated; neutral no-match copy; no partial directory. Existing global 120 requests/minute limit applies, with no stricter endpoint limit. |
| Connection requests | API views include the other person’s display name and email. |
| Friends without balances | Render live identities and “Balances coming later.” |
| Blocking | Keep unavailable until authoritative balances can be shown in confirmation. |
| Sessions | Omit inferred location because the API does not provide it. |
| Revoke others | One backend mutation revokes every session except the current session. |
| Change password | Current backend behavior wins: after success, clear local tokens and sign in again. |
| Password-reset email | Request/confirmation/deep-link UI is live; actual email delivery remains a backend dependency. |
| Terms/privacy | Keep the agreement sentence as non-interactive copy until URLs exist. |
| App icon/splash | Use a temporary brand-color Hissab monogram; replace when final assets exist. |
| Save placement | The final HTML screen decides between native header Save and bottom action. |
| Native chrome | Native tabs, headers, alerts, sheets, keyboards and back behavior win over HTML phone chrome. |
| Offline restart | Query cache is memory-only until SQLite is added; an offline restart may show a network error. |
| Registration defaults | Prefill device timezone; require explicit currency choice. |
| Android back | Predictive back is enabled. |

Any new mismatch between a final mockup and runtime/backend behavior must be presented to the product owner and
recorded in this table before implementation.

## Verification

- Run the app through Expo Go first; native projects remain untouched.
- Manually verify the available current iOS Simulator and Android Emulator.
- Check session restore, refresh failure, sign-out, password change, profile update, connection lookup/request,
  accept/decline/cancel, request lists, blocked list and every visible Coming Later route.
- Check light/dark appearance, 200% text, keyboard avoidance, native back and minimum touch targets.
- Lint and type-check are baseline code checks; no end-to-end framework is introduced by this foundation.
