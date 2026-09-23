# SnackTrainer ⚡

Log your **exercise snacks**: the 20 push-ups at 07:30, the 10 squats and a 45-second plank at
15:15. One tap picks an exercise, − / + or a typed total sets the reps, a stopwatch handles holds.

Installable web app (PWA), no account, no backend, no sync. Data lives in the browser's
`localStorage` on the device; a JSON backup export/import is the safety net.

Live (after the first deploy): <https://casperwollesen.github.io/SnackTrainer/>

## Features

- **Today** – reps, time and sessions for the day; the list of sessions with clock time and
  entries; ← / → to step through earlier days. Tap an entry to edit or delete it.
- **Log** – search or pick a recent exercise, count reps (− / +, +5, +10, or type), or run the
  stopwatch for holds. Optional time override for logging something done earlier.
- **Sessions** – entries logged within 20 minutes (configurable) of each other form one session.
- **History** – 14-day / 4-week / 8-week bar chart of reps or minutes per day, totals, a day list
  and a per-exercise breakdown.
- **Exercises** – all 58 exercises from MuscleUp, searchable, with totals and last use; add your
  own.
- **Backup** – export/import one JSON file with validation and preview.
- **Offline** – service worker caches the app; "New version ready" banner on updates.

## Repository layout

```
README.md  AGENTS.md  CLAUDE.md
.github/workflows/deploy.yml   Builds App/ and deploys dist/ to GitHub Pages
AI Documentation/              Vision & plan, feature notes
App/                           The web app (React 19, TypeScript, Vite 7, vite-plugin-pwa)
```

## Getting started

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
cd App
npm install
npm run dev
```

The dev server runs on <http://localhost:5173/SnackTrainer/> (same sub path as on GitHub Pages).

| Command             | Does                                          |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Development server with hot reload            |
| `npm run typecheck` | `tsc --noEmit`                                |
| `npm test`          | Runs all Vitest tests once                    |
| `npm run build`     | Typecheck + production build into `App/dist/` |
| `npm run preview`   | Serves `dist/` locally (offline testing)      |
| `npm run icons`     | Regenerates the PNG icons in `App/public/`    |

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci` → typecheck → test → build →
deploy. **One-time setup in GitHub:** repository → Settings → Pages → Build and deployment →
Source: **GitHub Actions**.

## Documentation

- `AI Documentation/[Planning]/SnackTrainer Vision & Plan v1.md` – vision, data model, decisions, plan
- `AI Documentation/2026_09_APP_Shell_Storage_And_Logging.md` – how the app is built
- `AGENTS.md` – rules for anyone (or any AI) changing the code
