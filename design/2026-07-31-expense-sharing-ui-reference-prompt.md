# Expense-sharing mobile UI reference map and AI prompt

**Date:** July 31, 2026  
**Authoritative product specification:** `/Users/alee/Documents/projects/ai playground/splitwise-clone/architecture/2026-07-31-expense-sharing-project-spec.md`  
**Target:** Expo / React Native mobile application for iOS and Android

This document maps the available Mobbin screenshots to the approved v1 specification and provides a copy-ready prompt for an AI designer or implementation agent.

## Reference sources

### Splitwise reference library

- Catalog: `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/catalog.json`
- Flow analysis: `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/flows/CORE_FLOWS.md`
- Image root: `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/`

Use Splitwise primarily for the shared-expense information architecture, ledger model, group/friend structure, expense lifecycle, balances, and settlement sequence.

### Contemporary native-mobile reference library

- Catalog: `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/catalog.json`
- Image root: `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/`

Use KOHO, Wise, Vipps, GoPay, Revolut and Buddy to modernize shared-expense interactions. Use Copilot Money, Monarch, YNAB and Cleo only for personal-transaction and reporting presentation that remains inside the v1 scope.

The two catalogs contain the complete ordered flow-to-image mappings. Resolve a flow by its `app_name` and `name`, then open every `screens[].local_file` relative to the catalog directory.

## Which references fit the approved specification

| Spec surface | Primary reference | Secondary reference | What to retain |
|---|---|---|---|
| Registration, login and recovery | Splitwise: Onboarding, Logging in, Resetting password | Splitwise: Account settings, Changing password | Short password-first flows, clear recovery path, visible completion state |
| Main navigation | Splitwise: Friends, Groups, Activity, Account | Monarch dashboard hierarchy | Preserve the shared-expense mental model; add a distinct Personal tab |
| Connections | Splitwise: Adding a friend, Friends, Friend profile/settings, blocking/removal | Wise participant search and selection | Search, invitations, pending/active/blocked states, balance preview |
| Group creation and membership | Splitwise: Creating a group, Adding a member, Group detail/settings | Wise and Revolut group creation | Name/image/type, member selector, invite link, member and role management |
| Shared-expense entry | Splitwise: Adding an expense, Adding an expense (group) | KOHO: Adding an expense | Amount-first entry, obvious context, progressive disclosure, one primary save action |
| Payers and splits | Splitwise: Changing payer, Editing split options | Revolut: Splitting a bill | Participant clarity and running totals; implement only Equal and Exact |
| Multiple payers | Extend Splitwise payer selection | No captured reference fully covers the spec | Allow multiple contributors and visibly validate that payer amounts equal the total |
| Currency selection | Splitwise: Changing a currency | None | Show ISO currency and keep balances separated; never imply conversion |
| Receipt attachment | Splitwise: Importing a receipt, Editing a receipt detail | GoPay receipt capture | Camera/library attachment, upload progress, retry and removal; no OCR in v1 |
| Expense detail/edit/delete | Splitwise: Expense detail, Editing expense detail, Expense detail (deleted) | Copilot transaction detail presentation | Audit-friendly detail, edit/delete actions, version/conflict feedback |
| Friend/group balances | Splitwise: Friend profile, Group balances, Group detail | Buddy settlement summary | Explicit “you owe” and “you are owed” language, per-currency sections |
| Settlement recording | Splitwise: Recording a payment | Vipps settlement and Buddy settle-up summary | Clearly state that the app records an external payment and does not transfer money |
| Overpayment | Extend Splitwise Recording a payment | No captured reference covers it | Inline warning before save; explain that the balance will flip to a credit; allow confirmation |
| Debt simplification | Splitwise: Group balances, Turning on simplify debts | None | Present read-only suggestions; never imply that balances or historical postings changed |
| Activity and realtime changes | Splitwise: Activity, Searching Splitwise | Monarch recent-transactions card | Chronological feed, actor/action/context, deep links, new/updated state |
| Reminders | Splitwise: Sending a reminder, Enabling settle-up reminders | None | Review before sending, rate-limit feedback, success state |
| Manual personal transaction | KOHO: Adding an expense | Copilot transaction detail | Amount, income/expense type, category, description/source, date, notes and attachment |
| Personal dashboard | Monarch: Dashboard | Copilot dashboard hierarchy | Income, spending and net summaries by currency; manual-data empty state |
| Personal reports | YNAB: Reflect | Monarch dashboard and Cleo spending review | Category totals and monthly trends; avoid net-worth, budgets and bank-account concepts |
| Shared-spend reporting toggle | Custom screen based on the spec | No direct captured reference | Explain “Your share” versus “Cash out of pocket” before changing the report mode |
| Profile/preferences | Splitwise: Account, Account settings, Customizing notifications | None | Profile, currency/timezone, notification preferences, export and account lifecycle |
| Account deletion | Splitwise: Deactivating account | No reference covers unsettled-balance blocking | Explain the blocking balances/memberships and give direct routes to settle or leave |

## Representative image paths

These are high-value anchors. Use the catalogs for their complete ordered sequences.

### Authentication and app shell

- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/70db38e6-dd65-499c-a58f-e611e1b06f2d.jpg` — entry/login choice
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/8d6848dd-31ff-4a14-9774-7faa90646ac4.jpg` — registration credentials
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/4fc2caf1-b679-45bf-8147-b1aaabb12e18.jpg` — profile/default-currency setup
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/892ad2cc-e3ff-42ec-a99c-3882d6fdc9d7.jpg` — password recovery
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/0a8eddba-d95b-4087-9fa8-b0d973be600d.jpg` — Friends surface
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/8d4a1f26-0dd5-488c-a257-990a28c15159.jpg` — Groups surface
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/cc189bd7-559f-4be6-b83b-97b3f67219ce.jpg` — Activity surface; ignore its bank-connection promotion
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/df8ee205-c7f1-4f2b-861b-7fb0c04e6e16.jpg` — Account surface

### Connections and groups

- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/1c683391-061f-46ec-af63-be129bb4783e.jpg` — add a connection
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/52b20eea-a570-4c21-b338-71e67b42081f.jpg` — friend ledger/profile
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/08e622e8-8e01-42cf-899b-2800fefd223d.jpg` — block confirmation
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/358893c0-cc25-45df-9df9-6667d2ffd491.jpg` — create group
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/e4787d0f-ddaa-454c-bb29-c8caf30118b8.jpg` — add members
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/2616efe7-ac77-469c-a198-5e5741f9c074.jpg` — group ledger
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/9f36de33-ee48-426a-b3df-65cba508f5b2.jpg` — group settings
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/wise/32c22a76-fab2-4e9a-8f5f-4b319dc711e8.jpg` — contemporary participant selection
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/gopay/71be92d0-3f4a-43a0-b1e7-50fae72b8298.jpg` — member selection with clear confirmation

### Expense entry, payer and split

- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/7d5b695d-659f-4f8f-8a50-dc82651d79de.jpg` — shared-expense form
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/81d7df66-32f4-4cb9-abd5-9f3628f80371.jpg` — populated group expense
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/koho/f22407bf-a263-4e11-826b-f07c47f1bdf3.jpg` — clean manual-expense form
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/koho/fd46ec3e-0322-4006-9057-235c6ea690a9.jpg` — amount-first entry with numeric keyboard
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/koho/475292ac-19e3-4c1f-87f5-c75473e5db4b.jpg` — expense review and split summary
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/836c3b1f-c0f0-47c4-8b2a-e5fa9f9f5c27.jpg` — payer/split summary
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/b6edb734-1356-4e15-80e7-8d270d471d81.jpg` — exact-amount split
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/5d621868-819d-4952-8b22-177e2ab3d93c.jpg` — payer selection
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/revolut/3fc54275-80f7-41c1-83ee-2dbff8296221.jpg` — modern equal-split presentation; do not copy Percent or Share modes
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/80642174-05d9-4c9c-b05f-bf22778e8f5c.jpg` — receipt source selection
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/9a07891f-548c-4b23-b54b-2cf1595ad144.jpg` — attachment upload state

### Balances, settlement and activity

- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/a65c5e3d-efa0-456e-8cf2-dc87f760e198.jpg` — group balances
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/f9ccb11d-e020-436f-9ed5-8caf559871f6.jpg` — choose balance/currency to settle
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/d6afe93d-62f4-46f4-88f1-54430380c8e0.jpg` — record payment amount
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/fc8f407c-af7f-4f83-a480-c7c83b351f62.jpg` — recorded-payment confirmation/detail
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/buddy/e1f4374b-33cc-4fcd-b282-b2a3ed6ed3b8.jpg` — compact settle-up explanation
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/118a60b1-191b-460e-924d-2df50405bb46.jpg` — expense detail
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/2b1a86c7-6122-40be-be7d-725a04ce24b8.jpg` — deleted-expense state

### Personal finance

- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/koho/fd46ec3e-0322-4006-9057-235c6ea690a9.jpg` — manual amount and category entry
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/copilot-money/5ebf5abc-02b1-4874-b430-7388635ae074.jpg` — transaction detail bottom sheet
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/monarch/efbd4143-bcdd-46ca-8499-697287ed3f2e.jpg` — recent transactions and dashboard hierarchy
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/ynab/9b65aa8e-31fd-4a72-8664-a54737014198.jpg` — spending breakdown; omit its net-worth module
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/cleo/9d399e65-490e-4b12-86e9-f00072d66ec1.jpg` — optional engaging spending-review pattern; do not trivialize debt

### Settings and lifecycle

- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/7ae4a5e2-577d-4197-b598-55e6434929c6.jpg` — settings hierarchy
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/07475630-26c2-4632-beca-02baec1619e8.jpg` — notification preferences
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/6834f03f-32f8-4b61-a98e-c75e97fb241f.jpg` — account-deactivation warning

## References that must not influence v1

Do not bring these patterns into the product merely because they appear in the screenshots:

- Bank linking, imported bank transactions or connected purchases.
- Budgets, saving goals, investments or net-worth modules.
- Payment processing, cards, wallets, custody or “pay now” behavior.
- Automated currency conversion or combined cross-currency totals.
- Percentage, shares/units or adjustment split methods.
- Recurring shared expenses.
- Receipt OCR or automatically extracted line items; v1 only attaches images.
- OAuth/social sign-in, Face ID app lock, subscriptions or Pro upsells.
- Group charts/totals beyond the balances and reports required by the spec.
- A restore-expense action unless separately approved; the immutable audit history is required, but restoration is not.
- Splitwise’s branding, illustrations, mascots, colors, copy or exact layouts.

## Copy-ready AI prompt

You are a senior mobile product designer and Expo/React Native implementation engineer. Design and, when requested, implement the v1 mobile experience defined by the authoritative specification below.

### 1. Read the source of truth first

Read this file completely before proposing screens or writing code:

`/Users/alee/Documents/projects/ai playground/splitwise-clone/architecture/2026-07-31-expense-sharing-project-spec.md`

The specification is authoritative. If a screenshot, existing flow document or personal assumption conflicts with it, follow the specification.

Also read:

- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/flows/CORE_FLOWS.md`
- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/catalog.json`
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/catalog.json`

The catalogs map every Mobbin flow to its ordered local image sequence. Open and inspect the actual images; do not infer their UI from filenames or flow names alone.

Image roots:

- `/Users/alee/Documents/projects/ai playground/splitwise-clone/design/research/screens/`
- `/Users/alee/Documents/projects/ai playground/mobile-finance-mobbin-core/screens/`

Use the “Representative image paths” and fit table earlier in this document as the reference routing map.

### 2. Product model and navigation

This is a native iOS and Android application built with Expo, not a web app.

Use a five-destination authenticated navigation model:

1. Friends — direct balances and direct ledgers.
2. Groups — group ledgers, members and balances.
3. Activity — chronological shared financial events and reminders.
4. Personal — manual personal transactions and reports.
5. Account — profile, preferences, export and lifecycle.

Provide a context-aware add action. Shared contexts create a shared expense; Personal creates manual income or expense. Never let users accidentally create a personal entry while believing it affects a shared balance, or vice versa.

### 3. Reference precedence

- Use Splitwise for shared-expense information architecture and functional sequencing.
- Use KOHO for amount-first manual entry and compact review.
- Use Wise and GoPay for participant selection, search and confirmation.
- Use Revolut for a contemporary split layout, but expose only Equal and Exact.
- Use Buddy and Vipps for understandable settlement summaries.
- Use Copilot Money for transaction-detail hierarchy.
- Use Monarch for dashboard and recent-transaction hierarchy.
- Use YNAB only for category-based spending visualization.
- Use Cleo sparingly for approachable language, never to gamify debt or financial distress.
- Synthesize a coherent original design system. Do not pixel-copy any reference or combine unrelated brand styles.

### 4. Required v1 surfaces

Design the complete states and transitions for:

- Registration, login, password recovery and profile.
- Connection request send, receive, accept, decline and cancel; blocking and blocklist.
- Friend list, friend ledger/profile and direct balance.
- Group list, create group, member invitations, roles, removal/leave and group settings.
- Shared expense creation for direct and group contexts.
- One or multiple payers.
- Equal and exact-amount splits only.
- Per-friend and per-group balances separated by currency.
- Expense detail, edit and delete with visible activity/audit context.
- Recorded settlement, partial settlement and overpayment.
- Read-only debt-simplification suggestions.
- Activity history, realtime-change state, search and reminders.
- Receipt/image attachment with upload progress, retry and removal.
- Manual personal income/expense entry.
- Personal transaction list/detail/edit/delete.
- Personal reports for income, spending, net, category totals and monthly trends.
- “Your share” versus “Cash out of pocket” report-mode preference.
- Notifications, data export and account deletion blocked by unsettled balances or active memberships.

### 5. Financial interaction rules

- Always express the relationship in words: “You owe Sam,” “Sam owes you,” or “Settled.” Do not rely on signs or color alone.
- Use tabular numerals for money. Show the currency code where ambiguity is possible.
- Keep currencies in separate sections and totals. Never silently convert or combine them.
- In expense entry, display a live reconciliation: total expense, total paid and total allocated. Disable save and explain the exact discrepancy until payer and split sums equal the total.
- Equal split must display deterministic remainder allocation when minor units do not divide evenly.
- Multiple-payer entry must let users add contributors and exact paid amounts without confusing paid amounts with owed shares.
- Settlement must explicitly say that the app records money transferred elsewhere; it does not move money.
- If settlement exceeds the current balance, show a nonblocking warning with the current amount, entered amount and resulting credit. Require deliberate confirmation but permit the action.
- Debt simplification is a suggestion view only. Never rewrite expense history or imply that past obligations changed.
- For edit/delete, provide review, clear consequences and success feedback. Surface version conflicts by showing that newer data exists and offering refetch/review; never silently overwrite.
- Prevent double counting by warning when a personal transaction may duplicate a shared expense, as specified, without inventing automatic deduplication.

### 6. Mobile design and accessibility standards

Follow:

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) and [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility).
- [Material Design 3](https://m3.material.io/) and [Android accessibility guidance](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility).
- [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/), including error identification, accessible authentication and error prevention for financial/data changes.
- [OWASP MASVS](https://mas.owasp.org/MASVS/) for authentication, secure storage, privacy and sensitive operations.

Enforce these implementation details:

- Minimum touch targets: 44×44 pt on iOS and 48×48 dp on Android.
- Support Dynamic Type/font scaling to 200%, VoiceOver and TalkBack.
- Text contrast at least 4.5:1; large text and meaningful non-text UI at least 3:1.
- Do not communicate balance state using color alone; pair color with labels, icons and signed wording.
- Provide accessible names, roles, values and hints for every control; announce validation, upload, save and realtime status changes.
- Respect safe areas, keyboard avoidance, system back behavior and platform navigation conventions.
- Provide visible focus/pressed/disabled/loading states. Do not use gesture-only actions; supply visible alternatives.
- Keep primary actions reachable and singular. Use progressive disclosure for category, date, notes, currency, receipt and advanced payer/split configuration.
- Use confirmation or a reversible path for destructive or financially consequential changes, consistent with WCAG 2.2 error-prevention guidance.
- Request contacts, camera, photos and notifications only at the moment of need, explain why, and provide a useful denied-permission path.
- Keep tokens in SecureStore, avoid sensitive data in logs and minimize exposed financial information in notifications/app-switcher previews.

### 7. State completeness

Every primary surface must include:

- First-use and empty state.
- Populated state.
- Loading/skeleton state.
- Recoverable error with retry.
- Offline cached-read state.
- Local draft state and resume/discard behavior.
- Saving/uploading state that prevents duplicate submission.
- Success feedback.
- Permission-denied state when relevant.
- Realtime “updated elsewhere” state.
- Optimistic-concurrency conflict state for edited financial records.
- Destructive confirmation where relevant.

Financial mutations require connectivity. Never present a locally queued financial mutation as committed. Offline support is limited to cached reads and local drafts.

### 8. Visual direction

Create an original, calm and trustworthy financial interface:

- Prioritize names, relationships and amounts over decoration.
- Use generous spacing, strong typographic hierarchy and restrained surfaces.
- Use one primary brand color plus semantic positive, negative, warning and neutral tokens.
- Use subtle motion only to clarify navigation, successful saves, changed balances or reordered information.
- Avoid playful illustrations in high-stakes warnings, debt, deletion, blocking and settlement.
- Keep shared and personal finance visually related but clearly labeled as separate contexts.
- Use platform-native components and behaviors where they improve familiarity; do not force identical iOS and Android chrome.

### 9. Deliverables and quality bar

Before implementation, produce:

1. A v1 screen inventory mapped to specification sections.
2. Navigation and state diagrams for shared expenses and personal finance.
3. A reference matrix stating which screenshot influenced each screen and what was intentionally rejected.
4. Reusable design tokens and component inventory.
5. Wireframes for the full everyday loop.
6. High-fidelity designs for all primary and exception states.
7. Accessibility annotations and financial validation behavior.
8. An implementation plan for Expo Router and reusable React Native components.

When implementing, keep presentation components separate from server state and financial calculations. The client may validate and preview, but it must never invent authoritative balances. Verify both iOS and Android behavior and test the primary loops with large text, screen readers, reduced motion, slow network, offline mode and mutation retries.

