# Changelog

All notable changes to `@vivid-life-theme/design-system` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).

**Breaking changes** (token renames / removals) are marked ⚠️ — downstream ports must update any hard-coded token references before regenerating.

---

## [Unreleased]

---

## [0.6.0] - 2026-08-26

Closes [#5](https://github.com/vivid-life-theme/vivid-life-design-system/issues/5): terminal-emulator backgrounds now have a verified-safe surface token.

### Added

- New `surface.bg_terminal` token, one per flavor — the first surface tier proven (by exhaustive contrast check, not just hex equality) to clear 4.5:1 against every `ansi.*` color on that flavor, except the slot(s) every real terminal scheme leaves near-invisible against its background by convention: `ansi.black` on dark flavors; `ansi.bright_white` on light flavors; and, on dawn specifically, `ansi.white` too (already close to `bg_soft` before this change). It's an alias — `bg_sunk` on midnight/twilight, `bg_soft` on dawn/noon — not a new hue.

### Changed

- `ansi.bright_black` on `midnight`, `twilight`, and `dawn` — was a `$palette.gray.*` reference that only cleared 1.9–4.4:1 against the flavor's now-designated `bg_terminal`. Replaced with a dedicated literal value (`#878787` for midnight/twilight, `#656565` for dawn) chosen to clear ≥4.9:1, without moving the shared `gray.500`/`gray.700` steps used elsewhere (borders, muted text, other surfaces). `noon`'s `ansi.bright_black` already cleared AA (4.7:1) and is unchanged.

---

## [0.5.0] - 2026-08-26

New surface token for docked structural chrome (sidebar, panel, terminal, status bar), so ports can visually separate it from the editor canvas instead of the two reading as the same background.

### Added

- New `surface.bg_inset` token, one per flavor — a fixed, low-saturation cool-slate tint (not accent-derived, so it doesn't shift per variant and doesn't compete with syntax/ANSI hues). Exempt from the semantic-vs-surface WCAG gate: alert/banner colors keep rendering on `bg`/`bg_soft`, never directly on `bg_inset` — see README § Caveats.

### Changed

- `tools/build-tokens.mjs` — the semantic-vs-surface contrast check now excludes `bg_inset` alongside `bg_scrim`.

---

## [0.4.0] - 2026-06-27

IDE port guidance: semantic tokens, workbench color roles, and comprehensive scope recommendations sourced from syntax-highlighting best practices.

### Added

- New `semantic_token_recommendations` section in `tokens.json5` / `tokens.json` — maps all 23 LSP semantic token types and 10 modifiers to design-system slots. Ports should define `semanticTokenColors` alongside `tokenColors`; semantic rules take precedence when a language server is active.
- New `workbench_color_roles` section — maps severity signals (error/warning/info/success), git decorations, diff editor alpha values, and bracket-pair colorization cycle to design-system tokens. Use `alphaOver()` from `tools/build-tokens.mjs` to bake diff background hex values at port build time.
- `scope_recommendations` expanded from 5 to 37 entries — all 12 core slots and all 25 extended tokens now have canonical TextMate scope lists for VS Code `tokenColors`.
- New extended tokens: `event` (named events/signals → `function`) and `label` (goto/break labels → `fg` italic).

### Fixed

- `decorator` extended token: was plain `"function"`, now `{ color: "function", style: ["italic"] }` — decorators are meta-layer annotations, not runtime calls.
- `builtin` extended token: was plain `"function"`, now `{ color: "function", style: ["italic"] }` — built-ins are provided, not authored ("not yours").
- `heading` extended token: was plain `"keyword"`, now `{ color: "keyword", style: ["bold"] }` — headings are structural anchors; bold is the right signal.

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

Initial npm release. The token system existed before this version; this is the first release published to the registry.

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

[unreleased]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.6.0...HEAD [0.6.0]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.5.0...v0.6.0 [0.5.0]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.4.0...v0.5.0 [0.4.0]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.3.0...v0.4.0 [0.3.0]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.2.1...v0.3.0 [0.2.1]: https://github.com/vivid-life-theme/vivid-life-design-system/compare/v0.2.0...v0.2.1 [0.2.0]: https://github.com/vivid-life-theme/vivid-life-design-system/releases/tag/v0.2.0
