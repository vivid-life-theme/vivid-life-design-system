# Syntax-Highlighting Semantics — Design Spec

**Date:** 2026-05-27
**Status:** Approved
**Resolves:** [#2 — Syntax-highlighting semantics: structural improvements observed against established themes](https://github.com/vivid-life-theme/vivid-life-design-system/issues/2)

## Goal

Re-shape the foundation's syntax-highlighting contract so downstream ports can distinguish constructs that currently collapse into a single color (e.g. `obj.foo`, `foo()`, `<Foo />` all blue), and so additional language constructs (parameters, decorators, doc-comment children, language-pronouns like `this`/`self`, invalid scopes, markdown emphasis) have explicit slots backed by both a color target and a style hint.

Every change here belongs in the foundation because each affects every port (VS Code, Helix, Neovim, JetBrains, …); fixing port-side would let ports drift.

## Scope

All ten findings from issue #2 in a single release. The author's original suggestion was to split items 1-6 (structural) from items 7-10 (additive); user has opted to ship together as the `0.3.0` minor bump.

**In scope:**

1. Split `property` from `tag`/`function`
2. Promote `parameter` to a first-class core slot
3. Decouple `attr` from `type` per flavor
4. Re-alias `decorator` away from `type`
5. Add `lang_var` slot (port maps `variable.language.this|self|super`)
6. Port-side TextMate-scope guidance for excluding `variable.other.constant.{js,ts,tsx}` from the `constant` slot
7. Add `emphasis`/`strong` language-agnostic mappings
8. Add `invalid`/`invalid.deprecated` mappings
9. Add JSDoc / doc-comment children (`doc_keyword`, `doc_type`, `doc_param`)
10. Markdown bold/italic body tint (delivered via `emphasis`/`strong` color)

**Out of scope:**

- All TextMate-scope mappings inside any specific port. The foundation publishes recommendations under `scope_recommendations` but does not generate per-port theme files.
- Item 6's enforcement — the foundation cannot dictate which TextMate scopes a port maps to `constant`. We list the JS/TS scopes that should fall through to `fg` as a recommendation only.

---

## Decision summary

| #   | Decision                       | Choice                                                                                                                                   |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `parameter` shape              | Promote to 12th **core slot** (CSS-emitted as `--syn-parameter`)                                                                         |
| D2  | Extended-map value shape       | Expand to `{ color, style }` objects; short string form remains valid (back-compat)                                                      |
| D3  | Extended-map target vocabulary | Core slot names, `fg` / `fg_muted` / `fg_subtle` / `fg_disabled`, `semantic.{success,warning,danger,info}`                               |
| D4  | Recommended TextMate scopes    | New `scope_recommendations` block in `tokens.json5` (machine-readable)                                                                   |
| D5  | Markdown tint                  | Bake into `emphasis` (yellow + italic) and `strong` (orange + bold); applies to all `emphasis`/`strong` scopes (markdown, rst, asciidoc) |
| D6  | Version bump                   | `0.2.1` → `0.3.0`                                                                                                                        |

---

## Change 1 — Core syntax slots

`syntax_tokens.core` grows from 11 → 12, adding `parameter`:

```
comment, keyword, string, number, function, parameter, type, constant, tag, attr, regex, punct
```

`parameter` is inserted between `function` and `type` so the canonical listing in the README's "Syntax token map" stays grouped by semantic role (definitions on the left, types in the middle, values/constants on the right).

### Per-flavor color reassignments

| Flavor   | bg        | `attr` (old) | `attr` (new)  | `parameter` (NEW)     |
| -------- | --------- | ------------ | ------------- | --------------------- |
| Midnight | `#171717` | yellow.500   | **green.300** | **orange.300** italic |
| Twilight | `#404040` | yellow.500   | **green.300** | **orange.500** italic |
| Dawn     | `#d4d4d4` | yellow.900   | **green.700** | **orange.900** italic |
| Noon     | `#f5f5f5` | yellow.900   | **green.700** | **orange.900** italic |

### Picking rationale

- **`attr` → green family:** Currently identical to `type` (yellow). Moves to green, one shade away from `string` so the two greens are distinguishable but in-family. `type` keeps yellow alone.
- **`parameter` → orange family:** Italics applied port-side. Chosen one shade away from `number`/`constant` per flavor. The 6-hue + grayscale palette is fully allocated, so a same-hue/different-shade split is the only path that respects the existing constraint.
- **Twilight `parameter` direction inversion:** Twilight's `number` is already at `.300`; pushing `parameter` to `.500` (deeper than number, instead of lighter) is the only available split. Contrast of `orange.500` (`#f97316`) on `gray.700` (`#404040`) is ≈ 3.9:1 — above the 3:1 syntax threshold but the lowest of any slot in the system. If the build script's `check()` reports < 3:1 after the change, fall back to `orange.300` and accept the slight collision with `number`.
- **`function` ≡ `tag` unchanged:** Item 1 names `obj.foo`, `foo()`, `<Foo />` as three constructs but the proposed fix only splits `property`. Function calls and JSX tags both read as "invoked identifier"; leaving them at shared blue matches Dracula's model and avoids cascading hue changes.
- **`number` ≡ `constant` unchanged at slot level:** Item 6 addresses the noise port-side (don't map JS/TS `variable.other.constant` to the `constant` slot). No foundation split.

### WCAG implications

`tools/build-tokens.mjs:307` warns at < 3:1 for any `flavors.*.syntax.*` color. New values:

- `green.300` (`#bef264`) on dark flavors: contrast > 11:1 ✓
- `green.700` (`#4d7c0f`) on light flavors: contrast > 4.5:1 ✓
- `orange.300` (`#fdba74`) on `gray.900`: > 9:1 ✓
- `orange.500` (`#f97316`) on `gray.700`: ≈ 3.9:1 ✓ (above 3:1 threshold)
- `orange.900` (`#7c2d12`) on light flavors: > 4.5:1 ✓

All pass. No threshold change required.

---

## Change 2 — Extended map shape

Each entry becomes either a string (color target shorthand) or an object:

```ts
type ExtendedEntry =
  | string // shorthand for { color: <string> }
  | { color?: string; style?: Style[] }; // explicit
type Style = "italic" | "bold" | "underline";
```

`color` target vocabulary:

- Core syntax slot name: `comment` | `keyword` | `string` | `number` | `function` | `parameter` | `type` | `constant` | `tag` | `attr` | `regex` | `punct`
- Text-layer alias: `fg` | `fg_muted` | `fg_subtle` | `fg_disabled` → resolves against `flavors.<f>.text.*`
- Semantic alias: `semantic.success` | `semantic.warning` | `semantic.danger` | `semantic.info` → resolves against `flavors.<f>.semantic.*`

A missing `color` means "use whatever the host text color is" (font-style-only effect).

### Resolver behavior

Ports MUST treat:

- `"foo"` as equivalent to `{ color: "foo" }`
- `{ style: [...] }` (no `color`) as a font-style-only directive — color inherits from parent context
- Unknown `color` strings as an error (fail fast — keeps ports from silently rendering against `fg`)

The foundation's build scripts do not need to resolve the extended map (it is metadata only). Ports do their own resolution at build time.

### Full extended map after changes

```js5
extended: {
  // ── Repurposed (items 1, 2, 4) ─────────────────────
  variable:  "fg",                                              // unchanged
  parameter: { color: "parameter", style: ["italic"] },         // was → "fg"; now → new core slot
  property:  "fg",                                              // was → "tag" (item 1)
  decorator: "function",                                        // was → "type" (item 4)

  // ── Unchanged ─────────────────────────────────────
  operator:  "keyword",
  builtin:   "function",
  namespace: "type",
  macro:     "function",
  lifetime:  "constant",
  heading:   "keyword",
  link:      "tag",
  selector:  "tag",
  unit:      "number",
  hex:       "string",
  shebang:   "comment",

  // ── New (items 5, 7, 8, 9, 10) ─────────────────────
  lang_var:           { color: "constant", style: ["italic"] },                       // this/self/super (item 5)
  emphasis:           { color: "type",     style: ["italic"] },                       // items 7, 10 (markdown italic + rst/asciidoc)
  strong:             { color: "number",   style: ["bold"] },                         // items 7, 10 (markdown bold + rst/asciidoc)
  invalid:            { color: "semantic.danger", style: ["italic", "underline"] },   // item 8
  invalid_deprecated: { color: "fg",              style: ["italic", "underline"] },   // item 8
  doc_keyword:        "keyword",                                                       // item 9
  doc_type:           { color: "type",      style: ["italic"] },                       // item 9
  doc_param:          { color: "parameter", style: ["italic"] },                       // item 9
}
```

---

## Change 3 — `scope_recommendations` block

New top-level block in `tokens.json5`. Machine-readable; ports may parse it directly when generating their TextMate scope maps, or treat it as advisory.

```js5
// ────────────────────────────────────────────────────────────────
//   11.  SCOPE RECOMMENDATIONS  —  TextMate scope → logical slot
// ────────────────────────────────────────────────────────────────
// Per-slot lists of TextMate scopes that ports SHOULD map to that
// slot when generating editor themes. Optional — ports may extend
// or override based on their target's grammar coverage.
//
// These recommendations resolve the cases from issue #2 that depend
// on consistent TextMate-scope handling across ports (items 5, 6, 9).

scope_recommendations: {
  // Item 5 — language-level pronouns (not function calls)
  lang_var: [
    "variable.language.this",
    "variable.language.self",
    "variable.language.super",
  ],

  // Item 9 — JSDoc / doc-comment children
  doc_keyword: ["comment.block.documentation keyword"],
  doc_type:    ["comment.block.documentation entity.name.type"],
  doc_param:   ["comment.block.documentation variable"],

  // Item 6 — in JS/TS, `const x = …` is the default declaration
  // form and should NOT inherit the `constant` color (which would
  // colour every const noisily). Map these scopes through to `fg`
  // (i.e. plain identifier). The language-server `variable.readonly`
  // semantic token should still get the `constant` slot.
  fg_fallthrough_jsts: [
    "variable.other.constant.js",
    "variable.other.constant.ts",
    "variable.other.constant.tsx",
  ],
}
```

This is the only new top-level block. The existing iconography section currently sits at slot 11; this becomes slot 12 (renumbering comments in `tokens.json5` is part of the change).

---

## Change 4 — Build script implications

- **`tools/build-tokens.mjs`** — No code changes. The contrast checker (`check()` at line 307) already iterates `flavors.*.syntax` and will pick up the new `parameter` slot and reassigned `attr` colors automatically. WCAG threshold (3:1 for syntax) is unchanged.
- **`tools/build-css.mjs`** — No code changes. `flavorBlock()` iterates `flavor.syntax` so `--syn-parameter` emits automatically. Extended map and `scope_recommendations` are JSON-only metadata; not CSS-emitted.
- **`tools/build-previews.mjs`** — Verify no references to `--syn-attr` color that assume yellow. If any preview hard-codes the old yellow for attribute rendering, update.

---

## Change 5 — Documentation

- **`README.md` → "Syntax token map (per flavor)" table:** insert `parameter` row; update `attr` row to green family. Optional: add a brief note explaining the 12th slot and the new extended-map shape.
- **`tokens.json5` comments:** update the slot-count comments (the `flavors.*.syntax` introduction says "11 core syntax token colors" — bump to 12) and the `syntax_tokens` block intro.
- **`CHANGELOG.md`:** new `[0.3.0]` entry under `### Added` (new core slot, new extended-map entries, `scope_recommendations` block) and `### Changed` (extended-map shape, `attr` color reassignment, `decorator` re-aliased).
- **`handoff/SKILL.md`:** existing reference to "11 core slots" or similar — update if present.

---

## Change 6 — Version bump

- `package.json` `version`: `0.2.1` → `0.3.0`
- `tokens.json5` `meta.version`: `0.2.0` → `0.3.0` (keep meta in sync with package)

Breaking-ish minor bump justified by:

- New core slot (additive — non-breaking for ports that don't use it)
- Extended-map shape change (back-compat preserved via string-shorthand acceptance)
- `attr` color reassignment in all four flavors (consumer-visible — ports that wrote against `--syn-attr` will now render green where they used to render yellow)
- `decorator` re-aliased from `type` to `function` (extended-map metadata; ports that resolve via the map will see the new color)

Pre-1.0, so minor is correct per CHANGELOG conventions.

---

## Non-changes (called out for clarity)

- `function` and `tag` slots remain shared-color per flavor. Splitting them would require allocating a 7th chromatic identity within the 6-hue palette and is not requested by the issue.
- `number` and `constant` slots remain shared-color per flavor. Item 6 handles the noise port-side.
- No new typography, spacing, radius, shadow, or motion tokens.
- No change to the WCAG threshold or contrast checker logic.
- No change to the variant axis (still 6 hues, cyan still reserved).

---

## Verification

After implementation, the following must hold (run `npm run check` and `npm run test`):

1. `npm run build` succeeds; all four flavors clear the 3:1 syntax-contrast warning bar.
2. `npm run check` reports `tokens.json`, `dist/tokens.js`, `colors_and_type.css`, and previews all in sync.
3. `npm run test` passes (color-math self-tests; no new tests required for this change).
4. `colors_and_type.css` contains `--syn-parameter` in each `.vl-*` block with the expected per-flavor color.
5. `tokens.json` contains the updated `syntax_tokens.extended` object form, the new `scope_recommendations` block, and `meta.version` of `0.3.0`.

Manual visual check (not required but recommended): open `preview/01-kitchen-sink.html` and confirm the syntax sample renders attributes in green and (when the port-side themes are regenerated) function parameters in italic orange.
