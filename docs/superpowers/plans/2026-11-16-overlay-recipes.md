# Overlay Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every port-side wash of the VS Code port becomes a gated overlay recipe; overlays publish `hexa`.

**Architecture:** `tokens.json5` § 3e gains roles and per-flavor recipes; `tools/build-tokens.mjs` gains gate classes `surface`, `mark`, `fill`, the `text_on`, `contrast_min` and `frame`-surface options, and the `hexa` field. Self-tests are `[fn, expected, name]` cases in `selfTest()`.

**Tech Stack:** Node.js ES modules, no dependencies.

**Spec:** `docs/superpowers/specs/2026-11-16-overlay-recipes-design.md`

## Global Constraints

- Hand-edit `tokens.json5` only; `npm run build` after every edit. Every task ends green on `npm run test`, `npm run build`, `npm run check`.
- Recipe values exactly as the spec tables; `hover` / `active` may move within their gates.
- Commits: Conventional Commits + gitmoji, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `feat/overlay-recipes`.

## Review Focus

1. A role whose `behind` is missing or unknown fails validation. Test in Task 1.
2. A `mark` with `contrast_min` that is below it on the frame fails (slider_active at 70 % on Midnight). Test in Task 3.
3. `text_on` limits `fg_muted` to its listed surfaces but `fg` is still gated everywhere. Test in Task 3.
4. `hexa` round-trips: `hexa` composited over `bg` equals `flat` within one step per channel. Test in Task 1.
5. A `fill` role gates `accent_on`; `accent_on` is rejected in `text` of any other class. Test in Task 3.

---

### Task 1: Gate classes, `text_on`, frame surfaces, `hexa`

**Files:** `tools/build-tokens.mjs` (`validateShapes` overlay section, `expandOverlays`, `check()` overlay loop, `distinctnessIssues` unchanged), self-tests.

**Interfaces — produces:** `behind ∈ {code, ui, surface, mark, fill}`; role keys `text_on` (object: text role → surfaces), `contrast_min` (number, `mark` only); `surfaces` may contain `"frame"`; `flavors.<f>.overlay.<v>.<name>.hexa` (`#rrggbbaa`).

- [ ] Tests first: `hexa` of `midnight/purple selection` equals `toHex([...parseHex(color), alpha*255])`; validation rejects `behind: "glow"`; `surfaceOk` accepts `frame` in `surfaces`.
- [ ] Run: fail. Implement: `hexa` in `resolveOverlay`'s result; `behind` list; `text_on` and `contrast_min` validation (`text_on` keys must be text aliases, values listed surfaces; `contrast_min` only on `mark`; `accent_on` allowed in `text` only for `fill`); `"frame"` accepted wherever a surface name is validated for overlay roles.
- [ ] `check()`: `ui`/`surface`: gate `text` on every surface, `text_on` roles on their surfaces, `text_on_bg` as before; `surface`: plus ΔE ≥ `related_min` from each surface; `mark`: ΔE ≥ `related_min` per surface and `contrast_min` when set; `fill`: `text` on the flat over `bg` at 4.5. Overlays over the frame resolve with `{ surface: "frame" }`.
- [ ] Run test/build/check: pass. Commit `✨ feat(overlay): gate classes for surface, mark and fill; publish hexa`.

### Task 2: Editor highlights, code backgrounds, label washes

**Files:** `tokens.json5` (§ 3e roles + four recipe blocks), self-tests.

- [ ] Tests first: `twilight/orange highlight` flat = `alphaOver(#fdba74, #404040, 0.15)`; `dawn/red merge_current` flat = `blue.100`; `midnight/red validation_error` flat = `alphaOver(semantic.danger, bg, 0.06)`.
- [ ] Add roles and recipes from the spec tables: `find_range`, `highlight`, `symbol_highlight` (`code`, `text_min: 3`); `merge_current`, `stack_frame`, `stack_frame_focused` (`code`); the six label washes (`ui`, `text: ["fg", "fg_muted"]`, surfaces per spec). Comment the section with the spec's reasons, including the two reuses (`diff_inserted_line`, `line_highlight`).
- [ ] Run test/build/check: pass. Commit `✨ feat(overlay): recipes for editor highlights, merge, stack frames and labels`.

### Task 3: Hover/active, marks, button hover

**Files:** `tokens.json5`, self-tests.

- [ ] Tests first: `has(check(mutated(t => t.overlay.recipes.midnight.slider_active.alpha = 0.7)), "midnight/yellow overlay.slider_active")` → true; `has(check(mutated(t => t.overlay.recipes.twilight.hover.alpha = 0.04)), "twilight")` → true (invisible); `has(check(mutated(t => t.overlay.roles.hover.text_on = {})), "")` covered by real tokens passing; `has(validateShapes(mutated(t => t.overlay.roles.highlight.text = ["accent_on"])), "accent_on")` → true.
- [ ] Add `hover`, `active` (`surface`, surfaces bg/bg_soft/bg_sunk/bg_overlay/frame, `text: ["fg"]`, `text_on: { fg_muted: ["bg", "frame"] }`), the `mark` roles with surfaces per spec and `slider_active.contrast_min: 3`, `button_hover` (`fill`, `text: ["accent_on"]`). Note in § 4 that `flavors.*.state` is superseded by `overlay.hover` / `overlay.active`.
- [ ] Run test/build/check: pass. Commit `✨ feat(overlay): hover, active, marks and button hover recipes`.

### Task 4: Docs and verification

- [ ] README: gate-class table, recipe table with VS Code keys (from the spec), `hexa`; handoff/SKILL.md alpha-table rule points at it. `npm run test && npm run build && npm run check`, report shows no ✗. Commit `📝 docs(overlay): document the recipe set and gate classes`. Push.
