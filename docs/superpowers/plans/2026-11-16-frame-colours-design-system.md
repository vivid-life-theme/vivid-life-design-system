# Frame Colours (Design System) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the design system a per-variant frame colour, one background for editor and terminal, and a tinted selection on the dark flavors, all gated by the build.

**Architecture:** Everything is authored in `tokens.json5` and resolved by `tools/build-tokens.mjs`, which derives per-(flavor, variant) values, gates them, and emits `tokens.json` / `dist/tokens.js`. `tools/build-css.mjs` turns the resolved tokens into `colors_and_type.css`. Self-tests are `[fn, expected, name]` entries in the `cases` array of `selfTest()` in `tools/build-tokens.mjs`; `check()` and `mutated()` are available there.

**Tech Stack:** Plain Node.js ES modules, no npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-16-frame-colours-design.md`

This plan covers the design-system repo only (spec decisions 1–4 and the docs). The VS Code, Windows Terminal and dependency-bump ports get their own plans after this ships, because they build against the token names defined here.

## Global Constraints

- `tokens.json5` is the only hand-edited token file. After every edit run `npm run build`; never edit `tokens.json`, `dist/tokens.js` or `colors_and_type.css` by hand.
- Every task ends green on `npm run test`, `npm run build` and `npm run check`.
- Flavor order in any listing: Midnight → Twilight → Dawn → Noon.
- WCAG: the accent clears 4.5:1 on `bg` for all 24 combinations (unchanged). Only `selection` and `inactive_selection` drop to 3:1.
- Commits use Conventional Commits with gitmoji and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `feat/frame-colours`.
- Markdown: no hard line breaks inside paragraphs.
- New token comments follow the file's style: say why, cite the spec (`docs/superpowers/specs/2026-11-16-frame-colours-design.md`).

## Review Focus

1. A frame recipe naming a rung some hue lacks (e.g. `accent.975`) must be rejected by `validateShapes`, not crash in `expandFrames`. Test in Task 4.
2. Dawn's placeholder frame (`bg_sunk`, 1.27:1 from `bg`) passes only because it is listed in `frame.step_exempt`. Removing the exemption must fail the build. Test in Task 4.
3. The 3:1 selection class must not leak to other code overlays: a find match at 3.37:1 still fails. Test in Task 3.
4. `frameAccentText` on a frame where no rung of the hue clears 4.5:1 must throw with the flavor, variant and frame in the message. Test in Task 4.
5. Removing `--vl-bg-inset` must not leave a dangling `var()` in the previews. `npm run check` (build-previews) covers it. Run in Task 5.

---

### Task 1: Palette 950 rung

**Files:**

- Modify: `tokens.json5` (§ 1 palette, and Midnight's `surface.bg_sunk` and `ansi.black`)
- Test: `tools/build-tokens.mjs` (`selfTest` cases)

**Interfaces:**

- Produces: `palette.<hue>.950` for all eight rows; `resolveColor(tokens, f, v, "accent.950")` resolves.

- [ ] **Step 1: Write the failing tests** (append to `cases`)

```js
[() => real.palette.purple[950], "#3b0764", "palette has the 950 rung"],
[() => resolveColor(real, "twilight", "green", "accent.950"), "#1a2e05", "accent.950 follows the variant"],
[() => ["red","orange","yellow","green","blue","purple","gray","cyan"].every((h) => /^#[0-9a-f]{6}$/.test(real.palette[h][950])), true, "every palette row has a 950"],
[() => real.flavors.midnight.surface.bg_sunk, real.palette.gray[950], "midnight bg_sunk is gray.950"],
```

- [ ] **Step 2: Run** `npm run test`. Expected: the four cases fail (`undefined`).

- [ ] **Step 3: Add the rung** to each palette row, after 900: red `#450a0a`, orange `#431407`, yellow `#422006`, green `#1a2e05`, blue `#172554`, purple `#3b0764`, gray `#0a0a0a`, cyan `#083344`. Extend the § 1 header comment: the 950 tier is the Tailwind v3.3+ default, added for the frame colour (spec decision 1), and moves no existing value. Change Midnight `bg_sunk` and `ansi.black` from the literal `#0a0a0a` to `$palette.gray.950` and drop "outside strict palette" from their comments.

- [ ] **Step 4: Run** `npm run build && npm run test && npm run check`. Expected: all pass; `git diff tokens.json` shows only the added 950 entries (resolved values unchanged).

- [ ] **Step 5: Commit** `✨ feat(palette): add the 950 rung to every row`

---

### Task 2: One background for editor and terminal

**Files:**

- Modify: `tokens.json5` (each flavor's `surface.bg_terminal` and its comment; Twilight and Noon `ansi.bright_black`; `overlay.recipes.midnight.panel`; § 3b comments that justify the old `bg_terminal` spread)
- Modify: `README.md` (§ ANSI palette wording about `bg_terminal`, the Dawn caveat under § Caveats)
- Test: `tools/build-tokens.mjs`

**Interfaces:**

- Produces: `flavors.<f>.surface.bg_terminal === flavors.<f>.surface.bg` for all four flavors. The name stays; ports keep reading it.

- [ ] **Step 1: Write the failing tests**

```js
[() => Object.values(real.flavors).every((f) => f.surface.bg_terminal === f.surface.bg), true, "bg_terminal is bg on every flavor"],
[() => real.flavors.twilight.ansi.bright_black, "#adadad", "twilight bright_black clears 4.5:1 on #404040"],
[() => real.flavors.noon.ansi.bright_black, "#6f6f6f", "noon bright_black clears 4.5:1 on #f5f5f5"],
```

Replace the existing case "a message block on line_highlight doesn't show over Twilight's bg_terminal (ΔE 3.2)". With `bg_terminal = bg` that mutation no longer fails (ΔE 6.2). The new case pins the regression this task fixes:

```js
[
  () => has(distinctnessIssues(mutated((t) => (t.overlay.recipes.midnight.panel = { color: "gray.800", alpha: 0.5 }))), "midnight/red: app_roles.message"),
  true,
  "the old Midnight panel (ΔE 3.5 from bg_terminal) is caught",
],
```

- [ ] **Step 2: Run** `npm run test`. Expected: the three new value cases fail.

- [ ] **Step 3: Change the tokens.**
  - Every flavor: `bg_terminal: "$flavors.<flavor>.surface.bg"`, with a comment that the editor and the terminal share one background (spec decision 3), and that issue #7's standalone spread still holds (`#171717` / `#404040` / `#d4d4d4` / `#f5f5f5`).
  - Twilight `bright_black: "#adadad"` (4.62:1 on `#404040`, ΔE 12.2 from `white`).
  - Noon `bright_black: "#6f6f6f"` (4.61:1 on `#f5f5f5`).
  - `overlay.recipes.midnight.panel: { color: "gray.800", alpha: 1 }`. The old 0.5 sat ΔE 3.5 from the new `bg_terminal`; at 1 it is ΔE 6.4, and comment grey on it is 5.31:1.
  - Rewrite the § 3b and § 3e comments that describe `bg_terminal` as darker or lighter than `bg`. Update the README passages so they no longer say the terminal has a fill of its own.

- [ ] **Step 4: Run** `npm run build && npm run test && npm run check`. Expected: all pass. If any other self-test's measured number in its label is now stale, fix the label text only.

- [ ] **Step 5: Commit** `♻️ refactor(surface): give the terminal the editor background`

---

### Task 3: Tinted selection on the dark flavors

**Files:**

- Modify: `tokens.json5` (§ 3e: `overlay.roles.selection` and `inactive_selection`, recipes for Midnight and Twilight, the DIRECTION RULE comment)
- Modify: `tools/build-tokens.mjs` (`validateShapes` overlay role keys; `check()` code-overlay loop; the `@deprecated` note on `selection()`)
- Modify: `README.md` (§ Overlays: the selection exception and why)
- Test: `tools/build-tokens.mjs`

**Interfaces:**

- Produces: overlay role key `text_min` (number, optional; default 4.5) that sets the minimum contrast for every code colour on a `behind: "code"` overlay. Only `selection` and `inactive_selection` set it, to 3.

- [ ] **Step 1: Write the failing tests**

```js
[() => real.flavors.twilight.overlay.orange.selection.flat, alphaOver(real.palette.orange[300], "#404040", 0.25), "twilight selection is 25% accent over bg"],
[() => real.flavors.midnight.overlay.blue.inactive_selection.flat, alphaOver(real.palette.blue[300], "#171717", 0.15), "midnight inactive selection is 15% accent over bg"],
[() => has(check(mutated((t) => (t.flavors.twilight.overlay.orange.selection.flat = "#5c5c5c"))), "twilight/orange syntax.comment on overlay.selection"), false, "a selection at 3.37:1 passes the 3:1 class"],
[() => has(check(mutated((t) => (t.flavors.twilight.overlay.orange.find_match.flat = "#5c5c5c"))), "twilight/orange syntax.comment on overlay.find_match"), true, "a find match at 3.37:1 still fails 4.5:1"],
[() => has(check(mutated((t) => (t.flavors.twilight.overlay.orange.selection.flat = "#7a7a7a"))), "twilight/orange syntax.comment on overlay.selection"), true, "a selection below 3:1 is caught"],
[() => has(validateShapes(mutated((t) => (t.overlay.roles.selection.text_min = "3"))), "text_min must be a number"), true, "a non-numeric text_min is rejected"],
```

- [ ] **Step 2: Run** `npm run test`. Expected: the value cases and the 3:1 case fail; the shape case fails.

- [ ] **Step 3: Implement.**
  - `tokens.json5`: add `text_min: 3` to `overlay.roles.selection` and `inactive_selection`, with the reason (spec decision 4: whether text is selected matters more than how readable it is in that moment, as in Sepp's Workshop). Midnight and Twilight recipes: `selection: { color: "accent", alpha: 0.25 }`, `inactive_selection: { color: "accent", alpha: 0.15 }`. Rewrite the DIRECTION RULE comment: the selections lighten the canvas in the accent hue on dark flavors; every other code overlay still follows the old rule. Dawn and Noon recipes stay.
  - `validateShapes`: allow `text_min` on overlay roles. Otherwise push `✗ ${w}.text_min must be a number in (1, 21]`, and reject it on a `behind: "ui"` role.
  - `check()`: in the `behind === "code"` branch use `role.text_min ?? 4.5` instead of the literal 4.5. The `terminal_foreground` pair stays at 4.5. Update the summary line printed in `main()` to say "4.5:1 (3:1 on the selections)".
  - `selection()` helper: the recipe it computes is current again on the dark flavors; replace the `@deprecated` note with one pointing to `resolveOverlay` as the source of truth for all flavors.

- [ ] **Step 4: Run** `npm run build && npm run test && npm run check`. Expected: all pass, including the existing `distinct.overlay` visible/apart gates.

- [ ] **Step 5: Commit** `✨ feat(overlay): tint the selection with the accent on dark flavors`

---

### Task 4: Frame colour

**Files:**

- Modify: `tokens.json5` (new § 3i FRAME after § 3h)
- Modify: `tools/build-tokens.mjs` (new exports, `resolveTokens`, `main()`, `validateShapes`, `check()`, `selfTest`)
- Test: `tools/build-tokens.mjs`

**Interfaces:**

- Consumes: `palette.<hue>.950` (Task 1).
- Produces:
  - `resolveFrame(tokens, flavor, variant): string`: the frame hex.
  - `frameAccentText(tokens, flavor, variant, frame = resolveFrame(...)): string`: accent-hued text that clears 4.5:1 on the frame.
  - `expandFrames(tokens): tokens`: sets `tokens.flavors[f].frame[variant] = { bg, accent_text }`, emitted after `overlay`.
  - `resolveTokens(parsed)` returns `expandFrames(expandOverlays(expandShadeTables(resolveRefs(parsed, parsed))))`; `main()` calls `expandFrames` after `expandOverlays` too.

Token shape (§ 3i):

```json5
frame: {
  min_step: 1.35,        // luminance contrast between frame and bg
  step_exempt: ["dawn"], // placeholder until the light-flavor round: bg_sunk is 1.27:1 from bg
  recipes: {
    midnight: { color: "accent.900", mix: "accent.950", ratio: 0.5 },
    twilight: { color: "accent.950" },
    dawn: { surface: "bg_sunk" },
    noon: { surface: "bg_sunk" },
  },
},
```

A recipe is either `{ surface }` or `{ color, mix?, ratio? }`; `mix` and `ratio` come together, and `ratio` is the share of `color` (as in `mix(a, b, p)`). Comment the section with the rule from the spec ("each flavor takes the frame shade that gives the clearest lightness step from its editor background"), the text restriction (only `fg` and `fg_muted` on the frame; `fg_subtle` measures 3.96–4.52:1 on Midnight), and why Dawn is exempt.

- [ ] **Step 1: Write the failing tests**

```js
// values
[() => resolveFrame(real, "midnight", "red"), "#621414", "midnight frame is the 50/50 mix of 900 and 950"],
[() => resolveFrame(real, "midnight", "blue"), "#1b306f", "midnight blue frame"],
[() => resolveFrame(real, "twilight", "purple"), "#3b0764", "twilight frame is 950"],
[() => resolveFrame(real, "dawn", "red"), real.flavors.dawn.surface.bg_sunk, "dawn frame is today's chrome"],
[() => real.flavors.twilight.frame.green.bg, "#1a2e05", "frames are emitted per variant"],
[() => frameAccentText(real, "midnight", "red"), "#fca5a5", "midnight red accent text steps to red.300 (accent is 3.42:1)"],
[() => frameAccentText(real, "midnight", "blue"), real.palette.blue[300], "an accent that clears stays the accent"],
[() => { try { frameAccentText(real, "midnight", "red", "#808080"); return "resolved"; } catch (e) { return /midnight\/red.*#808080/.test(e.message); } }, true, "no clearing rung throws with flavor, variant and frame"],
// gates
[() => has(check(mutated((t) => (t.flavors.midnight.frame.red.bg = t.flavors.midnight.surface.bg))), "midnight/red frame vs bg"), true, "a frame too close to bg is caught"],
[() => has(check(mutated((t) => (t.frame.step_exempt = []))), "dawn/red frame vs bg"), true, "dawn's placeholder frame needs its exemption"],
[() => has(check(mutated((t) => (t.flavors.midnight.frame.red.accent_text = "#ef4444"))), "midnight/red frame.accent_text on frame"), true, "accent text below 4.5:1 on the frame is caught"],
[() => has(check(mutated((t) => (t.flavors.midnight.frame.red.bg = "#7a7a7a"))), "midnight/red text.fg_muted on frame"), true, "fg_muted below 4.5:1 on the frame is caught"],
// shapes
[() => has(validateShapes(mutated((t) => (t.frame.recipes.twilight = { color: "accent.975" }))), "frame.recipes.twilight.color"), true, "a frame rung some hue lacks is rejected"],
[() => has(validateShapes(mutated((t) => (t.frame.recipes.dawn = { surface: "bg_sunk", color: "accent" }))), "frame.recipes.dawn"), true, "surface and color together are rejected"],
[() => has(validateShapes(mutated((t) => (t.frame.recipes.midnight = { color: "accent.900", mix: "accent.950" }))), "ratio"), true, "mix without ratio is rejected"],
```

- [ ] **Step 2: Run** `npm run test`. Expected: fail (`resolveFrame is not defined`).

- [ ] **Step 3: Implement** in `tools/build-tokens.mjs`, next to `resolveOverlay`:
  - `resolveFrame`: `{ surface }` → `flavors[f].surface[surface]`; otherwise `resolveColor(color)`, mixed with `resolveColor(mix)` via `mix(a, b, ratio)` when `mix` is set.
  - `frameAccentText`: return the accent if it clears 4.5:1 on the frame. Otherwise walk the variant's palette row from the accent's rung away from the frame (lighter when the accent is lighter than the frame, darker otherwise) and return the first rung that clears 4.5:1. Throw `frameAccentText: no ${variant} rung clears 4.5:1 on ${flavor}/${variant} frame ${frame}` when none does.
  - `expandFrames` as in Interfaces.
  - `validateShapes`: `frame` has exactly `min_step` (number > 1), `step_exempt` (flavor names), `recipes` (one per flavor, no extra flavors). Each recipe: allowed keys `surface`, `color`, `mix`, `ratio`; exactly one of `surface` / `color`; `surface` must exist via `surfaceOk`; `color` and `mix` go through `targetOk(..., { noOverlay: true })`; `mix` requires `ratio` in (0, 1) and vice versa.
  - `check()`, new block per flavor and variant, group `"frame"`, where-strings prefixed `${fName}/${hue}`:
    - `text.fg on frame`, `text.fg_muted on frame`: 4.5
    - `semantic.<role> on frame`: 4.5
    - `accent on frame`: `control_boundary.min`
    - `frame.accent_text on frame`: 4.5
    - for each text role `k` in `overlay.roles.selected.text`: `text.${k} on overlay.selected over frame`, the color composited with `alphaOver(resolveColor(recipe.color), frame, recipe.alpha)`: 4.5
    - unless the flavor is in `frame.step_exempt`: `frame vs bg` at `frame.min_step`
  - Add a summary line to `main()` for the frame gates.

- [ ] **Step 4: Run** `npm run build && npm run test && npm run check`. Expected: all pass; `tokens.json` gains `flavors.*.frame` for all 24 combinations.

- [ ] **Step 5: Commit** `✨ feat(frame): add a variant-coloured frame for the dark flavors`

---

### Task 5: Retire `bg_inset`, emit the frame in CSS, update docs

**Files:**

- Modify: `tokens.json5` (remove `bg_inset` from all four flavors; remove it from the comments in § 3e `selected`, § 3f `control_boundary`)
- Modify: `tools/build-tokens.mjs` (semantic-surface filter, comments, the two `bg_inset` self-test cases)
- Modify: `tools/build-css.mjs` (`variantBlock`)
- Modify: `preview/01-kitchen-sink.html` (the `--vl-bg-inset` swatch)
- Modify: `README.md` (§ The system at a glance: new frame subsection; § Selected-item wash; § Control boundaries; § For downstream ports; § Caveats), `handoff/SKILL.md` (lines 74–75)
- Test: `tools/build-tokens.mjs`

**Interfaces:**

- Consumes: `flavors.<f>.frame.<v>.{bg, accent_text}` (Task 4).
- Produces: CSS custom properties `--vl-frame` and `--vl-frame-accent-text` in each `.vl-<flavor>.variant-<variant>` block. `--vl-bg-inset` and `surface.bg_inset` no longer exist.

- [ ] **Step 1: Rewrite the two `bg_inset` self-tests** to use `bg_soft`:

```js
[() => selectedWash({ surface: "#404040", accent: "#d8b4fe" }), "#5b5562", "midnight selected wash (purple) on bg_soft"],
[() => resolveOverlay(real, "midnight", "purple", "selected", { surface: "bg_soft" }).flat, selectedWash({ surface: "#404040", accent: "#d8b4fe" }), "resolveOverlay over another surface matches selectedWash()"],
[() => Object.values(real.flavors).some((f) => "bg_inset" in f.surface), false, "bg_inset is gone"],
```

- [ ] **Step 2: Run** `npm run test`. Expected: only "bg_inset is gone" fails.

- [ ] **Step 3: Implement.**
  - Remove `bg_inset` from the tokens and every exemption that names it (`check()`'s semantic-surface filter keeps `bg_scrim` only).
  - `build-css.mjs`: in `variantBlock`, after `--vl-accent`, emit `--vl-frame` and `--vl-frame-accent-text` from `tokens.flavors[fname].frame[vname]`. Extend the block's header comment.
  - Kitchen sink: replace the `--vl-bg-inset` swatch with `--vl-frame`. It lives in a variant block, so the page's body classes must include a variant; check that they do.
  - README: a "Frame" subsection covering what counts as frame vs work area, the recipe per flavor, the gates, and the port rules (text on the frame is `fg` / `fg_muted` only; accent-hued text uses `frame.accent_text`; the accent itself only for bars, badges and indicators; panel tab rows are frame, the terminal inside is `bg_terminal`). Remove the `bg_inset` passages; the Selected-item wash and Control boundaries sections now name the frame where they named `bg_inset`. handoff/SKILL.md lines 74–75: same substitution.

- [ ] **Step 4: Run** `npm run build && npm run test && npm run check`. Expected: all pass, including build-previews (no dangling `var()`). Run `grep -rn "bg_inset\|bg-inset" --exclude-dir=node_modules --exclude-dir=docs --exclude=CHANGELOG.md .`. Expected: no output.

- [ ] **Step 5: Commit** `💥 feat(surface)!: replace bg_inset with the frame colour`, with a `BREAKING CHANGE:` footer saying `surface.bg_inset` and `--vl-bg-inset` are removed and ports should read `flavors.<f>.frame.<v>.bg` / `--vl-frame`.

---

### Task 6: Verify the branch

- [ ] **Step 1: Run** `npm run test && npm run build && npm run check && git status --short`. Expected: all green, a clean tree (the build changes no tracked file).
- [ ] **Step 2: Run** `npm run report | grep -c "^✗"`. Expected: `0`.
- [ ] **Step 3: Push** `git push`. The release itself (changelog, version 0.14.0, npm publish) goes through `.claude/skills/release/SKILL.md` after the branch is merged, and only when the owner asks for it.
