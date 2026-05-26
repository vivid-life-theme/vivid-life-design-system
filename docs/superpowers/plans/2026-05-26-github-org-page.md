# GitHub Org Profile README — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `profile/README.md` in a new `vivid-life-theme/.github` repo so that visiting github.com/vivid-life-theme shows a visual showcase landing page instead of a bare repo list.

**Architecture:** Single Markdown file (`profile/README.md`) in a new public `.github` repo under the org. All images reference existing assets from `vivid-life-design-system` via raw GitHub URLs — no new assets needed. The file is written locally, then pushed via `gh`.

**Tech Stack:** GitHub Markdown, shields.io badges, `gh` CLI

---

## File Map

| Action      | Path                                         |
| ----------- | -------------------------------------------- |
| Create repo | `vivid-life-theme/.github` (new GitHub repo) |
| Create      | `profile/README.md` in that repo             |

---

### Task 1: Create and clone the `.github` org repo

**Files:**

- Create: `vivid-life-theme/.github` repo on GitHub (via `gh`)
- Local clone target: `~/vivid-life-github-profile/`

- [ ] **Step 1: Create the public repo under the org**

```bash
gh repo create vivid-life-theme/.github \
  --public \
  --description "Vivid Life Theme GitHub organization profile"
```

Expected output: a confirmation line with the repo URL, e.g. `https://github.com/vivid-life-theme/.github`

- [ ] **Step 2: Clone it locally**

```bash
gh repo clone vivid-life-theme/.github ~/vivid-life-github-profile
```

Expected: clones into `~/vivid-life-github-profile/`

- [ ] **Step 3: Create the profile directory**

```bash
mkdir -p ~/vivid-life-github-profile/profile
```

---

### Task 2: Write `profile/README.md`

**Files:**

- Create: `~/vivid-life-github-profile/profile/README.md`

This is the complete content. Copy it exactly.

- [ ] **Step 1: Write the file**

Create `~/vivid-life-github-profile/profile/README.md` with this exact content:

````markdown
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/wordmark-dark.svg" />
    <img src="https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/wordmark.svg" height="48" alt="Vivid Life Theme" />
  </picture>
</p>

<p align="center">
  A multi-flavor color scheme system &nbsp;·&nbsp; 4 flavors × 6 variants = 24 themes &nbsp;·&nbsp; WCAG AA verified
</p>

<p align="center">
  <img src="https://img.shields.io/badge/WCAG-AA%20%E2%9C%93-22c55e" alt="WCAG AA" />
  <img src="https://img.shields.io/badge/license-MIT-3b82f6" alt="License: MIT" />
  <img src="https://img.shields.io/npm/v/%40vivid-life-theme%2Fdesign-system?color=a855f7&label=npm" alt="npm" />
  <img src="https://img.shields.io/badge/dependencies-none-737373" alt="No dependencies" />
</p>

<br />

<p align="center">
  <img
    src="https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/accent-grid.svg"
    alt="4 flavors × 6 variants = 24 themes · all WCAG AA"
  />
</p>

<table align="center">
  <tr>
    <td align="center">
      <img
        src="https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/screenshots/kitchen-sink-midnight.png"
        width="180"
        alt="Midnight"
      /><br /><sub>Midnight</sub>
    </td>
    <td align="center">
      <img
        src="https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/screenshots/kitchen-sink-twilight.png"
        width="180"
        alt="Twilight"
      /><br /><sub>Twilight</sub>
    </td>
    <td align="center">
      <img
        src="https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/screenshots/kitchen-sink-dawn.png"
        width="180"
        alt="Dawn"
      /><br /><sub>Dawn</sub>
    </td>
    <td align="center">
      <img
        src="https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/screenshots/kitchen-sink-noon.png"
        width="180"
        alt="Noon"
      /><br /><sub>Noon</sub>
    </td>
  </tr>
</table>

---

### 🟢 Foundation

**[vivid-life-design-system](https://github.com/vivid-life-theme/vivid-life-design-system)** — Token source of truth · CSS custom properties · ES module · No dependencies

```bash
npm install @vivid-life-theme/design-system
```

---

### IDE ports _(coming soon)_

| Repo                | Description         |
| ------------------- | ------------------- |
| `vivid-life-vscode` | VS Code color theme |
| `vivid-life-neovim` | Neovim color scheme |

### Desktop ports _(coming soon)_

| Repo                 | Description                  |
| -------------------- | ---------------------------- |
| `vivid-life-gtk`     | GTK / XFCE theme for Xubuntu |
| `vivid-life-windows` | Windows 11 accent theme      |

### Terminal ports _(coming soon)_

| Repo                          | Description                   |
| ----------------------------- | ----------------------------- |
| `vivid-life-windows-terminal` | Windows Terminal color scheme |
| `vivid-life-xfce-terminal`    | Xfce Terminal color scheme    |
| `vivid-life-fish`             | Fish shell color scheme       |
| `vivid-life-starship`         | Starship prompt preset        |

---

<p align="center">
  Building a port? Read the <a href="https://github.com/vivid-life-theme/vivid-life-design-system/blob/main/handoff/README.md">handoff guide →</a>
</p>
````

- [ ] **Step 2: Verify the key image URLs actually resolve (spot-check)**

```bash
curl -sI "https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/accent-grid.svg" | head -1
curl -sI "https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/screenshots/kitchen-sink-midnight.png" | head -1
curl -sI "https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/assets/wordmark-dark.svg" | head -1
```

Expected for each: `HTTP/2 200`

If any return 404, the asset path is wrong — double-check against `ls assets/` in the design-system repo.

---

### Task 3: Commit and push

**Files:**

- Modify: `~/vivid-life-github-profile/profile/README.md` (new file committed)

- [ ] **Step 1: Stage and commit**

```bash
cd ~/vivid-life-github-profile
git add profile/README.md
git commit -m "✨ feat: add org profile README"
```

Expected: `1 file changed, N insertions(+)`

- [ ] **Step 2: Push (first push — set upstream explicitly)**

```bash
git push -u origin main
```

Expected: push succeeds, output includes `Branch 'main' set up to track remote branch 'main' from 'origin'.`

> Note: the repo was just created empty, so there is no remote `main` branch yet. The `-u` flag creates it and sets tracking in one step.

---

### Task 4: Verify the org page

- [ ] **Step 1: Open the org page in a browser**

Navigate to: `https://github.com/vivid-life-theme`

Expected: the profile README renders — wordmark at top, accent grid bar, four flavor screenshots in a row, foundation card with npm snippet, three port sections, footer link.

- [ ] **Step 2: Check dark/light mode switching**

Toggle your OS or browser between dark and light mode.

Expected:

- Dark mode → `wordmark-dark.svg` (light text on transparent background)
- Light mode → `wordmark.svg` (dark text on transparent background)

- [ ] **Step 3: Check the handoff guide link**

Click `handoff guide →` in the footer.

Expected: navigates to `vivid-life-design-system/blob/main/handoff/README.md` without a 404.

---

## Out-of-scope manual steps (do these in GitHub org settings after the README is live)

- **Org avatar:** Upload `assets/icon-256.png` from `vivid-life-design-system` as the org profile picture
- **Org bio:** Write a one-line bio, e.g. `A 4-flavor × 6-variant color scheme system. 24 themes. WCAG AA.`
- **Pinned repos:** Pin `vivid-life-design-system` (and any other repos that exist) from the org's repository tab
