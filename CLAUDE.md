# Vivid Life Design System

Foundation for a 4-flavor × 6-variant = 24-theme color system. Source of truth is `tokens.json5`; build tools emit `tokens.json`, `dist/tokens.js`, and `colors_and_type.css`. No npm dependencies — plain Node.js.

## Key Config Files

| File | Purpose |
|------|---------|
| `.claudeignore` | Paths excluded from Claude Code indexing                              |
| `.claude/learnings.md` | Accumulated corrections and workarounds; read by cc-config-optimize   |
| `.claude/settings.json` | Permissions, hooks, environment variables                             |
| `.claude/skills/release/SKILL.md` | TODO: add description                                                 |
| `.editorconfig` | Locks indent / EOL / final newline across editors                     |
| `.githooks/pre-commit` | Keeps Key Config Files table in sync before each commit               |
| `.github/workflows/claude-code-review.yml` | Auto-reviews every PR when opened or updated                          |
| `.github/workflows/claude.yml` | Responds to @claude mentions in issues and PRs                        |
| `.github/workflows/publish.yml` | Publishes to npm on any `v*` tag push via OIDC (no token needed)      |
| `.gitignore` | Git ignore patterns                                                   |
| `handoff/README.md` | How downstream ports use the handoff artifacts                        |
| `handoff/SKILL.md` | Port-distribution skill — copied into a port's `.claude/skills/`      |
| `package.json` | npm manifest: exports, files, scripts (build/check/test)              |
| `.prettierignore` | Protects generated outputs from any formatter on save                 |
| `scripts/sync-config-table.sh` | Syncs Key Config Files table with filesystem                          |
| `tokens.json` | Generated — resolved flat token map; consumed by downstream ports     |

## Commands

- `npm run build` — regenerate `tokens.json`, `dist/tokens.js`, and `colors_and_type.css` from `tokens.json5` (with WCAG AA check)
- `npm run check` — CI integrity: verify token outputs, CSS, and preview references are all in sync (exits non-zero on drift)
- `npm run test` — run the color-math self-tests in `tools/build-tokens.mjs`

Always run `npm run build` after any change to `tokens.json5`. Underlying scripts (`node tools/build-{tokens,css,previews}.mjs [--check]`) are invocable directly when you need finer control.

## References

@README.md **Read when:** working on token definitions, flavor variants, the WCAG accent-shade table, the syntax token map, or anything that touches system architecture or the downstream-ports contract.

@tokens.json5 **Read when:** looking up or changing any concrete color, type, spacing, radius, shadow, or motion value — this is the single source of truth.

@handoff/SKILL.md **Read when:** explaining how downstream ports should consume the foundation, or when working on the handoff workflow itself.

## Structure

```
tokens.json5         ← single source of truth (edit this)
tokens.json          ← generated (do not hand-edit)
dist/tokens.js       ← generated ES module (do not hand-edit)
colors_and_type.css  ← generated CSS (do not hand-edit)
tools/               Build scripts with WCAG checking
fonts/               Atkinson Hyperlegible Next + Mono (OFL-1.1)
assets/              Logo SVGs, wordmark, icon PNGs
preview/             HTML reference cards (01-kitchen-sink.html is canonical)
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
