# CLAUDE.md

@AGENTS.md

Claude-specific notes on top of the shared instructions above:

- Start by reading `AI Documentation/[Planning]/SnackTrainer Vision & Plan v1.md`; work through
  the plan's open checkboxes in order unless told otherwise.
- Verify in the browser before saying something works: `preview_start` with the `dev`
  configuration from `.claude/launch.json`, then open `http://localhost:5173/SnackTrainer/`.
- Run `npm run typecheck`, `npm test` and `npm run build` (in `App/`) before committing.
- When a feature is finished, write or update a note in `AI Documentation/` following
  `AI Documentation/[Planning]/AI Documentation Planning v1.md`.
- The owner prefers being told what was not verified over optimistic reporting.
