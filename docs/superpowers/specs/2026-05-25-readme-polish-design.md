# README Polish — Design Spec

**Date:** 2026-05-25
**Status:** Approved

## Goal

Make the README.md visually compelling for a GitHub visitor, consistent with the fact that this is a design system repository. No structural reorganisation — insert two visual blocks and fix one bug.

## Scope

Five changes only. All existing section content is preserved verbatim.

---

## Change 1 — Fix truncated tagline (bug)

**File:** `README.md`, line 3

**Current:**

```
> A multi-flavor color-scheme syste
```

**Fix:**

```
> A multi-flavor color-scheme system
```

---

## Change 2 — New header block

Replace the plain `# Vivid Life Theme` heading (line 1) with a centered HTML block that renders the wordmark SVG and a badge strip.

```html
<p align="center">
  <img src="assets/wordmark.svg" height="48" alt="Vivid Life Theme" />
</p>
<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT" />
  <img
    src="https://img.shields.io/badge/WCAG-AA%20%E2%9C%93-22c55e"
    alt="WCAG AA"
  />
  <img
    src="https://img.shields.io/badge/dependencies-none-737373"
    alt="No dependencies"
  />
</p>
```

**Constraints:**

- `height="48"` keeps the wordmark compact — matches the SVG's natural 48px height.
- Shields.io badges are the standard GitHub README badge service; external dependency is acceptable here (they are a display-only, no-JS resource).
- The `alt` text on each badge ensures accessibility when images are off.

---

## Change 3 — Flavor strip + 24-theme accent grid

Insert a new HTML block immediately after the intro paragraph (after the `Every port is its own GitHub repo…` paragraph and before the `---` divider that opens the Status section).

### 3a — Flavor canvas strip

A single-row HTML table with four cells, each `bgcolor`-colored to its canvas:

| Cell | Label    | `bgcolor` | Text color |
| ---- | -------- | --------- | ---------- |
| 1    | Midnight | `#171717` | `#d4d4d4`  |
| 2    | Twilight | `#404040` | `#d4d4d4`  |
| 3    | Dawn     | `#d4d4d4` | `#404040`  |
| 4    | Noon     | `#f5f5f5` | `#404040`  |

### 3b — 24-theme accent grid

A 4-column × 6-row HTML table (rows = variants, columns = flavors). Each cell `bgcolor`-colored to the resolved accent for that flavor × variant combination.

Resolved accent colors:

| Variant | Midnight  | Twilight  | Dawn      | Noon      |
| ------- | --------- | --------- | --------- | --------- |
| Red     | `#ef4444` | `#fca5a5` | `#7f1d1d` | `#b91c1c` |
| Orange  | `#f97316` | `#fdba74` | `#7c2d12` | `#c2410c` |
| Yellow  | `#eab308` | `#eab308` | `#713f12` | `#713f12` |
| Green   | `#84cc16` | `#84cc16` | `#365314` | `#365314` |
| Blue    | `#93c5fd` | `#93c5fd` | `#1d4ed8` | `#1d4ed8` |
| Purple  | `#d8b4fe` | `#d8b4fe` | `#7e22ce` | `#7e22ce` |

**Caption below the grid:**

```
4 flavors × 6 variants = 24 themes · all WCAG AA
```

**Implementation note:** GitHub's HTML sanitizer strips `<style>` blocks but preserves `bgcolor` on `<td>` elements. Use `bgcolor` (not `style="background-color:…"`) for maximum compatibility. Cell width should be set with `width` attribute (e.g. `width="60"`), not inline styles.

---

## Change 4 — Preview gallery (2×2 screenshots)

Insert a new **Preview** section between the Status table and "The system at a glance" heading.

### Screenshot subjects

Four screenshots of `preview/01-kitchen-sink.html`, one per flavor at its default variant:

| Filename                                       | Flavor   | Variant | Canvas    |
| ---------------------------------------------- | -------- | ------- | --------- |
| `assets/screenshots/kitchen-sink-midnight.png` | Midnight | Purple  | `#171717` |
| `assets/screenshots/kitchen-sink-twilight.png` | Twilight | Yellow  | `#404040` |
| `assets/screenshots/kitchen-sink-dawn.png`     | Dawn     | Blue    | `#d4d4d4` |
| `assets/screenshots/kitchen-sink-noon.png`     | Noon     | Red     | `#f5f5f5` |

### Screenshot capture

- **Tool:** headless Chromium (`chromium-browser --headless`)
- **Viewport:** 1280 × 800
- **Theme selection:** the kitchen-sink page exposes flavor/variant via CSS classes on `<body>`. Before capturing, inject `document.body.className = 'vl-{flavor} variant-{variant}'` via `--run-script`, or use a URL query parameter if the page supports it. If neither is available, serve a wrapper HTML page that imports the kitchen-sink styles and sets the classes, then screenshot that.
- **Output size:** crop or resize to max 1200px wide × 675px tall (16:9) so four images sit comfortably at GitHub's ~820px content width
- **Format:** PNG

### Gallery markdown

```html
## Preview

<table align="center">
  <tr>
    <td align="center">
      <img
        src="assets/screenshots/kitchen-sink-midnight.png"
        width="380"
        alt="Midnight · Purple"
      /><br /><sub>Midnight · Purple</sub>
    </td>
    <td align="center">
      <img
        src="assets/screenshots/kitchen-sink-twilight.png"
        width="380"
        alt="Twilight · Yellow"
      /><br /><sub>Twilight · Yellow</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img
        src="assets/screenshots/kitchen-sink-dawn.png"
        width="380"
        alt="Dawn · Blue"
      /><br /><sub>Dawn · Blue</sub>
    </td>
    <td align="center">
      <img
        src="assets/screenshots/kitchen-sink-noon.png"
        width="380"
        alt="Noon · Red"
      /><br /><sub>Noon · Red</sub>
    </td>
  </tr>
</table>

> Open [`preview/01-kitchen-sink.html`](preview/01-kitchen-sink.html) locally to
interact with all 24 themes.
```

---

## Change 5 — Nothing else

All existing sections (Status, The system at a glance, Typography, Build flow, Files, Naming convention, For downstream ports, Caveats, Provenance) are left verbatim. No reordering, no rewrites.

---

## File inventory

| File                                           | Action                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `README.md`                                    | Edit: fix tagline, replace heading, insert grid block, insert preview section |
| `assets/screenshots/kitchen-sink-midnight.png` | New: generated by headless Chromium                                           |
| `assets/screenshots/kitchen-sink-twilight.png` | New: generated by headless Chromium                                           |
| `assets/screenshots/kitchen-sink-dawn.png`     | New: generated by headless Chromium                                           |
| `assets/screenshots/kitchen-sink-noon.png`     | New: generated by headless Chromium                                           |
| `.gitignore`                                   | Already updated: `.superpowers/` added                                        |

---

## Out of scope

- Palette swatch table (not selected)
- Accent-shade table with color chips (not selected)
- Syntax token color visual (not selected)
- Any changes to preview HTML files, tokens, or build scripts
- Table of contents
