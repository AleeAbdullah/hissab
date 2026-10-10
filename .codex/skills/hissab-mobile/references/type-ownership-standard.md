# Type Ownership Standard

Use this standard for TypeScript contracts, request DTOs, component props, route params, unions, and persisted data.

## Ownership

- Import request DTOs from `src/api/generated/types.gen.ts`.
- Import parsed response/domain contracts from `src/api/contracts.ts`.
- Keep UI-only props beside their component and form-only input types beside their pure form builder.
- Keep storage envelope/version types inside `features/local-data` unless another subsystem truly owns them.
- Do not create wrapper aliases, re-export barrels, or parallel DTOs solely to shorten imports.

## Quality

- Keep TypeScript strict. Prefer `type`; use `interface` only for intentional extension or declaration merging.
- Use `import type` for type-only dependencies.
- Avoid `any`, broad `object`, unvalidated casts, and non-null assertions. Narrow unknown data at integration boundaries.
- Represent finite state and backend enums with unions or generated types, not arbitrary strings.
- Keep user IDs, ledger IDs, route params, and API helper signatures consistent.
- Preserve exact financial amounts as integer strings across JSON boundaries and use `BigInt` only for local arithmetic.
- Do not weaken an owning type to silence a consumer error; fix the consumer or boundary mapping.

## Checklist

1. Does generated code or `contracts.ts` already own this shape?
2. Is the type local UI/form state or a domain response?
3. Has unknown persisted or external data been narrowed?
4. Would a new alias or barrel obscure the real owner?
5. Are exact numeric values preserved without `number` coercion?
