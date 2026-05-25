# Learnings

Corrections and observations collected during configuration sessions.
Entries are tagged by skill and dated.

---

[cc-config:cc-config-init] No npm/package.json — build tools are plain Node.js .mjs scripts with zero dependencies; don't suggest npm commands — 2026-05-25
[cc-config:cc-config-init] tokens.json5 is the sole source of truth; tokens.json, dist/tokens.js, and colors_and_type.css are all generated and must never be hand-edited — 2026-05-25
[cc-config:cc-config-init] SKILL.md at project root is the designer's skill (user-invocable); context/ folder was skipped because SKILL.md already captures the domain knowledge — 2026-05-25
[cc-config:cc-config-init] The sync-config-table.sh script picks up all root \*.json files, so tokens.json appears in Key Config Files; its description was set to reflect its role as a generated downstream-port artifact — 2026-05-25
