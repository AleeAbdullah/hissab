# Authentication And Security Standard

Use this standard for registration, sign-in, password flows, sessions, protected requests, logout, account switching, token refresh, and sensitive local data.

## Session Ownership

- Store access and refresh tokens only with Expo SecureStore through `src/api/session-store.ts`.
- Keep the current token snapshot in memory for request/auth UI coordination. Never persist tokens in TanStack Query, filesystem cache, drafts, route params, logs, analytics, or ordinary storage.
- Hydrate credentials before deciding the protected route tree. Represent hydration separately from signed-out state.
- Clear credentials and all user-scoped local recovery data when auth becomes invalid, the password changes, the account is deleted, or the active identity changes.
- Client-decoded JWT claims may identify the cache partition; they never authorize an action. The backend validates active users and sessions on every protected request.

## Request And Refresh

- Keep bearer attachment and refresh behavior in `src/api/transport.ts`.
- Concurrent expired requests share `runSingleRefresh()`. Do not create refresh loops per component or query.
- Refresh uses an idempotency key. Retry the failed request once only; clear credentials after a repeated `401`.
- Public auth endpoints use `publicRequest()` and must not accidentally attach an existing session.
- Normalize errors centrally and render safe messages. Do not expose raw tokens, request bodies, or backend internals.

## Security Rules

- Treat all bundled values, including `EXPO_PUBLIC_*`, as public. Never put a server secret in app configuration.
- Use HTTPS outside local development. Do not weaken iOS or Android transport security for production convenience.
- Validate deep links and external URLs before navigation. Keep sensitive data out of URLs and lock-screen notifications.
- Request permissions at the user-triggered point of need and explain denial without blocking unrelated app use.
- Preserve password and account-deletion requirements from `AGENTS.md`; native destructive confirmation must match backend requirements exactly.
- Avoid logging personal, financial, token, device-token, or security data.

## Change Checklist

1. Hydration and signed-out transition
2. SecureStore read/write/delete
3. Refresh concurrency and repeated `401`
4. Query/local-data clearing for the correct user
5. Realtime and push teardown/re-registration
6. Protected-route redirect and back behavior
7. Sensitive error, log, notification, and URL content
