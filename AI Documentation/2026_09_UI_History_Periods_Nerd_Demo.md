# History Periods, Nerd View and Demo Data (Milestone 3)

Documentation ID: `UI-HISTORY-PERIODS-NERD-DEMO`
File revision: `2026_09_r1`
Last reviewed: `2026-09-23`

Related code:
- `App/src/domain/periods.ts` — `periodAt`, `shiftPeriod`, `comparisonFor`, `recentPeriods`, `isLatest`
- `App/src/domain/stats.ts` — `summarize`, `deltaOf`, `hourlyTotals`, `weekdayTotals`, `streaks`, `nerdStats`
- `App/src/domain/demo.ts` — `generateDemoSessions`, `withDemoData`, `removeDemoData`, `isDemoId`
- `App/src/domain/dates.ts` — `startOfMonth`, `endOfMonth`, `addMonths` (clamped)
- `App/src/ui/views/HistoryView.tsx` — the view and `HistoryState`
- `App/src/ui/views/NerdPanel.tsx` — the Nerd view section
- `App/src/ui/format.ts` — `formatPeriod`, `formatDateRange`, `formatDelta`, `chartValue`
- `App/src/ui/components/StatTiles.tsx` — optional `delta` line
- `App/src/ui/useActions.ts` — `setDemo` (add/remove with Undo)
- `App/src/ui/views/SettingsSheet.tsx`, `App/src/App.tsx`, `App/src/ui/views/TodayView.tsx` — demo section, banner, tag

Related documentation:
- `[Planning]/SnackTrainer Vision & Plan v1.md` (`PLANNING-VISION-V1`) — decisions 11 and 12, milestone 3
- `2026_09_UI_History_Weeks_Exercise_Page_Hiding.md` (`UI-HISTORY-WEEKS-EXERCISE-PAGE`) — the exercise page, the week helpers

## Short Version

History shows one **period** at a time: Day (default), Week (ISO), Month, or a rolling 7 or 31 days.
← / → step through time, "Now" jumps back, and → is disabled at the latest period. For the period it shows:

- stat tiles (reps, time, sessions, and active days, or entries for a Day), each with its change
  against the comparison period ("▲ 12%", "▼ 8%", "new");
- a breakdown chart: by hour for a Day, by day otherwise. Tapping a past day opens it as a Day;
- a trend: the last 14 days or 12 weeks/months/windows ending with the shown period. Tapping a bar
  jumps there;
- the active days (tap: open on Today), or an "Open on Today" button for a Day;
- per-exercise totals with change (tap: exercise page);
- a **Nerd view** toggle (see below).

An **exercise filter** narrows everything, including trend and Nerd view, to one exercise. A
**metric** toggle (Reps / Time / Sessions) drives the charts.

**Demo data** can be added, refreshed and removed in Settings. It is marked by an id prefix, shown
with a banner and a "Demo" tag on Today, and removing it never touches real entries.

## Behavior Contract / Key Decisions

| # | Decision | Why |
|---|---|---|
| 1 | Rolling windows step by their own length (7 or 31 days). Calendar periods step by one period, and months are clamped (`addMonths`). | Consecutive windows never overlap, and the trend bars add up. |
| 2 | `comparisonFor`: a finished period is compared with the whole previous one. A running period is cut to today and compared with the same number of days of the previous one (never beyond its end: 1–30 Mar vs all of February). | Otherwise mid-week always looks like a drop. The caption says "the same days". |
| 3 | A Day is compared with the whole previous day, including a running today. | It is simple and matches how the owner reads a day. It also means "today" usually starts as ▼. |
| 4 | `HistoryState` (kind, anchor, metric, exerciseId, nerd) lives in `App`, not in storage. The anchor follows midnight when it was "today". | It survives Today ↔ History. It resets on reload, which is fine for a view setting and needs no `AppData` change. |
| 5 | When the kind changes, the new period contains the last elapsed day of the old one. | Switching Week → Day on last week shows last Sunday, not today. |
| 6 | Time charts use minutes with one decimal (`chartValue`). Tiles use `formatTotalTime`. | Single holds are well under an hour, and whole minutes would flatten a Day chart. |
| 7 | Demo ids start with `demo-`. `findSessionFor` never joins a demo session. `removeDemoData` removes demo entries only and drops sessions left empty. | No `AppData` flag or version bump. Removal cannot delete or split real history. |
| 8 | "Add demo data" replaces existing demo data. It generates 120 days ending now, with a seeded PRNG, a slow upward trend, quieter weekends and rest days. | It is repeatable, and the progress views show something meaningful. |
| 9 | Demo actions close the Settings sheet before the toast appears. | Same reason as for Hide: the modal dialog makes the Undo toast unreachable. |

### Nerd view

Rows for the period: per active day (reps, time, sessions), per session (reps, entries), per set
(reps, hold), biggest session, biggest day (multi-day only), best set, longest hold, earliest/latest
start, busiest hour, busiest weekday (multi-day only), and exercises used (without a filter).
Multi-day periods also get time-of-day and weekday charts. "All time" (after the filter) shows the
current streak (still alive if today is empty but yesterday was active), the longest streak and when
it ended, the first snack, active days, and total reps/time/sessions.

## Compatibility, Migration And Constraints

- No `AppData` change. Demo entries are ordinary entries and are included in backups. An imported
  backup containing demo entries shows the banner and can be cleaned the same way.
- The old Days/Weeks range toggle (14/28/56 days, 8/16/26 weeks) is gone. The same information is in
  the Week/Month periods and their trend.

## Verification Checklist

Automated: `npm test` (48 tests). Covers periods (clamping, stepping, "so far" comparison incl. a
shorter previous month, trend order), stats (summary, deltas, hour/weekday buckets, streaks incl.
the "alive yesterday" case, nerd numbers), and demo (deterministic, valid, never after now, upward
trend, add/refresh/remove keeps real data, no joining of demo sessions).

Verified manually on 2026-09-23 in the dev server with demo data plus one real entry:
- All five periods show the right labels, ranges, bar counts (24 / 7 / 30 / 7 / 31) and comparison captions.
- ← steps a 31-day window back to 24 Jul – 23 Aug. "Now" returns. A trend bar jumps to week 37. A day
  bar drills into that Day.
- Filtering to Plank with Time: time chart, no by-exercise list, Nerd rows without zero reps.
- Demo: add → banner, tag on past days, 369 demo entries. Remove from the banner leaves only the real
  session. Undo restores.
- At 375 px wide nothing overflows horizontally. The top of History was checked by screenshot, the
  rest by measurement (the preview pane does not draw scrolled content in screenshots).

Not verified: a real phone, screen readers, and how the numbers read to the owner over weeks of real
use.

## Open Items / Deliberately Not Done

- The History view state is not persisted across reloads.
- No custom date range and no year period (12 months covers the trend).
- The Nerd view has no per-exercise progression chart. The exercise page covers that.

## Maintenance Notes

Update this note when period semantics or the comparison rule change, when a period kind or Nerd
statistic is added or removed, or when the demo marker changes. Wording, colours, trend counts and
the demo generator's tuning need no update.

## Search Anchor

```text
UI-HISTORY-PERIODS-NERD-DEMO
```
