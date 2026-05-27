# Learnings

Corrections and observations collected during configuration sessions.
Entries are tagged by skill and dated.

---

[cc-config:cc-config-optimize] gitleaks is installed on this machine (`/home/linuxbrew/.linuxbrew/bin/gitleaks`) — can be referenced in hooks without an install step — 2026-05-27
[cc-config:cc-config-optimize] `core.hooksPath` must be set to `.githooks` per-clone — it's a local git config, not committed; anyone cloning fresh needs to run `git config core.hooksPath .githooks` or have it set via a setup script — 2026-05-27
