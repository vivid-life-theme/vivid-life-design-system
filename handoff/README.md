# Handoff

Artifacts intended for downstream ports — not active in this repo.

## SKILL.md

A Claude Code skill that teaches an AI assistant in a **downstream port project** (e.g. `vivid-life-vscode`, `vivid-life-gtk`, the future marketing site) how to consume the foundation defined here.

### How a port uses it

1. Copy this file into the port at `.claude/skills/vivid-life-theme/SKILL.md`.
2. Open Claude Code in the port and invoke `/vivid-life-theme`.

The skill fetches `tokens.json` and `README.md` directly from the GitHub repository,
so it works in a brand-new port project with no local copy of the foundation required.
If the foundation is already mounted locally (npm dep, git submodule, or snapshot),
the skill falls back to reading local paths automatically. To install via npm:

```bash
npm install @vivid-life-theme/design-system
```

### Why it lives here, not in `.claude/skills/`

Putting it under `.claude/skills/` would make Claude Code try to register it as an active skill in **this** repo. The skill is meant for ports, not for working on the foundation itself. Keeping it under `handoff/` makes the intent explicit and the file easy to copy verbatim.
