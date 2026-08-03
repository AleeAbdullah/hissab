# Expense-sharing mobile design

**Authority:** [`../../architecture/2026-07-31-expense-sharing-project-spec.md`](../../architecture/2026-07-31-expense-sharing-project-spec.md)  
**Status:** product model locked · HTML mockups final · implementation source approved

## Implementation authority

The production UI follows the 35 reviewed HTML mockup files in [`mockups/`](mockups/), indexed by
[`00-index.html`](mockups/00-index.html). There is no Figma artifact or Figma review stage.

When sources disagree, use this order:

1. Implemented backend behavior and API contracts.
2. Decisions recorded in [`05-implementation-handoff.md`](05-implementation-handoff.md#approved-implementation-deviations).
3. Product, financial and accessibility contracts in [`02-contracts.md`](02-contracts.md).
4. The final HTML mockup for the surface.
5. Runtime component guidance in [`03-design-system.md`](03-design-system.md).

Do not edit generated mockup HTML to hide implementation differences. Record an approved difference in the
handoff and implement it in the app.

## Documents

| | Document | Contains |
|---|---|---|
| 01 | `README.md` (this file) | Authority, status and locked decisions |
| 02 | [`02-contracts.md`](02-contracts.md) | Surface inventory, navigation, states, accessibility and financial rules |
| 03 | [`03-design-system.md`](03-design-system.md) | Runtime tokens and component contracts |
| 04 | [`04-decisions.md`](04-decisions.md) | Visual-direction rationale and retained/rejected references |
| 05 | [`05-implementation-handoff.md`](05-implementation-handoff.md) | Screen-to-route map, source boundaries and implementation rules |

## Pipeline

```text
final HTML mockups  →  screen-to-route map  →  Expo implementation  →  iOS and Android verification
```

## Locked decisions

| Date | Decision | Consequence |
|---|---|---|
| 2026-07-31 | Five authenticated destinations; context-aware create; Equal and Exact splits only; currency-isolated balances; connectivity required for financial mutations | See [`02-contracts.md`](02-contracts.md) |
| 2026-08-02 | **Direction A — Grouped Ledger.** Inset grouped cards on canvas, platform-familiar surfaces | Card is the primary surface primitive |
| 2026-08-03 | **Variant A1** — reconciliation scrolls in-form rather than pinned | `PrimaryAction` carries the disabled reason beside the action |
| 2026-08-03 | **L1** — one card per currency section on list surfaces | List rows use 12 px internal horizontal padding |
| 2026-08-03 | ISO code removed from `LedgerRow` breakdown lines and kept in the scoped section/balance column | Money remains unambiguous without crushing ledger names |
| 2026-08-03 | The 35 HTML mockup files are the final visual source; no Figma file will exist | Runtime fixes are recorded in the handoff; mockups stay unchanged |

## Settled visuals with provisional data contracts

The visuals are final. Some backend contracts remain intentionally unfinished: group type and invitations,
activity search, edit payment, personal-transaction concurrency, reports, export and other modules not yet
implemented by the API. Their routes must remain visible and render an honest **Coming later** state until the
corresponding backend contract exists.

## Explicit exclusions

No bank linking, imported transactions, budgets, savings goals, investments, net worth, payment execution,
cards, wallets, automatic FX conversion, percentage/share splits, recurring shared expenses, receipt OCR,
social sign-in, biometric app lock, subscription upsells, restore-expense action, or Splitwise branding/layouts.
