# Snack Session Timer and Stretching (Milestone 4)

Documentation ID: `APP-SNACK-SESSION-TIMER`
File revision: `2026_10_r4`
Last reviewed: `2026-10-15`

Related code:
- `App/src/domain/timer.ts` — `startSession`, `touchSession`, `stopSession`, `autoStopIfIdle`, `resumeSession`, `idleDeadline`, `elapsedSeconds`; count-down: `countdownEndMs`, `remainingSeconds`, `finishCountdownIfDue`
- `App/src/ui/views/CountdownDoneSheet.tsx`, `App/src/ui/sound.ts` — the count-down summary and end beep
- `App/src/domain/types.ts` — `ActiveSession`, `Session.durationSeconds`, `Settings.sessionTimeoutMinutes`, `DATA_VERSION = 3`
- `App/src/domain/sessions.ts` — `addEntry` routes entries into the running timer; `startOf` keeps a timed session's start
- `App/src/domain/backup.ts` — v2 → v3 step in `upgradeAppData`, validation of the new fields
- `App/src/domain/exercises.ts` — the Stretching category
- `App/src/ui/components/ActiveSessionBar.tsx` — the bar shown on every tab while the timer runs
- `App/src/ui/hooks/useNow.ts` — one-second clock, only while a timer runs
- `App/src/ui/useActions.ts` — `startTimer`, `stopTimer`, `autoStopTimer`, `touchTimer` (with toasts and Undo)
- `App/src/App.tsx` — the idle check, the bar, activity from the log sheet
- `App/src/ui/views/TodayView.tsx` — "Start snack session", Running / duration tags
- `App/src/ui/views/LogSheet.tsx` — `onActivity`
- `App/src/ui/views/SettingsSheet.tsx` — the auto-stop stepper

Related documentation:
- `[Planning]/SnackTrainer Vision & Plan v1.md` (`PLANNING-VISION-V1`) — Sessions section, decisions 13–14, milestone 4
- `2026_09_APP_Shell_Storage_And_Logging.md` (`APP-SHELL-STORAGE-LOGGING`) — gap-based session grouping
- `2026_09_UI_History_Periods_Nerd_Demo.md` (`UI-HISTORY-PERIODS-NERD-DEMO`) — Nerd view, demo data

## Short Version

Today has a **Start snack session** button. It starts a timer that counts up in a bar at the top of
every tab. The bar shows the elapsed time, what has been logged so far, and the **Log** and **Stop**
buttons. While the timer runs, everything logged on that day goes into this session. Stop saves the
session with its duration. After *n* minutes without activity (default 5, set in Settings → Sessions),
the timer stops by itself **at the last activity**. The quick Log button still works as before, with
gap-based grouping.

The catalogue also has a **Stretching** category: a general "Stretching (general)" plus 17 specific
stretches. They are timed by default, except Cat-Cow and World's Greatest Stretch, which are counted.

## Behavior Contract / Key Decisions

| # | Decision | Why |
|---|---|---|
| 1 | Starting creates only `AppData.activeSession`. The Session (with the timer's id) is created on the first entry. | Stored sessions are never empty. A timer with nothing logged leaves nothing behind. |
| 2 | While a timer runs, `addEntry` puts every entry whose date is the timer's day into that session, whatever the gap. Other days use the normal rule. | Explicit sessions beat the heuristic. Back-dating an entry to yesterday still works. |
| 3 | A timed session's `startedAt` is the timer start. Edits and deletes keep it, unless an entry moves earlier (`startOf`). | "10:00 · 6:12" should mean the timer started at 10:00, even if the first push-up came at 10:03. |
| 4 | Activity = starting, logging, and working in the log sheet (open, pick, counter, mode, and the stopwatch ticking). `touchTimer` writes at most every 15 s. "Keep going" forces a touch. | A long plank does not stop the session, and storage is not written four times a second. |
| 5 | Auto-stop ends the session at `lastActivityMs`, not at the moment it is detected. The check runs every second while the timer runs and at app start. | A forgotten Stop, or an app closed for an hour, adds no time. |
| 6 | Stop and auto-stop show a toast with **Undo**. Undo resumes the same timer, clears the duration, and counts activity from the moment of Undo. | Undo, not confirm (AGENTS rule 5). Without the fresh activity time, an undone auto-stop would stop again at once. |
| 7 | Elapsed time and idle detection use epoch ms (`startedMs`, `lastActivityMs`). The session keeps local wall-clock `startedAt`. | Durations must survive DST and clock display. Dates stay local, as everywhere else. |
| 8 | A broken `activeSession` in storage or a backup is dropped (null). A broken `durationSeconds` rejects the data like any other broken field. | A stale timer must never cost the user their data. |
| 9 | Demo sessions get a duration about 70 % of the time. | The Nerd view "Timed sessions" / "Longest session" rows have something to show. |

## Runtime Design / Implementation Map

1. `TodayView` → `actions.startTimer()` → `startSession(data, new Date())`.
2. `App` runs `useNow(timerRunning)` (1 s tick, also on focus and visibility) and calls
   `actions.autoStopTimer()` on every tick. That calls `autoStopIfIdle` and does nothing until the deadline.
3. `ActiveSessionBar` shows the elapsed time and a summary of the session. In the last minute before
   the deadline it switches to a warning with "Keep going".
4. Logging (`actions.log`) adds the entry and touches the timer in the same write.
5. `LogSheet.onActivity` → `actions.touchTimer()` (throttled).
6. `actions.stopTimer()` / auto-stop → `stopSession` → a toast with Undo → `resumeSession`.

## Compatibility, Migration And Constraints

- `DATA_VERSION` 2 → 3 (`upgradeAppData`): `activeSession: null`, `settings.sessionTimeoutMinutes: 5`.
  Existing sessions have no `durationSeconds` and are "untimed". v1 and v2 backups still import.
- The auto-stop setting is validated to 1–120 minutes. The UI offers 1–30.
- The new built-in ids (`stretching`, `neck-stretch`, … `worlds-greatest-stretch`) must never be
  renamed. Previously hidden lists do not contain them, so they show up as visible.

## Verification Checklist

Automated: `npm test` (55 tests). Covers: start without a session, entries routed into the timer
beyond the gap, start kept on edit/delete, other days untouched, stop with duration or drop when
empty, Undo, throttled touch, idle deadline, auto-stop at the last activity, v2 → v3 upgrade, a
backup round-trip with a running timer, invalid timer dropped, invalid duration rejected, and the
stretching catalogue and nerd timed stats.

Verified manually on 2026-09-23 in the dev server (desktop, and a 375×812 emulated phone):
- Stored v2 data became v3 on the first change. Start → bar at 0:00, counting. Log from the bar →
  Push-Up in the timed session (start 17:30, "Running" tag). Stop → "Session saved · 0:03" and a
  duration tag. Undo resumes.
- Timer with its last activity set 10 min back, then reload → auto-stopped with a 2:00 duration
  (last activity − start), not 12 min.
- 4.5 min idle → the warning "Stops in 0:27" and "Keep going" clears it. Stop with nothing logged →
  "Nothing was logged".
- The log picker shows a Stretching group with 18 exercises. Settings → Sessions has visible labels
  for both steppers.

Not verified: a real phone, and in particular whether iOS/Android keep the page alive or freeze it
in the background. The timer is derived from timestamps, so it stays correct after a freeze, and the
idle check runs on focus.

## Count-down (added 2026-10-15, data version 4)

Today's Start area has "Count up | Count-down" (`settings.timerMode`) and, for a count-down, a minutes
stepper (`settings.countdownMinutes`, 1–60). Start then sets `activeSession.countdownSeconds`.

- The bar shows the time left, a progress bar and "Ends at HH:MM"; the last 10 seconds use the warning colour.
- `autoStopIfIdle` ignores a count-down; `finishCountdownIfDue` stops it at its end time, so the duration
  is exactly the chosen length even when the app was closed past the end.
- `actions.autoStopTimer()` returns the finished count-down (no toast); App shows `CountdownDoneSheet`
  (per-exercise totals, total, Log / Done) once no other sheet is open, and plays `playTimeUp()` unless
  the end was more than 5 s ago.
- Stop early is the normal Stop with Undo; Undo resumes the count-down with its original end.

Verified in the dev server on 2026-10-15 (375×812): the mode and minutes persist, the bar counts down,
a logged entry shows in the bar, the count-down ended by itself, the summary listed the entry and the
session was saved with `durationSeconds: 300`. Not verified: the beep and vibration (the preview pane
has no audio output to check), and behaviour on a locked iPhone, where the page is frozen; the end is
then only noticed when the app is opened again (no sound in that case).

## Start sheet and Discard (added 2026-10-15)

- Today has one "Start snack session" button; it opens `StartSessionSheet` with Count up and
  Count-down (minutes stepper). `actions.startTimer(minutes | null)` stores the mode as
  `settings.timerMode` (highlighted next time) and the length as `settings.countdownMinutes`.
- Discard (timer bar footer) → `discardSession`: removes the timer and its session with every entry
  logged in it; nothing else is touched. Undo → `restoreDiscarded`: the session is put back in order and
  the timer runs on (a count-down keeps its original end).

Verified 2026-10-15 in the dev server: the sheet starts a 5-minute count-down; logging Squat ×10, then
Discard removed the session ("Session discarded with its 1 entry"), and Undo restored the session and
the running count-down. A discard of an empty count-up timer and its Undo also worked.

## Screen kept on (added 2026-10-15)

While `activeSession` is set, `useWakeLock` (App) holds a screen wake lock and re-requests it when
the app becomes visible again (browsers drop it when hidden). The bar adds "Screen stays on while it
runs." only while the lock is held; unsupported or refused shows nothing. This keeps a count-down's
beep working with the phone on the floor, as long as the app stays in front.

Verified 2026-10-15: the preview pane refuses the lock (`NotAllowedError`); the app shows no text and
no error, the timer runs normally. Not verified: that the lock is granted and the screen stays on on
a real iPhone / Android (iOS supports the API from Safari 16.4, also in installed PWAs).

## Open Items / Deliberately Not Done

- No pause button inside a session (the owner chose: a session *is* the break).
- No notification or sound at idle auto-stop (notifications are a non-goal). A count-down beeps only while the app is open.
- History does not yet show session duration as its own metric. It appears in the Nerd view and on Today.

## Maintenance Notes

Update this note when the activity rules, the auto-stop semantics, the `activeSession` shape or
the timed-session start rule change. Wording, the warning threshold and bar styling need no update.

## Search Anchor

```text
APP-SNACK-SESSION-TIMER
```
