# Hissab mobile app

Expo Router app for iOS and Android. The implementation contract and screen map live in [`../../design/finalization/05-implementation-handoff.md`](../../design/finalization/05-implementation-handoff.md); final HTML mockups are in [`../../design/finalization/mockups/`](../../design/finalization/mockups/).

```bash
pnpm install
pnpm api:generate
pnpm start
```

Development uses `http://127.0.0.1:3000` in the iOS Simulator and `http://10.0.2.2:3000` in the Android Emulator. Set `EXPO_PUBLIC_API_URL` for another backend.

Baseline checks:

```bash
pnpm type-check
pnpm lint
pnpm check:refresh
```
