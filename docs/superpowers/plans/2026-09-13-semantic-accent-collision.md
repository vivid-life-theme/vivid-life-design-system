# Semantic / Accent Collision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop five flavour × variant combinations from having a `danger`/`warning`/`success` token identical to their accent, and make that impossible to reintroduce.

**Architecture:** A pure function `semanticAccentCollisions(tokens)` compares `semantic_shade[f][role]` against `accent_shade[f][semantic_hues[role]]` — integers, no colour math — and is wired into `build-tokens.mjs`'s existing `check()`. Five `accent_shade` entries move from 900 to 800. Everything else is regeneration, changelog, and one downstream pin bump.

**Tech Stack:** Node ≥18, `tools/build-tokens.mjs` (JSON5 → `tokens.json` / `dist/tokens.js`), `tools/build-css.mjs` (→ `colors_and_type.css`), the repo's own `selfTest()` harness (`npm run test`), `npm run check` for drift.

**Spec:** `docs/superpowers/specs/2026-09-13-semantic-accent-collision-design.md`

## Global Constraints

- The invariant covers exactly `danger`, `warning`, `success`. `info` is excluded, and the exclusion carries its reason in the source.
- The hue per role comes from `tokens.semantic_hues` (already `{ success: "green", warning: "yellow", danger: "red", info: "blue" }`), never re-derived from colour values.
- No semantic token value changes. No `midnight-blue` change. No dawn `orange` change.
- Every generated artefact (`tokens.json`, `dist/tokens.js`, `colors_and_type.css`) is committed with the source change that produced it; `npm run check` must be clean at every commit.
- A gate is demonstrated failing before it is trusted — on synthetic data in `selfTest()`, and on the real tokens by temporarily reverting one value.
- Work happens on branch `semantic-accent-collision` in `vivid-life-design-system`, which already holds the spec commit. Do not commit to `main`.
- The release itself (0.9.0 → 0.10.0) is **not** part of this plan: it uses the repo's `release` skill, which only the user invokes. Task 4 is gated on that publish having happened.
- Commit messages: Conventional Commits with gitmoji, and end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Ba2tRPi2n1RjTYuz1SzCyk
  ```

---

## Task 1: The collision function, tested on synthetic data first

**Files:**

- Modify: `tools/build-tokens.mjs` — new export after `resolveAccent` (ends line 208); two new `selfTest()` cases after line 676

**Interfaces:**

- Produces: `export function semanticAccentCollisions(tokens)` → `Array<{ flavor, role, hue, shade }>`. Empty array means no collision. Task 2 wires this into `check()`.

- [ ] **Step 1: Add the two failing self-test cases**

In `tools/build-tokens.mjs`, after the line `[() => readableOn("#f5f5f5"), "#171717", "readable on noon"],` (line 676), add:

```js

    // semanticAccentCollisions — a role whose semantic_shade equals the
    // accent_shade for its own hue is a collision; info is excluded by rule.
    [
      () =>
        semanticAccentCollisions({
          semantic_hues: { success: "green", warning: "yellow", danger: "red", info: "blue" },
          semantic_shade: { x: { success: 900, warning: 900, danger: 900, info: 300 } },
          accent_shade: { x: { red: 900, yellow: 700, green: 700, blue: 300 } },
        }).map((c) => `${c.flavor}.${c.role}`).join(","),
      "x.danger",
      "collision: danger matches accent, info excluded even when it matches",
    ],
    [
      () =>
        semanticAccentCollisions({
          semantic_hues: { success: "green", warning: "yellow", danger: "red", info: "blue" },
          semantic_shade: { x: { success: 900, warning: 900, danger: 900, info: 900 } },
          accent_shade: { x: { red: 800, yellow: 800, green: 800, blue: 900 } },
        }).length,
      0,
      "no collision when every gated role differs from its accent",
    ],
```

The first case is deliberate about `info`: it collides on blue.300 and must **not** be reported. That is the exclusion the spec argues for, encoded so it cannot silently drop out.

- [ ] **Step 2: Run the self-test to verify it fails**

```bash
cd ~/Git-Repos/vivid-life-theme/vivid-life-design-system && npm run test
```

Expected: the run aborts with `ReferenceError: semanticAccentCollisions is not defined` (the function does not exist yet). If instead you see the two cases print `✗`, the harness caught the exception per case — either way, both new cases are red.

- [ ] **Step 3: Add the function**

In `tools/build-tokens.mjs`, directly after the closing `}` of `resolveAccent` (line 208), add:

```js
/**
 * Roles whose semantic colour is the same palette shade as the accent for
 * that role's own hue. Pure integer comparison against the two shade
 * rulesets — no colour math — so it is exact, not approximate.
 *
 * `info` is deliberately not gated. Sharing the primary blue is the
 * convention across most design systems and makes nothing unsafe: an info
 * banner that matches the primary is redundant, whereas a destructive
 * button that matches it is misleading. Both fixes for the one existing
 * info collision (midnight-blue) carry a real aesthetic cost, so the rule
 * is stated for the three roles that must read differently from the
 * primary. See docs/superpowers/specs/2026-09-13-semantic-accent-collision-design.md.
 */
const COLLISION_GATED_ROLES = ["danger", "warning", "success"];

export function semanticAccentCollisions(tokens) {
  const out = [];
  for (const [flavor, roles] of Object.entries(tokens.semantic_shade ?? {})) {
    for (const role of COLLISION_GATED_ROLES) {
      const hue = tokens.semantic_hues?.[role];
      const semShade = roles?.[role];
      const accShade = tokens.accent_shade?.[flavor]?.[hue];
      if (hue == null || semShade == null || accShade == null) continue;
      if (String(semShade) === String(accShade)) {
        out.push({ flavor, role, hue, shade: String(semShade) });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the self-test to verify it passes**

```bash
npm run test
```

Expected: both new lines print `✓`, and the summary count rises by two with `0` failures.

- [ ] **Step 5: Commit**

```bash
git add tools/build-tokens.mjs
git commit -m "✅ test: add semanticAccentCollisions and prove it on synthetic data

A pure comparison of semantic_shade against accent_shade for each role's
hue, using the existing semantic_hues mapping rather than re-deriving hue
from colour. info is excluded by rule, and the first self-test case
collides on info specifically so the exclusion cannot silently drop out.

Not yet wired into check(); that lands with the value fix so no commit
leaves the build red.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ba2tRPi2n1RjTYuz1SzCyk"
```

---

## Task 2: Wire the gate, watch it fail on real tokens, fix the five values

**Files:**

- Modify: `tools/build-tokens.mjs` — `check()` at line 391, insert before `if (warns.length) return warns;` (line 445)
- Modify: `tokens.json5` — rule comment lines 125–131; `accent_shade.dawn` lines 152–159; `accent_shade.noon` lines 160–166
- Regenerate + commit: `tokens.json`, `dist/tokens.js`, `colors_and_type.css`

**Interfaces:**

- Consumes: `semanticAccentCollisions(tokens)` from Task 1.
- Produces: `accent_shade.dawn.{red,yellow,green} = 800`, `accent_shade.noon.{yellow,green} = 800`. Task 4 depends on these exact values being what 0.10.0 ships.

- [ ] **Step 1: Wire the gate into `check()`**

In `tools/build-tokens.mjs`, inside `check(tokens)`, immediately before the line `if (warns.length) return warns;` (line 445), add:

```js
// No danger/warning/success token may be the same shade as the accent for
// its own hue, or the states the two exist to distinguish are not
// distinguishable. Integer comparison; see semanticAccentCollisions.
for (const c of semanticAccentCollisions(tokens)) {
  warns.push(
    `✗ ${c.flavor}.semantic.${c.role} is ${c.hue}.${c.shade}, the same shade as accent_shade.${c.flavor}.${c.hue} — the two states are indistinguishable`,
  );
}
```

- [ ] **Step 2: Run the build and watch the gate fail on the current tokens**

```bash
npm run build
```

Expected: exit 1, with **exactly five** `✗` lines under `Contrast warnings:`:

```
  ✗ dawn.semantic.danger is red.900, the same shade as accent_shade.dawn.red — the two states are indistinguishable
  ✗ dawn.semantic.warning is yellow.900, the same shade as accent_shade.dawn.yellow — ...
  ✗ dawn.semantic.success is green.900, the same shade as accent_shade.dawn.green — ...
  ✗ noon.semantic.warning is yellow.900, the same shade as accent_shade.noon.yellow — ...
  ✗ noon.semantic.success is green.900, the same shade as accent_shade.noon.green — ...
```

Not six. `midnight-blue` (info) must be absent. If it appears, `COLLISION_GATED_ROLES` is wrong. If any of the five is missing, stop — the gate has a gap.

This is the gate observed failing on real data, before the fix. Do not skip it.

- [ ] **Step 3: Update the accent-shade rule comment**

In `tokens.json5`, replace lines 125–131:

```json5
  // Per the rule: "Pick the shade in the opposite half of the
  // lightness scale from the bg, one step in from the extreme
  // (300/700) by default. Step further (100/900) only when the hue's
  // intrinsic luminance is too close to the background."
  //
  // All 24 combinations clear WCAG 2.1 AA (≥ 4.5 : 1) against their
  // flavor background.
```

with:

```json5
  // Per the rule: "Pick the shade in the opposite half of the
  // lightness scale from the bg, one step in from the extreme
  // (300/700) by default. Step further only when the hue's intrinsic
  // luminance is too close to the background — and step by the
  // SMALLEST amount that clears: 800 before 900 on the dark side."
  //
  // 800 was added to the palette after this rule was first written, so
  // dawn's warm hues sat at 900 when 800 already cleared. That produced
  // a collision with semantic_shade (§ 3d), which also uses 900 on
  // dawn and noon: danger == accent on dawn-red, and so on. The rule
  // below the table makes that impossible to reintroduce.
  //
  // All 24 combinations clear WCAG 2.1 AA (≥ 4.5 : 1) against their
  // flavor background.
```

- [ ] **Step 4: Move the five values**

In `tokens.json5`, `accent_shade.dawn` (lines 152–159) becomes:

```json5
    dawn: {
      red: 800,
      orange: 900,
      yellow: 800,
      green: 800,
      blue: 700,
      purple: 700,
    },
```

and `accent_shade.noon` (lines 160–166) becomes:

```json5
    noon: {
      red: 700,
      orange: 700,
      yellow: 800,
      green: 800,
      blue: 700,
      purple: 700,
    },
```

`orange` stays at 900 on dawn: no semantic role is orange, so it does not collide, and moving it would change a sixth theme for no contrast reason.

- [ ] **Step 5: State the invariant beside the table**

In `tokens.json5`, directly after the closing `},` of the `accent_shade` block (line 166), add:

```json5

  // INVARIANT (gated in tools/build-tokens.mjs): for every flavor, the
  // shade of semantic_shade.<flavor>.{danger,warning,success} must differ
  // from accent_shade.<flavor>.<hue of that role>. Otherwise a destructive
  // button is the same colour as a suggested one, and error text inside a
  // selection vanishes at 1.00:1. info is exempt: sharing the primary blue
  // is conventional and makes nothing unsafe (midnight-blue does this).
```

- [ ] **Step 6: Rebuild and verify the gate now passes**

```bash
npm run build && npm run check
```

Expected: `npm run build` exits 0 with the existing `✓` lines and no `Contrast warnings:` block. `npm run check` reports `tokens.json`, `dist/tokens.js` and `colors_and_type.css` all in sync. `git status` shows those three plus `tokens.json5` modified.

- [ ] **Step 7: Confirm the five accents landed with the spec's numbers**

```bash
node -e '
const t=require("./tokens.json");
for(const [f,h] of [["dawn","red"],["dawn","yellow"],["dawn","green"],["noon","yellow"],["noon","green"]]){
  const s=t.accent_shade[f][h]; console.log(f, h, s, t.palette[h][s]);
}'
```

Expected, exactly:

```
dawn red 800 #991b1b
dawn yellow 800 #854d0e
dawn green 800 #3f6212
noon yellow 800 #854d0e
noon green 800 #3f6212
```

- [ ] **Step 8: Demonstrate the gate fails on a reverted value, then restore**

Steps 3–5 are still uncommitted here, so **do not** restore with `git checkout -- tokens.json5` — that reverts to the last commit and discards the fix along with the demonstration. Back the fixed file up and restore from the backup:

```bash
cp tokens.json5 /tmp/tokens.json5.fixed
sed -i 's/^      red: 800,$/      red: 900,/' tokens.json5
node tools/build-tokens.mjs; echo "exit: $?"
cp /tmp/tokens.json5.fixed tokens.json5
cmp tokens.json5 /tmp/tokens.json5.fixed && echo "restored byte-identical"
npm run build > /dev/null && npm run check
```

Expected: the `node tools/build-tokens.mjs` run prints one `✗ dawn.semantic.danger is red.900 ...` line and `exit: 1`. `cmp` prints `restored byte-identical`, and `npm run check` is clean again. If the reverted run exits 0, the gate is not wired and Step 1 was lost.

(An earlier revision of this step used `git checkout --` and would have wiped the fix; the implementer caught it. Recorded as Ruling 3 in the ledger.)

- [ ] **Step 9: Commit source and generated output together**

```bash
git add tokens.json5 tokens.json dist/tokens.js colors_and_type.css tools/build-tokens.mjs
git commit -m "🐛 fix: move five colliding accents from shade 900 to 800, and gate the invariant

On dawn-red, dawn-yellow, dawn-green, noon-yellow and noon-green the
danger/warning/success token was the same palette shade as the accent, so
a destructive button read like a suggested one and error text inside a
selection vanished at 1.00:1.

The accents move, not the semantics. Dropping the dawn semantics to 800
would put all three below 4.5:1 on bg_sunk (4.42 / 3.65 / 3.77) and fail
this repo's existing semantic-vs-surface gate outright. 800 accents clear
the accent-vs-bg rule with more headroom than 900 has now (5.61 / 4.62 /
4.77 / 6.28 / 6.49), and honour the shade rule better: 800 is the smallest
step that clears, and the rule's wording simply predated the shade.

check() now fails on any danger/warning/success role whose shade equals
its hue's accent shade. Observed failing with exactly five lines before
the values moved, passing after, and failing again on one reverted value.
info is excluded by rule, with the reason beside the exclusion; the
existing midnight-blue info == accent is accepted, not fixed.

dawn orange stays at 900: nothing semantic is orange.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ba2tRPi2n1RjTYuz1SzCyk"
```

---

## Task 3: Changelog

**Files:**

- Modify: `CHANGELOG.md` — under `## [Unreleased]` (line 11)

**Interfaces:**

- Consumes: the five values from Task 2.
- Produces: the release notes the `release` skill will carry into 0.10.0.

- [ ] **Step 1: Write the entry**

In `CHANGELOG.md`, replace the empty `## [Unreleased]` section (line 11 through the `---` that follows it) with:

```markdown
## [Unreleased]

Fixes five flavour × variant combinations on which a semantic token was the **same colour** as the accent, found by the Xfce port's phase-4 review ([vivid-life-xfce#3](https://github.com/vivid-life-theme/vivid-life-xfce/pull/3)) and measured here across all 24. Where it happened, the states the two tokens exist to distinguish were not distinguishable: a destructive button read exactly like a suggested one, and error text inside a selected row vanished at 1.00:1.

### Changed

- ⚠️ **Five accents move from shade 900 to 800** — `dawn-red` (`#7f1d1d` → `#991b1b`), `dawn-yellow` (`#713f12` → `#854d0e`), `dawn-green` (`#365314` → `#3f6212`), `noon-yellow` (`#713f12` → `#854d0e`), `noon-green` (`#365314` → `#3f6212`). Each still clears the accent-vs-bg rule, with more headroom than before (5.61 / 4.62 / 4.77 / 6.28 / 6.49 : 1). The accents moved rather than the semantics because dropping dawn's semantics to 800 would fail the existing semantic-vs-surface gate on `bg_sunk`. Downstream ports regenerate to pick this up; these five themes get a slightly lighter accent and nothing else changes value.
- **The accent-shade rule** (`tokens.json5` § 3) now says to step by the _smallest_ amount that clears — 800 before 900. The 800 rung was added after the rule was written, which is how dawn's warm hues ended up at 900 when 800 already cleared.

### Added

- **Semantic/accent collision gate** — `semanticAccentCollisions(tokens)` in `tools/build-tokens.mjs`, wired into `check()`. For every flavour, `danger`, `warning` and `success` must not share a shade with the accent for their own hue. Pure integer comparison against `semantic_shade` and `accent_shade` via the existing `semantic_hues` mapping. `info` is deliberately exempt: sharing the primary blue is conventional and makes nothing unsafe, so the one remaining match (`midnight-blue`) is accepted rather than moved. Two self-test cases, one of which collides on `info` specifically so the exemption cannot silently drop out.

---
```

- [ ] **Step 2: Verify the entry references the exact hex values shipped**

```bash
grep -oE '#(991b1b|854d0e|3f6212)' CHANGELOG.md | sort | uniq -c
grep -c '#991b1b' tokens.json
```

Expected: the first prints three lines in sorted order — `2 #3f6212`, `2 #854d0e`, `1 #991b1b` (green and yellow each appear for both dawn and noon; red only for dawn). The second prints at least `1`. A hex in the changelog that is not in `tokens.json` is a typo.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "📝 docs: changelog for the semantic/accent collision fix

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ba2tRPi2n1RjTYuz1SzCyk"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin semantic-accent-collision
gh pr create --base main --title "🐛 fix: five semantic tokens were identical to their accent" --body-file - <<'BODY'
Implements `docs/superpowers/specs/2026-09-13-semantic-accent-collision-design.md`.

On `dawn-red`, `dawn-yellow`, `dawn-green`, `noon-yellow` and `noon-green` the `danger`/`warning`/`success` token was the same palette shade as the accent. A destructive button read like a suggested one; error text inside a selection vanished at 1.00:1.

**The accents move (900 → 800), not the semantics.** Moving dawn's semantics to 800 would fail this repo's existing semantic-vs-surface gate on `bg_sunk` (4.42 / 3.65 / 3.77). The 800 accents clear the accent-vs-bg rule with more headroom than 900 has now, and honour the shade rule better — 800 is the smallest step that clears, and the rule's wording predated the shade.

**A gate now makes this unrepeatable.** `semanticAccentCollisions()` is wired into `check()`; observed failing with exactly five lines before the fix, passing after, failing again on one reverted value. `info` is exempt by rule with the reason in source — `midnight-blue`'s info == accent is accepted, not moved.

`npm run test`, `npm run build`, `npm run check` all clean. Release as **0.10.0** via the `release` skill after merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Ba2tRPi2n1RjTYuz1SzCyk
BODY
```

**STOP HERE.** Merging the PR and cutting 0.10.0 are the user's actions — the `release` skill is user-invoked only. Task 4 begins once `npm view @vivid-life-theme/design-system version` prints `0.10.0`.

---

## Task 4: Downstream — bump the pin in `vivid-life-xfce` and close the open item

**Files (all in `~/Git-Repos/vivid-life-theme/vivid-life-xfce`):**

- Modify: `package.json` — `"@vivid-life-theme/design-system": "0.9.0"` → `"0.10.0"`; `package-lock.json` follows
- Regenerate + commit: `gtk-2.0/`, `gtk-3.0/`, `gtk-4.0/`, `xfwm4/`, `index/` for the five affected themes only
- Modify: `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md:145` — the open-items section

**Interfaces:**

- Consumes: `@vivid-life-theme/design-system@0.10.0` from npm, carrying Task 2's values.
- Produces: regenerated theme output for the five themes; the xfce spec's open item closed.

- [ ] **Step 1: Confirm the release is on npm, then branch**

```bash
cd ~/Git-Repos/vivid-life-theme/vivid-life-xfce
npm view @vivid-life-theme/design-system version
git checkout -b bump-design-system-0.10.0
```

Expected: `0.10.0`. If it prints `0.9.0`, the release has not happened — stop and say so.

- [ ] **Step 2: Bump the pin and regenerate**

```bash
npm install @vivid-life-theme/design-system@0.10.0 --save-exact
npm run generate
```

Expected: `package.json` now pins `"0.10.0"`, and generate reports its usual file count.

- [ ] **Step 3: Verify drift is confined to exactly the five themes**

```bash
git status --porcelain | grep -E '^ M (gtk-|xfwm4/|index/)' | sed -E 's#^ M [a-z0-9./-]*/(vivid-life-[a-z]+-[a-z]+)/.*#\1#' | sort -u
```

Expected, exactly these five and nothing else:

```
vivid-life-dawn-green
vivid-life-dawn-red
vivid-life-dawn-yellow
vivid-life-noon-green
vivid-life-noon-yellow
```

Any sixth theme means 0.10.0 changed something the spec did not authorise — stop and investigate before continuing.

- [ ] **Step 4: Confirm the collision count is now zero**

```bash
node --input-type=module -e '
const {flavorBlock,resolveAccent}=await import("./tools/lib/tokens.mjs");
const hits=[];
for(const f of ["midnight","twilight","dawn","noon"]) for(const v of ["red","orange","yellow","green","blue","purple"]){
  const b=flavorBlock(f), a=resolveAccent(f,v);
  for(const k of ["danger","warning","success"]) if(b.semantic[k].toLowerCase()===a.toLowerCase()) hits.push(`${f}-${v}:${k}`);
}
console.log("collisions among danger/warning/success:", hits.length, hits.join(" "));'
```

Expected: `collisions among danger/warning/success: 0`. This is the same measurement that found five before.

- [ ] **Step 5: Run the gates**

```bash
npm run check && npm test
```

Expected: no drift, and the full suite passes (127 or more — the count must not drop).

- [ ] **Step 6: Reinstall and review the five affected themes visually**

```bash
./install.sh --all
npm run preview:shots4 && npm run preview:shots2
```

Then read `tools/preview/out/contact-gtk4-dawn.png`, `contact-gtk4-noon.png`, `contact-gtk2-dawn.png` and `contact-gtk2-noon.png`. On the red, yellow and green tiles for dawn and the yellow and green tiles for noon: the **Destructive** button must now read differently from **Suggested**, and the `Level (high)` bar's success fill must read differently from a plain accent fill. If either pair still looks identical on any of the five, stop — the bump did not take.

- [ ] **Step 7: Close the open item in the xfce spec**

In `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md`, replace the heading at line 145:

```markdown
### Open, found in phase 4 — five semantic tokens are identical to their accent
```

with:

```markdown
### Resolved in design-system 0.10.0 — five semantic tokens were identical to their accent
```

and append, directly after that section's final paragraph (the one beginning `**Not fixable in this port.**`):

```markdown
**Fixed upstream** in `@vivid-life-theme/design-system` 0.10.0 (spec: `docs/superpowers/specs/2026-09-13-semantic-accent-collision-design.md` there). The five colliding accents moved from shade 900 to 800; the semantics stayed. A gate in upstream's `check()` now fails the build on any `danger`/`warning`/`success` role sharing a shade with its hue's accent. Re-measured here after the pin bump: 0 collisions among those three roles. A sixth match — `midnight-blue`, where `info` equals the accent — is accepted upstream as conventional and deliberately exempt from the gate.
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json gtk-2.0 gtk-3.0 gtk-4.0 xfwm4 index docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md
git commit -m "⬆️ chore: bump design-system to 0.10.0 — five accents move off their semantic shade

Regenerates dawn-red, dawn-yellow, dawn-green, noon-yellow and noon-green,
the five themes whose danger/warning/success token was identical to the
accent. Drift is confined to exactly those five. Collision count among the
three gated roles re-measured at 0; the 1.00:1 selected-row case on
dawn-red no longer exists.

Closes the open item in the GTK widget coverage spec.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ba2tRPi2n1RjTYuz1SzCyk"
```

- [ ] **Step 9: Push and open the PR**

```bash
git push -u origin bump-design-system-0.10.0
gh pr create --base main --title "⬆️ chore: bump design-system to 0.10.0" --body-file - <<'BODY'
Picks up `@vivid-life-theme/design-system` 0.10.0, which moves five colliding accents from shade 900 to 800 (spec there: `docs/superpowers/specs/2026-09-13-semantic-accent-collision-design.md`).

Drift is confined to exactly the five affected themes: `dawn-red`, `dawn-yellow`, `dawn-green`, `noon-yellow`, `noon-green`. Collision count among `danger`/`warning`/`success` re-measured at **0** (was 5). The 1.00:1 selected-row case on `dawn-red` no longer exists.

Contact sheets for dawn and noon reviewed on both GTK2 and GTK4: destructive now reads differently from suggested, and the success level-bar fill from a plain accent fill.

Closes the corresponding open item in `2026-09-05-gtk-widget-coverage-design.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Ba2tRPi2n1RjTYuz1SzCyk
BODY
```
