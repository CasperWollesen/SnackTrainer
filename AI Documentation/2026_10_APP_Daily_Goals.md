# Daily Goals

Documentation ID: `APP-DAILY-GOALS`
File revision: `2026_10_r1`
Last reviewed: `2026-10-15`

Related code:
- `App/src/domain/goals.ts` — `goalValueOf`, `goalProgress`, `newlyReachedGoals`, `goalStreak`, `GOAL_LIMITS`, `clampTarget`, `withGoal`, `withoutGoal`
- `App/src/domain/goals.test.ts`
- `App/src/domain/types.ts` — `DailyGoal`, `GoalMetric`, `Settings.dailyGoals`, `DATA_VERSION = 5`
- `App/src/domain/backup.ts` — 4 → 5 step, `validateGoal`
- `App/src/ui/components/GoalList.tsx` — rows with progress bar and streak; `goalScope` (name + emoji)
- `App/src/ui/views/GoalsSheet.tsx`, `App/src/ui/views/GoalEditor.tsx` — list and editor (Menu → Daily goals)
- `App/src/ui/views/TodayView.tsx` — `GoalsSection`
- `App/src/ui/useActions.ts` — `saveGoal`, `deleteGoal` (Undo), "Goal reached" on log

Related documentation:
- `[Planning]/SnackTrainer Vision & Plan v1.md` (`PLANNING-VISION-V1`) — decision 17

## Short Version

A daily goal counts **reps**, **time** (seconds of timed entries) or **snacks** (sessions) per day,
over **all exercises**, **one category** (e.g. Stretching) or **one exercise** (e.g. Push-Up).
Examples: 100 reps a day, 50 Push-Up, 10 min of Stretching, 5 snacks a day. Any number of goals.

Today shows a "Goals" section for the day shown: each goal with "35 / 50 reps", a progress bar,
green when met, and the streak (🔥 N days, from 2) when looking at today. With no goals, Today
shows a small "Set a daily goal" link. Logging an entry that completes a goal adds
"🎯 Goal reached: …" to the Logged toast.

## Behavior Contract / Key Decisions

1. **Goals live in `settings.dailyGoals`** (part of AppData, so they are in backups). Data version 5.
   An unreadable goal is dropped on load, never a reason to reject the data.
2. **Time counts timed entries only** (`Entry.seconds`), not session durations; the same as the Time tile.
3. **Snacks count sessions with at least one matching entry**, so "3 Stretching snacks" works.
4. **A streak is days in a row met**, ending today, or yesterday while today is not met yet, so an
   unfinished morning does not show a broken streak.
5. **Choosing a timed exercise** (plank, a stretch) in the editor switches the goal to Time.
6. Stepper limits: reps 5–2000 step 5, time 30 s–4 h step 30 s, snacks 1–30.
7. Delete closes the sheets so the Undo toast is reachable (same rule as hiding an exercise).

## Verification Checklist

- `npm test`: values per metric and scope, other days ignored, newly reached goals, streaks (gap,
  unfinished today), list editing, target clamping, v4 → v5 upgrade, dropping bad goals.
- Verified in the dev server on 2026-10-15 (375×812): "Set a daily goal" → Add goal → Push-Up,
  15 reps → saved (data written as version 5), shown on Today and in the sheet; logging 10 more
  showed "Goal reached: Push-Up" and the row turned green; Edit → Delete → Undo restored it; the
  menu lists Daily goals after Exercises. No console errors after a clean reload.

Not verified: on a real phone, streak display with real multi-day data in the browser (covered by
unit tests), and the native select's look on iOS.

## Open Items / Ideas

- History: mark days where all goals were met; a "goals met" count per period.
- Weekly goals (e.g. 500 push-ups a week) would reuse the same value function over a week's sessions.
- A bodyweight-only scope (the catalogue's `bodyweight` flag) if categories are not enough.

## Maintenance Notes

Update this note when a metric or scope is added, when goals move out of settings, or when the
streak rule changes. Wording and stepper limits need no update.

## Search Anchor

```text
APP-DAILY-GOALS
```
