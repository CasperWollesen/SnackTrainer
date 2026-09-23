# Working on SnackTrainer

Instructions for anyone changing this repository, human or AI. Two minutes to read.

SnackTrainer is a personal PWA for logging exercise snacks (reps and timed holds) during the day.
React 19 + TypeScript + Vite under `App/`, data in `localStorage`, hosted on GitHub Pages.
No backend, no sync, no account.

## Layout

```
README.md  AGENTS.md  CLAUDE.md
.github/workflows/deploy.yml   Build App/ and deploy dist/ to GitHub Pages
AI Documentation/              Vision, plan and feature notes (see [Planning]/)
App/                           The web app (package.json, vite.config.ts, src/, public/)
```

Everything that ships lives under `App/`. Do not put source files in the repository root.

## Ground rules

1. **Read `AI Documentation/[Planning]/SnackTrainer Vision & Plan v1.md` first.** It holds the
   data model, the decisions and the plan. Update the plan checkboxes when a milestone item lands.
2. **Keep the boundaries.** `src/domain/` is pure logic (no React, no DOM, no storage) and is
   unit-tested. Only `src/storage/repository.ts` reads or writes `localStorage`. Views render
   from `AppData` and call repository functions.
3. **English everywhere** in code, comments and UI. All UI strings live in `src/texts.ts`.
   The owner writes Danish in conversation; answer in the language used, never mix inside the app.
4. **Local dates, never UTC.** Use `src/domain/dates.ts`. Entry times are `YYYY-MM-DDTHH:MM`
   local wall-clock strings; days are `YYYY-MM-DD`.
5. **Undo, not confirm.** Everyday actions (log, edit, delete an entry) show a toast with Undo.
   Only "delete everything" asks first.
6. **No new dependency** without a note in the vision document's decisions.
7. **Changing `AppData`?** Bump `version` in `src/domain/types.ts`, add a migration step in
   `src/storage/repository.ts`, update `src/domain/backup.ts` validation and its tests.
8. **Relative asset paths.** The app is served from `/SnackTrainer/`; Vite's `base` handles it.
   Never hard-code the sub path in code.

## The loop for a change

```powershell
cd App
npm run typecheck
npm test
npm run dev        # http://localhost:5173/SnackTrainer/
npm run build      # before pushing
```

Node is not on PATH on the owner's machine; it lives at
`C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs\`.
`.claude/launch.json` (git-ignored) points the preview browser at that path.

## Commits

- One logical change per commit. Subject in the imperative, under 72 characters.
- Push to `main`; the workflow deploys to GitHub Pages. First time: repository → Settings →
  Pages → Source: **GitHub Actions**.
- Say what was not verified rather than reporting optimistically.
