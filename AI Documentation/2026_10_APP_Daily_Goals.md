# Goals (per day and per week)

Documentation ID: `APP-DAILY-GOALS`
File revision: `2026_10_r4`
Last reviewed: `2026-10-15`

Related code:
- `App/src/domain/goals.ts` — `goalValueOf`, `goalRange`, `goalProgress`, `daysAllGoalsMet`, `newlyReachedGoals`, `goalStreak`, `GOAL_LIMITS`, `clampTarget`, `withGoal`, `withoutGoal`
- `App/src/domain/goals.test.ts`
- `App/src/domain/types.ts` — `Goal`, `GoalMetric`, `GoalPeriod`, `Settings.goals`, `DATA_VERSION = 7`
- `App/src/domain/backup.ts` — 4 → 5, 5 → 6 and 6 → 7 steps, `validateGoal`
- `App/src/ui/components/GoalList.tsx` — rows with progress bar and streak; `goalScope` (name + emoji)
- `App/src/ui/views/GoalsSheet.tsx`, `App/src/ui/views/GoalEditor.tsx` — list and editor (Menu → Daily goals)
- `App/src/ui/views/TodayView.tsx` — `GoalsSection`
- `App/src/ui/useActions.ts` — `saveGoal`, `deleteGoal` (Undo), "Goal reached" on log
- `App/src/ui/views/HistoryView.tsx`, `App/src/ui/components/BarChart.tsx` (`marked`) — days with all goals met

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

### Week goals (added 2026-10-15, data version 6)

A goal has a `period`: `day` or `week` (ISO week, Monday–Sunday). The editor starts with "Per: Day | Week";
week targets have their own limits (reps 10–10000 step 10, time 5 min–40 h step 5 min, snacks 1–150).

- Today and the Goals sheet show a week goal as "285 / 500 reps this week" with a "Week" tag. The value
  counts Monday up to and including the day shown.
- The bar has a thin mark where an even pace would be by the end of that day (Monday 1/7 … Sunday 7/7),
  hidden once the goal is met.
- The streak counts weeks ("🔥 3 weeks"); an unfinished current week does not break it.
- "Goal reached" names it "(this week)".
- History's green day dots and "All daily goals met on N of M days" use only daily goals. With the Week
  period selected, a second line says "All week goals met" or "Week goals: N of M met".
- v5 → v6: `settings.dailyGoals` becomes `settings.goals`, every existing goal with `period: 'day'`.

Verified 2026-10-15 in the dev server with stored v5 data: the existing goal came through as a daily goal,
a new week goal (500 reps) saved as version 6 without `dailyGoals`, Today showed "285 / 500 reps this week"
with the pace mark at 57 % on a Thursday, and History → Week showed "Week goals: 0 of 1 met".

### Bodyweight scope (added 2026-10-15, data version 7)

"Counts" has **Bodyweight exercises** right after All exercises (`Goal.bodyweight: true`, at most one
scope per goal). It counts entries whose exercise has `bodyweight: true`: the built-in flag copied
from MuscleUp, or the toggle on a custom exercise. Entries of unknown (deleted) exercises do not count.
Shown as "🤸 Bodyweight exercises". The 6 → 7 step changes nothing in existing goals.

Verified 2026-10-15 in the dev server: stored v6 data loaded; a new bodyweight goal saved as version 7
with `bodyweight: true` and showed "20 / 100 reps" from the day's push-ups. No console errors.

### In History

Days where **every** goal was met get a green dot above their bar in the by-day chart (read out as
"all goals met"), a "Goals met" tag in the Days list, and a line under the tiles: "🎯 All goals met
on N of M days" (elapsed days only), or for the Day period "🎯 All goals met" / "Goals: 2 of 3 met".
Goals are about whole days, so this ignores History's exercise filter. Goals have no history: they
are judged as they are now, so changing a goal re-colours past days.

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
- History, 2026-10-15, demo data with "2 snacks a day": week 40 showed "All goals met on 3 of 7 days",
  three chart dots on Wed–Fri (each bar's label ends "· all goals met") and the same three days tagged
  "Goals met" in the Days list.

Not verified: on a real phone, streak display with real multi-day data in the browser (covered by
unit tests), and the native select's look on iOS.

## Open Items / Ideas


## Maintenance Notes

Update this note when a metric or scope is added, when goals move out of settings, or when the
streak rule changes. Wording and stepper limits need no update.

## Search Anchor

```text
APP-DAILY-GOALS
```
