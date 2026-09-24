# Splash Screen and Menu (Exercises · Settings · Share · Splash screen)

Documentation ID: `UI-SPLASH-SCREEN-MENU`
File revision: `2026_09_r1`
Last reviewed: `2026-09-24`

Related code:
- `App/src/domain/splash.ts` — when to show, which message, which emojis (pure, tested)
- `App/src/domain/splash.test.ts`
- `App/src/storage/repository.ts` — `getSplashState` / `setSplashState` (key `snacktrainer.splash`)
- `App/src/ui/hooks/useSplash.ts` — launch/new-day check and `replay`
- `App/src/ui/views/SplashScreen.tsx` — the full-screen `<dialog>`; styles at the end of `views.css`
- `App/src/ui/views/ShareSheet.tsx` — QR code and link, moved out of Settings
- `App/src/App.tsx` — `menuItems` (phone menu and desktop sidebar links)
- `App/src/texts.ts` — `texts.splash.messages`, `texts.share`

Related documentation:
- `[Planning]/SnackTrainer Vision & Plan v1.md` (`PLANNING-VISION-V1`) — decision 15
- `2026_09_UI_Share_QR_Code.md` (`UI-SHARE-QR-CODE`) — the QR encoder

## Short Version

A full-screen intro tells new users what SnackTrainer is. An exercise emoji changes every second, five
times, above one message. A Skip button fills up like a progress bar; when it is full (5 s) the splash
closes by itself. It shows on the first 5 launches, then on the first launch of each day, and can be
replayed from Menu → Splash screen.

The phone menu is now Exercises · Settings · Share · Splash screen. Share (QR code + link) left Settings
and got its own sheet. The desktop sidebar lists the non-tab items (Settings, Share, Splash screen) at the bottom.

## Behavior Contract / Key Decisions

1. **Messages are a list in `texts.splash.messages`.** Automatic showings go through the list in order
   (`shownCount % length`): welcome first, then 100% private, made by Casper Wollesen, and so on. Add a
   message by appending it; nothing else changes. A replay from the menu picks a random message.
2. **The state is device-local UI state, not `AppData`.** `{ shownCount, lastShownDate }` lives under its own
   key, so no data version bump, it is not in backups and "delete everything" does not reset it.
3. **Only automatic showings count.** A replay never uses up a daily or first-launch showing.
4. **"Launch" is a page load or the day changing while the app is open** (`useClock` refreshes on
   visibility, so a PWA left in the background shows it when brought back on a new day). A `useRef` guard
   keeps StrictMode's double effect run from counting one launch twice.
5. **Emojis come from the visible exercises** (built-in and custom, hidden ones left out), 5 different
   ones in random order.
6. **Always skippable**: Skip has focus when it opens (Enter/Space), Escape also closes. With reduced
   motion the animations are off and the bar is shown full; the 5 s timer still closes it.

## Verification Checklist

- `npm test`: first 5 launches show (also on the same day), then once per day, message order, defensive
  parsing, distinct emoji picks.
- Verified in the dev server on 2026-09-24 (375×812): first launch shows the welcome message and stores
  `shownCount: 1` once; the next reload shows "100% private."; the emoji changes each second and the splash
  closes after 5 s; with `shownCount: 5` and today's date it does not show, with yesterday's date it does;
  Menu lists the four items; Share opens the QR sheet; Splash screen replays without counting; Skip has
  focus and closes it. Desktop sidebar shows Settings, Share, Splash screen. No console errors.

Not verified: on a real phone (iOS standalone PWA resume on a new day, safe-area padding), the
reduced-motion path, and how the emojis render on Android/iOS fonts.

## Maintenance Notes

Change `SPLASH_FIRST_LAUNCHES`, `SPLASH_EMOJI_COUNT` or `SPLASH_EMOJI_MS` in `domain/splash.ts` to tune it.
Update this note if the splash state moves into `AppData` or gains more than messages (for example images).

## Search Anchor

```text
UI-SPLASH-SCREEN-MENU
```
