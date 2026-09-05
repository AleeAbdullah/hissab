# Hissab public website — design contract

Design specification for the public marketing and legal site. Read `AGENTS.md` first; it outranks this file on every product, financial, and accessibility rule. This file only decides how the public website looks and is structured.

Status: **design approved for build, not implemented.** No `web/` directory exists yet.

## Precedence

1. `AGENTS.md` — product boundaries and implementation rules.
2. This file — public website structure, visual system, and copy.
3. `legal-site/` — the current static preview. Superseded by this design; see [Migration](#migration-from-legal-site).
4. `mockups/brand-assets/` — brand reference only. **Not shippable artwork.** Its screenshots predate the current tab bar.

Do not silently resolve conflicts between these. Report and stop.

## Scope

- Public marketing and legal website. No authentication, no financial data, no backend access.
- This is **not** the "web client" that `AGENTS.md` lists as out of scope. That line should gain a clarifying sentence.
- The site replaces `legal-site/` entirely. `legal-site/` is deleted at cutover.

## Product message

Primary: **"Shared expenses, and exactly who owes whom."**

Every page must reinforce: **Hissab records money but never holds, sends, or converts it.** This appears in the hero, the settlements band, and the footer.

## Visual direction — decision record

Three directions were evaluated. **Direction A, "The Ledger Page", is approved.**

- **A · The Ledger Page (chosen).** The page is a ledger sheet. No cards, no shadows, no containers. Every boundary is a hairline, every section a ruled entry, every figure tabular. Chosen because it already exists as approved artwork (`mockups/brand-assets/25-relationship-led-sektra-cover.png`), and because a hairline-and-rhythm layout works identically at 390px and 1440px — mobile is the same design narrower, not a second design.
- **B · Two Columns, One Balance (rejected).** Vertical hairline splitting claim from evidence in every section. Rejected: the concept only reads above 900px. **One device is grafted in** — the paired section, used exactly once, for Groups/Friends.
- **C · Statement Stack (rejected).** Printed-statement density. Rejected: cold, and 11px annotations are unusable on mobile. **Its instinct is kept in one place** — the "What Hissab does not do" band is set tight and factual.

Accepted risk: with no cards, sloppy vertical rhythm cannot be hidden. Hold to the 4-point grid strictly. Use `gap` on flex/grid parents, never per-element margins.

## Routes

| Route | Page | Notes |
|---|---|---|
| `/` | Homepage | |
| `/help/` | Help | |
| `/privacy/` | Privacy policy | URL is a contract — the app will link to it |
| `/terms/` | Terms of service | URL is a contract — the app will link to it |

`trailingSlash: true`. These URLs already exist in `legal-site/` and must not change.

## Design tokens

Light values are taken unchanged from `code/fe/global.css`. Do not invent new values.

### Light

```
--paper        #F7F3EC   page canvas
--surface      #FFFEFA   raised plates, footer, disclosure
--sunk         #F1EADF   inset fills
--ink          #1D1D1B   body and headings
--muted        #665D55   leads, captions, secondary
--line         #DDD4C8   every hairline rule
--line-soft    #EAE2D6   sub-rules inside a group
--copper       #A83A1B   filled buttons only
--copper-ink   #A83A1B   copper as text, links, rules, marks
--copper-deep  #772610   link hover
--copper-wash  rgba(168,58,27,.06)
--copper-edge  rgba(168,58,27,.28)
--positive     #2E7D59   positive money only
--warning      #9C5A12
--danger       #B42318
--on-copper    #FFFFFF
--ring         #1D1D1B   focus outline
```

### Dark

```
--paper        #1D1D1B
--surface      #272522
--sunk         #211F1D
--ink          #F7F3EC
--muted        #C7BDB3
--line         #49423C
--line-soft    #38322D
--copper       #B84A26   NOT #A83A1B — see below
--copper-ink   #E3714D   NOT #A83A1B — see below
--copper-deep  #FF9A77
--copper-wash  rgba(227,113,77,.08)
--copper-edge  rgba(227,113,77,.32)
--positive     #77C79D
--warning      #F3B66B
--danger       #FF9A90
--on-copper    #F7F3EC
--ring         #F7F3EC
```

**Deliberate divergence from the app.** `code/fe/global.css` keeps `--primary: #A83A1B` in dark mode. On the web this splits into two roles because that value fails in dark:

- As text on Ink it reaches only **2.64:1** — fails WCAG AA. Web uses `#E3714D` (**5.42:1**).
- As a button fill its own edge is only **2.64:1** against the canvas — fails WCAG 1.4.11 (3:1 for UI boundaries) and reads as a smudge. Web uses `#B84A26` (**3.25:1** edge, **4.69:1** with Paper text).

### Verified contrast

Computed, not estimated. Re-verify if any value changes.

| Pair | Light | Dark |
|---|---|---|
| Body text on canvas | 15.26:1 | 15.26:1 |
| Muted on canvas | 5.82:1 | 9.13:1 |
| `copper-ink` on canvas | 5.78:1 | 5.42:1 |
| Button text on `copper` fill | 6.39:1 | 4.69:1 |
| `copper` fill edge vs canvas | — | 3.25:1 |
| `positive` on canvas | 4.53:1 | 8.39:1 |

## Typography

Serif is rationed to the wordmark and editorial headings, per `AGENTS.md`. Everything else is sans.

**One webfont only.** Sans is the system stack — zero bytes, and the site reads as the user's own device does. Serif is one self-hosted variable file.

```
--serif: <display serif, see open decisions>
--sans:  -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto,
         "Helvetica Neue", Arial, sans-serif
```

| Role | Face | Desktop | Mobile | Detail |
|---|---|---|---|---|
| Wordmark | SVG artwork | 27px | 23px | Locked art + equality mark. **Never live text** |
| Display 1 (h1) | Serif | 74/72 | 41/42 | `clamp(2.55rem,7.4vw,4.6rem)`, `-0.03em`, max 13ch, `text-wrap:balance` |
| Display 2 (h2) | Serif | 46/48 | 30/32 | Section openers, ledger band |
| Display 3 (h3) | Serif | 34/36 | 24/28 | Paired-section titles only |
| Eyebrow | Sans | 11/13 | 11/13 | 700, `0.17em` tracking, uppercase, `copper-ink` |
| Lead | Sans | 20/31 | 16/25 | Muted, max 38ch |
| Body | Sans | 17/28 | 16/26 | Max 68ch measure |
| Supporting | Sans | 15/23 | 14/22 | Step and clause bodies |
| Caption | Sans | 13/19 | 12.5/19 | Screenshot captions, footnotes |

**Every monetary figure uses `font-variant-numeric: tabular-nums`.** No exceptions.

## Spacing, rules, shape

- **Grid.** The app's 4-point grid, scaled. Gutters 20 / 32 / 40 / 64px across the four breakpoints. Content max-width 1152px. Body measure 68ch, lead measure 38ch.
- **Section rhythm.** 56px mobile, 88px desktop. Bands are separated by a hairline, never by whitespace alone — the rule is what makes it a ledger.
- **Rule hierarchy.** 1px `--ink` opens a major section. 1px `--line` separates rows. 1px `--copper-edge` is reserved for the ledger band and nothing else.
- **Rule tick.** A copper 1×11px vertical tick sits at the left end of a major rule. From the crop marks on the brand cover.
- **Left margin rule.** A single vertical copper rule at 7% opacity runs the full height of every page at the gutter. Already present in `legal-site/assets/styles.css`. The quietest and most persistent brand cue.
- **Shape.** Structural elements are **square** — plates, bands, rules, tables. Only controls are rounded, at **10px**. **No shadows anywhere**, matching the app's no-card-shadows rule.

## The equality mark

Three copper bars of decreasing length closed by a serif stem: unequal entries resolving to one settled line. Source: `mockups/brand-assets/02-hissab-app-icon.png`.

**The site's only ornament.** Four sizes, nowhere else:

| Size | Use |
|---|---|
| 32px | Footer terminator |
| 19px | Beside the wordmark |
| 26px box | List bullet — 26px bordered square containing an 11×2px copper bar (from `code/fe/src/app/(auth)/welcome.tsx`) |
| 1×11px | Rule tick |

Never rotated, recoloured outside copper, animated, or used as a bullet in running text. Always `aria-hidden` — it carries no meaning a screen reader needs.

SVG path, 24×24 viewBox:

```svg
<rect x="3.6"  y="7.6"  width="12.6" height="1.25"/>
<rect x="5.6"  y="11.35" width="10.6" height="1.25"/>
<rect x="9.6"  y="15.1" width="6.6"  height="1.25"/>
<path d="M17.7 3.6h2.6v.75h-.75v15.3h.75v.75h-2.6v-.75h.75V4.35h-.75z"/>
```

## Components

| Component | Specification |
|---|---|
| `Rule` | 1px hairline; `ink` / `line` / `copper-edge` weights; optional copper tick at the left gutter |
| `LedgerRow` | Grid `1fr auto`. Serif label, copper middot separators, tabular figure right-aligned, copper hairline above. Below 600px wraps to two lines with the figure still right-aligned. **Never scrolls horizontally** |
| `StepEntry` | Serif copper counter in a 2.4rem gutter column, sans title, muted body. Numbers used **only** here and in legal clauses, where order is real |
| `StoreButton` | **Pending (launch state):** 48–56px tall, 10px radius, dashed muted border, platform glyph + "Coming to …", non-interactive. **Live:** Apple and Google's official badge artwork, which is mandatory and cannot be restyled — the live row is a swap, not a restyle |
| `ScreenshotPlate` | Screenshot on `surface`, 1px hairline, square corners. **No bezel, no shadow, no perspective, no gradient.** Copper corner ticks, caption beneath. `<picture>` swaps light/dark captures |
| `Callout` | 3px copper left border, no fill. Used for the boundary statement and the legal plain-language summary |
| `Disclosure` | Native `<details>/<summary>`, copper `+`/`−`, hairline separated, 48px minimum row. **Works without JavaScript** |
| `DocIndex` | Sticky rail at ≥900px with a copper dash marking the current section. Collapses to a `<details>` jump list below |
| `ThemeToggle` | Three-state segmented control — System / Light / Dark — as real radios with `aria-checked`, 48px targets. Applied pre-paint by an inline script so there is no flash |
| `Header` | 78px desktop bar, hairline under. Below 900px becomes a full-screen sheet: focus trap, `aria-expanded`, Escape closes, scroll locked, first focus on the close button |
| `StickyDownload` | Mobile only. Appears once the hero leaves the viewport, hides when the download band is in view, dismissible, respects `env(safe-area-inset-bottom)` |

## Homepage

Nine bands, each separated by a rule.

| # | Band | Purpose | Screenshot |
|---|---|---|---|
| 1 | Hero | Thesis and boundary in one view | 01 |
| 2 | Ledger band | The brand's own artwork, made live | — |
| 3 | How it works | The one genuine sequence on the page (numbered 01–04) | — |
| 4 | Groups / Friends | The paired section grafted from Direction B | 02, 03 |
| 5 | Settlements | Reinforces the boundary where it matters most | 04 |
| 6 | Personal | The second, private context | 05 |
| 7 | What Hissab does not do | Honesty as a differentiator. Equality-mark bullets, **not** numbers | — |
| 8 | Download | Conversion band | — |
| 9 | Footer | Navigation and the boundary restated | — |

**Desktop hero:** grid `1.18fr .82fr`, gap 72px, `padding-block: 76px 64px`. Screenshot plate 288px wide, aspect `9/19.5`.
**Desktop steps:** four columns with vertical hairlines, `border-top: 1px solid --ink`.
**Desktop paired section:** grid `1fr 1px 1fr`, gap 56px. The `1px` column is the vertical rule.

**Mobile:**
- Hero screenshot leaves the hero entirely and becomes a **snap-scrolling rail** of three 172px plates below it, so the headline is never pushed below the fold.
- Store buttons stack full-width at 52px.
- Step numbers move from a gutter column to a 34px inline column.
- Sticky download bar per `StickyDownload` above.

## Help

A document, not a knowledge base. Sticky index left, grouped topics right, each a native `<details>`.

Topics are **grouped, not numbered** — reading order carries no meaning here.

| Group | Status |
|---|---|
| Getting started | Writable now |
| Friends and groups | Writable now |
| Expenses and splits | Writable now |
| Balances and settlements | Writable now |
| Personal tracking | Writable now |
| Notifications and reminders | Writable now |
| Your account and data | Writable now |
| Contact support | **Blocked** — needs verified address, response expectation, escalation path |

Answers that can be written today come from `AGENTS.md`: group privileges, split arithmetic, immutability, export and deletion rules, reminder cooldowns, display currency.

**Do not write anything implying password-reset email works.** `AGENTS.md` lists its delivery as not implemented.

Each group is an `<h2>`, each question an `<h3>` inside a `<summary>`, so the page outline is navigable by heading. Answers live in MDX.

Desktop layout: grid `minmax(210px,.3fr) minmax(0,.7fr)`, gap 72px.

## Legal

Privacy and Terms share one MDX layout. Numbered clauses with serif copper counters — order is real here, so numbering is justified.

Desktop layout: grid `minmax(230px,.34fr) minmax(0,.66fr)`, gap 72px. Sticky document header left.

**Clause sets** (carried from `legal-site/`, unchanged):

- **Privacy:** 01 Scope · 02 Information we collect · 03 Use and sharing · 04 Retention and choices · 05 Contact and updates
- **Terms:** 01 Eligibility and acceptance · 02 Service and accounts · 03 Acceptable use · 04 Risk and liability · 05 Ending use and changes

**Additions over the current preview:**

- Plain-language summary above the clauses, explicitly labelled non-binding. Written only **after** counsel approves the clauses, and must not contradict them.
- Version / effective / last-updated / entity block in the sticky header. All read "Pending" today.
- Per-clause anchors (`#scope`, `#information`) so support and the app can deep-link.
- Pending state stays visible until real copy lands.

**Write no legal copy.** Clause bodies remain placeholders naming what belongs there, exactly as the current preview does.

## Responsive

| Range | Gutter | Layout | Changes |
|---|---|---|---|
| 320–599 | 20px | Single column | h1 clamps to 38px; screenshots become a snap rail; ledger rows wrap; nav is a sheet; sticky bar active |
| 600–899 | 32px | Single column, wider measure | h1 ~52px; rail becomes two-up; steps 2×2; sticky bar active |
| 900–1199 | 40px | Two column where paired | Nav returns to a bar; paired sections split; sticky index appears; sticky bar retires |
| 1200+ | 64px | Full layout, max 1152px | Hero splits 1.18/0.82; steps become four columns |

- **Nothing scrolls sideways.** The only horizontal scrollers are the mobile screenshot rail and wide tables, each in its own `overflow-x: auto` container.
- **200% text.** All sizes in `rem`. Rows use `min-height`, never `height`. Padding does not scale with type — the same model the app mockups prove with their `.x2` frames.
- **Touch targets** 48×48 CSS px minimum, including theme toggle segments and disclosure rows.
- **Safe areas.** Sticky bar and footer pad with `env(safe-area-inset-bottom)`; header with `env(safe-area-inset-top)`.
- **Landscape phone.** Hero minimum height is content-driven, never `100vh`.

## Accessibility

- **Contrast.** Every value verified above. Body text ≥4.5:1, UI boundaries ≥3:1, both themes.
- **Focus.** 3px `--ring`, 2px offset, never removed. Ink on light, Paper on dark — the one ring that stays visible on Paper, on Surface, and on a copper fill.
- **Never colour alone.** Any money direction carries the words "You're owed" or "You owe". Pending store buttons say they are pending; they are not merely greyed.
- **Honest controls.** A visible control either works or is visibly non-interactive with truthful copy. **No dead store links, ever.**
- **Structure.** One `<h1>` per page, no skipped levels, real landmarks, skip link, `aria-current="page"` on the active nav item.
- **Screenshot alt text** describes the state shown — "A group balance screen showing Amna is owed 2,750" — not "app screenshot". Decorative marks are `aria-hidden`.
- **Motion.** One effect site-wide: a short fade-and-rise on section entry. Disabled entirely under `prefers-reduced-motion`, which also kills smooth scrolling.
- **Theme.** Respects `prefers-color-scheme`, allows a manual override persisted to `localStorage`, applied pre-paint. `color-scheme` set so form controls and scrollbars follow.
- **No JavaScript required** to read any page. Disclosures are native `<details>`; the nav sheet degrades to an anchor list.

## Implementation

| Decision | Value |
|---|---|
| Location | New top-level `web/`, replacing `legal-site/` |
| Framework | Next.js App Router, fully static |
| Backend | **None.** The site never talks to the Hissab API |
| Content | MDX for Help answers and both legal documents, so approved copy lands without touching components |
| Fonts | Sans = system stack (zero bytes). Serif = one self-hosted variable file via `next/font/local`, latin subset, `display: swap`, preloaded. Wordmark is SVG, not text |
| Images | `next/image`, AVIF + WebP, explicit dimensions, `<picture>` switching light/dark captures. Hero screenshot is the only priority image |
| Robots | `noindex` stays until legal copy is approved |
| Analytics | **None at launch.** Anything with cookies adds a consent surface and a policy section that does not exist |
| Localisation | Not built, not precluded. Logical properties throughout, no baked-in `dir` |

## Migration from `legal-site`

`legal-site/` is deleted at cutover. It is not just four HTML files — it carries deployment configuration and publication safeguards that exist nowhere else in the repo.

| From | What | Lands in |
|---|---|---|
| `vercel.json` | `X-Robots-Tag: noindex, nofollow` | `next.config` headers — **the single most important item.** Losing it publishes unapproved legal copy to search engines |
| `vercel.json` | `X-Content-Type-Options: nosniff` | `next.config` headers |
| `vercel.json` | `cleanUrls`, `trailingSlash: true` | `trailingSlash: true`; Next handles clean URLs natively |
| every `<head>` | `<meta name="robots" content="noindex, nofollow">` | Metadata API, `robots: { index: false, follow: false }` in the root layout |
| every `<head>` | `theme-color: #f7f3ec` | **Two** entries with `media` — Paper for light, Ink for dark. Currently light-only, which tints dark-mode browser chrome wrong |
| `.preview-bar` | "Development preview · approved legal copy pending" | Site-wide banner while copy is pending |
| `.skip-link` | Skip to content | Root layout, first focusable element |
| `terms/index.html` | Five clause headings | MDX, see [Legal](#legal) |
| `README.md` | Seven-item publication checklist | `web/README.md`, with the Vercel project-root item updated from `legal-site` to `web` |
| `index.html` | "Records, not money." ledger note | Already absorbed — hero boundary line and footer statement |

**Sequencing.** Delete `legal-site/` only after `web/` is preview-deployed and all four routes, both robots headers, mobile layout, keyboard focus, dark mode and reduced motion are checked. The Vercel project root changes from `legal-site` to `web` in the same change.

## Screenshots to capture

**None exist.** Every image in `mockups/brand-assets/` predates the current five-tab bar (`Groups · Activity · Home · Personal · Account`, per `code/fe/src/app/(tabs)/_layout.tsx`) and some show "coming later" placeholders. Do not use them on the site.

Five screens × light and dark × one iOS and one Android device = **twenty captures.**

| # | Screen | Route | State | Used in |
|---|---|---|---|---|
| 01 | Group balances | `(tabs)/groups/[groupId]/balances` | Settled and unsettled members both visible, "You're owed" present | Hero, mobile rail |
| 02 | Group ledger | `(tabs)/groups/[groupId]/index` | Several expenses, mixed payers, one settlement | Paired section |
| 03 | Friend ledger | `(tabs)/groups/friends/[friendId]/index` | Non-zero running balance with history | Paired section |
| 04 | Record a settlement | `(modals)/settlement` | Filled form, before confirmation | Settlements band |
| 05 | Personal reports | `(tabs)/personal/reports` | Owed-share mode, cash-out-of-pocket toggle visible | Personal band |

Rules:

- Capture at native resolution — 1179×2556 iPhone, 1080×2400 Android. Let `next/image` downscale.
- Status bar normalised: same time, full signal, full battery, no carrier name, no notification badges.
- Demo names must match the brand assets — Amna, Zoya, Bilal, Daniel, Mei, Noor — so the site and the cover artwork agree.
- **Amounts must obey the real split arithmetic.** A screenshot showing a split that does not sum to its total is the first thing a careful reader notices.
- No "coming later" placeholder may appear in any capture.

## Copy deck

Use verbatim. Do not paraphrase.

**Hero**
- Eyebrow: `Calm ledger. Clear relationships.`
- h1: `Shared expenses, and exactly who owes whom.`
- Lead: `Hissab records who paid, who owes, and how people settle up — across friends, groups, and your own private ledger.`
- Boundary: `Hissab records money that has already moved. It never transfers funds, links a bank account, or touches a card.`

**Ledger band** (from `25-relationship-led-sektra-cover.png`, unchanged)
- Eyebrow: `Every ledger, one balance`
- `Friends on a road trip · Amna + Zoya · PKR 2,750`
- `Family dinner · Bilal + Daniel · PKR 4,320`
- `Housemates at home · Mei + Noor · PKR 1,860`
- Caption: `Illustrative entries. Your display currency changes the symbol only — it never converts a record.`

**How it works**
1. `Add the expense` — `Record what was spent, who paid it, and which category it belongs to. One payer or several.`
2. `Split it` — `Equal or exact amounts. Every split adds up to the total, with no rounding left over.`
3. `See the balance` — `Each ledger shows one exact balance per person, computed from the entries themselves.`
4. `Settle up` — `Pay however you already pay. Record the settlement and the balance clears.`

**Groups / Friends**
- `Everyone in the group can keep it straight.` — `Groups have no roles. Every active member can add expenses, invite people, and record settlements. A group can only be archived once it is fully settled — and nobody can be removed from one.`
- `Or just between the two of you.` — `A direct ledger between two people: one running balance, and the full history behind it. Add a friend by their exact email address — Hissab will not surface anyone you have not looked up directly.`

**Settlements**
- `A settlement is a record, not a transfer.` — `When someone pays you back — cash, bank transfer, however you already do it — you record it in Hissab. The balance clears. The money moved somewhere else, and Hissab was never in the middle of it.`

**Personal**
- `Your own money, kept separate.` — `Personal income and expenses are private and never mix with shared activity. Reports show your owed share by default, with a toggle for what actually left your pocket.`

**What Hissab does not do**
- `Hold or send money` — `There is no wallet and no transfer. Records only.`
- `Link a bank or card` — `No connection to any account, ever.`
- `Import transactions` — `Every entry is one you chose to record.`
- `Convert currency` — `Your display currency changes the symbol, not the amount.`

**Download**
- h2: `Get Hissab.`
- Lead: `Coming to iOS and Android. No account is needed to read the privacy policy or the terms.`

**Footer**
- `Hissab records debts and settlements between people. It never holds, sends, or converts money.`

### Pre-launch state

There are no store listings — no `eas.json`, and `com.alee.hissab` is a personal namespace. Three surfaces mention getting the app; pre-launch all three say the same true thing:

- Header button and mobile sticky bar: `Coming soon`, jumping to the download band. Working controls with honest labels.
- Store buttons keep their platform glyphs so the reader still learns it is iOS and Android, but render dashed and non-interactive: `Coming to the App Store`, `Coming to Google Play`.

Going live is a content change: components swap to `href`s, copy becomes `Download on the App Store` / `Get it on Google Play`, header button becomes `Get the app`. **The live variant must use Apple's and Google's official badge artwork** — their wording and styling rules are mandatory.

## Do not

- Do not use generic SaaS bento grids, gradients, glass effects, stock photography, or banking imagery.
- Do not invent testimonials, user counts, ratings, launch dates, or any statistic.
- Do not invent product functionality, legal copy, support contacts, or store links.
- Do not use any image from `mockups/brand-assets/` on the site.
- Do not use green as a second brand colour. It is reserved for positive money and success states.
- Do not use `#A83A1B` for copper text or button fills in dark mode. See [tokens](#dark).
- Do not add card shadows.
- Do not number a section unless its order carries information the reader needs.
- Do not add analytics or cookies without a consent surface and a matching privacy clause.
- Do not use the word "cent" or any currency denomination. See below.

## Known conflict — unresolved

`code/fe/src/app/(auth)/welcome.tsx` says splits are exact "down to the cent". `AGENTS.md` states amounts are currency-neutral integer minor units and that Hissab "does not hold, send, convert, or record a money denomination". "Cent" names one.

**Website handling:** avoid the word. Copy says "every split adds up to the total". The app string is left alone — changing it is an app decision, not a website one.

## Open decisions — do not guess

Two of these gate the build. The rest gate a launch and can land into finished components later.

**Gating the build:**

1. **Display serif and its licence.** The wordmark appears to be GT Sectra Display — the brand cover files are named `…-sektra-cover.png`. Either license it for web, or approve an open substitute (Newsreader is the closest free match: variable, real optical sizing, comparable wedge-serif high-contrast character) and accept that headings will not be identical to the wordmark.
2. **Wordmark as SVG.** Only an 817 KB PNG exists (`01-final-hissab-wordmark.png`). A vector wordmark plus the equality mark is needed for header, footer, and favicon. `AGENTS.md` already lists the final wordmark and app icon as open.

**Gating a launch:**

3. **Screenshots.** Twenty captures per the section above. Blocks the homepage only; every other page is unaffected.
4. **Legal and support copy.** Counsel-approved Privacy and Terms; a verified support address, response expectation, and escalation path. Blocks publication and the app's Terms and Privacy controls.
5. **Responsible entity, jurisdiction, effective dates, contact channel.** All four read "Pending" in the legal page headers today.
6. **App store listings.** Not a blocker — the pending placeholder is the agreed launch state — but until listings exist there is nothing to link. Needs listings, canonical URLs, and the developer account name.
7. **Canonical domain**, and the decision to lift `noindex` and `X-Robots-Tag` once copy is approved.
8. **Favicon and social card.** The app icon is a 7.5 KB PNG. The dark splash in `code/fe/app.config.ts` is navy `#091E2F`, off-brand against Ink. Needs an SVG favicon and a 1200×630 OG image built from the equality mark.
9. **`AGENTS.md` wording** on "a web client" — needs one clarifying sentence. Documentation fix, not a decision.
10. **Localisation.** Still open in `AGENTS.md`. Not built; the design avoids anything that would preclude it.
