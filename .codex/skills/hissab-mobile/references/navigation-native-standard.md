# Navigation And Native Behavior Standard

Use this standard for Expo Router layouts, tabs, stacks, links, redirects, route params, modals, headers, back behavior, or platform controls.

## Route Structure

- Keep exactly five tab roots in this order: Groups, Activity, Home, Personal, Account. Friends remains inside the Groups stack.
- `(auth)` contains public authentication flows; `(tabs)` requires a hydrated session; `(shared)` contains cross-tab financial detail/edit routes; `(modals)` uses native modal presentation.
- Use typed Expo Router `Href` values and object params for dynamic routes. Validate required route params before querying.
- Configure route titles and native header options with `Stack.Screen` in the owning route. Center inline titles against the screen; keep tab-root large titles left-aligned.

## Native Behavior

- Prefer native tabs, stacks, links, and platform chrome. OS permissions, folder pickers, and share sheets stay native.
- All app-owned prompts use the shared app dialog (KAN-4), including destructive and discard confirmations. Keep explicit effect copy, a safe cancel action, semantic destructive styling, and side-effect-free platform Back. Ignore backdrop taps and preserve drafts/input on cancellation.
- Keep the global dialog above native-stack sheets with `FullWindowOverlay` on iOS and React Native `Modal` on Android. Share its UI and callers; restore focus and run confirmed effects only after the dialog is removed.
- Preserve hardware and predictive-back behavior. Do not intercept back unless unsaved state or a defined workflow requires it.
- Use automatic content inset adjustment and safe-area-aware layouts. Forms must remain usable with the keyboard shown.
- Keep modal state and draft ownership at the nearest workflow boundary. Clear drafts only on success or confirmed discard.

## Root Composition

- Keep global provider order intentional: query client → session → persisted-query hydration → realtime → cross-route draft providers → navigation.
- Do not add a root provider for one screen. Keep feature state local or feature-owned.
- Notification handlers and other process-wide native configuration belong at the root boundary and must not be installed repeatedly by screens.

## Route Change Checklist

1. Correct route group and typed params
2. Auth/hydration gate
3. Stack/tab registration and title
4. Link, redirect, deep-link, and notification targets
5. Back, dismiss, and draft-discard behavior
6. Safe area, keyboard, and platform presentation
7. iOS and Android manual verification
