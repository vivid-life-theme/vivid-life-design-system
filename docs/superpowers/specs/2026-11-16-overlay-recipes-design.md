# Overlay recipes for the port-side washes: design

Date: 2026-11-16 · Issue: #28 · Status: approved in conversation

## Intent

The VS Code port still makes 42 transparency decisions itself: an `ALPHA` table (10–90 %) applied to the accent, `fg_subtle`, the semantic colours and ANSI cyan. None of them passes a foundation gate, every other port would have to invent them again, and measured against the foundation's own rules most of them fail: washes behind code reach 2.6–3.9:1, washes behind labels 3.2–4.0:1, the hover state is invisible on Dawn's `bg_sunk`, and the active scrollbar is 2.7:1 on Midnight's frame. This change moves every one of these decisions into overlay recipes with exactly one gate class, so the port only maps tokens.

Before releasing 0.14.0, so that ports bump once.

## Goals

- A recipe for every wash the port decides today, or a documented reuse of an existing one.
- Every overlay role has exactly one gate class; the build fails on a role without one.
- Each resolved overlay publishes `hexa` (`#rrggbbaa`) next to `flat`, so ports drop `withAlpha` and `overlayHex`.

## Non-goals

- The port refactor itself (point 4 of #28). It belongs to the VS Code port plan.
- A modal scrim recipe: `surface.bg_scrim` already is one.

## Decisions

### Gate classes

`overlay.roles.<name>.behind` takes one of:

| class        | gated                                                                                                                    | used by                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `code`       | every syntax colour, `fg`, `fg_subtle` and the semantic colours on the flat over `bg`, at 4.5:1 or the role's `text_min` | existing code overlays, new editor washes |
| `ui` (label) | the roles in `text` on every surface in `surfaces`, at 4.5:1                                                             | `selected`, new label washes              |
| `surface`    | `ui`'s text gate, plus visible: ΔE ≥ `distinct.related_min` from every surface in `surfaces`                             | `hover`, `active`                         |
| `mark`       | non-text: ΔE ≥ `distinct.related_min` from every surface in `surfaces`, and contrast ≥ `contrast_min` where set          | ruler, minimap, scrollbar, terminal marks |
| `fill`       | the roles in `text` (may include `accent_on`) on the flat over `bg` at 4.5:1                                             | `button_hover`                            |

`surfaces` may name `frame`: the variant's frame colour (`resolveOverlay(…, { surface: "frame" })` already supports it). `ui` and `surface` roles may restrict a text role to some surfaces with `text_on: { <role>: [surfaces] }` (generalising `text_on_bg`).

### The short-lived editor highlights: 3:1, like the selection

Owner's decision: these follow the selection rule (`text_min: 3`), an accent tint the same on all four flavors. No accent tint behind code reaches 4.5:1 at any alpha, because syntax colours sit just above 4.5:1 on `bg`.

| role               | recipe      | VS Code keys it replaces                                                                                                         |
| ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `find_range`       | accent 10 % | `editor.findRangeHighlightBackground`                                                                                            |
| `highlight`        | accent 15 % | `editor.selectionHighlightBackground`, `editor.hoverHighlightBackground`, `notebook.symbolHighlightBackground`                   |
| `symbol_highlight` | accent 20 % | `editor.symbolHighlightBackground`, `editorBracketMatch.background`, `peekViewEditor/Result.matchHighlightBackground` (was 30 %) |

### Longer-lived code backgrounds: 4.5:1, the direction rule

Dark flavors tint with the 900 rung, light flavors with the 100 / 300 rung, like find match and diff.

| role                  | Midnight        | Twilight        | Dawn            | Noon            |
| --------------------- | --------------- | --------------- | --------------- | --------------- |
| `merge_current`       | blue.900 30 %   | blue.900 50 %   | blue.100 100 %  | blue.300 30 %   |
| `stack_frame`         | yellow.900 30 % | yellow.900 50 % | yellow.100 50 % | yellow.300 30 % |
| `stack_frame_focused` | yellow.900 40 % | yellow.900 60 % | yellow.100 70 % | yellow.300 45 % |

Merge "incoming" content reuses `diff_inserted_line` (as in Sepp's Workshop). Merge "common" content reuses `line_highlight`: no grey passes on Midnight except line_highlight's own, and none on Noon. _My call._

### Washes behind labels: 4.5:1, weaker tints

Same colour on all flavors, alpha lowered to what passes everywhere. `fg` and `fg_muted` gated.

| role                                      | recipe                               | surfaces                | keys                                                                   |
| ----------------------------------------- | ------------------------------------ | ----------------------- | ---------------------------------------------------------------------- |
| `merge_current_header`                    | semantic.info 15 %                   | bg                      | `merge.currentHeaderBackground`                                        |
| `merge_incoming_header`                   | semantic.success 15 %                | bg                      | `merge.incomingHeaderBackground`                                       |
| `merge_common_header`                     | fg_subtle 20 %                       | bg                      | `merge.commonHeaderBackground`                                         |
| `validation_error` / `_warning` / `_info` | semantic.danger / warning / info 6 % | bg, bg_soft, bg_overlay | `inputValidation.*Background` (the coloured border carries the signal) |
| `input_option_active`                     | accent 9 %                           | bg_soft, bg_overlay     | `inputOption.activeBackground`                                         |
| `slash_command`                           | ansi.cyan 8 %                        | bg, bg_soft             | `chat.slashCommandBackground`                                          |

### Hover and pressed: `surface` class

Gated on `bg`, `bg_soft`, `bg_sunk`, `bg_overlay` and `frame`. `fg` on all of them, `fg_muted` on `bg` and `frame` only: on Twilight's `bg_soft` (#525252) and Dawn's `bg_sunk`, `fg_muted` starts too close to 4.5:1 for any visible tint (_my call_; menus there show `fg`). Colours are `gray.100` on dark flavors and `gray.950` on light ones.

| role     | Midnight      | Twilight      | Dawn          | Noon          |
| -------- | ------------- | ------------- | ------------- | ------------- |
| `hover`  | gray.100 10 % | gray.100 8 %  | gray.950 10 % | gray.950 8 %  |
| `active` | gray.100 12 % | gray.100 12 % | gray.950 14 % | gray.950 12 % |

Starting values; the builder may move them within the gates. `active` stays stronger than `hover`. `chat.requestBubbleHoverBackground` reuses `hover` (the accent 10 % wash was invisible on Noon's frame, ΔE 3.5). The old `flavors.*.state` tokens stay for compatibility and are documented as superseded.

### Marks: `mark` class

| role                                    | recipe                            | surfaces  | keys                                                                            |
| --------------------------------------- | --------------------------------- | --------- | ------------------------------------------------------------------------------- |
| `ruler_find`                            | accent 60 %                       | bg        | `editorOverviewRuler.findMatchForeground`                                       |
| `mark`                                  | accent 40 %                       | bg        | overview-ruler range / selection / word highlight, `minimap.findMatchHighlight` |
| `minimap_selection`                     | accent 25 %                       | bg        | `minimap.selectionHighlight`                                                    |
| `minimap_occurrence`                    | accent 20 %                       | bg        | `minimap.selectionOccurrenceHighlight`                                          |
| `mark_inserted` / `mark_removed`        | semantic.success / danger 40 %    | bg        | `diffEditorOverview.*Foreground`                                                |
| `terminal_decoration`                   | fg_subtle 40 %                    | bg        | `terminalCommandDecoration.defaultBackground`                                   |
| `slider` / `slider_hover`               | fg_subtle 30 % / 50 %             | bg, frame | `scrollbarSlider.background` / `hoverBackground`                                |
| `slider_active`                         | fg_subtle 80 %, `contrast_min: 3` | bg, frame | `scrollbarSlider.activeBackground` (70 % was 2.7:1 on Midnight's frame)         |
| `minimap_slider` / `_hover` / `_active` | fg_subtle 20 % / 30 % / 50 %      | bg        | `minimapSlider.*`                                                               |

### Button hover: `fill` class

`button_hover`: accent 90 % over `bg`; the port uses `flat`, an opaque colour, as Sepp's Workshop's `accent_hover`. `accent_on` gated on it. Covers `button.hoverBackground` and `extensionButton.prominentHoverBackground`. `activityBar.activeBorder` (accent 90 % today) takes the plain accent: no recipe.

### `hexa`

Every resolved overlay (`flavors.<f>.overlay.<v>.<name>`) gains `hexa`: `color` with `alpha` as an 8-bit channel, the same value `colors_and_type.css` already writes as `--vl-overlay-<name>`.

## Left to the builder

- Fine-tuning `hover` / `active` and the B-group alphas within the gates.
- README: a section listing every recipe with its class and the VS Code keys it maps to; the handoff skill's "don't keep a port-side alpha table" rule points at it.
- Tests for each class proving the gate bites.
