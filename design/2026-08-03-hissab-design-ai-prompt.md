# Hissab brand, mobile, and campaign prompt

This artifact consolidates the approved Hissab product specification, finalized mobile-design system, final HTML mockups, and current implementation boundary into one self-contained prompt for a design AI.

## Source-of-truth summary

### Confirmed product

- Hissab is a native iOS and Android app for two related but deliberately separate jobs: tracking shared expenses with friends or groups, and manually tracking personal income and expenses.
- It records obligations and settlements made elsewhere. It does not transfer, hold, import, or automatically convert money.
- Shared expenses support one or multiple payers, Equal or Exact splits, balances separated by currency, audit-preserving edits/deletions, receipt images, externally completed settlements, reminders, and activity history.
- Personal finance supports manual income/expense entries, categories, attachments, and currency-specific reports. Shared spending can be reported as the user's owed share or cash paid out of pocket. Settlements never count as income or spending.
- The core users are individuals sharing costs directly, couples, households, trip groups and other informal groups, group owners/admins, and the same individuals who want optional manual personal tracking. No merchant, accountant, organization, or enterprise audience is defined.
- The approved product tone is calm, relational, precise, trustworthy, factual, non-judgmental, and audit-friendly.

### Confirmed visual direction

- The main direction is a **Warm Editorial Ledger** identity layered onto the finalized **Calm Ledger Precision / Grouped Ledger** product system: burnished copper, deep ink, warm neutral paper-like surfaces, crafted editorial lettering, exact numerical alignment, platform-native controls, and clear relationship language.
- The product-specific signature is the **Total → Paid → Allocated** reconciliation panel used to make shared-expense correctness visible.
- Every grouped surface, including a financial list, is an inset card. Currencies never share a card or total.
- A later user-approved brand decision replaces the earlier Ledger Blue identity with burnished copper around `#A8531B`, deep ink, and warm neutral surfaces. Green is reserved for genuinely positive semantic states. This artifact records that override; [`finalization/03-design-system.md`](finalization/03-design-system.md) remains the interaction, component, and accessibility reference until runtime tokens are separately updated.
- The 35 files indexed by [`finalization/mockups/00-index.html`](finalization/mockups/00-index.html) are the final mobile visual reference. Competitor research is inspiration only and must not be copied.

### Current implementation boundary

- The backend currently implements the Foundation areas: password authentication and recovery primitives, session handling, profile/preferences, connections/direct ledgers, blocking, idempotency, health checks, schema, and outbox infrastructure.
- Groups, shared-expense accounting, balances, payments, personal transactions, reports, attachments, notifications, realtime, export, and deletion are approved target-v1 concepts but do not all have completed API modules yet.
- The Expo client is still starter code and its current icons, splash, colors, and demo screens are not brand evidence.
- The implementation handoff explicitly calls the current Hissab monogram temporary and says it must be replaced when final assets exist.

### Genuine uncertainties / creative freedom

- No Sektra placement, dimensions, crop, or content rules appear in the repository. Sektra work must therefore be adaptable cover-image guidance, not a fabricated platform specification.
- **A — Editorial Reconcile is the selected identity direction.** Its exact vector lettering construction, supporting-mark production refinement, illustration system, campaign CTA, and marketing-channel sizes remain open design work.
- No target geography, language, cultural motif, or official meaning/etymology for the name is documented. Do not infer one from example currencies, names, or timezones.
- Group type taxonomy, invitation transport, some group ownership/removal rules, activity filters, payment editing, report/export details, and several other backend contracts remain provisional. Show only the confirmed purpose of those areas; do not invent mechanics.
- No pricing, subscription, bank connection, card, wallet, rewards, payment execution, merchant, or enterprise model is defined.

### Primary evidence used

1. [`../architecture/2026-07-31-expense-sharing-project-spec.md`](../architecture/2026-07-31-expense-sharing-project-spec.md) — approved target product behavior and exclusions.
2. [`finalization/README.md`](finalization/README.md), [`finalization/02-contracts.md`](finalization/02-contracts.md), [`finalization/03-design-system.md`](finalization/03-design-system.md), [`finalization/04-decisions.md`](finalization/04-decisions.md), and [`finalization/05-implementation-handoff.md`](finalization/05-implementation-handoff.md) — approved mobile experience, visual system, and implementation boundary.
3. [`finalization/mockups/00-index.html`](finalization/mockups/00-index.html) and its 35 linked screen files — final visual references.
4. [`2026-08-02-product-ux-ui-design-brief.md`](2026-08-02-product-ux-ui-design-brief.md) and [`2026-08-03-mobile-screen-overview.md`](2026-08-03-mobile-screen-overview.md) — reconciled product summary and designer-facing screen inventory.
5. [`../code/be/README.md`](../code/be/README.md), backend controllers, [`../code/fe/README.md`](../code/fe/README.md), and Expo configuration — confirmation of the current implementation boundary and placeholder frontend state.

## Selected brand identity — A: Editorial Reconcile

**A — Editorial Reconcile is locked as the Hissab identity direction.** It is **wordmark first, symbol second**: personality comes from restrained editorial Hissab lettering and the campaign system, while the app UI stays calm, native, precise, accessible, and legibility-led.

### Fixed brand rules

- The product name reads **Hissab**. No invented etymology or regional symbolism.
- Primary brand color: burnished copper around **`#A8531B`**, supported by deep ink and warm neutral surfaces. Green appears only for a genuinely positive semantic state, never as a general brand accent.
- The **Hissab wordmark is the primary identity asset**. Any symbol is a supporting printer's mark, margin device, favicon, or app-icon reduction; it must not dominate the lockup.
- Campaign/editorial typography may be expressive and crafted. The mobile UI continues to use native system typography, tabular money, familiar controls, and the finalized Grouped Ledger structure.
- Every mark must be original, vector-first, recognizable at app-icon size, and functional in one color.
- No currency sign, coin, wallet, bank, card, calculator, handshake, checkmark badge, payment-transfer metaphor, mascot, or Splitwise-like form.
- Positive/negative semantic colors stay out of the master identity. Debt direction belongs to explicit product language.

### Selected direction — A: Editorial Reconcile

**Brand idea:** Make every record line up.

**Wordmark:** A restrained editorial **Hissab** wordmark in deep ink, with open counters and disciplined spacing. Favor immediate legibility over decorative flourish. The current concept's subtle flared or wedge-like details are accepted as a working reference, but must not be added to or amplified. A small copper reconciliation register sits beside the wordmark like a printer's mark and stays at or below the wordmark's x-height.

**Supporting symbol:** Three short unequal ledger rules resolve against one terminal register, evoking Total, Paid, and Allocated. Use it as punctuation, a margin marker, app-icon reduction, or motion cue—not as the hero.

**Identity system:** Warm paper fields, thin copper rules, marginal ticks, oversized editorial headlines, aligned tabular figures, and stepped crops. In motion, the small register resolves; the wordmark remains stable.

**Tradeoffs:** Strongest product specificity and richest abstract campaign grammar. The supporting mark can still resemble list/alignment tooling if drawn too large or too generically, so scale discipline is essential.

### Not selected — B: Editorial Between Us

**Brand idea:** Clarity between people.

**Wordmark:** A warm humanist-editorial **Hissab** wordmark with generous round counters, subtly inward-facing terminals, and a conversational rhythm. A small copper paired-bracket device sits beside or beneath it as a quiet relationship cue.

**Supporting symbol:** Two open mirrored forms face a shared center rule. Keep it compact and bookish—closer to editorial brackets or marginalia than an app glyph.

**Identity system:** Paired columns, facing names, diptych people imagery, copper hairlines, and one shared center register. Exact amounts anchor the warmth.

**Tradeoffs:** Warmest and most human route. The brackets can read as code, messaging, collaboration, or matchmaking unless the wordmark, ledger rules, and exact financial language consistently lead.

### Not selected — C: Editorial Ledger H

**Brand idea:** A distinctive name, written like a dependable ledger.

**Wordmark:** A fully crafted **Hissab** wordmark whose initial H is a proprietary editorial letterform: two upright ledger columns, a calibrated crossbar, and one subtle reconciliation notch. The remaining letters carry complementary flared terminals and warm, confident rhythm. Copper may accent the H crossbar or a small terminal detail; the word remains primarily deep ink.

**Supporting symbol:** The custom H can be extracted for the app icon and smallest uses, but it is always presented as a reduction of the wordmark rather than a separate hero mark.

**Identity system:** Strong initial caps, vertical ledger columns, crossbar rules, framed crops, oversized word fragments, and precise tabular figures.

**Tradeoffs:** Best natural fit for a wordmark-led identity and strongest tiny-size continuity. H monograms are common, so the full lettering must be unusually ownable or the result will look like a polished placeholder.

### Decision record

| Criterion | A — Editorial Reconcile | B — Editorial Between Us | C — Editorial Ledger H |
|---|---|---|---|
| Product specificity | Highest | Medium–high | Medium |
| Editorial warmth | High | Highest | Medium–high |
| Wordmark-led fit | High | High | Highest |
| Small-size continuity | High if simplified carefully | High | Highest |
| Campaign/cover system | Strongest abstract system | Strongest people-led system | Strongest typographic system |
| Main risk | Reads as list/data tooling | Reads as code/collaboration | Reads as a generic H monogram |

**Locked: A — Editorial Reconcile.** B and C remain above only as historical decision context and are not directions for further development. A best connects the identity to Hissab's core reconciliation behavior while keeping the wordmark primary and the supporting register small.

**Production caveat:** The current wordmark concept is accepted but somewhat too decorative. Final vector refinement should simplify rather than embellish its terminals and stroke character, then verify kerning, small-size legibility, one-color use, light/dark use, and trademark/conflict clearance. The supporting register must remain subordinate to the wordmark.

## Copy this prompt into a design AI

```text
Act as a senior brand designer, product designer, and art director. Create one coherent, original design direction for Hissab that can govern its native mobile app, logo, poster/marketing concepts, overall brand theme, and adaptable cover imagery for a placement called Sektra.

Your work must feel like one brand system, not five unrelated moodboards. Preserve every confirmed product constraint below. Where a choice is explicitly marked as creative freedom, make a thoughtful proposal and label it as a proposal rather than a product fact.

PRODUCT IN ONE SENTENCE

Hissab helps people track shared expenses and exactly who owes whom, record settlements made outside the app, and optionally track their own manually entered income and spending.

CORE PROBLEM

People sharing costs need to record who paid and who benefited, understand relationship balances without manual arithmetic, preserve trustworthy history when an entry changes, and record outside settlements without confusing a recordkeeping app for a payment service. Some of the same people also want simple personal tracking without connecting a bank account.

SOLUTION AND PURPOSE

Hissab provides two related but visibly separate product areas:

1. Shared expenses for friends and groups: record one or multiple payers, split by Equal or Exact amounts, see who owes whom per relationship and per currency, correct entries without erasing their audit history, attach receipt images, review activity, and record settlements that happened elsewhere.
2. Personal finance for one account holder: manually add income and expense entries, categorize them, attach images, and inspect reports separated by currency. Shared spending can be viewed as “Your share” or “Cash out of pocket.”

Hissab records money; it does not move it. It does not transfer or hold funds, connect to banks, import transactions, execute payments, touch cards or wallets, or automatically convert currencies.

TARGET USERS

- Individuals sharing expenses directly with friends.
- Couples, households, trips, and other informal groups.
- Group owners/admins managing members and settings.
- The same individuals who optionally want manual personal income and spending records.

There is no confirmed organization, accountant, merchant, enterprise, geographic, linguistic, or culture-specific audience. Keep people and examples inclusive and globally adaptable. Do not infer a regional identity from sample names, PKR/USD examples, or the product name.

CORE USER JOURNEYS

- First shared expense: register or sign in → connect with a friend or create a group → open that ledger → enter amount and details → configure one or more payers → choose Equal or Exact split → reconcile Total, Paid, and Allocated → save online → inspect the resulting detail and balance.
- Correct an expense: open detail → edit the current version → reconcile the replacement → save → show the updated authoritative balance, or preserve the draft and review a conflict if newer data exists.
- Settle a balance: choose a person and one currency → enter money already paid elsewhere → review the before/after balance → deliberately confirm if the amount creates a credit → record the event. Never suggest that Hissab performs the transfer.
- Personal tracking: open Personal → add manual Income or Expense → enter amount, category, description, date and optional supporting detail → review a possible shared duplicate without automatic merging → save → inspect a currency-specific report.
- Group management: create a group → select members → manage roles/settings → record expenses → review currency-specific balances → optionally view read-only simplified settlement suggestions.
- Account lifecycle: manage profile and sessions → request export when available → resolve balances/memberships before deletion → confirm anonymization while preserving counterparties’ financial history.

CONFIRMED FEATURE BOUNDARIES

Supported or approved for target v1:
- Password authentication, recovery, sessions, profile/preferences, connection requests, blocking.
- Direct friend ledgers and group ledgers.
- One or multiple payers.
- Equal and Exact-amount splits only.
- Balances, reports, and settlement actions separated by currency.
- Audit-preserving expense edits/deletions; no restore action.
- External settlement records, including a deliberate overpayment/credit warning.
- Receipt/image attachments without OCR.
- Activity, reminders, cached reads, local drafts, and conflict/offline states.
- Manual personal income/expense tracking and currency-specific reports.
- Native light and dark appearance and accessibility through 200% text scaling.

Do not add or visually imply:
- Bank linking, transaction imports, cards, wallets, payment execution, custody, automatic FX conversion, crypto, rewards, subscriptions, upsells, or merchant features.
- Budgets, savings goals, investments, net worth, recurring shared expenses, receipt OCR, or automatic itemization.
- Percentage/share/unit split methods; only Equal and Exact are valid.
- Social sign-in, email-verification onboarding, biometric app lock, profile-photo editing, or desktop/web product screens.
- Sample claims about pricing, user counts, ratings, availability, security certifications, or features not described here.

BRAND ESSENCE AND TONE

Use a “Warm Editorial Ledger” brand identity around the product's approved “Calm Ledger Precision / Grouped Ledger” interaction system. The identity should feel authored, human and memorable; the app itself remains calm, native, precise and audit-friendly.

The personality is:
- calm, relational, trustworthy, precise, contemporary, restrained, and audit-friendly;
- editorial, warm and quietly expressive in wordmarks, campaigns, posters and covers;
- factual and respectful around debt, settlements, blocking, conflicts, and deletion;
- confident without looking like a bank, trading app, crypto product, or flashy payment service;
- human enough for friends and households, but never childish or gamified.

Key messaging may draw from these evidence-supported lines:
- “Shared expenses, and exactly who owes whom.”
- “Track shared expenses, see exactly who owes whom, and optionally track your own spending.”
- “Hissab records money—it does not move it.”
- “Split what you actually paid.”
- “Balances stay per currency.”
- “Record settlements you made elsewhere.”

Use Hissab as the product name. Do not invent an etymology or cultural story for the name. Campaign headlines beyond the lines above are creative proposals and should remain faithful to the product facts.

APPROVED DIRECTION AND WORKING VISUAL LANGUAGE

Create a coherent visual system around a crafted Hissab wordmark, burnished copper editorial rules, exact amounts, relationship phrases, aligned ledger rows, and calm grouped surfaces. The wordmark is the primary identity asset; any symbol must remain supporting punctuation or a small-format reduction.

Working light palette:
- canvas #F8F3EB
- surface #FFFDF9
- surface subtle #F1E8DD
- primary text / deep ink #241C18
- secondary text #6B5D54
- divider #D9CBBE
- meaningful control border #7A695E
- burnished copper / brand #A8531B
- brand subtle #F4E1D4
- on-brand #FFF8F0
- positive #156B4A
- negative #A62A22
- warning #8A4B0F

Working dark palette:
- canvas #181411
- surface #211B17
- surface subtle #2B231E
- primary text #F7EFE6
- secondary text #BDAFA2
- divider #3B3029
- meaningful control border #817064
- copper brand adaptation #E59A66
- brand subtle #3B2519
- on-brand #1C1714
- positive #5FD3A0
- negative #FF8A80
- warning #F0B457

Color is never the only signal. Pair owed/owing, success, warning, offline, and error colors with explicit words and icons. Reserve green exclusively for positive semantic states such as “owes you” or confirmed success; never use green as a general identity, decoration, CTA, or campaign accent.

For the mobile UI, use San Francisco/system type on iOS and Roboto/system type on Android. Use tabular numerals for money. App character should come from hierarchy, numerical alignment, relationship wording, and restrained copper accents—not from a decorative display font. The crafted Hissab wordmark and more expressive editorial typography belong to identity, welcome/marketing moments, posters and covers, not dense financial forms. Use approximately 12-point control radii and 16-point grouped-surface radii, restrained shadows, native headers/tabs/sheets/alerts/search/date controls, and generous but efficient spacing.

Every grouped surface is an inset card on the neutral canvas, including lists. A financial list card contains exactly one currency, with its currency label outside the card. Never merge currencies into one total. Every balance statement must read as a phrase such as “You owe Sam,” “Sam owes you,” or “Settled,” not as a bare signed number.

The signature product motif is Total → Paid → Allocated. Treat it as a precise reconciliation rail/panel and a possible source of brand geometry. In the app it is functional, not decorative. When a form is invalid, state the exact correction beside the disabled action.

Avoid:
- cold blue/purple/indigo fintech branding or gradients;
- green as a general brand color rather than a positive semantic signal;
- glass cards, floating decorative blobs, excessive pills/capsules, or generic metric-card grids;
- asymmetrical financial forms or ornamental charts when exact rows answer the question;
- debt celebration, confetti, aggressive red/green trading aesthetics, mascots, or anxiety-driven copy;
- literal copies of Splitwise or any competitor’s logo, palette, mascot, illustration, copy, or screen composition.

MOBILE APP DESIGN OUTPUT

Design for native iOS and Android, phone portrait first. The signed-in app has exactly five tabs:
1. Friends — direct relationships and balances.
2. Groups — group ledgers, balances, members and settings.
3. Activity — chronological shared-expense changes.
4. Personal — manual transactions and reports.
5. Account — profile, security, preferences, export and deletion.

There is no sixth create tab and no global floating action button. Shared-expense creation is contextual from Friends, Groups, or Activity. Personal creation begins inside Personal. Keep “Shared expense · [friend/group]” or “Personal” visibly present in titles, context markers, actions, and success feedback.

Produce a visual-direction board plus polished screen concepts for this representative set:
1. Welcome with the product purpose, Create account, Sign in, and the honest “records money; does not move it” explanation.
2. Register/sign-in family using familiar native forms.
3. Five-tab authenticated shell in both light and dark appearance.
4. Friends list grouped by currency, with relationship-first balance rows and a pending-request entry.
5. Friend ledger with “You owe / owes you / Settled,” recent activity, Add expense, Settle up, and reminder entry.
6. Groups list and one group ledger with members, recent events, balances, and contextual Add expense.
7. Add shared expense: amount-first, visible Shared context, separate Payer and Split summaries, date/category/receipt rows, Total/Paid/Allocated reconciliation, and one “Save shared expense” action.
8. Configure payers and configure split: clearly separate Paid from Owes; show multiple exact contributors; Equal and Exact only; show the exact remaining difference and deterministic one-minor-unit remainder explanation.
9. Expense detail and edit/conflict/delete states with an audit-friendly hierarchy and no restore action.
10. Record settlement with before/after balance, outside-payment disclosure, exact-settlement state, and deliberate overpayment-resulting-credit state.
11. Activity feed with actor, action, relationship/group context, time, and amount when relevant.
12. Personal dashboard, manual entry, possible-duplicate review, detail, and report showing Income, Spending and Net for one currency plus exact textual chart equivalents.
13. Account/security hierarchy and a serious, factual deletion-blocked/eligible concept.

Show at least one reusable example each of empty, loading, recoverable error, offline cached read, local draft, saving, success, updated elsewhere, version conflict, permission denied, destructive confirmation, and 200%-text reflow. Do not create a separate route for every state; show them as states of their owning screen, sheet, banner, or native dialog.

Prioritize accessibility: 44×44 pt iOS and 48×48 dp Android targets, 4.5:1 normal-text contrast, 3:1 meaningful nontext contrast, visible alternatives to gestures, logical VoiceOver/TalkBack order, full money values that never truncate, Reduced Motion support, and exact text equivalents for charts.

LOGO AND APP-ICON OUTPUT

Develop the selected **A — Editorial Reconcile** direction only into a small system:
- a primary restrained editorial wordmark that reads Hissab immediately, with open counters, disciplined spacing, and no added decorative flourish;
- a subordinate reconciliation register made from three short unequal ledger rules resolving against one terminal register, supporting the wordmark and leading only in space-constrained uses;
- iOS/Android app-icon composition with strong recognition at small sizes;
- monochrome, single-color, light-background, and dark-background variants;
- minimum-size and clear-space guidance;
- a concise rationale connecting the form to relationship clarity, ledger precision, and Total/Paid/Allocated reconciliation.

The current project monogram is explicitly temporary and is not a design constraint. The current Editorial Reconcile wordmark concept is accepted as a reference but is somewhat too decorative: simplify rather than embellish it, prioritize legibility, and do not expand its flared or wedge-like treatment. Keep the reconciliation register at or below the wordmark's x-height in the primary lockup and never make a large standalone symbol the hero. Prefer simple geometry, memorable letterforms, and balanced negative space. Avoid currency symbols tied to one country, coins, bank buildings, credit cards, wallets, handshakes, checkmark-in-a-circle clichés, calculator clip art, and anything resembling Splitwise’s identity. Do not force the crafted identity lettering into the product UI; it remains a standalone vector wordmark and campaign asset.

MAIN BRAND THEME OUTPUT

Define a compact, usable brand kit that connects product and campaign work:
- brand idea and one-sentence promise;
- four to six personality traits;
- primary wordmark and secondary supporting-mark use;
- confirmed palette roles and recommended proportions;
- UI typography versus crafted wordmark/editorial campaign typography guidance, keeping app UI system-native;
- icon and illustration principles;
- photography or people-imagery direction, if used;
- the reconciliation/ledger motif and rules for using it without turning it into decoration;
- light/dark examples;
- do/don’t examples that prevent the identity from becoming a generic fintech brand.

POSTER AND MARKETING CONCEPTS

Create three campaign/poster concepts that share the same logo, palette, typography logic, and ledger motif but emphasize different evidence-supported benefits:
1. Relationship clarity — “Shared expenses, and exactly who owes whom.”
2. Honest recordkeeping — “Hissab records money—it does not move it.”
3. Exact, separated money — multiple payers, Equal/Exact splits, and balances that stay per currency.

For each concept, provide:
- headline and restrained supporting copy;
- key visual idea and composition;
- how a phone screen, exact numbers, relationship phrase, people imagery, or abstract ledger motif appears;
- light and dark adaptation;
- a flexible CTA placeholder rather than an invented store/launch claim;
- suggested crop behavior for portrait poster, square social tile, and wide banner without claiming exact channel specifications.

Use real product behavior as the drama. Do not show money flying between phones, card swipes, bank connections, auto-imported transactions, crypto tokens, fake ratings, download counts, pricing, or “instant payment” language. Do not celebrate debt; emphasize calm clarity and trust.

SEKTRA COVER-IMAGE GUIDANCE

The repository does not define what Sektra is, where its cover appears, or its required dimensions. Do not invent a Sektra platform specification.

Instead, create three adaptable cover-image directions derived from the same Hissab brand system:
- a relationship-led cover using names and “owes/owes you/settled” structure;
- a reconciliation-led cover using Total → Paid → Allocated geometry;
- a brand-led cover using the crafted Hissab wordmark, burnished copper, deep ink, warm neutral surfaces, and a minimal editorial ledger rhythm.

For each, design a resolution-independent master composition with a generous central safe zone, edge content that can be cropped, high contrast at thumbnail size, and optional text/no-text variants. Demonstrate wide, square, and portrait crops only as adaptable working examples, not as official Sektra requirements. Keep essential logo and wording away from edges. If an actual Sektra template is later supplied, explain how to remap the master without changing the brand idea.

DELIVERABLE FORMAT

Present the work in this order:
1. Evidence vs creative-freedom note.
2. The selected Editorial Reconcile direction, concise rationale, and production guardrails.
3. Brand moodboard and token/application board.
4. The final Editorial Reconcile wordmark, supporting register, and app-icon system.
5. Mobile visual-direction board and the representative screen concepts, with light/dark and key state examples.
6. Three poster/marketing concepts.
7. Three adaptable Sektra cover-image concepts.
8. A final consistency sheet showing the same logo, colors, typography, spacing, icons, relationship language, exact money formatting, and reconciliation motif across app, poster, and cover.
9. A short list of unresolved inputs needed before production export, including actual Sektra dimensions/placement, final campaign CTA/channel, localization needs, and any backend-dependent feature availability.

Use polished, presentation-ready mockups and clear annotations. Be original. Never invent product capabilities to make a visual more exciting. Where backend availability is uncertain, label the work as a target-v1 concept and avoid implying that it is currently shipped.
```
