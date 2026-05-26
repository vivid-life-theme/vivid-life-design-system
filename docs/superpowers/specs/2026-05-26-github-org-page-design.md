# GitHub Org Page — Design Spec

**Date:** 2026-05-26
**Scope:** github.com/vivid-life-theme org profile README

---

## Goal

Create an org-level profile README that makes a strong first visual impression for visitors to the `vivid-life-theme` GitHub organization. The primary surface is the `.github` repository's `profile/README.md`, which GitHub renders as the org's landing page.

## Audience

Developers and power users who may want to:

- Use the design system in their own projects (downstream port authors)
- Install an existing port (VS Code, GTK, terminal, etc.)
- Contribute to or follow the project

## Style Direction

**Visual showcase** — let the colors do the talking. Lead with the accent grid and all-four-flavor screenshots. The system's breadth (24 themes, WCAG AA, cross-platform) is communicated visually first, with supporting text kept minimal.

---

## Page Structure

### 1. Hero (centered)

- **Logo:** `<picture>` element switching between `assets/wordmark-dark.svg` (dark mode) and `assets/wordmark.svg` (light mode), rendered at ~200px wide
- **Title:** omit — the wordmark SVG already contains "Vivid Life Theme" as text; a separate `<h1>` would duplicate it
- **Tagline:** `A multi-flavor color scheme system · 4 flavors × 6 variants = 24 themes · WCAG AA verified`
- **Badges (shields.io):**
  - WCAG AA ✓ (green)
  - License: MIT (blue)
  - npm version for `@vivid-life-theme/design-system` (purple)
  - No dependencies (gray)

### 2. Accent Grid

Full-width image: `assets/accent-grid.svg` (already in repo, hosted via raw GitHub URL).
Shows all 6 variant hues in one bar — the strongest single visual for the system.

### 3. Flavor Screenshots

Four screenshots in a row using an HTML table for alignment:

- `assets/screenshots/kitchen-sink-midnight.png` — caption: Midnight
- `assets/screenshots/kitchen-sink-twilight.png` — caption: Twilight
- `assets/screenshots/kitchen-sink-dawn.png` — caption: Dawn
- `assets/screenshots/kitchen-sink-noon.png` — caption: Noon

All images hosted via `raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/`.

### 4. Foundation (live)

A highlighted card-style block (using an HTML table or blockquote for visual weight):

- Repo: `vivid-life-design-system` with a 🟢 emoji live indicator (emoji works in GitHub Markdown)
- Description: Token source of truth · CSS custom properties · ES module · No dependencies
- npm install snippet in a fenced code block

### 5. Port Sections (coming soon)

Three labeled sections, each rendered as a Markdown table (GitHub strips inline `style=` attributes, so CSS-based card styling is not available). Each section heading includes `_(coming soon)_` to set expectations.

**IDE ports**
| Repo | Description |
|---|---|
| `vivid-life-vscode` | VS Code color theme |
| `vivid-life-neovim` | Neovim color scheme |

**Desktop ports**
| Repo | Description |
|---|---|
| `vivid-life-gtk` | GTK / XFCE theme for Xubuntu |
| `vivid-life-windows` | Windows 11 accent theme |

**Terminal ports**
| Repo | Description |
|---|---|
| `vivid-life-windows-terminal` | Windows Terminal color scheme |
| `vivid-life-xfce-terminal` | Xfce Terminal color scheme |
| `vivid-life-fish` | Fish shell color scheme |
| `vivid-life-starship` | Starship prompt preset |

### 6. Footer

Centered line: `Building a port? Read the [handoff guide →](https://github.com/vivid-life-theme/vivid-life-design-system/blob/main/handoff/README.md)`

---

## Technical Notes

### Repository

- Create a new **public** repository named `.github` under the `vivid-life-theme` org
- File: `profile/README.md`
- GitHub automatically renders this as the org's profile page

### Image Hosting

All images reference the existing `vivid-life-design-system` repo via raw GitHub URLs:

```
https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/accent-grid.svg
https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/screenshots/kitchen-sink-midnight.png
```

No new image assets need to be created — the repo already has everything needed.

### Markdown Constraints

GitHub README Markdown:

- Use `<p align="center">` for centered content (GitHub strips most CSS)
- Use `<picture>` + `<source media="(prefers-color-scheme: dark)">` for dark/light mode image switching (already used in `vivid-life-design-system`'s own README)
- HTML tables work and render cleanly for multi-column layouts
- Inline `style=` attributes are stripped by GitHub's sanitizer — layout must use table structure, not CSS grid

### Port Cards

Since GitHub strips inline styles, the "coming soon" port cards will be rendered as a Markdown table with a note like `_(coming soon)_` rather than a visually faded card. The table structure communicates the same information cleanly.

---

## Out of Scope

- Org avatar / bio — separate manual step in GitHub org settings (upload `assets/icon-256.png`, write a one-line bio)
- Pinned repos — manual step in GitHub org settings after the `.github` repo is created
- Social preview images — deferred; requires generating 1200×630 images per repo
- Any changes to the `vivid-life-design-system` repo itself

---

## Success Criteria

- Visiting `github.com/vivid-life-theme` shows the profile README instead of a bare repo list
- Hero renders correctly in both dark and light GitHub themes
- Accent grid and all four flavor screenshots are visible without scrolling on a 1280px-wide viewport
- All 9 planned repos (1 live + 8 coming soon) are listed with accurate names and descriptions
- The handoff guide link resolves correctly
