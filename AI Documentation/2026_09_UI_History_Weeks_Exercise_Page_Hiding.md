# History Weeks, Exercise Page and Hidden Exercises (Milestone 2)

Documentation ID: `UI-HISTORY-WEEKS-EXERCISE-PAGE`
File revision: `2026_09_r2`
Last reviewed: `2026-09-23`

Related code:
- `App/src/domain/dates.ts` — `startOfWeek`, `isoWeekNumber` (ISO 8601, Monday weeks)
- `App/src/domain/sessions.ts` — `weeklyTotals`, `sessionsWithExercise`, `personalBests`
- `App/src/domain/exercises.ts` — `visibleExercises`, `hiddenExercises`, `withHidden`, `unusedBuiltInIds`
- `App/src/domain/backup.ts` — `upgradeAppData` (v1 → v2) and `hiddenExerciseIds` validation
- `App/src/ui/components/BarChart.tsx` — generic bars plus `dayBars` / `weekBars` builders
- `App/src/ui/views/HistoryView.tsx` — "By exercise" rows open the exercise page (the view itself: `UI-HISTORY-PERIODS-NERD-DEMO`)
- `App/src/ui/views/ExerciseSheet.tsx` — the exercise page
- `App/src/ui/views/ExercisesView.tsx` — opens the page, "Hide N unused", Hidden section
- `App/src/ui/components/ExercisePicker.tsx` — leaves hidden exercises out (search still finds them)
- `App/src/ui/useActions.ts` — `setHidden` with Undo
- `App/src/App.tsx` — `exerciseInfo` overlay and its wiring

Related documentation:
- `2026_09_APP_Shell_Storage_And_Logging.md` (`APP-SHELL-STORAGE-LOGGING`) — storage, sessions, the rest of the UI
- `2026_09_UI_History_Periods_Nerd_Demo.md` (`UI-HISTORY-PERIODS-NERD-DEMO`) — the current History view
- `[Planning]/SnackTrainer Vision & Plan v1.md` (`PLANNING-VISION-V1`) — decisions 8 and 9, milestone 2

## Short Version

Three milestone-2 features:

1. **Weekly History** (superseded). History used to have a *Days / Weeks* toggle. It was replaced by
   the period-based History described in `UI-HISTORY-PERIODS-NERD-DEMO`. `weeklyTotals`, `weekBars`
   and the ISO week helpers are still used there and by the exercise page.
2. **Exercise page.** A tall sheet for one exercise: total, sessions, best session, best set, a
   4-week daily or 26-week weekly chart, and every session with the exercise (newest first, 20 shown
   before "Show all"). The best session is marked. Tapping a session opens that day on Today. It is
   opened from the Exercises tab (tapping a row no longer opens the log sheet) and from History's
   "By exercise" rows.
3. **Hidden exercises.** Any exercise (built-in or custom) can be hidden from its page, or all
   never-logged built-ins at once with "Hide N unused" on the Exercises tab. Hidden exercises are left
   out of the pickers and Recent chips. They are listed in a "Hidden" section on the Exercises tab, and
   a picker search still finds them under a trailing "Hidden" group. History and totals are not affected.

The data model moved to **version 2** (`settings.hiddenExerciseIds`).

## Behavior Contract / Key Decisions

| # | Decision | Why |
|---|---|---|
| 1 | Hidden state is `settings.hiddenExerciseIds: string[]`, not a flag on `Exercise`. | Built-ins live in code (`BUILT_IN_EXERCISES`), so they have no stored object to flag. One list covers built-ins and customs. |
| 2 | Migration steps live in the pure `upgradeAppData` (`domain/backup.ts`); `repository.ts`'s `migrate` and `parseBackup` both call it before `validateAppData`. | A v1 backup exported yesterday must still import. `validateAppData` itself accepts only `DATA_VERSION`. |
| 3 | The upgraded blob is written to `localStorage` on the next change, not on load. | Loading never writes. A v1 blob keeps working until then. |
| 4 | Backup `formatVersion` stays 1. | The wrapper did not change, only the `data` inside it. An older app build given a v2 backup reports `invalid-data`. |
| 5 | "Best session" = the highest sum over one session's entries of that exercise. Ties keep the earliest session. "Best set" = the highest single entry. | "Personal best per session" is what the plan asked for. A snack is often several sets. |
| 6 | The page shows the exercise's own mode (reps/time) unless it was only ever logged in the other mode. | Plank shows time, push-ups show reps, and a mismatch does not show zeros. |
| 7 | Hide/Show closes the exercise sheet before the toast appears. | The sheet is a modal `<dialog>`, and everything outside it (including the toast) is inert. With the sheet open, Undo could not be clicked. |
| 8 | "Hide N unused" is shown only after something has been logged, and counts only visible built-ins with no entries. | Otherwise a new user could hide the whole catalogue with one tap. |
| 9 | Week ranges are whole ISO weeks. `weeklyTotals` still clips to `from..to`, so the current week counts only up to today. | Bars line up with calendar weeks. The last bar is visibly partial ("This week"). |
| 10 | Undo for hiding restores the previous list exactly (`before`), not the inverse operation. | Hiding 52 exercises, then undoing, must not also unhide ones that were hidden before. |

## Runtime Design / Implementation Map

- `BarChart` now takes `bars: ChartBar[]` (`id`, `value`, `axisLabel`, `name`, `current`, `muted`) instead
  of days. Build them with `dayBars(days, today)` (weekday initials up to 14 bars, day of month beyond,
  weekends muted) or `weekBars(weeks, today)` (week number, the current week highlighted). Axis labels are
  shown every 1/2/7 bars depending on count. The axis grid uses `minmax(0, 1fr)` so a visible label may spill
  over its hidden neighbours without shifting columns. This also fixed labels being clipped in the
  4-week day chart on phones.
- Per-exercise statistics reuse the day/week helpers: `sessionsWithExercise(data.sessions, id)` returns
  sessions narrowed to that exercise's entries, and `dailyTotals` / `weeklyTotals` / `totalsOf` /
  `exerciseTotals` / `personalBests` run on `{ sessions: narrowed }`.
- App overlay `{ kind: 'exerciseInfo', exerciseId }` stores only the id. The exercise is looked up on every
  render, so edits show immediately, and a deleted custom exercise falls back to `unknownExercise`.
- `ExercisePicker` builds its list from `visibleExercises`. It fetches extra Recent ids so that hidden ones
  can be skipped and six chips still shown.

## Compatibility, Migration And Constraints

- `DATA_VERSION` 1 → 2. v1 data (localStorage or backup) gets `hiddenExerciseIds: []`.
  `validateSettings` drops non-string and empty ids and removes duplicates. A non-array falls back to `[]`.
- Hidden ids that no longer exist (a deleted custom exercise) stay in the list harmlessly.
  `hiddenExercises()` only returns exercises that exist.

## Verification Checklist

Automated (`cd App`): `npm run typecheck`, `npm test` (week start/number incl. year boundaries,
`weeklyTotals` clipping and empty weeks, `sessionsWithExercise` / `personalBests` incl. ties,
hide/show helpers, v1 → v2 upgrade through `upgradeAppData` and `parseBackup`, id cleaning),
`npm run build`.

Verified manually on 2026-09-23 in the dev server (desktop pane and a 375×812 emulated phone), with ~10 weeks of
generated v1 data injected into `localStorage`:
- The v1 blob loads without the "could not be read" toast, and becomes `version: 2` after the first change.
- History Weeks 8/26 renders, "This week" row, day chart labels no longer clipped at 4 weeks.
- Exercise page from the Exercises tab and from History "By exercise": stats, time metric for Plank,
  best-session marker, 26-week chart (26 bars), tapping a session opens that day on Today.
- Hide → toast → Undo, Show again → toast → Undo (Undo is hit-testable after the sheet closes).
- Hidden exercise absent from list and Recent, found under "Hidden" when searching in the log sheet.
- "Hide 52 unused" hides all never-logged built-ins, the suggestion disappears, "Show all" unhides everything.

Not verified: a real phone (iOS Safari / Android Chrome), screen readers, and importing a backup file
through the Settings UI (only `parseBackup` in unit tests).

## Open Items / Deliberately Not Done

- Manual reordering of exercises (parked in the vision document).
- Week rows are not clickable. There is no week detail view.
- The exercise page chart has no Reps/Time toggle. The metric is chosen automatically (decision 6).

## Maintenance Notes

Update this note when `hiddenExerciseIds` or the version/migration flow changes, when the
exercise page gains or loses sections or entry points, or when week semantics change (e.g. Sunday
weeks). Text changes, styling, range lengths and preview counts do not need an update.

## Search Anchor

```text
UI-HISTORY-WEEKS-EXERCISE-PAGE
```
