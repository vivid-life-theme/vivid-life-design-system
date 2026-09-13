# Semantic / Accent Collision — Design Spec

**Date:** 2026-09-13
**Status:** Approved
**Found by:** the Xfce port's phase-4 review ([vivid-life-xfce#3](https://github.com/vivid-life-theme/vivid-life-xfce/pull/3)); measured across all 24 flavour × variant combinations.

## Goal

On six of the twenty-four flavour × variant combinations, a semantic token is the **same colour** as the accent. Where that happens the states the two tokens exist to distinguish are not distinguishable: a destructive button reads exactly like a suggested one, a `success` level-bar block like a plain accent fill, error text inside a selected row vanishes into the selection at 1.00:1.

This belongs in the foundation. Every port derives both colours from the same tables, so any port-side workaround would have to redefine a token value — which the ports' own non-goals forbid — and would drift from every other port.

## The collisions

Semantic tokens are flavour-scoped; accents are flavour × variant-scoped; both are drawn from the same palette. A collision occurs exactly when `accent_shade[flavour][hue]` equals the shade the semantic token for that hue uses.

| combination     | semantic          | accent                           | shared value |
| --------------- | ----------------- | -------------------------------- | ------------ |
| `dawn-red`      | `danger` red.900  | `accent_shade.dawn.red` 900      | `#7f1d1d`    |
| `dawn-yellow`   | `warning` yel.900 | `accent_shade.dawn.yellow` 900   | `#713f12`    |
| `dawn-green`    | `success` grn.900 | `accent_shade.dawn.green` 900    | `#365314`    |
| `noon-yellow`   | `warning` yel.900 | `accent_shade.noon.yellow` 900   | `#713f12`    |
| `noon-green`    | `success` grn.900 | `accent_shade.noon.green` 900    | `#365314`    |
| `midnight-blue` | `info` blue.300   | `accent_shade.midnight.blue` 300 | `#93c5fd`    |

The first five involve `danger`, `warning` or `success` and are defects. The sixth is `info` sharing the primary blue, which is conventional in most design systems and makes nothing unsafe — see [Decision 3](#decision-3-midnight-blue-is-accepted-not-fixed).

## Decision 1: move the accents, not the semantics

Two directions were measured for every collision (both against the 4.5:1 text floor, since both tokens are used as text).

**Moving the dawn semantics fails this repo's own gate.** `build-tokens.mjs` already requires every semantic colour to clear 4.5:1 on every surface except `bg_scrim` and `bg_inset`. The current 900 shades do (danger 5.3, warning 4.6, success 4.6 on `bg_sunk`). Dropping to 800 puts all three **below 4.5:1 on `bg_sunk`** — 4.42 / 3.65 / 3.77 — so the build would reject the change outright. That is not a judgment call; it is the existing rule.

**Moving the accents to 800 still clears this repo's own accent rule** (≥ 4.5:1 against `surface.bg`), with less headroom than 900 had — the decision rests on rule adherence (800 is the smallest step that clears; 700 fails at 4.36 / 3.32 / 3.37) and on the semantic gate failing in the other direction:

| variant       | 900 vs bg (now) | **800 vs bg** | accent-on text on 800 |
| ------------- | --------------- | ------------- | --------------------- |
| `dawn-red`    | 6.8             | **5.61**      | 7.62                  |
| `dawn-yellow` | 5.8             | **4.62**      | 6.28                  |
| `dawn-green`  | 5.9             | **4.77**      | 6.49                  |
| `noon-yellow` | 8.0             | **6.28**      | 6.28                  |
| `noon-green`  | 8.0             | **6.49**      | 6.49                  |

Semantic tokens stay exactly as they are. The "deepest shade is the most serious" ordering between semantic and accent holds on dawn.

**This also honours the accent-shade rule better than the current values do.** The rule reads: step in from the extreme (300/700) by default; step further (100/900) only when the hue is too close to the background. Dawn's warm hues at 700 _are_ too close (red.700 is 4.36:1) — but the palette has an 800 shade, which the rule's wording predates, and 800 is the _minimal_ step that clears. 900 overshoots. The rule text gains 800 as the intermediate step.

## Decision 2: the change

Five entries in `accent_shade` move from 900 to 800:

```json5
dawn: { red: 800, yellow: 800, green: 800 },   // orange stays 900, blue/purple 700
noon: { yellow: 800, green: 800 },             // red/orange/blue/purple stay 700
```

Nothing else changes value. Dawn `orange` does not collide (no semantic token is orange) and is left at 900 rather than moved for cosmetic uniformity — that would change a sixth theme for no contrast reason.

## Decision 3: midnight-blue is accepted, not fixed

`info` sharing the primary blue is the convention across most design systems, and no state becomes unsafe: an info banner matching the primary is redundant, not misleading, whereas a destructive button matching the primary is. Both available fixes carry a real aesthetic cost — moving the accent to blue.500 turns midnight-blue's pastel into a saturated mid-blue on what is likely the most-used theme; moving `info` to blue.100 makes it the only midnight semantic not at 300.

So the invariant is stated for `danger`, `warning` and `success` only, and `info` is excluded **with this reason written beside the exclusion**, so the check passes midnight-blue honestly rather than by exemption.

## Decision 4: the invariant and its gate

Documented in `tokens.json5` beside `accent_shade`, and enforced in `tools/build-tokens.mjs`'s existing `check()`:

> For every flavour and every semantic kind in `{danger, warning, success}`, `flavors[f].semantic[kind]` must not equal `palette[hue][accent_shade[f][hue]]`, with the fixed mapping `danger → red`, `warning → yellow`, `success → green`.

The mapping is stated rather than inferred from colour values, so the check cannot be satisfied by accident if a semantic token is later moved to a different hue.

The check emits a `✗` line in the same shape as the existing accent-vs-bg rule and fails the build. Today nothing prevents this recurring the next time either table changes.

**The gate is demonstrated failing before it is trusted:** reverting any one of the five values must turn it red. A check that has never been seen to fail is not evidence of anything — the Xfce phase-4 work shipped five such checks and found every one only by breaking its input on purpose.

## Release

Minor bump, **0.9.0 → 0.10.0**. Under this repo's changelog convention, breaking means renames or removals; a value change is _Changed_. But five named themes visibly shift, so the entry names them and carries the ⚠️ downstream-regeneration note.

Downstream, in `vivid-life-xfce`: bump the pin, `npm run generate`, confirm `npm run check` reports drift in exactly the five affected themes and nowhere else, `npm test`, and review the contact sheets for those five. The other consumers that read `accent_shade` (fish, powershell, starship) pick the change up on their own next bump and are not part of this work.

## Verification

- `node tools/build-tokens.mjs` passes on the new values and **fails** on any one reverted value.
- The five new accents' contrast figures above are recorded here so they are traceable, not re-derived.
- Downstream, the Xfce collision measurement drops from 5 to 0 among `danger`/`warning`/`success`, and the 1.00:1 selected-row case on `dawn-red` no longer exists.

## Non-goals

- No change to any semantic token value.
- No change to `midnight-blue`.
- No change to dawn `orange`.
- No consumer other than `vivid-life-xfce` is updated in this work.
