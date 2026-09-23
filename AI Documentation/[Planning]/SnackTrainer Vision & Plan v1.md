# SnackTrainer – Vision & Plan v1

Documentation ID: `PLANNING-VISION-V1`
File revision: `2026_09_r4`
Last reviewed: `2026-09-23`

Related repositories (inspiration, not dependencies):
- `C:\Development\GitHub\Conrad` – React/Vite/PWA shell, design tokens, sheet/toast/nav components, backup pattern.
- `C:\Development\GitHub\PowerOn` – plain HTML/CSS bar charts (`js/chart.js`), defensive `localStorage` wrapper, "tell me what was not verified" working style.
- `C:\Development\GitHub\MuscleUp` – the exercise catalogue (`Component/Core/ExerciseCatalog.cs`) that SnackTrainer's built-in exercise list is copied from.

## Short Version

SnackTrainer is a tiny installable web app (PWA) for logging **exercise snacks**: the 20 push-ups at
07:30, the 10 squats and 13 push-ups at 15:15. One tap picks an exercise, +/− or a typed total sets the
reps, a stopwatch handles holds like planks. Everything is stored in the browser's `localStorage`
on the device. No account, no backend, no sync with MuscleUp. Hosted as static files on GitHub Pages.

The owner has explicitly accepted that `localStorage` can be lost (cleared site data, new phone).
A JSON export/import exists as the safety net, nothing more.

## Why This Exists

MuscleUp is a full Windows workout tracker for heavy sessions. Exercise snacks are the opposite:
many, tiny, spread over the day, logged on the phone in five seconds. The app must be faster to use
than a note on the fridge, and the history must answer "what did I actually do today / this week?".

Non-goals (version 1): sync of any kind, multiple users, programs/plans, notifications, webcam rep
counting, weights, social features, streak gamification.

## User-Facing Behaviour

### Tabs

| Tab | What it shows |
|---|---|
| **Today** | The selected day (default today) with ← / → to step back and forth. Stat tiles (reps, time, sessions) and the list of sessions, each with its clock time and the entries logged in it ("07:30 · 20 Push-Up"). Tap an entry to edit or delete it. |
| **History** | Group by **Days** (14 days / 4 weeks / 8 weeks) or **Weeks** (8 / 16 / 26 ISO weeks, Monday–Sunday): bar chart of reps, toggle to time. Stat tiles for the range. A list of days (tapping one opens it on the Today tab) or of weeks. A per-exercise breakdown for the range; tapping a row opens that exercise's page. |
| **Exercises** | Search box, "Recent" first, then all visible exercises grouped by category. Tapping an exercise opens its **exercise page**. Custom exercises can be added. "Hide N unused" hides every never-logged built-in at once; a "Hidden" section lists hidden exercises with "Show all". |

**Exercise page** (sheet): totals, sessions, best session (most reps or longest time summed over one session) and best set (single entry), a 4-week daily / 26-week weekly chart and every session with the exercise (the best one marked; tapping one opens that day). Footer: Hide / Show again, Edit (custom only), Log.

**Hidden exercises** are left out of the pickers and Recent; a search still finds them under a "Hidden" group. Their entries count everywhere as before.

A floating **Log** button is always present on phones (sidebar button on desktop).

### Logging flow

1. Tap **Log** → pick an exercise (search or recent).
2. Enter the amount:
   - **Reps** mode: big number, − / +, quick +5 / +10, or type the total.
   - **Time** mode: stopwatch (start / pause / reset) or typed mm:ss.
   - Any exercise can be switched between the two modes; the exercise's default decides the start mode.
3. Optional: change the clock time (defaults to now; the date is the day shown on the Today tab).
4. Save. A toast with **Undo** appears. The entry lands in a session.

### Sessions

A session is a group of entries that belong to one snack. The app never asks the user to "start a
session": a new entry joins the most recent session of the same day when that session's last entry
is less than the *session gap* (default 20 minutes, changeable in settings) old; otherwise a new
session is created. Sessions are stored explicitly (not recomputed), so editing an entry's time later
does not silently regroup history. Deleting the last entry of a session deletes the session.

### Settings

Install hint (iOS: Share → Add to Home Screen; Chromium: install prompt), session gap, export /
import backup (JSON, validated, preview, replace-all), delete everything, about, and **Share**: a QR
code for the public address (`https://CasperWollesen.github.io/SnackTrainer/`) plus a Share / Copy
link button. Only the link is shared, never data.

## Key Decisions

1. **React + TypeScript + Vite, copied in spirit from Conrad.** The shell, sheet, toast, tab bar,
   install prompt, update banner and deploy workflow are proven there. Starting from that skeleton
   is faster than plain HTML *and* keeps types on the data model. PowerOn's chart is ported to a
   React component with the same "fixed axis, CSS bars, no library" approach.
2. **`localStorage`, one JSON blob**, key `snacktrainer.data`, written on every change through a
   defensive wrapper (never throws). Not Dexie/IndexedDB: the data is small (a year of snacks is a
   few hundred KB at most) and the owner asked for simple local storage.
3. **Source lives under `App/`, not the repository root.** GitHub Pages is deployed from the Vite
   `dist/` output by a GitHub Actions workflow with `working-directory: App`, so the root stays
   clean: `README.md`, `AGENTS.md`, `.github/`, `AI Documentation/`, `App/`. JS in the repository
   root is only necessary when Pages serves the branch directly without a build (PowerOn's model).
4. **English in code and UI**, Danish in conversation, like the sibling projects. All UI strings
   live in `App/src/texts.ts`.
5. **Exercise catalogue copied from MuscleUp**, minus the webcam-specific config. Each exercise
   keeps `name`, `emoji`, `category` and gains `mode` (`reps` or `time`). "Plank (hold)" is the only
   built-in time exercise. "Any Exercise (Auto)" is dropped (it only made sense for the Rep Cam).
6. **Entries carry their own timestamp** (`at`, local ISO `YYYY-MM-DDTHH:MM`), sessions carry
   `startedAt`. Dates are local calendar dates; nothing is converted through UTC.
7. **Undo instead of confirm dialogs** for everyday actions (Conrad rule). Only "delete everything"
   confirms.
8. **Hiding lives in `settings.hiddenExerciseIds`**, not on the exercise. Built-ins are code, not data,
   so a per-id list is the only way to hide them; custom exercises use the same list. Data version 2.
   Migration steps are the pure `upgradeAppData` in `domain/backup.ts`, so localStorage and backup
   import upgrade old data identically.
9. **The Exercises tab opens the exercise page, not the log sheet.** Logging from there costs one more
   tap (page → Log); the Log button stays one tap from everywhere.
10. **The share QR code is encoded in-house** (`domain/qr.ts`: byte mode, level L, versions 1–5)
    instead of adding a QR library, in the same spirit as the dependency-free icon script. It is
    rendered at runtime as SVG from `SHARE_URL` in `texts.ts`: works offline, one source of truth.

## Data Model

```ts
type ExerciseMode = 'reps' | 'time';

interface Exercise {
  id: string;          // slug, e.g. "push-up"; custom: "custom-<random>"
  name: string;
  emoji: string;
  category: string;    // Legs, Glutes, Back, Chest, Shoulders, Arms, Core, Full Body, Custom
  mode: ExerciseMode;  // default logging mode
  bodyweight: boolean; // informational, from MuscleUp's MovesBodyweight
}

interface Entry {
  id: string;
  exerciseId: string;
  at: string;          // "YYYY-MM-DDTHH:MM" local
  reps?: number;       // present in reps mode
  seconds?: number;    // present in time mode
}

interface Session {
  id: string;
  date: string;        // "YYYY-MM-DD" local
  startedAt: string;   // "YYYY-MM-DDTHH:MM" local
  entries: Entry[];    // sorted by `at`
}

interface AppData {
  version: 2;              // 1 -> 2 adds settings.hiddenExerciseIds
  sessions: Session[];        // sorted by startedAt
  customExercises: Exercise[];
  settings: {
    sessionGapMinutes: number;
    installHintDismissed: boolean;
    hiddenExerciseIds: string[];   // added in version 2
  };
}
```

Backup file: `{ app: "snacktrainer", formatVersion: 1, exportedAt, data: AppData }`.

## Architecture (App/src)

```
texts.ts                 All UI strings and the app name
domain/                  Pure logic, no React, unit-tested
  types.ts               Data model above
  dates.ts               Local date/time helpers (copied from Conrad, trimmed)
  exercises.ts           Built-in catalogue + search + recent ordering
  sessions.ts            Add/edit/delete entries, session grouping, day/range totals
  backup.ts              Backup format, validation, summary
  ids.ts                 Random ids
storage/
  storage.ts             Defensive localStorage wrapper (PowerOn pattern)
  repository.ts          Load/save AppData, migration hook, subscribe()
ui/
  components/            Button, Sheet, Nav, Toast, EmptyState, Section, StatTiles,
                         BarChart, Counter, Stopwatch, UpdateBanner
  views/                 TodayView, HistoryView, ExercisesView, LogSheet, EntrySheet,
                         ExerciseEditor, SettingsSheet
  hooks/                 useAppData (store subscription), useClock, useToast, useInstallPrompt
styles/                  tokens.css, base.css, components.css, views.css
```

Rule of thumb: views render from `AppData` and call repository functions; `domain/` never touches
the DOM or storage; only `repository.ts` writes to `localStorage`.

## Plan

### Milestone 1 – Skeleton and logging (this session)

- [x] Repository layout (`App/`, `AI Documentation/`, workflow, README, AGENTS.md)
- [x] Vite + React + TS + PWA config, design tokens, base components
- [x] Exercise catalogue from MuscleUp
- [x] Storage wrapper + repository + tests for the domain
- [x] Today view with day navigation, sessions, entry edit/delete
- [x] Log sheet: exercise picker (search + recent), reps counter, stopwatch, time override
- [x] History view with bar chart, stat tiles, day list, per-exercise breakdown
- [x] Exercises view with search, recent, custom exercise editor
- [x] Settings: install, session gap, backup export/import, delete all
- [x] Icons, manifest, service worker (via vite-plugin-pwa), update banner
- [x] `npm run build` and `npm test` green

### Milestone 2 – Polish (next)

- [ ] Verify on a real phone (iOS Safari install, Android Chrome install)
- [x] Weekly view in History (group by ISO week)
- [x] Per-exercise page: history chart for one exercise, personal best per session
- [x] Hide built-in exercises the owner never uses (one by one or "Hide N unused")
- [x] Share QR code for the app's address in Settings

### Ideas parked (not planned)

- Reminders / nudges ("no snack since 11:00")
- Import from MuscleUp session JSON (owner explicitly does not want sync)
- Weight per entry
- Manual reordering of exercises (Recent + hiding covers the need for now)

## Verification Checklist

```powershell
cd App
npm install
npm run typecheck
npm test
npm run build
npm run dev        # http://localhost:5173/SnackTrainer/
```

Manual: log an entry, log another within 20 minutes (same session), one after (new session),
edit an entry's reps, delete, undo, step back a day, check the chart (Days and Weeks), open an
exercise page from the Exercises tab and from History, hide an exercise and undo, "Hide N unused",
search for a hidden exercise in the log sheet, export a backup, import it.

## Search Anchor

```text
PLANNING-VISION-V1
```
