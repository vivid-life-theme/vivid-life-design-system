# README Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the README.md visually compelling for GitHub visitors by fixing a tagline bug, replacing the plain heading with a centered wordmark + badge header, inserting a flavor canvas strip + 24-theme accent grid, and adding a 2×2 screenshot gallery of the kitchen-sink page across all four flavors.

**Architecture:** All changes are additive HTML/Markdown edits to `README.md` plus four new PNG screenshots committed to `assets/screenshots/`. Screenshots are captured using headless Chromium with `--disable-javascript` so the static `<body class="vl-{flavor} variant-{variant}">` is preserved. The accent grid uses `bgcolor` on `<td>` elements (not `style=`) because GitHub's HTML sanitizer strips `<style>` blocks but preserves `bgcolor`.

**Tech Stack:** Bash, headless Chromium (`chromium-browser --headless`), sed (temp file creation), Node.js `npm run check` for post-change validation.

---

## File Inventory

| File                                           | Action                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `README.md`                                    | Edit: fix tagline, replace heading, insert grid block, insert preview section |
| `assets/screenshots/kitchen-sink-midnight.png` | New: headless Chromium capture                                                |
| `assets/screenshots/kitchen-sink-twilight.png` | New: headless Chromium capture                                                |
| `assets/screenshots/kitchen-sink-dawn.png`     | New: headless Chromium capture                                                |
| `assets/screenshots/kitchen-sink-noon.png`     | New: headless Chromium capture                                                |

---

### Task 1: Fix truncated tagline bug

**Files:**

- Modify: `README.md:3`

- [ ] **Step 1: Edit the tagline**

  In `README.md` line 3, change:

  ```
  > A multi-flavor color-scheme syste
  ```

  to:

  ```
  > A multi-flavor color-scheme system
  ```

- [ ] **Step 2: Verify the fix**

  Run:

  ```bash
  grep "color-scheme" README.md
  ```

  Expected output:

  ```
  > A multi-flavor color-scheme system
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add README.md
  git commit -m "fix: correct truncated tagline in README"
  ```

---

### Task 2: Replace plain heading with wordmark + badge header

**Files:**

- Modify: `README.md:1`

- [ ] **Step 1: Replace the heading**

  In `README.md`, replace line 1:

  ```
  # Vivid Life Theme
  ```

  with the following HTML block (note: no blank line between the two `<p>` elements, and a blank line after the block before the tagline):

  ```html
  <p align="center">
    <img src="assets/wordmark.svg" height="48" alt="Vivid Life Theme" />
  </p>
  <p align="center">
    <img
      src="https://img.shields.io/badge/license-MIT-blue"
      alt="License: MIT"
    />
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

- [ ] **Step 2: Verify the replacement**

  Run:

  ```bash
  head -12 README.md
  ```

  Expected: first line is `<p align="center">` and the old `# Vivid Life Theme` heading is gone.

- [ ] **Step 3: Commit**

  ```bash
  git add README.md
  git commit -m "docs: replace plain heading with wordmark + badge header"
  ```

---

### Task 3: Insert flavor canvas strip + 24-theme accent grid

**Files:**

- Modify: `README.md` — insert after the "Every port is its own GitHub repo…" paragraph (before the `---` divider that opens the Status section)

- [ ] **Step 1: Locate exact insertion point**

  Run:

  ```bash
  grep -n "Every port is its own" README.md
  ```

  Expected: a line around line 22–26 ending with `re-reads.`

  The new block goes AFTER `re-reads.` and BEFORE the `---` divider.

- [ ] **Step 2: Insert the flavor strip and accent grid**

  Insert the following HTML block between the `re-reads.` paragraph and the `---` divider:

  ```html
  <br />

  <table align="center" cellspacing="0" cellpadding="0">
    <tr>
      <td width="120" align="center" bgcolor="#171717">
        <font color="#d4d4d4"><b>Midnight</b></font>
      </td>
      <td width="120" align="center" bgcolor="#404040">
        <font color="#d4d4d4"><b>Twilight</b></font>
      </td>
      <td width="120" align="center" bgcolor="#d4d4d4">
        <font color="#404040"><b>Dawn</b></font>
      </td>
      <td width="120" align="center" bgcolor="#f5f5f5">
        <font color="#404040"><b>Noon</b></font>
      </td>
    </tr>
  </table>

  <table align="center" cellspacing="2" cellpadding="0">
    <tr>
      <td width="120" height="24" bgcolor="#ef4444"></td>
      <td width="120" height="24" bgcolor="#fca5a5"></td>
      <td width="120" height="24" bgcolor="#7f1d1d"></td>
      <td width="120" height="24" bgcolor="#b91c1c"></td>
    </tr>
    <tr>
      <td width="120" height="24" bgcolor="#f97316"></td>
      <td width="120" height="24" bgcolor="#fdba74"></td>
      <td width="120" height="24" bgcolor="#7c2d12"></td>
      <td width="120" height="24" bgcolor="#c2410c"></td>
    </tr>
    <tr>
      <td width="120" height="24" bgcolor="#eab308"></td>
      <td width="120" height="24" bgcolor="#eab308"></td>
      <td width="120" height="24" bgcolor="#713f12"></td>
      <td width="120" height="24" bgcolor="#713f12"></td>
    </tr>
    <tr>
      <td width="120" height="24" bgcolor="#84cc16"></td>
      <td width="120" height="24" bgcolor="#84cc16"></td>
      <td width="120" height="24" bgcolor="#365314"></td>
      <td width="120" height="24" bgcolor="#365314"></td>
    </tr>
    <tr>
      <td width="120" height="24" bgcolor="#93c5fd"></td>
      <td width="120" height="24" bgcolor="#93c5fd"></td>
      <td width="120" height="24" bgcolor="#1d4ed8"></td>
      <td width="120" height="24" bgcolor="#1d4ed8"></td>
    </tr>
    <tr>
      <td width="120" height="24" bgcolor="#d8b4fe"></td>
      <td width="120" height="24" bgcolor="#d8b4fe"></td>
      <td width="120" height="24" bgcolor="#7e22ce"></td>
      <td width="120" height="24" bgcolor="#7e22ce"></td>
    </tr>
  </table>

  <p align="center">
    <sub>4 flavors × 6 variants = 24 themes · all WCAG AA</sub>
  </p>
  ```

  The rows of the accent grid are in variant order: Red, Orange, Yellow, Green, Blue, Purple.
  The columns are in flavor order: Midnight, Twilight, Dawn, Noon.

- [ ] **Step 3: Verify insertion**

  Run:

  ```bash
  grep -n "24 themes" README.md
  ```

  Expected: a line containing `24 themes · all WCAG AA`.

- [ ] **Step 4: Commit**

  ```bash
  git add README.md
  git commit -m "docs: add flavor canvas strip and 24-theme accent grid to README"
  ```

---

### Task 4: Capture four kitchen-sink screenshots

**Files:**

- New: `assets/screenshots/kitchen-sink-midnight.png`
- New: `assets/screenshots/kitchen-sink-twilight.png`
- New: `assets/screenshots/kitchen-sink-dawn.png`
- New: `assets/screenshots/kitchen-sink-noon.png`

The kitchen-sink page has `<body class="vl-midnight variant-purple">` as its static default. JS overrides this on load via localStorage. Using `--disable-javascript` preserves the static class, so we capture each flavor by creating a temp copy of the page with the body class replaced.

- [ ] **Step 1: Create the screenshots directory**

  ```bash
  mkdir -p assets/screenshots
  ```

- [ ] **Step 2: Capture the Midnight · Purple screenshot**

  ```bash
  sed 's/class="vl-midnight variant-purple"/class="vl-midnight variant-purple"/' preview/01-kitchen-sink.html > preview/_ks-midnight.html
  chromium-browser --headless --disable-javascript --screenshot="$(pwd)/assets/screenshots/kitchen-sink-midnight.png" --window-size=1280,800 "file://$(pwd)/preview/_ks-midnight.html"
  rm preview/_ks-midnight.html
  ```

  Expected: `assets/screenshots/kitchen-sink-midnight.png` exists and is non-empty.

- [ ] **Step 3: Capture the Twilight · Yellow screenshot**

  ```bash
  sed 's/class="vl-midnight variant-purple"/class="vl-twilight variant-yellow"/' preview/01-kitchen-sink.html > preview/_ks-twilight.html
  chromium-browser --headless --disable-javascript --screenshot="$(pwd)/assets/screenshots/kitchen-sink-twilight.png" --window-size=1280,800 "file://$(pwd)/preview/_ks-twilight.html"
  rm preview/_ks-twilight.html
  ```

  Expected: `assets/screenshots/kitchen-sink-twilight.png` exists and is non-empty.

- [ ] **Step 4: Capture the Dawn · Blue screenshot**

  ```bash
  sed 's/class="vl-midnight variant-purple"/class="vl-dawn variant-blue"/' preview/01-kitchen-sink.html > preview/_ks-dawn.html
  chromium-browser --headless --disable-javascript --screenshot="$(pwd)/assets/screenshots/kitchen-sink-dawn.png" --window-size=1280,800 "file://$(pwd)/preview/_ks-dawn.html"
  rm preview/_ks-dawn.html
  ```

  Expected: `assets/screenshots/kitchen-sink-dawn.png` exists and is non-empty.

- [ ] **Step 5: Capture the Noon · Red screenshot**

  ```bash
  sed 's/class="vl-midnight variant-purple"/class="vl-noon variant-red"/' preview/01-kitchen-sink.html > preview/_ks-noon.html
  chromium-browser --headless --disable-javascript --screenshot="$(pwd)/assets/screenshots/kitchen-sink-noon.png" --window-size=1280,800 "file://$(pwd)/preview/_ks-noon.html"
  rm preview/_ks-noon.html
  ```

  Expected: `assets/screenshots/kitchen-sink-noon.png` exists and is non-empty.

- [ ] **Step 6: Verify all four screenshots**

  ```bash
  ls -lh assets/screenshots/
  ```

  Expected: four `.png` files, each at least 50 KB.

- [ ] **Step 7: Commit screenshots**

  ```bash
  git add assets/screenshots/
  git commit -m "docs: add kitchen-sink screenshots for all four flavors"
  ```

---

### Task 5: Insert Preview section with 2×2 screenshot gallery

**Files:**

- Modify: `README.md` — insert new `## Preview` section between the Status table and `## The system at a glance` heading

- [ ] **Step 1: Locate the insertion point**

  Run:

  ```bash
  grep -n "The system at a glance" README.md
  ```

  Expected: a line number (around 49–55 after earlier edits). The Preview section goes in the `---` gap between the Status table and this heading.

- [ ] **Step 2: Insert the Preview section**

  Insert the following block immediately before `## The system at a glance`:

  ```markdown
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
  > interact with all 24 themes.

  ---
  ```

  (Preserve the existing `---` that follows, or replace it with the one above — the result should be one `---` between Preview and "The system at a glance".)

- [ ] **Step 3: Verify the gallery is present**

  Run:

  ```bash
  grep -n "kitchen-sink-midnight.png" README.md
  ```

  Expected: a line referencing `assets/screenshots/kitchen-sink-midnight.png`.

- [ ] **Step 4: Commit**

  ```bash
  git add README.md
  git commit -m "docs: add 2×2 screenshot preview gallery to README"
  ```

---

### Task 6: Final validation

**Files:** none (read-only check)

- [ ] **Step 1: Run the project check**

  ```bash
  npm run check
  ```

  Expected: exits 0. If it exits non-zero, inspect the error — the README edits should not affect token outputs or CSS, so any failure is unrelated to these changes.

- [ ] **Step 2: Confirm README structure**

  Run:

  ```bash
  grep -n "^##\|^<p align" README.md | head -20
  ```

  Expected output should show (in order):
  1. `<p align="center">` (wordmark)
  2. `<p align="center">` (badges)
  3. `## Status (May 2026)`
  4. `## Preview`
  5. `## The system at a glance`
     … and then the remaining sections untouched.

- [ ] **Step 3: Spot-check that no existing sections were removed**

  Run:

  ```bash
  grep -c "^## " README.md
  ```

  Expected: `11` (Status, Preview [new], The system at a glance, Typography, Build flow, Files, Naming convention, For downstream ports, Iconography, Caveats, Provenance).
