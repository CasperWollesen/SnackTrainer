# App Shell, Storage and Logging (SnackTrainer v0.1)

Documentation ID: `APP-SHELL-STORAGE-LOGGING`
File revision: `2026_09_r2`
Last reviewed: `2026-09-23`

Related code:
- `App/src/domain/types.ts` — the data model (`AppData`, `Session`, `Entry`, `Exercise`)
- `App/src/domain/sessions.ts` — add/edit/delete entries, session grouping, totals
- `App/src/domain/exercises.ts` — built-in catalogue (from MuscleUp), search, recent, grouping
- `App/src/domain/backup.ts` — backup format and the validator also used when loading storage
- `App/src/storage/repository.ts` — the single owner of state; loads/saves `localStorage`
- `App/src/ui/useActions.ts` — user actions with toast + Undo
- `App/src/App.tsx` — tabs, overlays (sheets), date selection
- `App/vite.config.ts` — base path `/SnackTrainer/`, PWA manifest and service worker

Related documentation:
- `[Planning]/SnackTrainer Vision & Plan v1.md` — why the app exists, decisions, plan
- `2026_09_UI_History_Weeks_Exercise_Page_Hiding.md` (`UI-HISTORY-WEEKS-EXERCISE-PAGE`) — week grouping, exercise page, hidden exercises, data version 2

## Short Version

SnackTrainer is a React 19 + TypeScript + Vite PWA under `App/`. All state is one `AppData`
object held in memory by `repository.ts`, persisted as one JSON blob under the `localStorage`
key `snacktrainer.data` on every change, and read by React through `useSyncExternalStore`
(`useAppData`). Domain logic in `src/domain/` is pure and unit-tested with Vitest (21 tests).

Logging: the user picks an exercise, enters reps (counter) or time (stopwatch), optionally
adjusts the clock time, and saves. `addEntry` decides whether the entry joins the latest session
of that day (gap ≤ `settings.sessionGapMinutes`, default 20) or starts a new one. Every everyday
write shows a toast with Undo instead of a confirmation dialog.

## Behavior Contract / Key Decisions

1. **One blob, whole-state writes.** `repository.update(fn)` applies a pure `AppData → AppData`
   function, writes the JSON, notifies subscribers. Writes never throw; `lastSaveFailed` is set
   and `useActions` turns it into an error toast.
2. **Corrupt storage is not destroyed.** If the stored JSON fails `validateAppData`, the app
   starts empty, sets `repository.loadedCorrupt`, shows a warning toast, and leaves the old blob
   in place until the next successful write overwrites it.
3. **Sessions are explicit, not derived.** Editing an entry's time keeps it in its session;
   the session's `startedAt`/`date` follow its earliest entry. Deleting the last entry deletes
   the session. Undo of a delete restores the entry into its original session id (or revives it).
4. **Exactly one of `reps` / `seconds` per entry.** Enforced by `Amount` in code and by the
   validator on load/import.
5. **Local wall-clock strings everywhere** (`YYYY-MM-DD`, `HH:MM`, `YYYY-MM-DDTHH:MM`).
   No `Date` arithmetic except through `domain/dates.ts`.
6. **Exercise ids are slugs** (`push-up`); custom exercises are `custom-<id>`. Entries referring
   to a deleted custom exercise render as "Unknown exercise" and keep their numbers.
7. **UI strings only in `texts.ts`.** English UI.
8. **Any exercise can be logged in either mode.** `Exercise.mode` is only the default the log
   sheet starts in; a `Reps | Time` segmented control switches.

## Runtime Design / Implementation Map

Data flow: view → `useActions` (or `repository.setSettings` for settings) → `repository.update`
→ `localStorage` + subscribers → `useAppData` re-renders views.

| Path | Responsibility |
|---|---|
| `src/App.tsx` | Tab state, selected date, overlay state machine (`log`, `entry`, `exercise`, `settings`), install hint banner |
| `src/ui/views/TodayView.tsx` | Day header with ← / →, stat tiles, session cards (newest first), entry rows |
| `src/ui/views/LogSheet.tsx` | Two-step sheet: `ExercisePicker` → `Counter`/`Stopwatch` + time override; "Save & add another" |
| `src/ui/views/EntrySheet.tsx` | Edit amount/mode/time or delete one entry |
| `src/ui/views/HistoryView.tsx` | Days/Weeks grouping, range and metric (reps/time) toggles, `BarChart`, stat tiles, day or week list, per-exercise totals (see `UI-HISTORY-WEEKS-EXERCISE-PAGE`) |
| `src/ui/views/ExercisesView.tsx` | Catalogue with totals and last use; opens the exercise page (see `UI-HISTORY-WEEKS-EXERCISE-PAGE`) |
| `src/ui/views/ExerciseEditor.tsx` | Create/edit/delete custom exercises |
| `src/ui/views/SettingsSheet.tsx` | Install, session gap stepper, backup export/import with preview, delete all, about |
| `src/ui/components/BarChart.tsx` | PowerOn-style CSS bar chart: nice axis maximum, gridlines, tap to select |
| `src/ui/components/Stopwatch.tsx` | Elapsed time derived from `Date.now()` timestamps, so background throttling does not drift |
| `src/ui/components/Sheet.tsx` | Native `<dialog>` sheet; `tall` keeps a fixed height for list filtering |
| `src/storage/storage.ts` | Defensive `localStorage` wrapper, persistent-storage request |

Service worker and manifest come from `vite-plugin-pwa` (`registerType: 'prompt'`); the
`UpdateBanner` offers "Reload" and never reloads on its own.

## Verification Checklist

```powershell
cd App
npm run typecheck   # clean
npm test            # 21 tests, 4 files, green
npm run build       # dist/ ~291 KB JS, PWA precache 15 entries
npm run dev         # http://localhost:5173/SnackTrainer/
```

Verified in the desktop app's browser pane (mobile viewport 375×812) on 2026-09-23:
log 20 × Squat → session at 15:57 with Undo toast; log Plank via stopwatch 0:06 within the gap
→ joined the same session, "6 s" in the Time tile; History chart, stat tiles, day list and
per-exercise list render with 12 days of injected test data; Exercises tab shows Recent chips
and totals.

**Not verified:** a real phone (iOS Safari install flow, Android install prompt), offline
behaviour of the built service worker, GitHub Pages deployment (repository Pages source must be
set to GitHub Actions first), backup import via the file picker (export/parse is unit-tested).

## Open Items / Deliberately Not Done

- No demo-data button (dropped from the plan); test data is injected through the console.
- The native `<input type="time">` follows the browser locale (12-hour in en-US browsers).

## Maintenance Notes

Update this note when `AppData` changes shape (also bump `DATA_VERSION`, add a step to
`upgradeAppData` in `backup.ts`, extend `validateAppData` and tests), when the session-grouping rule
changes, or when a new tab/sheet is added. Wording, styling and new exercises in the catalogue
do not need a documentation update.

## Search Anchor

```text
APP-SHELL-STORAGE-LOGGING
```
