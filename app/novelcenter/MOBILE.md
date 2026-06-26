# Novel Centre — React Native (CLI)

Mobile client for the same backend as the Next.js web app (`server/`), focused on **reader** and **author** flows (no admin UI).

## Prerequisites

- Node ≥ 22
- Xcode (iOS), Android Studio / SDK (Android)
- Backend API running (default port **4000**)

## API URL

[`src/config/env.js`](src/config/env.js) resolves:

| Environment | Default base URL |
|---------------|------------------|
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |

**Physical devices:** use your machine’s LAN IP, e.g. `http://192.168.1.10:4000`. Set `NC_API_URL` when starting Metro:

```bash
NC_API_URL=http://192.168.1.10:4000 npm start
```

Rebuild the native app after changing env wiring.

## Fonts

See [`assets/fonts/README.md`](assets/fonts/README.md).

## Native commands

```bash
npm install
cd ios && pod install && cd ..
npm run ios
npm run android
```

## Stack highlights

- React Navigation (tabs + stacks)
- Zustand stores mirroring web (`auth`, `wallet`, `reader`, `ui`)
- `react-native-render-html` for reading chapters
- `@10play/tentap-editor` for author chapter HTML editing
- Same REST surface as web: `/api/v1/*`

## Smoke checklist

1. Reader: login → Discover → book → chapter → theme / font size → scroll (progress saves).
2. Library: add/remove book.
3. Author (author role): Account → Author Studio → books → chapters → Tentap edit → save/publish.
