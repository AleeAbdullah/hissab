# Hissab Product & UX Discovery → UI Design Brief

**Status:** Updated source of truth for UI mockup generation  
**Date:** August 2, 2026  
**Target:** Native iOS and Android application using Expo SDK 57 and Expo Router  
**Supersedes for mockup generation:** assumptions in earlier screen inventories or reference documents that conflict with the approved product specification, implemented API, or this brief.

## Evidence labels

- **Confirmed—API:** implemented in the current NestJS application.
- **Confirmed—spec:** required by the approved product specification but not necessarily implemented.
- **Confirmed—design:** a product-appropriate design decision adopted by this brief.
- **Strong inference:** strongly implied by the domain model or approved workflows.
- **Unknown:** no reliable contract exists; do not fabricate it.

## Source precedence

1. `architecture/2026-07-31-expense-sharing-project-spec.md` — target product behavior.
2. Current NestJS controllers, services, schema, and migration — implemented behavior and constraints.
3. This brief — reconciled UX, visual, and Expo-native design direction.
4. Earlier finalization and research documents — supporting references only.
5. Competitor screenshots — inspiration only, never product requirements.

---

## 1. Executive Product Summary

Hissab is a mobile-first application with two related but explicitly separate product areas:

1. **Shared expenses:** friends and groups record who paid, who owes, and settlements made elsewhere.
2. **Personal finance:** an individual manually records income and expenses and reviews reports.

Hissab records obligations and external payments. It does not transfer, hold, import, or automatically convert money.

### Problem solved

Users need to split costs accurately, understand relationship balances, preserve trustworthy history when records change, and optionally track personal finances without connecting bank accounts.

### Primary users

- Individuals sharing expenses directly with friends.
- Members of households, couples, trips, and other groups.
- Group owners/admins managing membership and settings.
- The same individuals recording manual personal income and spending.

There is no organization, merchant, accountant, or enterprise model.

### Product value

- One or multiple payers.
- Equal and exact-amount splits.
- Currency-isolated balances.
- Audit-preserving edits and deletions.
- Settlement recording without pretending Hissab moves money.
- Personal reports that can treat shared expenses as “Your share” or “Cash out of pocket.”

### First-seconds message

> Track shared expenses, see exactly who owes whom, and optionally track your own spending. Hissab records money—it does not move it.

### Most important actions

1. Connect with another user or create a group.
2. Record a shared expense.
3. Review or correct it safely.
4. Understand balances by relationship and currency.
5. Record an external settlement.
6. Add a personal income or expense entry.
7. Review activity and personal reports.

### Current implementation boundary

- **Implemented:** password authentication, rotating refresh sessions, password recovery primitives, profile preferences, connection requests, direct-ledger creation, blocking, idempotency, health checks, database schema, and outbox infrastructure.
- **Specified/schema only:** groups, expenses, balances, payments, personal transactions, categories, attachments, reports, notifications, realtime, export, and account deletion.
- **Frontend:** the executable app is still an Expo starter. It is not product or visual evidence.

---

## 2. Users & Jobs-to-be-Done

| User | Jobs-to-be-done | Success definition |
|---|---|---|
| Direct expense sharer | Connect, add expenses, understand the relationship balance, remind, settle | Both people understand the balance without manual arithmetic |
| Group member | Add expenses, pay or owe shares, inspect activity and balances | Contributions and obligations remain accurate across members and currencies |
| Group owner/admin | Create/configure group, manage members and roles, control simplification | Membership changes do not damage financial history |
| Personal-finance user | Enter income/expenses, categorize them, inspect income/spending/net | Reports reflect manual entries and the selected shared-spend mode |
| Account holder | Recover access, change password, inspect/revoke sessions | Access is restored or revoked predictably |
| Departing user | Export data, resolve balances/memberships, delete account | PII is removed while counterparties’ history remains valid |

### Core job statements

- “When I pay for something shared, help me record who contributed and who benefited.”
- “When an expense changes, keep enough history that I can trust the resulting balance.”
- “When I settle outside the app, record it without implying Hissab transferred money.”
- “When I track personal finances, keep them separate from relationship balances.”
- “When currencies differ, never hide that behind a combined total.”
- “When I am offline, preserve my draft without pretending it was committed.”

---

## 3. Product Areas

```text
Hissab
├── Authentication and session
├── Friends and connection requests
│   └── Direct ledger
├── Groups
│   ├── Membership and roles
│   ├── Group ledger
│   └── Group balances
├── Shared expenses
│   ├── Payers
│   ├── Equal/exact splits
│   ├── Attachments
│   └── Edit/delete history
├── Settlements and reminders
├── Activity and realtime changes
├── Personal finance
│   ├── Manual transactions
│   ├── Categories
│   └── Reports
└── Account, security, preferences, export, and deletion
```

| Area | Purpose | Main UI and actions | Permissions/dependencies |
|---|---|---|---|
| Authentication | Establish/recover identity | Register, sign in, reset/change password, sessions | Password only in v1; JWT plus rotating refresh token |
| Friends | Establish direct relationships | Requests, friend list, direct ledger, block | Both users active; blocking archives direct ledger |
| Groups | Durable shared context | Group list, create/edit, members, roles, settings | Owner/admin manage membership/settings; APIs pending |
| Shared expenses | Record obligations | Amount-first form, payer/split sheets, detail, edit/delete | Active membership; reconciliation; connectivity |
| Balances | Explain who owes whom | Currency sections, relationship rows, suggestions | Derived from immutable postings |
| Settlements | Record external payments | Balance choice, entry, overpayment review, payment detail | Positive amount; distinct members; one currency |
| Activity | Show committed changes | Chronological feed, search/filter, deep links | Read API/event vocabulary pending |
| Personal finance | Manual records and reports | Dashboard, list, editor, detail, reports | Owner-only; currencies separated |
| Files | Attach image evidence | Source choice, preview, progress, retry/remove | Signed URL contract pending |
| Account | Identity, security, lifecycle | Profile, sessions, notifications, export/delete | Partially implemented |

---

## 4. Core User Journeys

### First shared expense

Register/sign in → connect or create group → open ledger → add shared expense → enter amount/details → configure payer(s) → configure Equal/Exact split → reconcile → save online → inspect detail and updated balance.

### Correct an expense

Open detail → edit latest version → reconcile replacement → submit version/idempotency key → refetch detail/balances → show success, or preserve draft and review conflict.

### Settle a balance

Open friend/group balances → choose counterparty and currency → enter amount transferred elsewhere → review resulting balance → confirm overpayment if applicable → record → show payment detail and new balance.

### Personal entry and reporting

Open Personal → add Income/Expense → enter amount/category/details → review possible shared duplicate → save → view detail → review currency-specific report → optionally change report mode.

### Group administration

Create group → add members → assign/manage roles → record expenses → review balances → optionally enable read-only simplification → leave/remove according to unresolved rules.

### Account lifecycle

Manage profile/sessions → request export if needed → begin deletion → resolve blocking balances/memberships → confirm anonymization → leave authenticated app.

---

## 5. Complete Workflow Map

| Workflow | Preconditions and steps | Success/failure/back behavior | APIs/entities |
|---|---|---|---|
| Register | Email, 12+ character password, name, currency, timezone → submit once | Duplicate/validation error retains input; success authenticates immediately; no email verification | `POST /v1/auth/register`; User, Identity, Preferences, PersonalLedger, Session |
| Sign in/refresh | Credentials → session; refresh rotates token | Generic invalid-credential error; reuse may revoke family | Sign-in/refresh; RefreshSession |
| Sign out/revoke | Confirm current or selected session revocation | Idempotent success; clear local credentials for current session | Sign-out/session APIs |
| Password recovery | Email → neutral accepted → token → new password | Delivery is not operational yet; invalid/expired token rejected; all sessions revoked on success | Forgot/reset; ResetToken, Outbox |
| Change password | Current/new password → submit | Wrong current password; success requires new sign-in | Change-password API |
| Edit profile | Change one or more supported fields | Empty mutation/invalid timezone rejected; old records keep their currency | Users API; User, Preferences |
| Send request | Discover user → send | Self/missing/blocked/already connected/pending rejected | Request API; discovery unknown |
| Respond/cancel request | Pending incoming Accept/Decline; pending outgoing Cancel | Accept creates/reactivates direct ledger; stale request appears not found | Request commands; Ledger, Member |
| Block/unblock | Review consequences → block; unblock from list | Block cancels requests and archives ledger; unblock does not reconnect | Block APIs |
| Create/manage group | Name/type/image → members → roles/settings | API and exact validation unknown | Ledger, GroupProfile, LedgerMember |
| Create expense | Context → amount/details → payers → split → reconcile → optional image → save | Invalid totals, nonmember, offline, timeout; back saves/discards local draft | Expense/accounting entities; APIs pending |
| Edit expense | Edit current version → review/reconcile → submit | Conflict preserves local draft; success creates reversal/replacement | Expense, Events, Allocations |
| Delete expense | Consequence review → confirm | Soft delete plus reversal; deleted detail remains; no restore | Expense, Event |
| Record settlement | Counterparty/currency → amount/date → review | Partial/exact/overpayment branches; app does not move money | Payment, Event, Posting |
| Edit/delete payment | Open payment → edit/delete review | Reversal/replacement intended; API/version contract unknown | Payment, Event |
| Attach receipt | Camera/library → preview → signed upload → attach | Permission, size/type, expiry, retry/remove states | Attachment, object storage |
| Activity/realtime | Feed → filter/search → deep link; change signal → refetch | Socket never supplies authoritative balance | ActivityEvent, Outbox |
| Reminder | Unsettled relationship → review → send | Success, unavailable, rate limit, retry | Notification entities; API pending |
| Personal transaction | Type/amount/category/details → duplicate review → save | Owner-only; warning never auto-deduplicates | PersonalTransaction, Category, Attachment |
| Personal reports | Currency/period → totals/categories/trend → mode education | No mixed total; payments excluded; deleted shared expenses excluded | Personal and shared read models |
| Export/delete account | Export → resolve balances/memberships → confirm | Deletion blocked until eligible; then PII anonymized | User and linked records; APIs pending |

---

## 6. Domain Model

| Entity | Purpose/key fields | Lifecycle and relationships | User/system responsibility |
|---|---|---|---|
| User | Email, name, default currency, timezone, status | Active/Deactivated/Anonymized; owns all user data | Profile fields editable; ID/status generated |
| UserIdentity | Provider, subject, password hash | One provider identity per user; password only v1 | Auth flows only |
| RefreshSession | Device metadata, expiry/revocation/rotation | Token family; active/consumed/revoked/expired presentations | System-managed; device name supplied |
| PasswordResetToken | Hash, expiry, use/invalidation | Single-use and time-limited | System-generated |
| UserPreferences | Personal report mode | One-to-one User | User edits mode |
| NotificationPreferences | Push/activity/payment/reminder toggles | One-to-one User | Target UI, no API |
| DeviceToken | Platform/token/device/enabled | Belongs to User | System registration, no API |
| ConnectionRequest | Sender/receiver/pair/status | Pending → Accepted/Declined/Cancelled | Sender creates/cancels; receiver accepts/declines |
| UserBlock | Directional pair | Exists/absent; independent of requests | Blocker controls |
| Ledger | Direct/Group, Active/Archived | Contains members, expenses, payments | Direct creation implemented; group pending |
| LedgerMember | Role/status | Owner/Admin/Member; Invited/Active/Left/Removed | Group management pending |
| GroupProfile | Name/type/image/simplify | Exactly one per group ledger | Editable; exact taxonomy unknown |
| Expense | Description, total, currency, category, date, status, version | Active/Deleted; creates immutable events | Header editable through replacement |
| ExpensePayer | User and positive paid amount | Current rows sum to expense total | User-configured |
| ExpenseSplit | User, nonnegative owed amount, Equal/Exact | Current rows sum to total | User-configured/derived |
| Payment | From/to, amount, currency, date, status, version | Active/Deleted settlement record | User-configured; result derived |
| FinancialEvent | Created/Replacement/Reversal | Append-only; expense or payment source | System-generated |
| EventAllocation | Historical payer/participant snapshot | Append-only per event | System-generated |
| LedgerPosting | Signed user amount/currency | Append-only; zero-sum per event | System-generated |
| BalanceProjection | Ledger/user/currency net | Rebuildable from postings | Entirely derived |
| PersonalLedger | One per user | Created during registration | System-generated |
| PersonalTransaction | Type, amount, currency, category, description, optional source/notes, date, status | Active/Deleted; owner-only | Entry editable; report derived |
| Category | Name/kind/icon/color/system/owner | System or custom | Custom CRUD unknown |
| Attachment | Expense or personal parent, object/type/size | Exactly one parent type | User selects; storage fields generated |
| ActivityEvent | Actor, ledger, type, aggregate, payload, time | Chronological read/audit model | System-generated |
| OutboxEvent | Delivery/retry/lease state | Processed/retried/dead-lettered | Infrastructure only |
| IdempotencyKey | Actor/scope/key/hash/result | Processing/Completed | Client generates; server stores outcome |

---

## 7. Backend/API Inventory

### Implemented product APIs

All `/v1` routes except explicitly public auth and health routes require a bearer access token. Every mutation requires a 16–128 character URL-safe `Idempotency-Key`.

| API | Method | Purpose | Input | Output/state change |
|---|---|---|---|---|
| `/health/live` | GET | Process liveness | None | `{status:"ok"}` |
| `/health/ready` | GET | Database readiness | None | OK/database up or 503 |
| `/v1/auth/register` | POST | Create account/session | Email, password, name, currency, timezone, optional device name | Token bundle/user; creates user, prefs, personal ledger, session |
| `/v1/auth/sign-in` | POST | Authenticate | Email, password, optional device name | Token bundle/user; creates session |
| `/v1/auth/refresh` | POST | Rotate tokens | Refresh token | New token bundle; consumes/creates session |
| `/v1/auth/sign-out` | POST | End current session family | Bearer | `{signedOut:true}` |
| `/v1/auth/sessions` | GET | List login sessions | Bearer | Session array |
| `/v1/auth/sessions/:sessionId` | DELETE | Revoke selected session family | UUID | `{revoked:true}` |
| `/v1/auth/password/forgot` | POST | Request reset neutrally | Email | `{accepted:true}`; token/outbox when account active |
| `/v1/auth/password/reset` | POST | Set password with token | Token, new password | `{changed:true}`; revokes sessions |
| `/v1/auth/password` | PATCH | Change password | Current/new password | `{changed:true}`; revokes sessions |
| `/v1/users/me` | GET | Read profile/preferences | Bearer | Profile, report mode, timestamps |
| `/v1/users/me` | PATCH | Update profile/preferences | Nonempty subset of name/currency/timezone/report mode | Updated profile and events |
| `/v1/connection-requests` | POST | Send direct-relationship request | `receiverUserId` | Request row |
| `/v1/connection-requests` | GET | List requests | Optional direction/status | Newest-first request array |
| `/v1/connection-requests/:id/accept` | POST | Accept and create/reactivate ledger | Request UUID | `{ledgerId, request}` |
| `/v1/connection-requests/:id/decline` | POST | Decline incoming | Request UUID | Updated request |
| `/v1/connection-requests/:id/cancel` | POST | Cancel outgoing | Request UUID | Updated request |
| `/v1/connections` | GET | List active direct relationships | Bearer | Ledger and other-user identity |
| `/v1/blocks` | GET | List blocked users | Bearer | Blocked identity/date array |
| `/v1/blocks/:userId` | PUT | Block user | UUID | Cancels requests and archives ledger |
| `/v1/blocks/:userId` | DELETE | Unblock user | UUID | Removes block; does not reconnect |

The protected `/v1` “Hello World” route is a development placeholder and has no UI.

### Implemented validation/error behavior

- Unknown request fields rejected.
- Email trimmed/lowercased.
- Display name 1–100 characters.
- New passwords 12–1024 characters.
- Currency exactly three uppercase letters; actual ISO membership not yet checked.
- Timezone is IANA-validated on profile update.
- Errors use `{error:{code,message,details?}, requestId, timestamp}`; message may be a string or array.
- Current list APIs are unpaginated.

### Missing API contracts

User discovery/invitation, groups, expenses, balances, payments, activity/search, attachments, notifications/reminders, realtime, personal transactions/reports, categories, export, and deletion remain pending. Designs may represent intended behavior but must label data contracts provisional.

---

## 8. UX Requirements

### Authentication

- Registration gathers all required fields before one API submission; no email-verification screen.
- Password-manager and paste support are mandatory.
- Forgot-password confirmation is neutral.
- Reset/change success returns to Sign in because all refresh sessions are revoked.
- Session rows distinguish current, active, consumed, expired, and revoked.

### Connections

- Never expose UUID entry as production UX.
- Incoming and outgoing requests have distinct actions.
- Only pending requests are actionable.
- Blocking review states that requests are cancelled and direct ledger archived.
- Unblocking never implies reconnection.

### Money/currency

- Calculate as integer minor units.
- Use tabular numerals and currency-aware formatting.
- Never combine currencies.
- State debt direction in words, not color/sign alone.
- Client math is preview; server data is authoritative.

### Shared expense

- Required: ledger, description, positive total, currency, date, payer contribution(s), and Equal/Exact owed rows.
- Keep Paid and Owes visually separate.
- Persistently show Total, Paid, and Allocated.
- Disable save while mismatched or offline and name exact correction.
- Equal remainder allocation is deterministic and explained.
- Changing amount, currency, context, participants, or method forces review.
- Freeze one idempotency key per submission attempt.

### Edit/delete

- Expense/payment edits use the last observed version.
- Conflicts preserve local input; never silently overwrite or auto-merge allocations.
- Delete creates a reversal and audit-visible tombstone.
- No restore in v1.
- Personal edit versioning is unknown because its schema lacks a version field.

### Settlement

- State: “This records money paid elsewhere. Hissab does not transfer money.”
- One direction, counterparty, and currency per settlement.
- Overpayment shows current balance, entered amount, resulting credit, and reversed direction before deliberate confirmation.

### Offline/realtime

- Cached reads show saved timestamp and staleness.
- Local items say “Draft on this device.”
- Never show offline financial changes as queued/committed.
- Change events trigger refetch; they never provide trusted balances.

### Personal finance

- Shared and Personal creation remain unmistakable in title, context, action, and success copy.
- Category and description are required; source/notes optional.
- Duplicate detection warns but never merges automatically.
- Settlements never count as income/spending.
- Reports and charts remain currency-separated and have exact textual equivalents.

### Accessibility

- 44×44 pt iOS and 48×48 dp Android targets.
- Reflow through 200% text size.
- 4.5:1 normal-text contrast and 3:1 meaningful nontext contrast.
- Visible alternatives for gestures/long press.
- Screen-reader order follows decision order.
- Important financial/error text is selectable where appropriate.
- Announce validation, upload, save, and realtime changes politely.
- Respect Reduced Motion and system appearance.

---

## 9. Product-Specific Design Principles

1. **Relationships before arithmetic:** “You owe Sam” precedes the number.
2. **Shared and Personal never blur:** repeat context throughout create/edit/success.
3. **Currency is structural:** separate sections, actions, reports, and totals.
4. **Reconcile before commit:** Total/Paid/Allocated remains visible near save.
5. **Consequences before mutation:** show current and resulting financial state.
6. **Audit trust over apparent simplicity:** details expose meaningful history/status.
7. **Draft, request, and committed are distinct:** wording and styling cannot imply equivalence.
8. **Creation is contextual:** ledger-first entry prevents wrong-context mistakes.
9. **Feedback is calm and factual:** no celebration of debt, blocking, or deletion.
10. **Permissions are just in time:** every denial has a useful alternative.
11. **Native familiarity beats ornamental novelty:** platform navigation/controls remain native.
12. **Visual distinction comes from the product model:** ledger relationships and reconciliation, not fashionable decoration.

---

## 10. Visual Direction

### Named direction: Calm Ledger Precision

Hissab should feel like a precise, contemporary personal ledger: calm enough for repeated use, distinctive through relationship language and numerical alignment, and restrained in high-stakes moments.

### Signature element

The recurring **Total → Paid → Allocated reconciliation rail/panel** is the memorable product-specific element. It appears consistently in shared-expense creation/editing and communicates correctness without decorative spectacle.

### Personality and density

- Calm, relational, trustworthy, audit-friendly.
- Medium density: full-width lists and ledger rows; grouped surfaces only for summaries and decisions.
- Names, context, and exact amounts precede decoration.

### Typography

- San Francisco/system on iOS and Roboto/system on Android.
- No custom display font; accessibility/native behavior overrides generic “distinctive font” advice.
- Character comes from hierarchy, tabular numbers, alignment, and labels.
- Money remains exact; abbreviations may appear only in secondary summaries with full accessible/selectable values.

### Color

- Neutral ledger canvas and surfaces.
- Ink-like primary text.
- One restrained brand accent for actions, focus, and selection.
- Positive, negative, warning, and neutral semantic roles always paired with text/icons.
- Existing indigo `#3757C5` is provisional; avoid turning it into a purple/indigo-gradient SaaS aesthetic.
- Native tab/header materials should remain system-adaptive rather than being painted with opaque brand surfaces.

### Surfaces and shape

- Hairline dividers and grouped rows over grids of rounded cards.
- Approximate 12-point control and 16-point grouped-surface radii.
- Use continuous corner curves on supported native surfaces.
- Visible input boundaries and clear focus/disabled/error states.
- Optional subtle atmosphere belongs only on Welcome/benign empty states, never core financial forms.

### Iconography

- NativeTabs use SF Symbol and Material Symbol mappings via `sf`/`md`.
- Ordinary symbols use a platform mapping; icons support, never replace, labels.
- Initials are the dependable person-avatar fallback; profile photos are unsupported.

### Imagery/data visualization

- Group images and receipt previews are functional.
- Avoid decorative imagery in settlement, blocking, conflict, and deletion.
- Category/month charts require exact textual equivalents.
- No bank, net-worth, investment, or budget imagery.

### Motion

- Native Stack owns navigation timing.
- Short in-screen motion may clarify reconciliation, save, refetch, balance change, or reordered rows.
- Reduced Motion uses opacity or immediate change.
- No page-load choreography, parallax, or celebratory debt animation.

### Anti-generic guardrails

- No interchangeable rounded metric-card grid.
- No purple/indigo gradient hero.
- No floating glass cards over decorative blobs.
- No excessive pills/capsules.
- No asymmetrical financial forms.
- No ornamental chart when exact rows answer the question.
- No expressive font that compromises native behavior.

---

## 11. Complete Screen Inventory

| Area | ID | Screen/surface | Priority |
|---|---|---|---|
| Auth | A01 | Welcome | P0 |
| Auth | A02 | Register | P0 |
| Auth | A03 | Sign in | P0 |
| Auth | A04 | Request password reset | P0 |
| Auth | A05 | Set new password | P0 |
| Friends | F01 | Friends list | P0 |
| Friends | F02 | Find/add connection | P0, API-blocked |
| Friends | F03 | Incoming/outgoing request center | P0 |
| Friends | F04 | Friend ledger | P0 |
| Friends | F05 | Friend safety/settings | P1 |
| Friends | F06 | Blocked people | P1 |
| Groups | G01 | Groups list | P0 |
| Groups | G02 | Create/edit group | P0 |
| Groups | G03 | Select/invite members | P0 |
| Groups | G04 | Group ledger | P0 |
| Groups | G05 | Group balances | P0 |
| Groups | G06 | Simplified debts | P1 |
| Groups | G07 | Group members and roles | P0 |
| Groups | G08 | Group settings and leave/remove confirmations | P1 |
| Expenses | E01 | Shared expense editor | P0 |
| Expenses | E02 | Choose friend/group context | P0 |
| Expenses | E03 | Configure payers | P0 |
| Expenses | E04 | Configure Equal/Exact split | P0 |
| Expenses | E05 | Currency picker | P0 |
| Expenses | E06 | Receipt attachment/upload | P1 |
| Expenses | E07 | Expense detail and audit | P0 |
| Expenses | E08 | Edit expense | P0 |
| Expenses | E09 | Updated elsewhere/version conflict | P1 |
| Expenses | E10 | Delete review/deleted detail | P1 |
| Settlement | S01 | Choose balance/currency | P0 |
| Settlement | S02 | Record settlement | P0 |
| Settlement | S03 | Overpayment review | P0 |
| Settlement | S04 | Payment detail/edit/delete | P1 |
| Settlement | S05 | Reminder review/result | P1 |
| Activity | Y01 | Activity feed | P1 |
| Activity | Y02 | Activity search/filter | P1 |
| Personal | P01 | Personal dashboard | P0 |
| Personal | P02 | Personal transaction list | P0 |
| Personal | P03 | Add/edit personal transaction | P0 |
| Personal | P04 | Possible duplicate review | P1 |
| Personal | P05 | Personal detail/delete review | P0 |
| Personal | P06 | Personal reports | P0 |
| Personal | P07 | Report-mode education | P1 |
| Personal | P08 | Custom-category manager | P2, contract unknown |
| Account | C01 | Account | P0 |
| Account | C02 | Edit profile/preferences | P0 |
| Account | C03 | Change password | P0 |
| Account | C04 | Sessions/devices | P1 |
| Account | C05 | Notifications | P1 |
| Account | C06 | Data export | P1 |
| Account | C07 | Delete-account eligibility/confirmation | P1 |

There is no required registration-verification or post-registration profile-setup screen. Registration already collects the required profile fields and authenticates immediately.

---

## 12. Screen Specifications

All screens are phone-first portrait experiences for iOS and Android. Lists use native headers and automatically inset `FlatList`/`SectionList`; forms use automatically inset `ScrollView`. Tablet is an unresolved reflow target, and web/desktop is out of scope.

### Authentication

- **A01 Welcome:** purpose statement; Create account primary, Sign in secondary; no data; safe offline entry.
- **A02 Register:** name, email, password, currency, timezone; one final submission; validation/duplicate/saving states; no profile photo or email verification.
- **A03 Sign in:** email/password, recovery entry; invalid/rate-limit/offline/saving states; token storage on success.
- **A04 Request reset:** email; neutral accepted result; delivery currently unavailable in backend Foundation.
- **A05 Set password:** new password plus client confirmation; invalid/expired/saving/success; return to Sign in.

### Friends

- **F01 Friends:** connection rows and future per-currency relationship statements; Add connection; request entry; empty/loading/error/offline.
- **F02 Find/add:** native header search, identity rows, confirm request; no UUID input; discovery contract provisional.
- **F03 Requests:** incoming/outgoing/status filters; Accept/Decline/Cancel according to direction; resolved read-only.
- **F04 Friend ledger:** relationship header, currency sections, chronological ledger; Add expense primary; Settle/Remind/Settings secondary.
- **F05 Safety/settings:** Block with consequence sheet; remove/nickname omitted until APIs exist.
- **F06 Blocked people:** blocked identity/date list; Unblock; success explicitly does not reconnect.

### Groups

- **G01 Groups:** group rows and future currency previews; Create; local/header search; standard list states.
- **G02 Create/edit:** name, optional image, provisional type; image permission/upload states; success opens ledger.
- **G03 Members selection:** native search, selected count, active/pending labels; discovery/invite contract provisional.
- **G04 Group ledger:** identity, currency-separated user balances, expenses/payments; Add expense primary; balances/members/settings secondary.
- **G05 Balances:** “You owe/owes you” member rows by currency; settlement entry; no combined total.
- **G06 Simplified debts:** read-only payer→recipient suggestions; persistent “does not change expenses or balances” explanation.
- **G07 Members/roles:** status and role rows; invite/change/remove according to permissions; owner rules unresolved.
- **G08 Settings:** name/image/type/simplify/members/leave; native consequence sheets; deletion/unsettled rules unresolved.

### Shared expenses

- **E01 Editor:** full-screen modal; context marker, amount/currency, description, payers, split, date, category, attachment, reconciliation, Save shared expense; no expense note.
- **E02 Context:** searchable friend/group selection; explicit reset/review when changing an allocated draft.
- **E03 Payers:** form sheet; rows labelled Paid, one/multiple positive contributions, Paid/Total difference.
- **E04 Split:** form sheet; Equal/Exact segmented control, rows labelled Owes, remainder/discrepancy explanation.
- **E05 Currency:** native searchable/picker presentation; choosing a currency invalidates/reviews incompatible amounts.
- **E06 Receipt:** camera/library, preview, progress, retry/replace/remove; no OCR.
- **E07 Detail:** amount/context hierarchy, payer/owed breakdown, receipt, creator/date/status/version/activity; edit/delete actions.
- **E08 Edit:** E01 with current version and change review; refetch affected detail/balances before settled success.
- **E09 Conflict:** newer authoritative data and preserved local draft; Review latest/Discard/Reapply manually.
- **E10 Delete/deleted:** factual consequence sheet; opens audit-visible tombstone; no restore.

### Settlements

- **S01 Balance choice:** one counterparty/currency relationship; direction and current amount.
- **S02 Record:** direction, positive amount, date, non-transfer disclosure; standard or overpayment branch; no payment note.
- **S03 Overpayment:** current, entered, resulting credit/direction; deliberate Record and create credit.
- **S04 Payment detail:** parties, amount/currency/date/status/version/result; edit/delete review; API provisional.
- **S05 Reminder:** recipient and currency-specific balance; send/result/rate-limit/unavailable states; editable copy unknown.

### Activity

- **Y01 Activity:** chronological actor/action/context rows, amount/currency where relevant, deep links, realtime refresh banner.
- **Y02 Search/filter:** native header search plus event/context filters; pagination/query contract provisional.

### Personal

- **P01 Dashboard:** currency-specific income/spending/net and recent manual entries; Add transaction; no bank/net-worth/budget modules.
- **P02 Transactions:** month/currency grouped list; provisional type/category/currency/period filters.
- **P03 Editor:** Personal context, Income/Expense, amount, currency, required category/description, optional source/notes/attachment; version behavior unresolved.
- **P04 Duplicate:** possible shared match; inspect/continue/back; no automatic merge.
- **P05 Detail/delete:** complete entry hierarchy, attachment, edit/delete; report consequence review.
- **P06 Reports:** one currency/period, income/spending/net, category totals, monthly trend, exact textual equivalent.
- **P07 Mode education:** Your share vs Cash out of pocket definitions/example; apply then refetch report.
- **P08 Categories:** system/custom grouping, name/kind/icon/color; P2 until CRUD/reassignment rules exist.

### Account

- **C01 Account:** profile summary and native grouped navigation to profile/security/notifications/export/delete/sign out.
- **C02 Profile:** name, currency, timezone, report mode; unchanged/invalid/saving/success; no profile photo.
- **C03 Password:** current/new/confirmation; state that all sessions end; return to Sign in.
- **C04 Sessions:** current/device/user-agent/timestamps/status; revoke selected; active/expired/revoked states.
- **C05 Notifications:** push master and activity/payment/reminder switches; OS permission plus app preference states; API pending.
- **C06 Export:** scope, request/processing/ready/failure/expiry; format/delivery unknown.
- **C07 Deletion:** blocking balances/memberships with direct resolution routes, eligibility, anonymization confirmation, success.

---

## 13. Reusable UI Patterns

| Pattern | Purpose/variations |
|---|---|
| Native screen shell | Stack title, automatic insets, loading/error/empty slots |
| MoneyText | Exact minor-unit formatting, tabular numbers, full accessible value |
| CurrencySection | One currency only; summary/list/chart variations |
| BalanceStatement | You owe / owes you / Settled / credit |
| PersonRow | Identity, request/member/role/balance/selectable variations |
| LedgerRow | Direct/group identity and separated currency subrows |
| ActivityRow | Actor/action/context/time/amount/deep link |
| ContextMarker | Shared expense · ledger or Personal; fixed/changeable |
| AmountEditor | Localized input, ISO code, raw minor-unit preview |
| Payer/Split summary | Compact entry into focused sheets |
| ParticipantAmountRow | Explicit Paid or Owes label; inclusion/disabled states |
| ReconciliationPanel | Signature Total/Paid/Allocated; valid/under/over/offline |
| AttachmentTile | Local/uploading/uploaded/failed preview |
| StatusBanner | Offline/stale/conflict/upload/success with visible action |
| Confirmation sheet | Financial/destructive consequence and action-specific verb |
| ReportModeControl | Compact current value plus education sheet |
| CategoryBreakdown | Exact values plus optional accessible chart |
| State set | First-use/loading/error/offline/draft/saving/success |

Do not abstract one-off experiences such as deletion eligibility or conflict comparison into speculative universal components.

---

## 14. States & Edge Cases

| State | Required behavior |
|---|---|
| Empty Friends/Groups/Personal | Explain purpose and offer one primary action |
| Missing discovery API | Use labelled provisional mock contract; no UUID entry |
| Pending incoming/outgoing | Correct Accept/Decline versus Cancel actions |
| Stale request | Safe not-found/already-resolved treatment |
| Blocked/unblocked | Do not reveal other party’s block state or imply reconnection |
| Settled | Say Settled rather than signed zero |
| Multiple currencies | Separate headings, totals, actions, reports |
| Invalid total | Cannot save zero/negative |
| Payer/split under/over | Name exact amount to add/remove |
| Equal remainder | Name recipient(s) of extra minor unit(s) |
| Multiple payers | Keep Paid and Owes distinct |
| One-participant expense | Minimum unresolved; do not hard-code from mockups |
| Offline mutation | Preserve local draft; Connect to save |
| Timeout after submit | Reuse key and refetch before new submission |
| Idempotent replay | Same request returns original outcome; changed request conflicts |
| Updated elsewhere | Nonblocking banner/refetch |
| Version conflict | Preserve draft; review latest; no auto-merge |
| Deleted expense/payment | Audit tombstone; no restore |
| Partial/exact/overpayment | Remaining, Settled, or resulting credit respectively |
| Permission denied | Manual alternative/another source/continue/settings |
| Upload failure | Preserve preview; retry/remove |
| Possible duplicate | Warn and allow deliberate continuation |
| Session expiry/revocation | Refresh or return to Sign in; preserve nonsensitive drafts |
| Password changed/reset | Clear credentials and sign in again |
| Notification failure | Financial write remains successful |
| Account deletion blocked | Exact currencies/memberships and resolution links |
| 200% text | Reflow without clipped values/actions/errors |
| Screen reader | Full relationship/currency phrase, not bare sign/number |

---

## 15. Technical/Product/API Constraints

### Technical constraints

- Expo SDK 57, React Native, TypeScript, Expo Router.
- Native iOS and Android; portrait configured; web not a v1 target.
- Root protected `Stack`; authenticated `(tabs)` group contains five static `NativeTabs` triggers.
- Every tab owns a nested native `Stack` and independent history.
- Routes contain only route/layout composition; features/components/state/financial logic remain outside `app`.
- `ScrollView`, `FlatList`, or `SectionList` is the first screen child with `contentInsetAdjustmentBehavior="automatic"`.
- Never hard-code tab-bar height or add a manual bottom tab inset.
- NativeTabs owns safe-area/tab presentation; native Stack owns navigation transitions.
- Use header search rather than a sixth Search tab.
- Use native form sheets for focused flows and full-screen modal for the long shared-expense editor.
- iOS-only toolbars, previews, and context menus are supplemental and require visible Android equivalents.
- Native tab icons use `sf` and `md` mappings; regular icon usage follows platform mappings.
- Use `process.env.EXPO_OS` for new compile-time platform branches where appropriate.
- Use flex layout and `useWindowDimensions`; never `Dimensions.get()`.
- Configure Android keyboard layout mode to `resize` for form-heavy screens.
- Preserve Android predictive back unless a demonstrated framework issue requires disabling it.
- Use SQLite for cached reads/local drafts and SecureStore for tokens/session metadata; install only when those features are implemented.
- Try Expo Go first; create custom native builds only when actual capabilities require them.

### Product constraints

- Hissab records but never moves money.
- Shared and Personal contexts remain distinct.
- Equal and Exact only; multiple payers required.
- No automatic FX conversion or mixed totals.
- Overpayment allowed after warning.
- Debt simplification is read-only.
- Financial mutation requires connectivity.
- Financial deletion retains audit history.
- Account deletion is blocked until balances/memberships are resolved.
- OAuth, bank linking, payment processing, budgets, investments, subscriptions, OCR, recurring shared expenses, and restoration are out of scope.

### API constraints

- Current backend is Foundation-only.
- Every mutation requires idempotency key.
- Access token defaults to 15 minutes; refresh session 30 days; reset token one hour.
- Global throttle defaults to 120 requests/minute.
- Implemented lists are unpaginated.
- Connection creation currently requires UUID; discovery missing.
- Error message may be string or array.
- Expense/payment version mechanics intended but not implemented.
- Generated OpenAPI client quality must be verified because many response types lack explicit response DTOs.

### UX constraints

- No color-only debt direction.
- No cross-currency total.
- No offline draft presented as committed.
- No silent overwrite or automatic financial merge.
- One clear commit action per form.
- Preserve input on recoverable failure.
- Permission requests are just in time.
- No gesture-only destructive action.
- Do not imply email verification, profile photos, expense/payment notes, or friend removal are supported.

---

## 16. P0/P1/P2 Screen Prioritization

### P0 — Core

Auth/recovery; Friends/requests/provisional discovery/friend ledger; Groups/create/member selection/ledger/balances/members; shared expense context/payers/split/currency/detail/edit; settlement/overpayment; Personal dashboard/list/editor/detail/reports; Account/profile/password.

### P1 — Important

Friend safety/blocklist; group settings/simplification; receipt upload; updated/conflict/delete states; payment maintenance; reminders; Activity/search; duplicate review; report-mode education; sessions/notifications/export/deletion.

### P2 — Secondary

Custom category manager until contract confirmed; advanced activity filters; tablet-specific adaptation; decorative empty-state system; anything present only in competitor references.

---

## 17. Recommended Design Sequence

1. Money, currency, balance language, payer/split rows, and reconciliation signature.
2. Native shell: protected root Stack, five NativeTabs, nested stacks, auth.
3. Group ledger → expense → payers → split → detail → balances.
4. Friend requests → friend ledger → direct expense → balance.
5. Settlement and overpayment.
6. Offline/timeout/updated/conflict/delete safety states.
7. Personal entry → duplicate → detail → reports → mode.
8. Activity, attachments, reminders, sessions.
9. Export/deletion/blocking/group leave/remove.
10. iOS/Android, 200% text, screen reader, Reduced Motion, slow/offline verification.

### Prototype before implementation

Multiple payers; Equal remainder; Exact reconciliation; changing allocated context; overpayment language; version conflict; timeout-after-submit; report-mode education; group role/member removal; deletion eligibility.

---

## 18. Open Questions / Unknowns

| Unknown | Why it matters | Safe temporary assumption |
|---|---|---|
| User discovery | UUID API is not usable UX | Mock standard search/result contract and label provisional |
| Contacts/invite links | Changes permission/growth flow | Manual search primary; contacts/link optional |
| Group type taxonomy | Schema is free text | Neutral provisional selector |
| Invitation lifecycle | Invited status lacks API/token | Show pending without transport details |
| Owner/leave/remove rules | Affects destructive flows | Block unresolved owner actions in mockups |
| Friend removal | No endpoint | Expose Block only as build-ready |
| Archived ledger visibility | Blocking archives direct ledger | Preserve history provisionally; no reconnect promise |
| Expense/payment APIs | Needed for final states/conflicts | Base mock data on schema and mark routes provisional |
| Minimum participants | Not enforced explicitly | Use at least two in examples, not validation contract |
| Personal edit concurrency | No version field | Show generic safe errors, not confirmed conflict |
| Categories/custom CRUD | Schema only | Mock system selector; defer manager |
| Supported currencies | Shape check is insufficient | Use real ISO examples; no fixed published list |
| File limits/upload sequence | Affects validation/retry | Generic failure and provisional URL→upload→attach flow |
| Activity event/query model | Payload generic | Product-language rows; provisional filters |
| Realtime envelope | Affects invalidation | Only “resource changed; refetch” |
| Reminder copy/rate limit | Affects form/result | Fixed factual copy; rate-limit state |
| Duplicate heuristic | False positives affect trust | “Possible match,” never definitive |
| Report period/timezone | Affects aggregation | Calendar month in user timezone |
| Export format/delivery | Affects progress/download | Generic processing/ready states |
| Deletion confirmation | Credential step unknown | Deliberate final confirmation only |
| Reset delivery | Worker has no email handler | Design state but mark unavailable now |
| Tablet/localization/RTL | Layout and money implications | Phone first; avoid fixed-width assumptions |
| Shared detail tab behavior | Root routes can lose tab history | Prefer array/shared routes inside tab stacks, or explicitly hide tabs and define fallback |

---

## 19. Design-to-Frontend Handoff Notes

### Recommended Expo Router structure

```text
src/app/
  _layout.tsx                         # providers + protected root Stack
  index.tsx                           # session redirect; route for "/"
  (auth)/
    _layout.tsx                       # native Stack
    welcome.tsx
    register.tsx
    sign-in.tsx
    forgot-password.tsx
    reset-password.tsx
  (tabs)/
    _layout.tsx                       # five static NativeTabs
    friends/
      _layout.tsx                     # nested Stack + header search
      index.tsx
      [friendId].tsx
    groups/
      _layout.tsx
      index.tsx
      [groupId]/
        index.tsx
        balances.tsx
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
    account/
      _layout.tsx
      index.tsx
      profile.tsx
      security.tsx
      notifications.tsx
      export.tsx
      delete-account.tsx
  (modals)/
    _layout.tsx
    connection-new.tsx
    group-new.tsx
    members-select.tsx
    shared-expense.tsx
    payers.tsx
    split.tsx
    currency.tsx
    receipt.tsx
    settlement.tsx
    reminder.tsx
    personal-transaction.tsx
    report-mode.tsx
```

Expense/payment details used from several tabs should preferably use Expo Router array/shared routes so each tab preserves its own navigation history. If they remain root-stack routes, the design must explicitly show hidden-tab behavior and a deterministic deep-link fallback.

### Native navigation rules

- Static tabs: Friends, Groups, Activity, Personal, Account—never a create/search sixth tab.
- Use `NativeTabs.Trigger.Icon` with stateful SF and Material symbols.
- Use `headerSearchBarOptions`/native header search for Friends, Groups, and Activity where supported.
- Use Stack titles rather than custom page-title text.
- Use form sheets with deliberate detents for payers, split, report mode, and compact reviews.
- Use a full-screen modal for shared-expense entry when keyboard/reconciliation space requires it.
- Let iOS 26 native glass/material appear on navigation surfaces; financial content surfaces remain readable and restrained.
- Link previews/context menus are optional iOS enhancements, never the only access to an action and never a place to expose sensitive debt by default.

### Frontend boundaries

- Route: composition, navigation, focus.
- Presentation: display state and collect intent.
- Financial preview: deterministic integer-minor-unit validation.
- Server state: fetch/cache/invalidate/retry/mutation lifecycle.
- SQLite: cached reads and drafts only.
- SecureStore: tokens/session only.
- WebSocket: invalidation signal only.
- Generated client: typed requests, version, idempotency headers.

### Mockup fixture requirements

Include direct/group ledgers; settled/owing/owed/credit relationships; at least two separate currencies; single/multiple payers; Equal one-minor-unit remainder; Exact mismatch; active/edited/deleted expenses; partial/exact/overpaid settlements; request states; member role/status states; personal entries/duplicate; both report modes; offline/conflict/timeout/permission/deletion-blocked states.

### Design-system build order

1. MoneyText and balance language.
2. CurrencySection.
3. Person/Ledger/Activity rows.
4. ContextMarker.
5. AmountEditor and participant amount rows.
6. Signature ReconciliationPanel.
7. StatusBanner.
8. Consequence sheets/dialogs.
9. State set.
10. Accessible chart equivalents.

### Final guardrails

- Do not use the Expo starter as a visual reference.
- Do not generate email verification, profile photos, expense/payment notes, social login, bank linking, payment execution, OCR, percentage splits, budgets, or restore flows.
- Do not infer endpoint availability from schema presence.
- Mark provisional API-driven interactions in mockups.
- Produce both normal and financial-exception states before implementation.
- The selected high-fidelity work must visibly express Calm Ledger Precision rather than a generic fintech card dashboard.
