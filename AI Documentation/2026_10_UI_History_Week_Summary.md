# Week Summary in History

Documentation ID: `UI-HISTORY-WEEK-SUMMARY`
File revision: `2026_10_r1`
Last reviewed: `2026-10-15`

Related code:
- `App/src/domain/weekSummary.ts` — `weekSummary(data, date, today)`, pure
- `App/src/domain/weekSummary.test.ts`
- `App/src/ui/components/WeekSummaryCard.tsx` — the card
- `App/src/ui/views/HistoryView.tsx` — shown for the Week period
- `App/src/texts.ts` — `texts.history.summary`

Related documentation:
- `[Planning]/SnackTrainer Vision & Plan v1.md` (`PLANNING-VISION-V1`)
- `2026_09_UI_History_Periods_Nerd_Demo.md` — History periods
- `2026_10_APP_Daily_Goals.md` — goals per day and week

## Short Version

With **Week** selected in History, a "Week summary" section ("Week so far" while the week runs) sits
right under the tiles. It tells the week as highlights:

- 📊 totals: "285 reps · 12 min · 9 snacks on 4 of 4 days"
- 🏆 best day (most reps, or most time in a week without reps); tap to open it as a Day
- 💪 top exercise with its sets; tap to open the exercise page
- ⭐ new best sets: a single entry this week that beats the best before this week (up to 3, biggest
  relative improvement first); tap to open the exercise
- 🆕 exercises logged for the very first time
- 🎯 daily goals met on N of M days, and week goals met (only when such goals exist)

## Behavior Contract / Key Decisions

1. **Uses all data.** The summary is about the week, so History's exercise filter does not apply; a
   hint says so while a filter is set.
2. **A running week counts up to today** (days = days so far), like the rest of History.
3. **A new best needs a previous best.** The first time an exercise is logged is listed under 🆕, not ⭐.
4. **The goal lines under the tiles are left out for the Week period**, because the summary carries them.
5. Lines without content are left out; an empty week says "Nothing logged this week yet."

## Verification Checklist

- `npm test`: running week totals, best day, top exercise, first times, best sets ordered by
  improvement (and a lower set not counted), a finished week with daily and week goals, time-only
  weeks, future week = null, empty week.
- Verified 2026-10-15 in the dev server (375×812, demo data): week 41 showed totals, best day,
  top exercise and both goal lines; the current week ("Week so far") showed three new best sets;
  tapping Best day opened that day in the Day period. No console errors.

Not verified: on a real phone.

## Maintenance Notes

Update this note when a highlight is added or removed, or when the summary starts following the
exercise filter. Wording and emojis need no update.

## Search Anchor

```text
UI-HISTORY-WEEK-SUMMARY
```
