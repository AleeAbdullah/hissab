# Shared Expenses Mobile App

An Expo mobile application for shared expenses and manual personal income/expense tracking, backed by a NestJS API. The frontend and backend are independent applications.

## Repository map

```text
.
├── architecture/
│   ├── proposals/       System designs under review
│   └── decisions/       Finalized architecture decision records (ADRs)
├── code/
│   ├── be/              Independent NestJS API
│   └── fe/              Independent Expo mobile application
└── design/
    ├── flows/           Product journeys and flow analysis
    └── research/        Reference catalog, gallery, and screenshots
```

## Start here

- [System design review brief](architecture/proposals/2026-07-31-expense-sharing-system-design-review.md)
- [Current product flows](design/flows/CORE_FLOWS.md)
- [Splitwise reference catalog](design/research/README.md)
- [Screenshot gallery](design/research/index.html)

Each application owns its dependencies and commands. Run `pnpm install` inside `code/be` and `code/fe` independently.
