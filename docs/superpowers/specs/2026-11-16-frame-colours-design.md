# Frame colours for the dark flavors: design

Date: 2026-11-16 · Status: approved in conversation, awaiting review of this document

## Intent

After daily use of the ports (mostly VS Code), the owner finds Vivid Life too grey. Two problems:

1. The highlight colour barely reads as a highlight. The theme as a whole should produce more colourful output.
2. Different sections of a window are hard to tell apart.

The reference is Sepp's Workshop (`~/Git-Repos/sepps-workshop`), a theme the owner uses all day at work and is happy with. What Sepp does that Vivid Life does not: its window frame is the brand colour while the area you work in is a calmer, darker shade; its selection lightens the canvas in the accent hue; its terminal shares the editor background, with a strip of frame (the panel's tab row) between them.

Vivid Life stays a "one strong colour" theme by design (Sepp is a two-colour theme: blue frame, yellow accent). The work areas stay grey; that is the basic idea of the theme. The variant colour moves into the frame around them.

## Goals

- The variant's colour is visible in the window frame of every port that has one.
- Work areas keep the flavor's grey. Editor and terminal share one background: `bg`.
- The text selection reads as the variant colour, not as a dark smudge.
- Frame and work areas are clearly apart, in lightness as well as hue.

## Non-goals

- Dawn and Noon frames and selections. They are designed in a later round, by testing ideas visually. In this round they keep today's look, except for the terminal background (see decision 3).
- `vivid-life-xfce` (separate project).
- Tinting the work areas.
- A second strong colour.

## Anti-goals

- A frame that grabs attention. The 900 shades were tried and rejected for this: good at first sight, too loud to stare past all day.
- Hand-picked colours with no rule behind them.

## Constraints

- Visual consistency matters more than mathematical consistency. Colours outside the palette are fine as long as they visibly belong to their palette row.
- Yellow turns brown when dark. Accepted; the owner knows it from their own use of the palette.
- `tokens.json5` stays the single source of truth; ports read everything from the generated tokens. WCAG gates stay in the build.

## Approaches considered

1. **One rule per flavor (chosen).** Add the 950 rung to the palette and give each flavor one frame recipe. The variant supplies the hue. The build derives the 24 values and gates them. This matches how `accent_shade` already picks a rung per flavor, and a new variant gets its frame for free.
2. **A hand-picked colour per theme.** 12 values now, 24 later. Most freedom to tune by eye, but no rule explains the values and every change is manual.
3. **Rule plus a per-variant exception table.** Nothing needs an exception today. Add the table when one does, probably with the light flavors.

## Decisions

### 1. Palette: add the 950 rung

Tailwind v3.3+ defaults, the same source as every other rung. Add it to every row, cyan and gray included:

| row                     | 950       |
| ----------------------- | --------- |
| red                     | `#450a0a` |
| orange                  | `#431407` |
| yellow                  | `#422006` |
| green (Tailwind lime)   | `#1a2e05` |
| blue                    | `#172554` |
| purple                  | `#3b0764` |
| gray (Tailwind neutral) | `#0a0a0a` |
| cyan                    | `#083344` |

`gray.950` equals the literal `#0a0a0a` used today for Midnight's `bg_sunk` and `ansi.black`; those may become references.

### 2. Frame colour

A new surface role, the frame: title bar, activity bar, tab strip, status bar, the sidebar, and the bottom panel's tab row. It replaces `surface.bg_inset` (the fixed slate tint), which no port uses; remove it and its exemptions, and update the README passages that describe it (§ surface hierarchy, the selected-item wash, control boundaries).

The frame depends on the variant, so it is emitted per (flavor, variant), like the overlays.

Recipe per flavor. The rule: each flavor takes the frame shade that gives the clearest lightness step from its own editor background.

| flavor     | recipe                                                | why                                                                                                    |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Midnight   | 50/50 mix of the variant's 900 and 950, mixed in sRGB | 950 alone is only 1.1–1.2:1 from `#171717`. The mix reaches 1.39–1.59:1 and looked best to the owner.  |
| Twilight   | the variant's 950                                     | 950 sits below `#404040` at 1.41–1.56:1. The mix would be almost as light as the canvas (1.09–1.24:1). |
| Dawn, Noon | today's chrome, `bg_sunk`, the same for every variant | placeholder until the light-flavor round (superseded, see "Light flavors" below) |

Resulting values for the dark flavors (as shown in the mockups):

| variant | Midnight  | Twilight  |
| ------- | --------- | --------- |
| red     | `#621414` | `#450a0a` |
| orange  | `#60210d` | `#431407` |
| yellow  | `#5a300c` | `#422006` |
| green   | `#28410d` | `#1a2e05` |
| blue    | `#1a306f` | `#172554` |
| purple  | `#4a1276` | `#3b0764` |

Gates on the frame, per (flavor, variant):

- Text on the frame is `fg` or `fg_muted`, and both clear 4.5:1 (`fg_muted`: 7.6:1 or better). `fg_subtle` does not qualify: on Midnight it measures 3.96–4.52:1 on the frame, so ports must not use it there (inactive tab labels, sidebar descriptions and similar take `fg_muted`). Gate the two allowed roles, and document the restriction for port authors.
- The accent clears 3:1 (non-text: indicator bars, badges, the active-tab line). Midnight-red is the tightest at 3.4:1.
- The frame differs from `bg` by at least 1.35:1 in luminance contrast. _Builder's starting value, my call:_ every value above clears it, and it keeps the "lightness step, not only hue" rule enforceable.
- Text in the accent hue on the frame (e.g. VS Code's `list.highlightForeground` in the sidebar) must clear 4.5:1. The plain accent does not on Midnight-red (3.4:1), so the tokens must provide a frame-safe accent text colour. The obvious candidate is the variant's hue one or more rungs lighter. Gate it.
- Add the frame to `overlay.roles.selected.surfaces`: selected rows in the sidebar now sit on it.

Known and accepted:

- Midnight-red's accent is weakest on its frame (3.4:1).
- Yellow frames are brown.
- Twilight-purple's 950 is visibly more saturated than the other five. If it bothers in daily use, that is the first entry for the exception table (approach 3).

### 3. One background for editor and terminal

`surface.bg_terminal` becomes `bg` on all four flavors. Keep the name as an alias, the way Sepp's Workshop does. Every port reads `bg_terminal`, so the fish, PowerShell, Claude Code and xfce4-terminal ports change by dependency bump alone.

Issue #7 separated `bg_terminal` so Midnight and Twilight would look different in a standalone terminal. Using `bg` separates them further (`#171717` vs `#404040`; Dawn `#d4d4d4` vs Noon `#f5f5f5`), so that reason still holds.

Two ANSI colours fail 4.5:1 against the new backgrounds and need new values:

- Twilight `bright_black` `#a3a3a3`: 4.11:1 on `#404040`.
- Noon `bright_black` `#737373`: 4.35:1 on `#f5f5f5`.

Pick the closest values that clear 4.5:1 and stay apart from the other neutrals (the existing distinctness gate decides). Update the comments that justify today's `bg_terminal` choices and the README caveat about Dawn's terminal panel.

### 4. Selection on the dark flavors

Today the selection darkens the canvas with the 900 rung, so syntax colours keep 4.5:1. The owner's experience with Sepp's Workshop: colleagues wanted a selection that stands out, and whether text is selected matters more than how readable it is in that moment. Sepp lowered its requirement to 3:1, and Vivid Life adopts the same rule.

- `selection`: the accent at 25 % over `bg` (it lightens).
- `inactive_selection`: the accent at 15 % over `bg`.
- Selection roles get their own gate class: every code colour (syntax slots, `fg`, `fg_subtle`, semantic colours) clears 3:1, not 4.5:1. Measured worst cases: Midnight 3.55:1 (comment on blue and purple), Twilight 3.10:1 (comment on orange). Inactive: 3.84:1 or better.
- The terminal selection foreground (`terminal_foreground: fg`) stays gated at 4.5:1; `fg` on the new selection is 5.6:1 or better.
- The existing `distinct.overlay` gates (selection visible against `bg`, apart from the find matches) stay. If a find-match recipe fails `apart` against the lighter selection, adjust the find match, not the selection.
- Dawn and Noon keep their recipes. They already clear 4.5:1, so the looser class does not change them.
- The 3:1 class covers `selection` and `inactive_selection` only. Every other code overlay (find matches, word highlights, diff tints, line highlight, panel) stays at 4.5:1. The invariant in `CLAUDE.md` ("WCAG AA at ≥ 4.5:1 for all 24 accent combinations") is about the accent against `bg` and is untouched. Update the README's selection section and the overlay comments in `tokens.json5` to state the exception and its reason.

### 5. VS Code port

- Frame colour: `titleBar.activeBackground` / `inactiveBackground`, `activityBar.background`, `sideBar.background`, `editorGroupHeader.tabsBackground` (and `noTabsBackground`), `tab.inactiveBackground`, `statusBar.background` / `noFolderBackground`, `panel.background`.
- `bg`: `editor.background`, `tab.activeBackground`, `terminal.background`.
- `panel.background` = frame while `terminal.background` = `bg` gives the strip of frame between editor and terminal: VS Code draws the panel's tab row in `panel.background`. Sepp does exactly this.
- Every colour that now sits on the frame instead of `bg_sunk` needs rechecking: sidebar text, the list selection wash, list highlight text, badges, the activity-bar indicator, status bar items.
- For Dawn and Noon the frame token equals today's `bg_sunk`, so their themes stay unchanged apart from decision 3.

### 6. Windows Terminal port

Add a window theme per (flavor, variant), as in `sepps-workshop-windows-terminal/themes/sepps-workshop-window-theme.json`:

```json
{
  "window": { "applicationTheme": "dark" },
  "tabRow": { "background": "<frame>", "unfocusedBackground": "<frame>" },
  "tab": {
    "background": "terminalBackground",
    "unfocusedBackground": "<frame>"
  }
}
```

`applicationTheme` follows the flavor type. The active tab merges with the terminal below it; the tab row and inactive tabs are frame.

Installation follows Sepp's port (`sepps-workshop-windows-terminal/docs/superpowers/specs/2026-10-13-window-theme-design.md`). JSON fragments cannot hold themes, so the window themes ship as a generated file the user pastes into `settings.json`, with the steps in the README. `install.ps1` does not edit `settings.json`. Windows Terminal has one global `theme` key while colour schemes are set per profile, so the README tells users to pick the window theme that matches their scheme. _My call:_ it keeps the sibling ports' install story, and Sepp's design already worked through the alternatives.

### 7. Other ports

`vivid-life-claude-code`, `vivid-life-fish`, `vivid-life-powershell`, `vivid-life-starship`, `vivid-life-xfce4-terminal`: bump the design-system dependency, rebuild, run their tests. They pick up decision 3 (and, where they draw selections, decision 4) through the tokens. None of them has frame areas.

## Rollout order

1. Design system (decisions 1–4), released as a minor version: removing `bg_inset` is breaking for anyone outside these repos.
2. VS Code.
3. Windows Terminal.
4. The remaining ports.

Each repo releases through its own release process.

## Left to the builder

- Token naming and structure for the frame recipe and its emitted values, as long as it is one recipe per flavor and the values are emitted per (flavor, variant), including in `colors_and_type.css` and `dist/tokens.js`.
- The 1.35:1 threshold, if the build's existing distance measures (OKLab ΔE) express it better.
- The frame-safe accent text colour and the new `bright_black` values, within the gates above.
- Whether the borders between frame and work areas (`border.subtle`) still help. Sepp keeps visible borders.
- Every VS Code key beyond those listed in decision 5.
- Tests, previews (`npm run check` must pass), changelogs, versions.

## Reference

- Mockup generator (throwaway): the visual companion session in `.superpowers/brainstorm/185029-1794831585/content/frames-dark-v3.html`. The approved configuration: frame "Proposed", sidebar "Frame", terminal panel "Frame header, editor grey", selection "Tinted".
- Sepp's Workshop tokens: `~/Git-Repos/sepps-workshop/sepps-workshop-design-system/tokens.json5` (§ 3 surfaces, § 7 overlays).

## Light flavors (decided 2026-11-16, second round)

The owner compared five ideas in mockups: today's grey, the 100 tint, a calculated calm pastel, the 300 shade, and Midnight's dark frame around a light editor. Decision: the calculated pastel. It is the only idea that gives all six variants about the same step from the editor on both flavors. The 100 tint is invisible on Noon (1.00–1.12:1). The 300 shade is as light as Dawn's canvas and uneven on Noon. The dark frame needs its own light text and accent tokens, and it is as loud as the rejected 900 frames.

The pastel is computed in OKLCH: fixed lightness and chroma, with the hue taken from the variant's 500 shade. It sits near Tailwind's 200 shade, but the plain 200 shade is uneven: 1.07:1 for yellow and green on Noon, 1.02–1.04:1 for red and blue on Dawn.

| flavor | recipe | step from `bg` | why |
|---|---|---|---|
| Noon | OKLCH L 0.86, C 0.05, darker than the canvas | 1.39–1.43:1 | every frame gate passes |
| Dawn | OKLCH L 0.98, C 0.05, *brighter* than the canvas (superseded, see "Dawn revision" below) | 1.39–1.42:1 | a darker pastel drops Dawn's `success` (green.900) and `warning` (yellow.900) to 3.9–4.45:1 on the frame, and git decorations in the sidebar use them |

For Dawn the alternative was a darker pastel with `success` and `warning` moved to 950. That would make "added" and "conflict" almost black everywhere in Dawn, so it was rejected. Dawn's frame goes the opposite way from the other three flavors; a lighter frame around a mid-grey editor fits Dawn's soft-light character.

Values:

| variant | Dawn | Noon |
|---|---|---|
| red | `#fef6f6` | `#f0c5c0` |
| orange | `#fff7f3` | `#eec8b5` |
| yellow | `#fef8ea` | `#e0cfac` |
| green | `#efffe2` | `#c6d8b6` |
| blue | `#f5f9fe` | `#bed2f3` |
| purple | `#faf7fe` | `#d8caec` |

No flavor stays exempt from the frame step gate (superseded: Dawn is exempt since the revision below). The light-flavor selections keep today's recipes: they are already accent tints that keep 4.5:1, so the dark flavors' smudge problem never applied. The port rules for the frame apply unchanged (text `fg` / `fg_muted`, accent-hued text via `accent_text`, which steps darker on the light frames).


## Dawn revision (issue #37)

In the VS Code port the Dawn frame read as white around a grey editor, and the variant colour was barely visible. The cause is the sRGB gamut: at L 0.98 it has almost no room for chroma, so red, blue and purple were clamped to C 0.009 whatever the recipe asked for. Green reached 0.042, which is why it looked stronger than the other five.

No Dawn frame can have visible colour and also clear the 1.35:1 step from `#d4d4d4`. A frame lighter than the canvas has to be near white to clear the step. A darker frame drops `fg_muted` (under the hover and pressed-row overlays) and `success` / `warning` below 4.5:1 before it gets there: at L 0.83, `fg_muted` on the pressed-row overlay measures 4.49:1. So Dawn's frame is set apart by hue, and Dawn is listed in `frame.step_exempt`.

Three candidates passed every other gate. The owner chose B:

| candidate | recipe | step from `bg` | chroma across variants | worst text on frame |
|---|---|---|---|---|
| A | L 0.93, C 0.05, brighter | 1.19–1.22:1 | 0.032–0.049 | 6.98:1 |
| **B** | **L 0.91, C 0.05, brighter** | **1.12–1.15:1** | **0.043–0.051** | **6.52:1** |
| C | L 0.84, C 0.05, darker | 1.08–1.12:1 | 0.050–0.051 | 5.22:1 |

B keeps Dawn's lighter-than-canvas direction and has the most even chroma of the lighter options, matching Noon's C 0.05. A keeps more of the step, but red and blue stay weak. C is barely above the pressed-row overlay limit.

Values:

| variant | Dawn |
|---|---|
| red | `#ffd6d2` |
| orange | `#fed8c5` |
| yellow | `#f0e0bc` |
| green | `#d6e9c6` |
| blue | `#d1e2fe` |
| purple | `#e8dafd` |

`accent_text` is unchanged. A self-test now requires every Dawn frame to reach OKLCH chroma 0.04.
