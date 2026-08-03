# Hissab mobile implementation rules

Read `../../design/finalization/05-implementation-handoff.md` before changing routes, UI, data flow or scope.

- The final HTML files in `../../design/finalization/mockups/` are the visual source. There is no Figma file.
- Stop and ask the product owner about every new mockup/backend/runtime inconsistency before implementing it. Record the approved result in the handoff deviation table.
- Backend behavior and OpenAPI request contracts take precedence only where the handoff already records that decision.
- Regenerate `src/api/generated/` with `pnpm api:generate`; never hand-edit generated files.
- Define backend response contracts once in `src/api/contracts.ts`. Do not add repository interfaces, factories or duplicate DTO layers.
- Use TanStack Query for server state and `expo-secure-store` only for auth/session secrets. Query persistence and SQLite are deferred.
- Keep exactly five native tabs. Loading, error, confirmation and conflict branches belong inside their owning route or a native dialog.
- A visible control must reach every mapped destination. Unsupported modules show the shared, honest Coming Later state and never mock financial data.
- Use `Hissab` capitalization, native platform controls/chrome, accessible touch targets and both light and dark colors.
- Verify with `pnpm type-check`, `pnpm lint`, `pnpm check:refresh`, then manually on both the available iOS Simulator and Android Emulator.

Development defaults target `127.0.0.1:3000` on iOS and `10.0.2.2:3000` on Android. Set `EXPO_PUBLIC_API_URL` for any other environment.
