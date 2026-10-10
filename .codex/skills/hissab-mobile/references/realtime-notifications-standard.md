# Realtime And Notifications Standard

Use this standard for Socket.IO events, query invalidation, reconnect behavior, push permissions, Expo push tokens, device registration, notification preferences, reminders, or notification UI.

## Realtime

- Connect only for a hydrated authenticated session and send the current access token through the socket auth boundary.
- The socket carries invalidations, not authoritative financial state. On `connect`, `invalidate`, or `resync`, invalidate/refetch HTTP queries.
- Do not implement client replay, ordering, or balance mutation on top of Socket.IO. HTTP remains authoritative after reconnect.
- Disconnect and remove listeners when the access token changes or the provider unmounts.
- Prefer targeted invalidation only when the server event contract supplies reliable domain identifiers; otherwise preserve the safe broad refetch.

## Push Registration

- Register only on a physical iOS or Android device after a user-triggered permission request.
- Explain permission denial and leave unrelated app behavior functional.
- Store installation and registered-device identifiers in SecureStore. Associate device registrations with the authenticated user and revoke them through the backend before clearing the local device ID.
- Keep platform mapping explicit and use Expo's push-token API. Do not treat simulator behavior as device verification.

## Notification Behavior

- Durable in-app notifications remain query-backed server state. Realtime/push wakes the client; it does not replace the inbox.
- Respect master and category notification preferences. Keep preference mutations pending-safe and refetch the authoritative result.
- Lock-screen copy must avoid unnecessarily sensitive financial data. Hissab reminder push copy contains sender and ledger, never an amount.
- Manual reminders require an owed relationship in the same active ledger and are rate-limited by the backend. Surface cooldown errors; do not bypass or duplicate server enforcement.

## Change Checklist

1. Auth lifecycle and socket cleanup
2. Reconnect/resync authoritative refetch
3. Physical-device and permission path
4. Secure device-ID ownership and revocation
5. Preference/inbox query invalidation
6. Sensitive lock-screen copy
7. Foreground, background, denied, reconnect, and logout behavior
