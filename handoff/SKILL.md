---
name: vivid-life-theme
description: Use this skill to design or build artifacts (slides, prototypes, websites, app mocks) using the Vivid Life Theme — a multi-flavor color-scheme system with 4 flavors × 6 variants = 24 themes, plus type, spacing, and component foundations. All values are WCAG AA verified.
---

# Vivid Life Theme — designer's skill

Read `README.md` for the full system overview, then explore the other files
listed below before producing anything.

## What this is

A **foundation** for theming. Not itself a theme for any one app. Whatever
you build (slide deck, marketing site, app mock, throwaway prototype,
production code) should consume the tokens defined here.

## Files to read, in order

1. `README.md` — the system at a glance
2. `tokens.json5` — single source of truth (palette, flavors, variants,
   syntax map, typography, spacing, radii, shadows, motion)
3. `colors_and_type.css` — CSS implementation of all tokens
4. `preview/14-kitchen-sink.html` — every UI token live across all 24
   themes (open it; click the flavor/variant pills)

## How to use, in three patterns

### Pattern A — Static visual artifact (slides, marketing, throwaway)

1. Copy `colors_and_type.css` + `fonts/` + `assets/` into your output.
2. In HTML: `<link rel="stylesheet" href="colors_and_type.css">` and
   `<body class="vl-<flavor> variant-<variant>">`.
3. Use `var(--vl-bg)`, `var(--vl-fg)`, `var(--vl-accent)`, etc. exclusively.
   **Do not hardcode colors.** If you need a value not in the foundation,
   open it as a question — the foundation may have a gap.
4. For brand surface: use `assets/logo.svg` (or a PNG render); use
   `assets/wordmark.svg` for headers.

### Pattern B — Theme port (VS Code, terminal, GTK, …)

1. Read `dist/tokens.js` (or `tokens.json`). Do not re-encode the palette.
2. Iterate `flavor × variant`. The accent is
   `palette[variant][accent_shade[flavor][variant]]`.
3. Map foundation tokens into your target format. Use `syntax_tokens.extended`
   for fallback resolution.
4. Write one file per theme to your port's output dir.
5. See README's "For downstream ports" section.

### Pattern C — Production app design

1. Pull `colors_and_type.css` into your app's CSS pipeline.
2. Toggle flavor + variant via two classes on `<html>` or `<body>`.
3. Persist user choice in `localStorage`; default to Midnight + Purple.
4. Refer to `preview/14-kitchen-sink.html` for the canonical look of
   every component state (buttons, inputs, toasts, tabs, modal, app chrome).

## Brand voice (light)

The theme system itself is named, structured, and described in plain,
unhyped language. No emoji. No corporate boilerplate. Examples:

- Theme names use the time-of-day metaphor: **Midnight · Twilight · Dawn ·
  Noon**. Don't invent new flavor names without strong reason.
- When listing the four flavors, keep them in time order (Midnight first
  or last; never alphabetical).
- Capitalize variant names: **Red · Orange · Yellow · Green · Blue ·
  Purple**. Cyan is _not_ a variant.

## If the user invokes this skill without further guidance

Ask: "What are you building — a static artifact, a theme port, or a
production-app surface?" Then ask: "Which flavor and variant should be
the default?" Then build accordingly using the patterns above.

## Hard rules

- All 24 (flavor × variant) themes must remain WCAG AA. Don't bypass the
  accent-shade table.
- Don't introduce a serif face. Atkinson Hyperlegible has none.
- Don't use cyan as a variant. It exists only for ANSI cyan / diff hunk
  headers / similar protocol uses.
- Don't draw the brand mark by hand. Copy `assets/logo.svg`.
- Don't hardcode hex values where a token exists.

## Feedback

After producing an artifact, ask the user: "Did the result use the
foundation correctly? If not, tell me what's off — I'll log it to
`.claude/learnings.md` so the next session doesn't repeat it." If they
flag a gap that's actually a foundation gap (a missing token, an
underspecified pattern), open it as an issue against the foundation repo
rather than papering over it on the port side.
