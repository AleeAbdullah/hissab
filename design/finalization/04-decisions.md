# Design decisions and reference reasoning

Why the design looks the way it does: which references were retained or rejected, which visual
direction was chosen, and what each choice obliges elsewhere. Interactive artifacts live in
[`mockups/`](mockups/).

---

## Visual direction record

**Date:** August 2, 2026 (direction) · August 3, 2026 (variant, tokens, list density)
**Status:** **Direction A — Grouped Ledger, variant A1, list density L1.** All three resolved below.
**Final artifacts:** [`00-index.html`](mockups/00-index.html) indexes all 35 screen files.
[`17-add-expense.html`](mockups/17-add-expense.html) carries A1 and its validation states;
[`05-friends.html`](mockups/05-friends.html) carries L1 and its accessibility-size list state. Shared runtime
tokens are in [`_tokens.css`](mockups/_tokens.css).

Per [`README.md`](README.md) (Visual checkpoint), all three directions render the **same** shared-expense
editor content so visual differences can be judged without changing the product model: Winter Trip brunch,
USD 45.00, two payers, equal split, balanced reconciliation.

### Held constant across all three

Tokens, type roles, tabular numerals, 44 pt minimum targets, `Shared expense · Winter Trip` context marker with
an explicit Change action, amount-first composition, `PayerSummary` and `SplitSummary` as separate rows, and a
single bottom `Save shared expense` action. Only three things vary: **surface strategy**, **amount prominence**,
and **where reconciliation lives**.

### Directions

| | A — Grouped Ledger | B — Statement | C — Keypad First |
|---|---|---|---|
| Surfaces | Inset white cards, radius 16, on canvas | Edge-to-edge rows, hairlines and caps labels only | Tinted `brandSubtle` hero + compact grouped rows |
| Amount | Large Title inside a summary card | Large Title on plain surface, hairline under | 40 px in a tinted hero, keypad always present |
| Reconciliation | Inline card, last thing before the action | **Pinned** above the action, always visible | Condensed to one line, welded to the action bar |
| Brand usage | Cancel, Change, action | Cancel, Change, caret, action | Cancel, Change, hero tint, caret, action |
| Feels like | Platform Settings | An audit record | A payment app |

#### Observed tradeoffs

- **A** — most familiar and lowest-risk, but card chrome costs vertical space: reconciliation sits below the
  fold, and reaching it scrolls the amount away. For a surface whose whole job is validating three numbers
  against each other, the decisive component being off-screen is a structural cost, not a polish issue.
- **B** — reconciliation and the amount are simultaneously visible with no scrolling, and it reads as calm and
  audit-friendly, matching the stated visual principle. Weakest at conveying "modern"; risks feeling austere.
- **C** — fastest amount entry and the reconciliation bar can never be missed, but the persistent keypad
  consumes roughly half the viewport, forcing `PayerSummary`/`SplitSummary` into side-by-side chips and pushing
  Receipt/Note out of view. The tinted hero also spends brand color on decoration rather than action.

### Reference reasoning

Grounded in [the reference matrix below](#reference-matrix), Shared expense editor / Payers / Splits rows.

Retained from the Splitwise captures:

- The running-total footer in `b6edb734` ("$0.00 of $20.00 / $20.00 left") is the direct ancestor of
  `ReconciliationPanel`. It proves a persistent validity readout works; the specification extends it from a
  single shortfall to explicit Total / Paid / Allocated. Directions B and C keep it persistent; A does not.
- The amount hierarchy in expense detail `118a60b1` (small label, dominant amount, then the payer → owes
  breakdown) informs the amount treatment in all three.

Rejected, and where:

- `7d5b695d` / `81d7df66` place **description before amount** with both as underlined inline fields. All three
  directions invert this to amount-first.
- The prose chip "Paid by you and split equally" collapses two independent decisions into one control. All three
  split it into separate `PayerSummary` and `SplitSummary` rows.
- Header `Save` in the top-right is replaced by one bottom action with an action-specific label.
- Per-field icon tiles are dropped as dated chrome.
- `b6edb734`'s five-way split-mode toolbar (=, 1.23, %, bars, +/−) and mascot illustration are out of scope;
  Equal and Exact only, no ornament.
- `5d621868` defaults to a single payer with "Multiple people" behind a disclosure. All three surface a payer
  count directly, because multiple payers is a first-class spec case.

### Reference gap

the reference matrix below cites KOHO, Revolut, Monarch, YNAB, Wise, GoPay, Copilot, Buddy, Cleo and Vipps
screenshots, but `../../research/screens/` contains only the 158 Splitwise captures described by
`../../research/catalog.json`. Those citations could not be visually verified for this checkpoint; the
non-Splitwise influences above were taken from the matrix's written intent only.

### Resolved: reconciliation placement — A1, panel scrolls

Direction A was selected with the reconciliation panel scrolling as the last card in the form. That leaves
Total / Paid / Allocated off-screen whenever the amount is visible, which is a problem for the mismatch,
remainder, incomplete-contribution and offline states in
[`02-contracts.md`](02-contracts.md#everyday-loop-wireframes) (Exception-state wireframe set) — in every one of those, the panel
is the text the user must read *before* deciding to save, and `PrimaryAction` is disabled with the reason
stated adjacent to it.

The finalized add-expense frames preserve the selected A1 behavior:

- **A1** — panel scrolls with the form. Matches what was chosen. Receipt and Note stay visible; validity does not.
- **A2** — same card lifted out of the scroll and pinned above the action, section heading dropped because
  position now carries the meaning. Amount and validity are always co-visible; Receipt and Note move below the
  fold instead.

A2 costs one card of permanent vertical space and pushes two progressive rows down. A1 costs a scroll every time
a number needs checking.

**A1 selected August 3, 2026.** The form stays pure and Receipt and Note remain visible.

#### Binding consequence of A1

Because the panel can be off-screen, the footer must carry validation. This is not optional polish — it is what
keeps A1 compliant with [`02-contracts.md`](02-contracts.md#accessibility-and-financial-validation):

- The disabled-action rule requires the primary save's disabled state **and its adjacent reason** to be available
  to accessibility services. With the panel scrolled away, the only thing adjacent to the action is the footer.
- The reconciliation rules require the exact difference to be named, with currency and absolute amount, positive
  meaning "add" and negative meaning "remove".

So `PrimaryAction` gains a reason slot directly above it, populated whenever save is unavailable, and the
`PayerSummary` / `SplitSummary` rows show their own shortfall inline so the form is not silent while scrolled.
The reconciliation panel remains the authoritative full breakdown; the footer is the always-visible summary of
why save is blocked. Demonstrated in [`17-add-expense.html`](mockups/17-add-expense.html):

| State | Footer | Row treatment |
|---|---|---|
| Balanced | Action alone, enabled | `USD 45.00 paid` in `textSecondary` |
| Paid-total mismatch | `Add USD 12.00 to payer amounts.` + disabled action | `USD 33.00 of USD 45.00` in `negative` with weight |

Verified contrast: disabled label `textSecondary` on `surfaceSubtle` is 5.42:1; reason text `negative` on
`canvas` is 6.14:1. Both clear the 4.5:1 normal-text floor. Color is never the sole carrier — the reason pairs an
icon with explicit language, and the row shortfall states both amounts rather than relying on red.

### Resolved: dark tokens

The token table previously specified dark only as intent ("near-black neutral", "lighter indigo").
Real hexes were derived on August 3, 2026 and verified by computing WCAG ratios for every text token against all
three dark backgrounds. Weakest passing text pair is `textSecondary` on `surfaceSubtle` at 6.49:1. Rendered and
checked via the light/dark toggle shared by every final mockup file.

Two structural changes came out of that verification rather than being decided up front:

- **`border` split into `borderDivider` and `borderControl`.** One token was serving both row dividers and input
  boundaries. At `#D8DCE5` it holds 1.37:1 on `surface` — fine for a decorative hairline between rows, failing
  for meaningful non-text UI, which requires 3:1. Dividers keep the light value; control boundaries move to
  `#767F93` light / `#616B80` dark. List density is unchanged.
- **`onBrand` added.** Dark `brand` is a light indigo, so white-on-brand collapses to 2.36:1 and `PrimaryAction`
  would have failed in dark mode. The label is now a token: white in light, `#0F1116` in dark, giving 7.99:1.
  The alternative was darkening the dark-mode fill, which would have made the primary action recede.

### Resolved: list-heavy surfaces are cards per currency section — L1

Direction A was validated on a form. `F01` Friends, `G05` group balances and `Y01` Activity are long lists, and
applying inset cards literally is not obviously right there. Tested in
the finalized [`05-friends.html`](mockups/05-friends.html) frames with `F01` at realistic density — two currencies, a multi-ledger
person, a settled person, and a pending-requests entry.

The first measurement favoured edge-to-edge rows:

| | L1 as first built (padding 16, wrapping breakdown) | L2 — edge-to-edge rows |
|---|---|---|
| Row width | 361 px | 393 px (+32) |
| Identity column | 274 px | 306 px (+32) |
| Tallest row | 121 px | 103 px |
| Five rows total | 439 px | 367 px (−16%) |
| Breakdown wrap, John Doe | 4 lines | 3 lines |

**L1 selected August 3, 2026 — Direction A applied literally.** The card is the direction's primitive, and
splitting the vocabulary so that half the product is inset cards and half is edge-to-edge rules would have made
the card mean "form" rather than "group of related things". Consistency was judged worth more than the 72 px.

The 16% penalty was then removed rather than accepted, by attacking its two causes:

- **Row padding 16 → 12 inside cards.** The card is already inset 16 from the screen edge, so a second 16 doubled
  the gutter to 32 and pushed the breakdown onto an extra line. Identity column recovers to 282 px.
- **One line per ledger, truncated, instead of a wrapping paragraph.** The breakdown no longer reflows; each
  ledger gets exactly one line.

| | L1 as selected | L2 |
|---|---|---|
| Row width | 361 px | 393 px |
| Identity column | 282 px | 306 px |
| Tallest row | **85 px** | 103 px |
| Five rows total | **349 px** | 367 px |
| Breakdown wrap, John Doe | none — 3 truncated lines | 3 wrapped lines |

Tuned L1 is 18 px shorter than L2 over five rows and 18 px shorter in its tallest row. The measurement that
argued for L2 no longer holds.

**Truncation is asymmetric, and that is a contract, not a detail.** Clipped money is forbidden, so within each
breakdown line the amount is fixed and the ledger name absorbs all the pressure: `flex:0 0 auto` on the amount,
`min-width:0` with ellipsis on the name. Verified `anyMoneyClipped:false` across all five rows.

So the scope of the card is:

- **`Card`** — everywhere. Summaries and decisions (the editor's grouped fields, `ReconciliationPanel`,
  settlement review, overpayment review, report summaries) *and* lists, one card per currency section with a
  caption `SectionLabel` above it on canvas.
- Row padding inside a list card is **12**, not 16. Padding 16 is for cards whose content is fields, not rows.

`CurrencySection`'s never-merge contract is now enforced structurally: two currencies cannot share a card.

#### Follow-on: the ISO code leaves the breakdown line

At 282 px the identity column truncated hard — "Winter Trip · you owe USD 200.00" rendered as
"Wi… you owe USD 200.00". Three fixes were considered: a two-line breakdown, moving the breakdown to the detail
screen, or shortening the line.

**Shortening won, on August 3, 2026: the ISO code is dropped from breakdown lines.** The row now reads
`Winter Trip · you owe 200.00` inside a card headed `US DOLLAR · USD`. The reasoning is structural, not
cosmetic — L1 makes two currencies unable to share a card, so the card itself scopes the currency, which is
exactly the condition the per-row ISO rule existed to cover. Repeating `USD` three times in a single row cost
about 40 px and disambiguated nothing.

The two rejected options were rejected on cost: a two-line breakdown takes a three-ledger row from 85 px to
roughly 125 px, giving back more than the L1 tuning won; moving the breakdown to the detail screen would strip
the Friends list of *which* ledger a debt belongs to, which is the reason that list is worth reading.

What did not change: the direction phrase ("you owe" / "owes you") is still never dropped, and the balance column
at the right still carries its ISO code.

### Implementation status

Direction A, variant A1, with resolved tokens and card-everywhere lists is implemented directly from the 35 final
HTML mockup files. There is no Figma artifact or review gate. Runtime component rules are in
[`03-design-system.md`](03-design-system.md), and the complete screen-to-route map plus approved deviations are in
[`05-implementation-handoff.md`](05-implementation-handoff.md).

Some data contracts remain provisional even though their visuals are final. Until their backend modules exist,
their routes stay visible and render an honest Coming Later state.

---

## Reference matrix

The catalogs were resolved by flow and every screenshot in the relevant ordered sequences was inspected. “Retain” describes an interaction principle, not a pixel copy.

### Screen influence

| Product surface | Primary screenshot(s) | Retain | Intentionally reject |
|---|---|---|---|
| Welcome / auth | Splitwise `70db38e6…`, `8d6848dd…`, `892ad2cc…` | Short credential-first paths and obvious recovery | Splitwise illustration, brand color, exact copy/layout; social login |
| Profile setup | Splitwise `4fc2caf1…` | Default-currency step and visible completion | Combining currencies later; upsell |
| Friends | Splitwise `0a8eddba…`, `52b20eea…` | Relationship-led list and friend ledger | Color-only owed state and dated sparse chrome |
| Groups | Splitwise `8d4a1f26…`, `2616efe7…`, `9f36de33…` | List → ledger → balances/settings mental model | Exact green/orange styling and group charts outside scope |
| Connection/member selection | Splitwise `1c683391…`, `e4787d0f…`; Wise `32c22a76…`; GoPay `71be92d0…` | Search, selected count, identity confirmation, pending state | Banking contacts/promos, payment requests, auto-import |
| Shared expense editor | Splitwise `7d5b695d…`, `81d7df66…`; KOHO `fd46ec3e…`, `f22407bf…`, `475292ac…` | Amount-first composition, clear context, compact review, one save action | Splitwise exact form, KOHO card/account associations |
| Payers | Splitwise `5d621868…`, `836c3b1f…` | Participant clarity and payer summary | Single-payer assumption; confusing “paid” versus “owed” labels |
| Splits | Splitwise `b6edb734…`; Revolut `3fc54275…` | Participant rows, running exact totals, modern equal split | Percentage, shares/units, adjustment and “pay now” behavior |
| Receipt | Splitwise `80642174…`, `9a07891f…`; GoPay receipt flow | Source selection, preview, progress, retry/removal | OCR, extracted items, automatic split suggestions |
| Expense detail | Splitwise `118a60b1…`, `2b1a86c7…`; Copilot transaction detail | Strong amount/detail hierarchy and deleted audit state | Bank/card controls, restore action, merchant enrichment |
| Group balances | Splitwise `a65c5e3d…` | Per-person settlement relationships and currency context | Silent simplification or mixed-currency total |
| Settlement | Splitwise `f9ccb11d…`, `d6afe93d…`, `fc8f407c…`; Buddy `e1f4374b…`; Vipps settlement flow | Choose a currency balance, concise review, clear result | Payment execution, wallet/card rails, celebratory framing that obscures consequence |
| Activity | Splitwise `cc189bd7…`; Monarch recent-transaction hierarchy | Chronological actor/action/context and scannable rows | Bank-connection promotion and account aggregation |
| Personal entry | KOHO `fd46ec3e…`; Copilot detail | Amount, type, category and compact details | Imported bank transaction assumptions |
| Personal dashboard | Monarch `efbd4143…`; Copilot dashboard | Modular summary and recent rows | Accounts, investments, net worth, budgets |
| Personal reports | YNAB `9b65aa8e…`; Monarch; Cleo spending review | Category totals and readable monthly movement | Net worth/plans; debt gamification; judgmental labels |
| Account / notifications | Splitwise `7ae4a5e2…`, `07475630…` | Familiar hierarchy and granular preferences | Pro/subscription rows and biometric-lock scope expansion |
| Account deletion | Splitwise `6834f03f…` | Serious consequence language | One-step deactivate that ignores unsettled ledgers |

### Custom specification-led surfaces

| Surface | Why a direct reference is insufficient | Final design requirement |
|---|---|---|
| Multiple payers | Captured flows do not validate multiple exact contributions against one total | Dedicated paid-amount rows plus Paid/Total discrepancy |
| Equal-split remainder | References do not explain deterministic minor-unit allocation | Name the recipient and exact remainder before save |
| Overpayment | Captured settlement flows assume the entered amount closes or reduces debt | Current balance, entered amount and resulting credit; nonblocking confirmation |
| Debt simplification | Reference exposes the feature without sufficiently protecting ledger history | Read-only suggestion label and explicit “does not change expenses or balances” copy |
| Report-mode toggle | No reference distinguishes economic share from cash flow in this model | Educational sheet with both definitions and a small example |
| Version conflict | Consumer references do not expose optimistic concurrency | Show newer data exists; refetch/review; never overwrite silently |
| Offline mutation | References may imply queued actions | Cached/read-only and draft labels; financial save unavailable until online |
| Deletion eligibility | Reference deactivation does not handle immutable ledgers | List exact blocking currencies/memberships and direct routes to resolve them |

### Originality boundary

The final system uses original Ledger Blue tokens, neutral grouped surfaces, platform-native type and controls, and specification-specific reconciliation. It does not reuse a source app’s logo, illustrations, mascots, branded copy, exact color palette or exact screen composition.
