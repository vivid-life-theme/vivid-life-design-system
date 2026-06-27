# Changelog

All notable changes to `@vivid-life-theme/design-system` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

**Breaking changes** (token renames / removals) are marked ⚠️ — downstream
ports must update any hard-coded token references before regenerating.

---

## [Unreleased]

---

## [0.4.0] - 2026-06-27

IDE port guidance: semantic tokens, workbench color roles, and comprehensive
scope recommendations sourced from syntax-highlighting best practices.

### Added

- New `semantic_token_recommendations` section in `tokens.json5` / `tokens.json` —
  maps all 23 LSP semantic token types and 10 modifiers to design-system slots.
  Ports should define `semanticTokenColors` alongside `tokenColors`; semantic rules
  take precedence when a language server is active.
- New `workbench_color_roles` section — maps severity signals (error/warning/info/
  success), git decorations, diff editor alpha values, and bracket-pair colorization
  cycle to design-system tokens. Use `alphaOver()` from `tools/build-tokens.mjs` to
  bake diff background hex values at port build time.
- `scope_recommendations` expanded from 5 to 37 entries — all 12 core slots and all
  25 extended tokens now have canonical TextMate scope lists for VS Code `tokenColors`.
- New extended tokens: `event` (named events/signals → `function`) and `label`
  (goto/break labels → `fg` italic).

### Fixed

- `decorator` extended token: was plain `"function"`, now `{ color: "function",
style: ["italic"] }` — decorators are meta-layer annotations, not runtime calls.
- `builtin` extended token: was plain `"function"`, now `{ color: "function",
style: ["italic"] }` — built-ins are provided, not authored ("not yours").
- `heading` extended token: was plain `"keyword"`, now `{ color: "keyword",
style: ["bold"] }` — headings are structural anchors; bold is the right signal.

---

## [0.3.0] - 2026-05-27

Resolves [#2](https://github.com/vivid-life-theme/vivid-life-design-system/issues/2) — syntax-highlighting semantics restructure observed against established themes (Dracula).

### Added

- ⚠️ New core syntax slot: `parameter` (emits `--syn-parameter` per flavor, italic via extended map). Total core slots: 11 → 12.
- New extended-map entries: `lang_var` (this/self/super), `emphasis` (tinted italic), `strong` (tinted bold), `invalid`, `invalid_deprecated`, `doc_keyword`, `doc_type`, `doc_param`.
- New `scope_recommendations` block in `tokens.json5` — machine-readable TextMate-scope guidance for ports (covers issue #2 items 5, 6, 9).
- Markdown / asciidoc / rst `emphasis` and `strong` now ship with both color and style (yellow + italic, orange + bold respectively), matching the Dracula tinted-emphasis pattern.

### Changed

- ⚠️ `attr` slot color reassigned in all four flavors: was yellow (collided with `type`), now green family (`green.300` on dark, `green.700` on light). Ports that rendered against `--syn-attr` will now show green instead of yellow.
- ⚠️ `decorator` extended-map target changed from `type` → `function`. Decorators are call-site annotations, not type declarations.
- ⚠️ `property` extended-map target changed from `tag` → `fg`. `obj.foo` now reads as a plain identifier rather than colliding with function/tag blue.
- `syntax_tokens.extended` map shape expanded: entries may now be either a string (color target shorthand) or an object `{ color?, style? }`. Short string form remains valid (back-compat).
- Extended-map target vocabulary expanded: `fg_muted`, `fg_subtle`, `fg_disabled`, `semantic.success|warning|danger|info` are valid targets alongside core-slot names.

### Notes for ports

- Item 6 (`variable.other.constant.{js,ts,tsx}` should fall through to `fg`, not `constant`) is a port-side TextMate-scope concern. See `scope_recommendations.fg_fallthrough_jsts` in `tokens.json` for the recommended scope list.
- The new `parameter` slot's italic styling is delivered via `syntax_tokens.extended.parameter.style` — ports that resolve only `flavors.*.syntax.parameter` get the color, but must read the extended map for the italic.

---

## [0.2.1] - 2026-05-26

### Fixed

- Semantic colors (`--vl-success`, `--vl-warning`, `--vl-error`, `--vl-info`) are now WCAG AA compliant on all four flavor surfaces

### Changed

- Added Prettier pre-commit hook; reformatted codebase with default settings
- Harmonized README badges with organization profile
- Added `npm install` command to downstream-ports documentation
- Documented `publish.yml` workflow in CLAUDE.md config table

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

[unreleased]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/vivid-life-theme/vivid-life-design-system/releases/tag/v0.2.0
