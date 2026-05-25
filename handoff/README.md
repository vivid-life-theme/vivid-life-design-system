# Handoff

Artifacts intended for downstream ports — not active in this repo.

## SKILL.md

A Claude Code skill that teaches an AI assistant in a **downstream port project** (e.g. `vivid-life-vscode`, `vivid-life-gtk`, the future marketing site) how to consume the foundation defined here.

### How a port uses it

1. Bring the foundation into the port repo (git submodule, npm dep, or hand-copied snapshot — see the root `README.md`'s "For downstream ports" section).
2. Copy this file into the port at `.claude/skills/vivid-life-theme/SKILL.md`.
3. Open Claude Code in the port. The skill is now invocable as `/vivid-life-theme`.

The skill's instructions reference paths relative to the foundation root (`tokens.json5`, `colors_and_type.css`, `preview/14-kitchen-sink.html`, …). Those paths must resolve from the port's view of the foundation — adjust them once if your port mounts the foundation at a non-default location.

### Why it lives here, not in `.claude/skills/`

Putting it under `.claude/skills/` would make Claude Code try to register it as an active skill in **this** repo. The skill is meant for ports, not for working on the foundation itself. Keeping it under `handoff/` makes the intent explicit and the file easy to copy verbatim.
