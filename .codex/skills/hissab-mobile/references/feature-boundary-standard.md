# Feature Boundary Standard

Use this standard when placing routes, components, hooks, providers, API helpers, form logic, utilities, or types.

## Placement

- `src/app/**` owns route params, `Stack.Screen` options, redirects, links, modal presentation, and composition.
- `src/features/<domain>/api.ts` owns typed query definitions and mutations for that domain.
- `src/features/<domain>/form.ts` owns pure parsing, initial values, validation, and payload construction when a feature has non-trivial forms.
- `src/features/<domain>/components/` owns UI reused by multiple routes or too substantial for a route file.
- `src/components/ui*` owns cross-domain primitives with consistent semantics and accessibility.
- `src/lib/` owns small cross-domain infrastructure without a clearer feature owner.
- Root providers belong in `src/app/_layout.tsx` only when they coordinate the whole application.

## Boundaries

- Route files must not contain raw generated-client calls, token persistence, filesystem persistence, or duplicated domain calculations.
- Feature modules may depend on `api`, `components`, and `lib`; shared infrastructure must not import route-private internals.
- Keep feature constants and helpers local until another real consumer exists.
- Prefer a plain function or existing provider over adding a store, service class, factory, registry, or interface with one implementation.
- Do not move code merely to satisfy file-length aesthetics. Extract when ownership, reuse, testability, or lifecycle clarity improves.

## Change Checklist

1. Route entry and navigation behavior
2. Feature component or provider owner
3. Pure form/domain transformation
4. Feature API and response contract
5. Query/cache invalidation
6. Local recovery or realtime impact
7. Loading, error, empty, disabled, and permission states
