# Custom fonts (Newsreader + Manrope)

The app expects these PostScript-friendly filenames so they match [`src/theme/typography.js`](../../src/theme/typography.js):

- `Newsreader-Regular.ttf`
- `Newsreader-Medium.ttf`
- `Manrope-Regular.ttf`
- `Manrope-Bold.ttf`

## Add fonts

1. Download static `.ttf` files from [Google Fonts](https://fonts.google.com/) (Newsreader and Manrope).
2. Place them in this folder with the names above.
3. From `app/novelcenter`, run:

```bash
npx react-native-asset
cd ios && pod install && cd ..
```

4. Rebuild the native app (`npm run ios` / `npm run android`).

Until fonts are linked, iOS/Android fall back to **System** / **serif** (see typography module).
