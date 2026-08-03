# Runtime design system

Direction A (Grouped Ledger), variant A1, list density L1. The final visual references are the 35 HTML files in
[`mockups/`](mockups/); this document defines how their shared language maps to Expo/React Native.

## Visual principle

Calm, relational and audit-friendly. Names, context and amounts come before ornament. Shared and Personal use
the same foundation but are always named in headers, context markers, actions and success feedback.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#F6F7FB` | `#0F1116` | App background |
| `surface` | `#FFFFFF` | `#171A21` | Cards and sheets |
| `surfaceSubtle` | `#EEF1F7` | `#1F2430` | Context and selected backgrounds |
| `textPrimary` | `#171A22` | `#F2F4F8` | Primary text and money |
| `textSecondary` | `#5B6270` | `#A0A8B8` | Supporting text |
| `borderDivider` | `#D8DCE5` | `#2C323E` | Decorative row dividers only |
| `borderControl` | `#767F93` | `#616B80` | Meaningful control boundaries |
| `brand` | `#3757C5` | `#8FA6F0` | Primary actions, selected navigation, focus |
| `brandSubtle` | `#EEF1FF` | `#1B2340` | Selected/background emphasis |
| `onBrand` | `#FFFFFF` | `#0F1116` | Text on brand fill |
| `positive` | `#156B4A` | `#5FD3A0` | Owed-to-user states with words/icons |
| `negative` | `#B42318` | `#FF8A80` | User-owes and error states with words/icons |
| `warning` | `#8A4B0F` | `#F0B457` | Offline, stale and overpayment notices |
| `focus` | `#3757C5` | `#8FA6F0` | Keyboard/switch focus |

Semantic color is never the only carrier. Do not hard-code white on `brand`; dark mode uses `onBrand` near-black.

## Typography

- System fonts: San Francisco on iOS and Roboto on Android. No bundled display font.
- Allow system font scaling through 200%; do not cap `maxFontSizeMultiplier`.
- Roles: Large Title 34/41, Title 28/34, Headline 20/25, Body 17/23, Supporting 15/20, Caption 13/18.
- Money uses tabular numerals and never truncates.
- Currency and value stay together; names may wrap or truncate according to the row contract.
- Important values and errors are selectable where copying is useful.

## Layout tokens

| Token | Value |
|---|---:|
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.12` | 48 |
| `radius.control` | 12 |
| `radius.surface` | 16 |

- Minimum targets are 44×44 pt on iOS and 48×48 dp on Android.
- Use flex layout and `useWindowDimensions`; do not derive layout from a fixed 393 px canvas.
- Screens start with `ScrollView`, `FlatList` or `SectionList` using automatic inset adjustment.
- Account for keyboard and bottom safe area without overlaying validation or money.
- Use continuous curves for rounded cards where supported.

## Navigation and native controls

- Exactly five native tabs: Friends, Groups, Activity, Personal and Account.
- Each tab owns a native stack; shared detail routes preserve the originating tab on back.
- Use native headers, search, alerts, menus, date controls, switches, segmented controls and form sheets.
- The HTML phone/status/tab chrome is illustrative. Native iOS and Android behavior wins; screen content,
  hierarchy, tokens and copy follow the final mockup.
- Use semantic platform icon equivalents. No custom global floating action button.
- Header Save and bottom Save are both valid: the final mockup for each screen decides placement.

## Surface rules

### Card

- Every deliberate grouped surface is an inset card on `canvas`; there are no edge-to-edge product lists.
- `surface` fill, radius 16, subtle `0 1px 2px` shadow, clipped children.
- Field-card rows use 12 vertical / 16 horizontal padding.
- List-card rows use 12 / 12 padding.

### SectionLabel and CurrencySection

- Section labels sit on `canvas`, outside the card.
- A financial list card contains exactly one currency.
- Never combine currencies into one total or card.

### Row

- Minimum height 52, gap 12, optional top divider using `borderDivider`.
- Use value layout for short data and stack layout for phrases/instructions.
- At accessibility sizes, horizontal label/value pairs may stack; values and controls must not clip.

### LedgerRow

- Avatar, identity column, balance column and chevron.
- Ledger breakdown uses one line per ledger.
- Ledger name may ellipsize; direction phrase and amount never do.
- The currency section scopes breakdown amounts, while the right balance column retains explicit currency where
  ambiguity remains.
- `settled` shows the word “Settled,” not a zero or signed number.

### MoneyText

- Accepts integer minor units and an ISO 4217 code.
- Uses locale-aware formatting, tabular numerals and an accessible full spoken value.
- Formatting is presentation only; financial decisions never use floating point.

### ContextMarker

- Always shows either `Shared expense · {ledger}` or `Personal`.
- Changing context requires an explicit action.

### PrimaryAction

- One primary action per surface.
- Use an action-specific verb.
- Disabled financial actions include an adjacent, announced reason.
- Offline financial save reads `Connect to save`.
- A1 duplicates the exact correction beside the action because reconciliation may have scrolled away.

### ReconciliationPanel

Fixed order: Total, Paid, Allocated. Invalid states name currency, absolute difference and correction:

- `Add USD 12.00 to payer amounts.`
- `Remove USD 0.01 from exact splits.`
- `Paid matches. Allocate USD 12.00 more before saving.`

### StatusBanner

Supports offline, stale, updated elsewhere, upload, conflict, recoverable error and success. Changes that affect
the current decision announce politely; they do not reorder content under the user.

## Core component contracts

| Component | Contract |
|---|---|
| `AppScreen` | Native header + safe scroll/list + loading/error/empty/content slots |
| `Card` | The single grouped-surface primitive |
| `SectionLabel` | Canvas label for one related group or currency |
| `MoneyText` | Minor-unit formatting and accessible value |
| `BalanceStatement` | “You owe {name},” “{name} owes you,” or “Settled” |
| `PersonRow` | Avatar fallback, name, status and optional balance |
| `LedgerRow` | Identity, scoped ledger breakdown and explicit balance phrase |
| `ActivityRow` | Actor, action, context, time and optional amount |
| `ContextMarker` | Persistent Shared/Personal ownership cue |
| `AmountEditor` | Currency, localized decimal input and validation |
| `SummaryRow` | Payer or split summary with valid/short/over state |
| `ParticipantAmountRow` | Explicitly labelled Paid or Owes input |
| `ReconciliationPanel` | Total/Paid/Allocated and correction |
| `AttachmentTile` | Preview, progress, retry, replace/remove; no OCR |
| `StatusBanner` | Network, upload, stale, conflict and success feedback |
| `PrimaryAction` | Singular action with disabled reason |
| `DestructiveAction` | Explicit verb and consequence; confirmation required |
| `ReportModeControl` | Your share/Cash out of pocket with education entry |
| `CategoryBreakdown` | Chart plus equivalent exact textual values |
| `ComingLater` | Honest unavailable-backend state with title and purpose; never sample data |

## State contract

Every primary surface handles applicable states from [`02-contracts.md`](02-contracts.md#required-state-contract).
Do not create a route per state. Loading, error, offline, confirmation, conflict and success are states or native
dialogs within their owning route.

Skeletons match final geometry. Recoverable errors retain input. Financial mutation timeouts retain the same
idempotency key while status is checked. Conflict never auto-merges allocations.

## Accessibility

- Balance statements are complete phrases, never bare signed numbers.
- Paid and Owes inputs have distinct labels.
- Charts have exact textual equivalents.
- Focus order follows the visible decision order.
- Validation, upload, save and realtime changes are announced without repeatedly interrupting input.
- Respect Reduce Motion and system appearance.
- Password fields allow password managers, paste and external keyboards.

## Motion

- Fast feedback: 160 ms; navigation/detail transitions use native timing.
- Reduced Motion uses opacity or an instant change instead of translation/scale.
- Never celebrate debt or destructive actions.

## Implementation source

Use [`05-implementation-handoff.md`](05-implementation-handoff.md) for the route map, source boundaries and
approved deviations from static mockup copy or behavior.
