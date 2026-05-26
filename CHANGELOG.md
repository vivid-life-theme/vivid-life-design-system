# Changelog

All notable changes to `@vivid-life-theme/design-system` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

**Breaking changes** (token renames / removals) are marked ⚠️ — downstream
ports must update any hard-coded token references before regenerating.

---

## [Unreleased]

---

## [0.2.0] - 2026-05-26

Initial npm release. The token system existed before this version; this is
the first release published to the registry.

### Added

- 4-flavor × 6-variant color system — 24 themes (Midnight · Twilight · Dawn · Noon × Red · Orange · Yellow · Green · Blue · Purple), all WCAG AA (≥ 4.5:1)
- Syntax token map — 11 core slots + 15 extended tokens with fallback resolution
- UI tokens — surfaces, text, borders, interactive states, semantic roles, accent-on
- Typography — Atkinson Hyperlegible Next + Mono (OFL-1.1, locally bundled), 11-style type scale
- Spacing, radii, shadows, motion tokens
- Build toolchain — `tokens.json5` → `tokens.json` + `dist/tokens.js` + `colors_and_type.css`; WCAG check on every build
- Reference preview cards — kitchen sink + 5 topic pages, live across all 24 themes
- Brand assets — logo, wordmark, icon set (6 sizes, 4 per-flavor variants)
- Handoff skill (`handoff/SKILL.md`) for downstream ports

---

[unreleased]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/vivid-life-theme/vivid-life-design-system/releases/tag/v0.2.0
