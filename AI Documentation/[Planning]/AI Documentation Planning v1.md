1# AI Documentation Planning v1

Use this document when a feature has been implemented and a technical AI-documentation note must be created or updated in `\AI Documentation`.

The documentation is for the next developer or AI agent who must understand, change, diagnose, test, or safely extend the feature. It is **not** a changelog, a code dump, or a generic project overview.

## Reusable Prompt

Copy the following prompt after implementing a feature. Replace the placeholders with the feature-specific details that are already known.

```text
Create or update the AI feature documentation for <FEATURE NAME>.

Follow `AI Documentation/[Planning]/AI Documentation Planning v1.md` exactly.
Before writing, inspect the implemented code, relevant React views, project files, tests/build output,
and related AI documentation in `AI Documentation/`. Do not invent behavior, paths,
measurements, verification results, or compatibility guarantees. Mark genuinely unverified items as
such or list them as open items.

Write one focused Markdown file in `AI Documentation/` named:
`YYYY_MM_<AREA>_<Feature_Name>.md`

Use English for the documentation. The audience is a future developer/AI agent familiar with the
SnackTrainer codebase, but not with this feature. Explain intent and decisions before low-level
implementation details. Include concrete code paths, APIs, configuration names, examples and
verification steps where they help someone work safely.

Feature context:
- Feature name: <FEATURE NAME>
- Documentation ID: <AREA-FEATURE-NAME>
- Main user/problem solved: <SHORT DESCRIPTION>
- Relevant code roots or entry points: <PATHS>
- Related existing documentation: <PATHS OR NONE>
- Known compatibility, migration, performance, UI/theme, deployment or safety concerns: <DETAILS>

After writing:
1. Re-read the document against the implementation and remove unsupported claims.
2. Ensure every named file/path/API is accurate and useful.
3. Add a stable documentation ID and a search-anchor section.
4. State what must be maintained when the feature changes, and what ordinary changes do not require
   documentation updates.
5. Report the created/updated file and any intentionally unverified or open items.
```

## Required Documentation Shape

Adapt the headings to the feature. Keep only sections that add information, but cover the underlying questions.

```markdown
# <Feature title> (<short clarification when useful>)

Documentation ID: `<AREA-FEATURE-NAME>`
File revision: `YYYY_MM_r1`
Last reviewed: `YYYY-MM-DD`

Related code:
- `<relative or absolute path>` — <why it matters>

Related documentation:
- `<path or documentation ID>` — <relationship>

## Short Version

Explain in a few paragraphs what changed/exits, who it is for, and the most important rule or outcome.

## Why This Exists

Describe the original problem, constraints, and intended value. Include relevant non-goals when they prevent misuse.

## User-Facing Behavior / Usage

Document the user/API/configuration workflow with concise, realistic examples. For UI features include entry points,
themes, validation/error behavior and important terminology. Omit this section only when there is no user-facing surface.

## Behavior Contract / Key Decisions

State guarantees, invariants, defaults, boundaries, compatibility promises, and the reasons for decisions.
Use numbered decisions or a table when it improves clarity. Distinguish deliberate non-changes from accidental omissions.

## Runtime Design / Implementation Map

Explain how the feature works at a level that makes future changes safe. Include data flow or lifecycle when relevant,
then list the important files/classes and their responsibilities. Prefer exact repository-relative paths.

## Compatibility, Migration And Constraints

Explain legacy behavior, version switches, aliases, upgrade paths, limits, and unsupported cases when applicable.

## Verification Checklist

Give reproducible checks: build command/project, runtime scenarios, error cases, UI/theme combinations,
performance measurements, deployment checks, or diagnostics. State verified results only when actually verified.

## Open Items / Deliberately Not Done

List known follow-ups, risks, rejected alternatives, and why they remain out of scope. Omit only when none exist.

## Maintenance Notes

State exactly when this document must be updated and which routine changes do not need an update.

## Search Anchor

```text
<AREA-FEATURE-NAME>
```
```

## Writing Rules

- Write in English, even when the implementation request is in Danish.
- Describe the implementation that exists now; do not present proposals as shipped behavior.
- Be specific: name the relevant project, class, configuration property, React component, command, path, or error message.
- Explain *why* important decisions were made, especially where a simpler-looking change would break compatibility,
  performance, themes, deployment, thread affinity, or customer configuration.
- Preserve existing terminology and identify legacy names/syntax explicitly.
- Keep examples minimal, valid, and representative. Never include credentials, customer secrets, or environment-specific
  data that should not be documented.
- Prefer tables for mappings, variants, options, and compatibility matrices; prefer a numbered flow for lifecycle/processes.
- Use a stable uppercase `Documentation ID` that can be searched in both code comments and documentation.
- Add or update entry-point code comments with the documentation path/ID when that convention is useful for the feature.
- Do not pad the note with generic React/TypeScript explanations a maintainer already knows.

## Quality Gate For The Agent

Before declaring the documentation complete, confirm:

- The title, filename, documentation ID, revision, and review date are present and internally consistent.
- A reader can answer: what it does, why it exists, where the code lives, how it behaves, how to test it, and what can
  safely change.
- Claims about builds, runtime behavior, performance, or compatibility are supported by inspected code or an explicitly
  recorded verification.
- The note points to related feature documents rather than duplicating their full content.
- Open risks and deliberate limitations are visible rather than hidden in prose.

## Scope

Create a feature document for a meaningful new capability, a cross-cutting behavior change, a risky compatibility layer,
or an implementation with non-obvious operational knowledge. Do not create a separate document for a tiny local refactor
unless it changes a documented contract or would otherwise be difficult to rediscover.
