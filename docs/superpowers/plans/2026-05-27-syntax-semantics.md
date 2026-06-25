# Syntax-Highlighting Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all ten findings from issue #2 — restructure the foundation's syntax-highlighting contract and ship as `0.3.0`.

**Architecture:** Single source of truth (`tokens.json5`) drives everything. Promote `parameter` to a 12th core slot (CSS-emitted), expand the extended map into `{ color, style }` objects (string shorthand still valid), reassign `attr` color in all four flavors, and add a `scope_recommendations` block listing TextMate scopes for ports. Build scripts are deterministic and require no code changes — they already iterate `flavors.*.syntax` and pick up new entries automatically. The contrast checker (`tools/build-tokens.mjs:307`) validates the new colors at build time.

**Tech Stack:** Plain Node.js (no npm dependencies). JSON5 source → JSON/JS/CSS outputs via three scripts in `tools/`.

**Spec reference:** [`docs/superpowers/specs/2026-05-27-syntax-semantics-design.md`](../specs/2026-05-27-syntax-semantics-design.md)

---

## File Structure

**Modify:**

- `tokens.json5` — source of truth: core array, per-flavor syntax, extended map, new `scope_recommendations` block, intro comments, version
- `package.json` — version bump 0.2.1 → 0.3.0
- `README.md` — slot-count references (line 78, 213); optionally extend the syntax token map table
- `handoff/SKILL.md` — check for slot-count references; update if present
- `CHANGELOG.md` — `[0.3.0]` entry
- `preview/05-syntax-reference.html` — _optional:_ add a `<span class="prm">` example so the new `--syn-parameter` slot is visible

**Regenerated (do not hand-edit):**

- `tokens.json`
- `dist/tokens.js`
- `colors_and_type.css`

**No code changes:**

- `tools/build-tokens.mjs` — already iterates `flavors.*.syntax`; picks up new `parameter` slot and reassigned `attr` colors automatically
- `tools/build-css.mjs` — already emits `--syn-*` per `flavor.syntax`
- `tools/build-previews.mjs` — drift check unaffected (extended map is not CSS-emitted; see spec "Out of scope")

---

## Task 1: Update `syntax_tokens` block in `tokens.json5`

**Files:**

- Modify: `tokens.json5` (block currently spans lines 644–682)

This task only edits the central syntax-tokens block. Per-flavor color edits are Task 2; the `scope_recommendations` block is Task 3.

- [ ] **Step 1: Replace the `syntax_tokens` block with the new shape**

  Find the block starting at the comment line `//   10.  SYNTAX TOKEN MAP  —  logical → concrete` and ending at the closing `}` of `syntax_tokens`. Replace its contents (intro comment + `syntax_tokens` object) with:

  ```js5
    // ────────────────────────────────────────────────────────────────
    //   10.  SYNTAX TOKEN MAP  —  logical → concrete
    // ────────────────────────────────────────────────────────────────
    // The 12 "core" tokens are defined directly on each flavor (see
    // flavors.*.syntax) and emit as `--syn-<name>` CSS variables.
    //
    // Extended tokens map a logical name to either:
    //   • a string shorthand — resolves to { color: <string> }
    //   • { color?, style? } — color target + optional font-style array
    //
    // `color` target vocabulary:
    //   • core slot name (comment, keyword, …, parameter, …, punct)
    //   • fg, fg_muted, fg_subtle, fg_disabled  (→ flavors.*.text.*)
    //   • semantic.success | .warning | .danger | .info  (→ flavors.*.semantic.*)
    //
    // `style` values: "italic" | "bold" | "underline"
    // A missing `color` means style-only (inherits host text color).
    //
    // Ports do their own resolution at build time; the foundation
    // ships this map as metadata.

    syntax_tokens: {
      core: [
        "comment",
        "keyword",
        "string",
        "number",
        "function",
        "parameter",
        "type",
        "constant",
        "tag",
        "attr",
        "regex",
        "punct",
      ],
      extended: {
        // ── Repurposed (issue #2, items 1, 2, 4) ─────────────────
        variable: "fg",
        parameter: { color: "parameter", style: ["italic"] },
        property: "fg", // obj.foo, css property — was → "tag"
        decorator: "function", // @foo, #[attr] — was → "type"

        // ── Unchanged ────────────────────────────────────────────
        operator: "keyword", // +, -, =, =>, |
        builtin: "function", // print, len, console.log
        namespace: "type", // module / namespace paths
        macro: "function", // println!, vec!
        lifetime: "constant", // Rust 'a, 'static
        heading: "keyword", // markdown # ## ###
        link: "tag", // markdown [text](url)
        selector: "tag", // css .foo, :root
        unit: "number", // css 16px, 200ms
        hex: "string", // css #fff, #abc123
        shebang: "comment", // #!/usr/bin/env bash

        // ── New (items 5, 7, 8, 9, 10) ───────────────────────────
        lang_var: { color: "constant", style: ["italic"] }, // this/self/super (item 5)
        emphasis: { color: "type", style: ["italic"] }, // markup.italic + markdown/rst/asciidoc emphasis
        strong: { color: "number", style: ["bold"] }, // markup.bold + markdown/rst/asciidoc strong
        invalid: { color: "semantic.danger", style: ["italic", "underline"] },
        invalid_deprecated: {
          color: "fg",
          style: ["italic", "underline"],
        },
        doc_keyword: "keyword", // JSDoc @param, @returns, etc.
        doc_type: { color: "type", style: ["italic"] },
        doc_param: { color: "parameter", style: ["italic"] },
      },
    },
  ```

  Indentation: this block sits at 2-space indent within the root `{ … }`; the inner object uses 4-space (matches surrounding file). Match the existing file's style.

- [ ] **Step 2: Verify the block parses**

  Run: `node tools/build-tokens.mjs --check`
  Expected: drift error pointing at `tokens.json` and `dist/tokens.js` being out of date (this is correct — we haven't regenerated yet). Should NOT report JSON5 parse errors. If you see "Unterminated block comment" or similar parser errors, fix the syntax before continuing.

---

## Task 2: Update per-flavor `flavors.*.syntax` blocks

**Files:**

- Modify: `tokens.json5`:
  - midnight syntax (~lines 199–211)
  - twilight syntax (~lines 265–277)
  - dawn syntax (~lines 331–343)
  - noon syntax (~lines 397–409)

Each flavor: insert `parameter` between `function` and `type`; change `attr` from yellow to green. Insertion position matters — keep it consistent with the new `core` array order.

- [ ] **Step 1: Update Midnight's syntax block**

  Replace the existing `syntax: { … }` block inside `flavors.midnight` with:

  ```js5
        syntax: {
          comment: "$palette.gray.500",
          keyword: "$palette.purple.300",
          string: "$palette.green.500",
          number: "$palette.orange.500",
          function: "$palette.blue.300",
          parameter: "$palette.orange.300", // NEW (issue #2 item 2) — italic via extended map
          type: "$palette.yellow.500",
          constant: "$palette.orange.500",
          tag: "$palette.blue.300",
          attr: "$palette.green.300", // was yellow.500 (issue #2 item 3)
          regex: "$palette.red.500",
          punct: "$palette.gray.300",
        },
  ```

- [ ] **Step 2: Update Twilight's syntax block**

  Replace the existing `syntax: { … }` block inside `flavors.twilight` with:

  ```js5
        syntax: {
          comment: "#a3a3a3",
          keyword: "$palette.purple.300",
          string: "$palette.green.500",
          number: "$palette.orange.300",
          function: "$palette.blue.300",
          parameter: "$palette.orange.500", // NEW — deeper than number.300 (only available split on this bg)
          type: "$palette.yellow.500",
          constant: "$palette.orange.300",
          tag: "$palette.blue.300",
          attr: "$palette.green.300", // was yellow.500
          regex: "$palette.red.300",
          punct: "$palette.gray.300",
        },
  ```

- [ ] **Step 3: Update Dawn's syntax block**

  Replace the existing `syntax: { … }` block inside `flavors.dawn` with:

  ```js5
        syntax: {
          comment: "#525252",
          keyword: "$palette.purple.700",
          string: "$palette.green.900",
          number: "$palette.orange.700",
          function: "$palette.blue.700",
          parameter: "$palette.orange.900", // NEW
          type: "$palette.yellow.900",
          constant: "$palette.orange.700",
          tag: "$palette.blue.700",
          attr: "$palette.green.700", // was yellow.900
          regex: "$palette.red.700",
          punct: "$palette.gray.700",
        },
  ```

- [ ] **Step 4: Update Noon's syntax block**

  Replace the existing `syntax: { … }` block inside `flavors.noon` with:

  ```js5
        syntax: {
          comment: "#525252",
          keyword: "$palette.purple.700",
          string: "$palette.green.900",
          number: "$palette.orange.700",
          function: "$palette.blue.700",
          parameter: "$palette.orange.900", // NEW
          type: "$palette.yellow.900",
          constant: "$palette.orange.700",
          tag: "$palette.blue.700",
          attr: "$palette.green.700", // was yellow.900
          regex: "$palette.red.700",
          punct: "$palette.gray.700",
        },
  ```

- [ ] **Step 5: Sanity-check the parse**

  Run: `node tools/build-tokens.mjs --check`
  Expected: drift error (still). NOT a parse error. If JSON5 parse fails, locate the broken bracket/comma in the flavor you just edited.

---

## Task 3: Add `scope_recommendations` block

**Files:**

- Modify: `tokens.json5` — insert new section between `syntax_tokens` (slot 10) and `iconography` (currently slot 11, becomes slot 12)

- [ ] **Step 1: Insert the new section**

  Find the iconography section header (currently `//   11.  ICONOGRAPHY  —  what to use, per layer`). Immediately BEFORE that header, insert:

  ```js5
    // ────────────────────────────────────────────────────────────────
    //   11.  SCOPE RECOMMENDATIONS  —  TextMate scope → logical slot
    // ────────────────────────────────────────────────────────────────
    // Per-slot lists of TextMate scopes that ports SHOULD map to that
    // slot when generating editor themes. Optional — ports may extend
    // or override based on their target's grammar coverage.
    //
    // These resolve the issue #2 cases that depend on consistent
    // TextMate-scope handling across ports (items 5, 6, 9).

    scope_recommendations: {
      // Item 5 — language-level pronouns (not function calls)
      lang_var: [
        "variable.language.this",
        "variable.language.self",
        "variable.language.super",
      ],

      // Item 9 — JSDoc / doc-comment children
      doc_keyword: ["comment.block.documentation keyword"],
      doc_type: ["comment.block.documentation entity.name.type"],
      doc_param: ["comment.block.documentation variable"],

      // Item 6 — in JS/TS, `const x = …` is the default declaration form
      // and should NOT inherit the `constant` color (which would colour
      // every const noisily). Map these scopes through to `fg` (i.e.
      // plain identifier). The language-server `variable.readonly`
      // semantic token should still get the `constant` slot.
      fg_fallthrough_jsts: [
        "variable.other.constant.js",
        "variable.other.constant.ts",
        "variable.other.constant.tsx",
      ],
    },

  ```

- [ ] **Step 2: Renumber the iconography section header**

  Change the comment line `//   11.  ICONOGRAPHY  —  what to use, per layer` to `//   12.  ICONOGRAPHY  —  what to use, per layer`. No other lines in the iconography section need to change.

- [ ] **Step 3: Update the flavor-introduction comment**

  In the flavors introduction block (around line 162), change:

  ```
    //   syntax   — the 11 core syntax token colors
  ```

  to:

  ```
    //   syntax   — the 12 core syntax token colors
  ```

- [ ] **Step 4: Verify the file still parses**

  Run: `node tools/build-tokens.mjs --check`
  Expected: drift error on outputs (still). NOT a parse error.

---

## Task 4: Bump versions

**Files:**

- Modify: `tokens.json5` — `meta.version`
- Modify: `package.json` — `version`

- [ ] **Step 1: Update `meta.version` in `tokens.json5`**

  Find `meta.version: "0.2.0"` (around line 22). Change to:

  ```js5
      version: "0.3.0",
  ```

  Also update the file-header banner comment if it mentions a version. The header currently says `// Version 0.2.0 · May 2026` near line 17 — change to `// Version 0.3.0 · May 2026`.

- [ ] **Step 2: Update `version` in `package.json`**

  Change the `"version": "0.2.1"` line to:

  ```json
    "version": "0.3.0",
  ```

  (Do not edit any other field. `package-lock.json` is not present in this repo — no other version mirrors to update.)

---

## Task 5: Regenerate outputs and verify build

**Files:**

- Regenerated: `tokens.json`, `dist/tokens.js`, `colors_and_type.css`

- [ ] **Step 1: Run the full build**

  Run: `npm run build`
  Expected output (last lines):

  ```
  ✓ tokens.json
  ✓ dist/tokens.js
  ✓ wrote colors_and_type.css (…)

  ✓ All accent variants meet WCAG AA against their flavor bg.
  ✓ All (flavor, variant) selections remain readable for body text.
  ```

  If contrast warnings appear under "Contrast warnings:", the most likely culprit is `twilight.syntax.parameter` (`#f97316` on `#404040` ≈ 3.9:1, just above the 3:1 threshold). If it fails (< 3:1), the spec's fallback is `orange.300`:
  - Edit `tokens.json5` flavors.twilight.syntax.parameter → `"$palette.orange.300"` (accepts collision with number)
  - Re-run `npm run build`

- [ ] **Step 2: Spot-check generated CSS contains `--syn-parameter`**

  Run: `grep -E "syn-parameter" colors_and_type.css`
  Expected: 4 lines (one per flavor block), each with the per-flavor color from Task 2 (orange.300 / orange.500 / orange.900 / orange.900 in hex form: `#fdba74`, `#f97316`, `#7c2d12`, `#7c2d12`).

- [ ] **Step 3: Spot-check `--syn-attr` changed to green**

  Run: `grep -E "syn-attr" colors_and_type.css`
  Expected: 4 lines with hex values `#bef264` (midnight), `#bef264` (twilight), `#4d7c0f` (dawn), `#4d7c0f` (noon).

- [ ] **Step 4: Spot-check `tokens.json` carries the new metadata**

  Run: `node -e 'const t = require("./tokens.json"); console.log("core:", t.syntax_tokens.core.length, t.syntax_tokens.core); console.log("extended keys:", Object.keys(t.syntax_tokens.extended).length); console.log("scope_recommendations keys:", Object.keys(t.scope_recommendations || {})); console.log("version:", t.meta.version);'`

  Expected:

  ```
  core: 12 [ … 'parameter' … ]
  extended keys: 23
  scope_recommendations keys: [ 'lang_var', 'doc_keyword', 'doc_type', 'doc_param', 'fg_fallthrough_jsts' ]
  version: 0.3.0
  ```

---

## Task 6: Run drift check and self-tests

- [ ] **Step 1: Run the full check pipeline**

  Run: `npm run check`
  Expected: every line ends with `✓`. If any output is "out of date", re-run `npm run build` (something didn't commit through).

- [ ] **Step 2: Run color-math self-tests**

  Run: `npm run test`
  Expected: `10/10 passed.` (or the current passing count — should be unchanged, since this PR adds no new tests).

---

## Task 7: Update `README.md` slot-count references

**Files:**

- Modify: `README.md` — lines 78 and 213

- [ ] **Step 1: Update the Features bullet**

  Line 78 currently reads:

  ```
  - **Syntax token map** — 11 core slots + 15 extended, stable shape across all flavors
  ```

  Change to:

  ```
  - **Syntax token map** — 12 core slots + 23 extended, stable shape across all flavors
  ```

- [ ] **Step 2: Update the "Syntax token map (per flavor)" intro**

  Line 213 currently reads:

  ```
  the 11 core slots. Ports may override individual entries.
  ```

  Change to:

  ```
  the 12 core slots. Ports may override individual entries.
  ```

- [ ] **Step 3: Extend the syntax token table to include `parameter`**

  The "Syntax token map (per flavor)" table starts a few lines above line 213 (look for `| Token      | Hue family   |`). The current rows go through `punct`. Insert a new row between `function` and `type`:

  ```
  | `parameter` | orange (italic) |
  ```

  And update the `attr` row's hue family from `yellow` to `green` (was `attr | yellow`, now `attr | green`).

- [ ] **Step 4: Verify no other slot-count references**

  Run: `grep -nE "11 core|11 \"core\"|11-slot|11 slot" README.md handoff/SKILL.md tokens.json5`
  Expected: no matches (or only matches inside the spec/plan docs under `docs/`). Update any production-doc references found.

---

## Task 8: Update `handoff/SKILL.md` if it references the old slot count

**Files:**

- Modify (conditional): `handoff/SKILL.md`

- [ ] **Step 1: Check for slot-count references**

  Run: `grep -nE "11 core|11 \"core\"" handoff/SKILL.md`
  Expected: no matches → skip Step 2.
  If matches found, proceed.

- [ ] **Step 2: Update any matches to "12"**

  Edit each match to read "12" instead of "11". Preserve surrounding formatting exactly.

---

## Task 9: Add CHANGELOG entry

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Insert the `[0.3.0]` block under `[Unreleased]`**

  Find the `## [Unreleased]` line. Immediately after it (and the trailing `---`), insert:

  ```markdown
  ## [0.3.0] - 2026-05-27

  Resolves [#2](https://github.com/vivid-life-theme/vivid-life-design-system/issues/2) — syntax-highlighting semantics restructure observed against established themes (Dracula).

  ### Added

  - ⚠️ New core syntax slot: `parameter` (emits `--syn-parameter` per flavor, italic via extended map). Total core slots: 11 → 12.
  - New extended-map entries: `lang_var` (this/self/super), `emphasis` (tinted italic), `strong` (tinted bold), `invalid`, `invalid_deprecated`, `doc_keyword`, `doc_type`, `doc_param`.
  - New `scope_recommendations` block in `tokens.json5` — machine-readable TextMate-scope guidance for ports (covers issue #2 items 5, 6, 9).
  - Markdown/asciidoc/rst `emphasis` and `strong` now ship with both color and style (yellow + italic, orange + bold respectively), matching the Dracula tinted-emphasis pattern.

  ### Changed

  - ⚠️ `attr` slot color reassigned in all four flavors: was yellow (collided with `type`), now green family (`green.300` on dark, `green.700` on light). Ports that rendered against `--syn-attr` will now show green instead of yellow.
  - ⚠️ `decorator` extended-map target changed from `type` → `function`. Decorators are call-site annotations, not type declarations.
  - ⚠️ `property` extended-map target changed from `tag` → `fg`. `obj.foo` now reads as a plain identifier rather than colliding with function/tag blue.
  - `syntax_tokens.extended` map shape expanded: entries may now be either a string (color target shorthand) or an object `{ color?, style? }`. Short string form remains valid (back-compat).
  - Extended-map target vocabulary expanded: `fg_muted`, `fg_subtle`, `fg_disabled`, `semantic.success|warning|danger|info` are valid targets alongside core-slot names.

  ### Notes for ports

  - Item 6 (`variable.other.constant.{js,ts,tsx}` should fall through to `fg`, not `constant`) is a port-side TextMate-scope concern. See `scope_recommendations.fg_fallthrough_jsts` in `tokens.json` for the recommended scope list.
  - The new `parameter` slot's italic styling is delivered via `syntax_tokens.extended.parameter.style` — ports that resolve only `flavors.*.syntax.parameter` get the color, but must read the extended map for the italic.
  ```

- [ ] **Step 2: Verify CHANGELOG renders cleanly**

  Run: `head -60 CHANGELOG.md`
  Expected: `[Unreleased]` is empty, `[0.3.0]` is the first dated entry, structure matches the existing `[0.2.1]` format.

---

## Task 10: Visual verification of previews

**Files:**

- Read: `preview/01-kitchen-sink.html`, `preview/05-syntax-reference.html`

- [ ] **Step 1: Confirm CSS variables resolve**

  Run: `grep -cE "--syn-parameter|--syn-attr" colors_and_type.css`
  Expected: at least 8 (4 flavors × 2 vars).

- [ ] **Step 2: Open the kitchen sink preview**

  Open `preview/01-kitchen-sink.html` in a browser. Confirm:
  - HTML/JSX attribute names (if shown in any syntax sample) render in green (was yellow).
  - The new `--syn-parameter` is defined (inspect a `.prm` element in DevTools; CSS variable should resolve to the per-flavor orange shade).

  No visible breakage is required — the change is forward-compatible for previews that don't reference the new slot.

- [ ] **Step 3 (optional): Add a parameter usage to the syntax preview**

  `preview/_syntax.css:99` already defines `.prm { color: var(--syn-parameter); font-style: italic; }`, but no HTML element currently uses the class. To make the new slot visible in a preview:
  - Open `preview/05-syntax-reference.html`.
  - Find any function definition sample (e.g., `function foo(bar) { … }` or `(a, b) => …`).
  - Wrap the parameter names in `<span class="prm">…</span>`. Example: change `function fetch(<span class="v">url</span>, <span class="v">opts</span>)` to `function fetch(<span class="prm">url</span>, <span class="prm">opts</span>)`.
  - Re-open the preview. Parameter names should now render in italic orange (per-flavor shade).

  If you make this change, run `node tools/build-previews.mjs --check` afterward — drift checker validates `var(--…)` references in previews.

---

## Task 11: Commit and link to issue

- [ ] **Step 1: Stage and commit**

  Decide commit boundaries based on the changes you actually made. Two reasonable shapes:

  **Single commit (recommended for this PR):**

  ```bash
  git add tokens.json5 tokens.json dist/tokens.js colors_and_type.css \
          package.json README.md CHANGELOG.md handoff/SKILL.md \
          preview/05-syntax-reference.html 2>/dev/null
  git status   # verify only intended files staged
  git commit -m "$(cat <<'EOF'
  ✨ feat: restructure syntax-highlighting semantics (#2)

  Resolves #2.

  - Promote `parameter` to a 12th core slot (orange family, italic via
    extended map); emits `--syn-parameter` per flavor.
  - Decouple `attr` from `type`: reassign attr to green family in all
    four flavors.
  - Re-alias `decorator` → `function`, `property` → `fg`.
  - Expand extended-map shape to `{ color, style }` objects; string
    shorthand remains valid. Add `lang_var`, `emphasis`, `strong`,
    `invalid`, `invalid_deprecated`, `doc_keyword`, `doc_type`,
    `doc_param`.
  - Markdown emphasis/strong now tinted (yellow italic / orange bold),
    matching Dracula's pattern.
  - New `scope_recommendations` block lists TextMate scopes ports
    should consume for items 5, 6, 9.
  - Bump to 0.3.0.

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  ```

  **Split commits (if preferred):** one commit for `tokens.json5` + generated outputs + `package.json`, one for `README.md` + `CHANGELOG.md` + `handoff/SKILL.md`, optional one for the preview change. The "Resolves #2" trailer goes on the final commit.

- [ ] **Step 2: Verify the commit landed cleanly**

  Run: `git log -1 --stat`
  Expected: the changed files match what you intended; `tokens.json`, `dist/tokens.js`, `colors_and_type.css` are all included so the drift checker passes on `main`.

  Run: `npm run check && npm run test`
  Expected: all `✓`, exit 0. If anything fails post-commit, fix and create a new commit (do not amend).

---

## Verification Checklist (run after all tasks complete)

These mirror the spec's verification section.

1. [ ] `npm run build` succeeds; all four flavors clear the 3:1 syntax-contrast warning bar.
2. [ ] `npm run check` reports `tokens.json`, `dist/tokens.js`, `colors_and_type.css`, and previews all in sync.
3. [ ] `npm run test` passes.
4. [ ] `colors_and_type.css` contains `--syn-parameter` in each `.vl-*` block.
5. [ ] `tokens.json` has `meta.version` of `0.3.0`, `syntax_tokens.core.length === 12`, and a top-level `scope_recommendations` object.
6. [ ] `README.md` references "12 core slots + 23 extended".
7. [ ] `CHANGELOG.md` has a dated `[0.3.0]` entry.
8. [ ] Visual check: `preview/01-kitchen-sink.html` renders attributes in green (was yellow); if Task 10 Step 3 was done, parameters render italic orange.

If all checks pass, the PR is ready for review.
