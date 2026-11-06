# Teletype SDK — Expo example

Runnable Expo demo of `teletype-sdk-rn`.

- **Expo SDK:** 57 (React Native 0.86, React 19.2) — the latest at time of writing
- **New Architecture:** always on (mandatory in SDK 55+); the SDK is pure JS so it works out of the box
- Runs in **Expo Go** — no custom dev client or prebuild needed

## Run

```bash
cd example
npm install
# set your real external id in App.tsx (EXTERNAL_ID)
npm run ios      # or: npm run android  |  npm run web
```

## How the local link works

The example consumes the SDK via `"teletype-sdk-rn": "file:.."`. The
SDK's `react-native` entry points at its TypeScript source, so Metro bundles it
directly — no build step required while developing. `metro.config.js` watches
the parent folder and forces a single copy of `react` / `react-native`.

## Note on `npx expo-doctor`

Doctor reports a "duplicate dependencies" warning for `react` / `react-native`.
This is expected in this **local dev link** setup: two *identical* copies exist
on disk (one in `example/node_modules`, one in the SDK's own `node_modules` from
its `devDependencies`), but `metro.config.js` resolves both to a single copy at
bundle time — confirmed by a clean `npx expo export`. Consumers installing the
published package never hit this, because there `react`/`react-native` are
`peerDependencies` only.
