# Share QR Code (Settings → Share)

Documentation ID: `UI-SHARE-QR-CODE`
File revision: `2026_09_r1`
Last reviewed: `2026-09-23`

Related code:
- `App/src/domain/qr.ts` — dependency-free QR encoder (`qrMatrix`)
- `App/src/domain/qr.test.ts` — known vectors and an independent round-trip reader
- `App/src/ui/components/QrCode.tsx` — renders the matrix as SVG
- `App/src/ui/views/SettingsSheet.tsx` — `ShareGroup`, the last section after About
- `App/src/texts.ts` — `SHARE_URL` and `texts.settings.share`

Related documentation:
- `[Planning]/SnackTrainer Vision & Plan v1.md` (`PLANNING-VISION-V1`) — decision 10

## Short Version

The last section of Settings, "Share", shows a QR code for `SHARE_URL`
(`https://CasperWollesen.github.io/SnackTrainer/`), the address as a link, and one button. The button
opens the system share sheet where `navigator.share` exists (phones) and copies the link elsewhere.
Only the link is shared, never data.

## Behavior Contract / Key Decisions

1. **No dependency.** `qrMatrix(text)` supports byte mode (UTF-8), level L and versions 1–5. Those are the
   single-block versions, so no block interleaving or version-info areas are needed. The limit is 106 bytes,
   and longer text throws. The share URL is 46 bytes, which gives version 3 (29×29).
2. **Generated at runtime** from `SHARE_URL`, not a committed image. Changing the address in `texts.ts`
   is the whole change. It works offline because it is part of the bundle.
3. **The URL is the production address, not `location.href`.** A code scanned from a dev server or a
   preview build still points at the real app.
4. **Always black on white with a 4-module quiet zone**, whatever the theme. Scanners expect dark modules
   on a light background.
5. The mask is chosen with the standard penalty rules N1–N4. Any mask decodes, and the penalty only helps
   scanning.

## Verification Checklist

- `npm test`: Reed–Solomon matches the thonky.com "HELLO WORLD" 1-M vector. Format bits match the ISO
  table (L/0, M/0, L/7). Finder patterns are drawn. A reader written separately in the test (its own
  function-module map and zigzag, checks the RS remainder) round-trips the share URL and texts for
  versions 1–5, including UTF-8.
- Verified in the dev server on 2026-09-23: the section renders after About, the SVG is 37×37 units
  (29 + quiet zone), and a failed copy shows the fallback hint.

Not verified: scanning the code with a real phone camera (the preview browser has no
`BarcodeDetector`), a successful clipboard copy (the preview pane blocks the clipboard), and the
`navigator.share` path (desktop Chromium in the pane has none).

## Maintenance Notes

Update this note if the encoder gains modes, levels or versions, or if the shared address stops being
a constant. Changing the URL value or the wording needs no update.

## Search Anchor

```text
UI-SHARE-QR-CODE
```
