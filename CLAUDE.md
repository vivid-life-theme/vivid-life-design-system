# Vivid Life Design System

Foundation for a 4-flavor × 6-variant = 24-theme color system. Source of truth is `tokens.json5`; build tools emit `tokens.json`, `dist/tokens.js`, and `colors_and_type.css`. No npm dependencies — plain Node.js.

## Key Config Files

| File | Purpose |
|------|---------|
| `.claudeignore` | Paths excluded from Claude Code indexing                           |
| `.claude/learnings.md` | TODO: add description |
| `.claude/settings.json` | Permissions, hooks, environment variables                          |
| `.githooks/pre-commit` | Keeps Key Config Files table in sync before each commit            |
| `.github/workflows/claude-code-review.yml` | Auto-reviews every PR when opened or updated                       |
| `.github/workflows/claude.yml` | Responds to @claude mentions in issues and PRs                     |
| `.gitignore` | Git ignore patterns                                                |
| `scripts/sync-config-table.sh` | Syncs Key Config Files table with filesystem                       |
| `SKILL.md` | Designer's skill — invoke with /vivid-life-theme                   |
| `tokens.json` | Generated — resolved flat token map; consumed by downstream ports  |

## Commands

- `node tools/build-tokens.mjs` — resolve `tokens.json5` → `tokens.json` + `dist/tokens.js` + WCAG AA check
- `node tools/build-css.mjs` — generate `colors_and_type.css` from `tokens.json5`
- `node tools/build-css.mjs --check` — verify CSS is in sync (CI mode, exits non-zero on drift)

Run both build commands after any change to `tokens.json5`.

## Structure

```
tokens.json5         ← single source of truth (edit this)
tokens.json          ← generated (do not hand-edit)
dist/tokens.js       ← generated ES module (do not hand-edit)
colors_and_type.css  ← generated CSS (do not hand-edit)
tools/               Build scripts with WCAG checking
fonts/               Atkinson Hyperlegible Next + Mono (OFL-1.1)
assets/              Logo SVGs, wordmark, icon PNGs
preview/             HTML reference cards (14-kitchen-sink.html is canonical)
```

## Conventions

- `tokens.json5` is the only file you hand-edit; all outputs are generated.
- WCAG AA at ≥ 4.5:1 for all 24 (flavor × variant) accent combinations is non-negotiable.
- Flavor order in any listing: Midnight → Twilight → Dawn → Noon.
- Cyan is not a variant — it exists only for ANSI/diff-hunk protocol uses.
- Don't add a serif typeface; the brand uses Atkinson Hyperlegible (sans + mono only).

## Don't

- Don't commit secrets or credentials to git
- Don't use --force flags — fix the underlying issue instead
- Don't hand-edit `tokens.json`, `dist/tokens.js`, or `colors_and_type.css`
- Don't introduce a new flavor or variant without updating the WCAG accent-shade table in `tokens.json5`

## Learnings

When the user corrects a mistake or points out a recurring issue, append a one-line
summary to .claude/learnings.md. Don't modify CLAUDE.md directly.

## Compact Instructions

When compacting, preserve: list of modified files, current test status, open TODOs, and key decisions made.
