#!/usr/bin/env node
/**
 * build-tokens.mjs
 * ────────────────────────────────────────────────────────────────────
 * Two roles in one file:
 *
 * 1.  CLI — when run directly:
 *       node tools/build-tokens.mjs           → gate, then emit
 *       node tools/build-tokens.mjs --check   → gate, exit 1 if outputs would change
 *       node tools/build-tokens.mjs --report  → print WCAG + APCA for every gated pair
 *       node tools/build-tokens.mjs --test    → self-test
 *     Reads `tokens.json5`, validates its shape, runs every gate, and
 *     only then emits:
 *       tokens.json     — flat JSON with all $palette.x.y refs resolved
 *                         and the derived token groups filled in
 *       dist/tokens.js  — ES module that exports the resolved object
 *     A failing gate leaves both files untouched, so a port on a
 *     local-path dependency never picks up rejected values.
 *
 * 2.  Library — imported by downstream ports:
 *       import { loadTokens, resolveColor, resolveOverlay, alphaOver,
 *                contrast } from
 *         '@vivid-life-theme/design-system/tools/build-tokens';
 *     Color-math helpers are centralised here so a GTK port and a
 *     VS Code port can't drift from each other or from the web.
 *
 * No npm dependencies. Tiny JSON5 subset: line/block comments,
 * single-quoted strings, unquoted keys, trailing commas.
 * ────────────────────────────────────────────────────────────────────
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* =====================================================================
   COLOR MATH  (exported)
   ===================================================================== */

/** Parse "#rrggbb" or "#rrggbbaa" → [r, g, b, a] all 0..255 (a defaults 255). */
export function parseHex(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6 && h.length !== 8) {
    throw new Error(`Bad hex color: ${hex}`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

/** [r, g, b, a?] → "#rrggbb" or "#rrggbbaa". */
export function toHex([r, g, b, a]) {
  const h2 = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  let out = "#" + h2(r) + h2(g) + h2(b);
  if (a !== undefined && a < 255) out += h2(a);
  return out;
}

/**
 * Mix two hex colors in sRGB space.
 *   mix('#d8b4fe', '#171717', 0.25)
 *     → A at 25%, B at 75%   →   '#473e51'
 *
 * Matches CSS `color-mix(in srgb, A 25%, B)`. Interpolation happens in
 * gamma-encoded sRGB (the same space the channel values live in) — NOT
 * in linear-light, NOT in OKLch. If you need perceptual mixing, write
 * a separate helper.
 *
 * @param {string} a     hex (#rgb pair)
 * @param {string} b     hex (#rgb pair)
 * @param {number} p     0..1 — weight of `a`; `b` gets (1 - p)
 * @returns {string}     "#rrggbb"
 */
export function mix(a, b, p) {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex([
    ar * p + br * (1 - p),
    ag * p + bg * (1 - p),
    ab * p + bb * (1 - p),
  ]);
}

/**
 * Composite a semi-transparent foreground over a known opaque background.
 * Use when a target format doesn't support alpha overlays (most native
 * theme formats) and you need a concrete hex equivalent.
 *
 *   alphaOver('#ffffff', '#171717', 0.08)
 *     → 8% white over Midnight bg  →  '#2a2a2a'
 *
 * @param {string} fg    foreground hex
 * @param {string} bg    background hex (opaque)
 * @param {number} alpha 0..1
 * @returns {string}     "#rrggbb"
 */
export function alphaOver(fg, bg, alpha) {
  const [fr, fg2, fb] = parseHex(fg);
  const [br, bg2, bb] = parseHex(bg);
  return toHex([
    fr * alpha + br * (1 - alpha),
    fg2 * alpha + bg2 * (1 - alpha),
    fb * alpha + bb * (1 - alpha),
  ]);
}

/** Relative luminance per WCAG 2.1. */
export function relLum(hex) {
  const [r, g, b] = parseHex(hex)
    .slice(0, 3)
    .map((v) => v / 255);
  const lin = (v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colors. */
export function contrast(fg, bg) {
  const L1 = relLum(fg),
    L2 = relLum(bg);
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

/** Pick gray-900 or gray-100 for text on a given background. */
export function readableOn(bg) {
  return relLum(bg) > 0.5 ? "#171717" : "#f5f5f5";
}

/** hex → [L, a, b] in OKLab (Björn Ottosson's matrices, sRGB D65). */
export function oklab(hex) {
  const [r, g, b] = parseHex(hex)
    .slice(0, 3)
    .map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * Perceptual distance between two colours: Euclidean in OKLab, × 100.
 * ≈ 2 is a just-noticeable difference; the distinctness gate asks 7
 * for colours that must not look alike (tokens.json5 § 3g).
 */
export function deltaE(a, b) {
  const [L1, a1, b1] = oklab(a);
  const [L2, a2, b2] = oklab(b);
  return 100 * Math.hypot(L1 - L2, a1 - a2, b1 - b2);
}

/**
 * APCA lightness contrast (Lc), APCA-W3 0.0.98G-4g constants. Signed:
 * positive for dark text on light, negative for light on dark — compare
 * `Math.abs()` against a target. Informational only: the gates enforce
 * WCAG 2.x, the build prints this beside it (`--report`).
 */
export function apcaContrast(txt, bg) {
  const Y = (hex) => {
    const [r, g, b] = parseHex(hex)
      .slice(0, 3)
      .map((v) => Math.pow(v / 255, 2.4));
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    return y < 0.022 ? y + Math.pow(0.022 - y, 1.414) : y;
  };
  const Yt = Y(txt),
    Yb = Y(bg);
  if (Math.abs(Yb - Yt) < 0.0005) return 0;
  if (Yb > Yt) {
    const s = (Math.pow(Yb, 0.56) - Math.pow(Yt, 0.57)) * 1.14;
    return s < 0.1 ? 0 : (s - 0.027) * 100;
  }
  const s = (Math.pow(Yb, 0.65) - Math.pow(Yt, 0.62)) * 1.14;
  return s > -0.1 ? 0 : (s + 0.027) * 100;
}

/* =====================================================================
   FOUNDATION RECIPES  (exported)
   ─────────────────────────────────────────────────────────────────────
   Same color math we apply in CSS via color-mix, but exposed as plain
   functions for ports that bake values at build time.
   ===================================================================== */

/**
 * @deprecated since issue #19 — the selection is no longer "25% of the
 * accent over bg" (that recipe lightened dark canvases toward the text
 * and dropped Midnight comments to 2.13:1). Read the real value with
 * `resolveOverlay(tokens, flavor, variant, 'selection')`, or from
 * `tokens.flavors[flavor].overlay[variant].selection` in tokens.json.
 * Kept as plain colour math so existing callers don't break.
 *
 *   selection({ bg: '#171717', accent: '#d8b4fe' })  → '#473e51'
 */
export function selection({ bg, accent, mixPct = 0.25 } = {}) {
  if (!bg || !accent) throw new Error("selection: bg and accent required");
  return mix(accent, bg, mixPct);
}

/**
 * Selected-item wash for a (surface, variant) combo.
 * Equivalent to `color-mix(in srgb, var(--vl-accent) 18%, transparent)`
 * composited over `surface` — a translucent tint mixes to the same
 * value as an opaque mix against whatever sits behind it.
 *
 * Same result as `resolveOverlay(tokens, flavor, variant, 'selected',
 * { surface })`, which reads the percentage from tokens.json5 instead
 * of taking it as an argument; prefer that in new code.
 *
 * Unlike `selection()`, which always lands on the flavor canvas, this
 * one takes the surface explicitly: a selected row can sit on `bg`,
 * `bg_soft` or `bg_inset`, and the wash reads differently on each.
 *
 *   selectedWash({ surface: '#171717', accent: '#d8b4fe' })  → '#3a3341'
 *
 * The wash reinforces a selection signal; it never carries one alone.
 * Keep the underline / accent bar beside it. See issue #14.
 */
export function selectedWash({ surface, accent, mixPct = 0.18 } = {}) {
  if (!surface || !accent)
    throw new Error("selectedWash: surface and accent required");
  return mix(accent, surface, mixPct);
}

/**
 * Hover overlay baked against a known bg.
 *   hoverOver({ flavor: 'dark', bg: '#171717' })  → '#2a2a2a'
 *   hoverOver({ flavor: 'light', bg: '#f5f5f5' }) → '#e9e9e9'
 *
 * Dark flavors lighten by 8% white; light flavors darken by 5% black —
 * matches the values in `tokens.json5 → flavors.*.state`.
 */
export function hoverOver({ flavor, bg } = {}) {
  if (!flavor || !bg) throw new Error("hoverOver: flavor and bg required");
  return flavor === "dark"
    ? alphaOver("#ffffff", bg, 0.08)
    : alphaOver("#000000", bg, 0.05);
}

/** Active-state overlay; slightly stronger than hover. */
export function activeOver({ flavor, bg } = {}) {
  if (!flavor || !bg) throw new Error("activeOver: flavor and bg required");
  return flavor === "dark"
    ? alphaOver("#ffffff", bg, 0.12)
    : alphaOver("#000000", bg, 0.08);
}

/**
 * Resolve the accent hex for a (flavor, variant) pair using the
 * accent-shade ruleset from tokens.json5.
 *
 *   resolveAccent(tokens, 'midnight', 'purple') → '#d8b4fe'
 */
export function resolveAccent(tokens, flavor, variant) {
  const shade = tokens.accent_shade?.[flavor]?.[variant];
  if (!shade) throw new Error(`No accent shade for ${flavor}/${variant}`);
  const hex = tokens.palette?.[variant]?.[shade];
  if (!hex) throw new Error(`No palette entry for ${variant}-${shade}`);
  return hex;
}

const TEXT_ALIASES = ["fg", "fg_muted", "fg_subtle", "fg_disabled"];

/**
 * Resolve a colour target — the vocabulary shared by `overlay`,
 * `shell_roles`, `prompt_roles` and `workbench_color_roles` — to a hex
 * for one (flavor, variant):
 *
 *   accent              the (flavor, variant) accent
 *   accent.<rung>       the variant's hue at another rung
 *   hue.<hue>           <hue> at its own accent rung on this flavor
 *   <hue>.<rung>        any palette entry, e.g. "cyan.900"
 *   fg | fg_muted | fg_subtle | fg_disabled
 *   semantic.<role>     success | warning | danger | info
 *   <syntax core slot>  comment, keyword, …, punct
 *   ansi.<slot>         the flavor's 16-colour terminal palette
 *   overlay.<name>      that overlay flattened over `surface`
 *
 *   resolveColor(tokens, 'midnight', 'purple', 'accent.900')  → '#581c87'
 *
 * Works on loadTokens() output (flavors.*.syntax already derived).
 * `surface` names the surface an "overlay.*" target composites over;
 * defaults to `bg`. Throws on anything it can't resolve.
 */
export function resolveColor(tokens, flavor, variant, target, opts = {}) {
  const f = tokens.flavors?.[flavor];
  if (!f) throw new Error(`resolveColor: unknown flavor "${flavor}"`);
  if (typeof target !== "string" || !target) {
    throw new Error(`resolveColor: colour target must be a non-empty string`);
  }
  const fail = () => {
    throw new Error(`resolveColor: can't resolve "${target}" on ${flavor}`);
  };
  if (target === "accent") return resolveAccent(tokens, flavor, variant);
  if (TEXT_ALIASES.includes(target)) return f.text[target] ?? fail();
  if (f.syntax && Object.hasOwn(f.syntax, target)) return f.syntax[target];
  const dot = target.indexOf(".");
  if (dot < 0) fail();
  const head = target.slice(0, dot),
    tail = target.slice(dot + 1);
  switch (head) {
    case "accent":
      return tokens.palette?.[variant]?.[tail] ?? fail();
    case "hue":
      return tokens.palette?.[tail]?.[tokens.accent_shade?.[flavor]?.[tail]] ?? fail();
    case "semantic":
      return f.semantic?.[tail] ?? fail();
    case "ansi":
      return f.ansi?.[tail] ?? fail();
    case "overlay":
      return resolveOverlay(tokens, flavor, variant, tail, opts).flat;
    default:
      return tokens.palette?.[head]?.[tail] ?? fail();
  }
}

/**
 * Resolve one overlay recipe (tokens.json5 § 3e) for a (flavor,
 * variant), composited over `surface` (default `bg`):
 *
 *   resolveOverlay(tokens, 'midnight', 'purple', 'selection')
 *     → { color: '#581c87', alpha: 0.5, flat: '#37194f' }
 *
 * `color` + `alpha` are for targets that blend; `flat` is the same
 * colour, pre-composited, for targets that can't. `border` is present
 * when the recipe has one.
 */
export function resolveOverlay(tokens, flavor, variant, name, opts = {}) {
  const recipe = tokens.overlay?.recipes?.[flavor]?.[name];
  if (!recipe) throw new Error(`resolveOverlay: no recipe ${flavor}.${name}`);
  if (String(recipe.color).startsWith("overlay.")) {
    throw new Error(`resolveOverlay: ${flavor}.${name} may not target another overlay`);
  }
  const surfaceName = opts.surface ?? "bg";
  const base = tokens.flavors[flavor].surface[surfaceName];
  if (!base) throw new Error(`resolveOverlay: unknown surface "${surfaceName}"`);
  const color = resolveColor(tokens, flavor, variant, recipe.color);
  const out = { color, alpha: recipe.alpha, flat: alphaOver(color, base, recipe.alpha) };
  if (recipe.border) out.border = resolveColor(tokens, flavor, variant, recipe.border);
  return out;
}

/**
 * Roles whose semantic colour is the same palette shade as the accent for
 * that role's own hue. Shade-index comparison (string-coerced, so `900`
 * and `"900"` collide) against the two shade rulesets — no colour math —
 * so it is exact, not approximate.
 *
 * See docs/superpowers/specs/2026-09-13-semantic-accent-collision-design.md.
 */
const COLLISION_GATED_ROLES = ["danger", "warning", "success"];

/**
 * Semantic roles deliberately exempt from the collision gate.
 *
 * `info`: sharing the primary blue is the convention across most design
 * systems and makes nothing unsafe: an info banner that matches the
 * primary is redundant, whereas a destructive button that matches it is
 * misleading. Both fixes for the one existing info collision
 * (midnight-blue) carry a real aesthetic cost, so the rule is stated for
 * the three roles that must read differently from the primary.
 *
 * Every key in `semantic_hues` must appear in exactly one of this list or
 * `COLLISION_GATED_ROLES` — `check()` enforces that below.
 */
const COLLISION_EXEMPT_ROLES = ["info"];

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

/* =====================================================================
   JSON5 → JSON  (exported, used both by main() and the CSS generator)
   ===================================================================== */

export function json5ToJson(src) {
  let out = "";
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    const c2 = src.slice(i, i + 2);

    if (c2 === "//") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c2 === "/*") {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) throw new Error("Unterminated block comment");
      i = end + 2;
      continue;
    }
    if (c === '"') {
      out += c;
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          out += src[i] + src[i + 1];
          i += 2;
          continue;
        }
        if (src[i] === '"') {
          out += src[i];
          i++;
          break;
        }
        out += src[i];
        i++;
      }
      continue;
    }
    if (c === "'") {
      out += '"';
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          out += src[i] + src[i + 1];
          i += 2;
          continue;
        }
        if (src[i] === "'") {
          out += '"';
          i++;
          break;
        }
        if (src[i] === '"') {
          out += '\\"';
          i++;
          continue;
        }
        out += src[i];
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }

  out = out.replace(/,(\s*[}\]])/g, "$1");
  out = out.replace(
    /([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*|[0-9]+)\s*:/g,
    (m, pre, key) => `${pre}"${key}":`,
  );
  return out;
}

export function resolveRefs(node, root) {
  if (typeof node === "string") {
    if (!node.startsWith("$")) return node;
    const path = node.slice(1).split(".");
    let cur = root;
    for (const part of path) {
      if (cur == null || !(part in cur)) {
        throw new Error(`Unknown reference: ${node}`);
      }
      cur = cur[part];
    }
    if (typeof cur === "string" && cur.startsWith("$"))
      return resolveRefs(cur, root);
    return cur;
  }
  if (Array.isArray(node)) return node.map((v) => resolveRefs(v, root));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = resolveRefs(v, root);
    return out;
  }
  return node;
}

/**
 * Fill in the token groups that are derived rather than authored:
 * `flavors.*.semantic` from `semantic_shade`, `flavors.*.syntax` from
 * `syntax_shade` (issue #9). Both are the same shape as `ansi_shade` —
 * one shared hue map plus a per-flavor shade row.
 *
 * A slot whose hue names a palette hue resolves to `palette[hue][shade]`.
 * A slot whose hue names an entry of the flavor's own `text` ramp (only
 * `syntax.comment` today, → `fg_subtle`) resolves to that instead and
 * carries no shade.
 *
 * Mutates and returns `tokens`. Runs after `resolveRefs`, so `palette`
 * and `text` already hold literal hexes. Key order follows the hue maps,
 * and the derived groups are reinserted between `state` and `ansi` so
 * the emitted flavor shape is unchanged.
 */
export function expandShadeTables(tokens) {
  const groups = [
    ["semantic", tokens.semantic_hues, tokens.semantic_shade],
    ["syntax", tokens.syntax_hues, tokens.syntax_shade],
  ];

  for (const [fName, f] of Object.entries(tokens.flavors)) {
    for (const [group, hues, shades] of groups) {
      const out = {};
      for (const [slot, hue] of Object.entries(hues)) {
        if (hue in f.text) {
          out[slot] = f.text[hue];
          continue;
        }
        const shade = shades?.[fName]?.[slot];
        const hex = tokens.palette?.[hue]?.[shade];
        if (!hex) {
          throw new Error(
            `${group}_shade: no palette entry for ${fName}.${slot} → ${hue}-${shade}`,
          );
        }
        out[slot] = hex;
      }
      f[group] = out;
    }
    // Reinsert in authored order so tokens.json keeps its shape.
    const order = [
      "label",
      "type",
      "surface",
      "text",
      "border",
      "state",
      "semantic",
      "syntax",
      "ansi",
    ];
    const rebuilt = {};
    for (const k of order) if (k in f) rebuilt[k] = f[k];
    for (const k of Object.keys(f)) if (!(k in rebuilt)) rebuilt[k] = f[k];
    tokens.flavors[fName] = rebuilt;
  }
  return tokens;
}

/**
 * Fill in `flavors.<flavor>.overlay.<variant>.<name>` from the overlay
 * recipes (tokens.json5 § 3e): every recipe resolved for every variant
 * and flattened over the flavor's `bg`. Emitted after `ansi`, so the
 * existing flavor shape is unchanged up to that point.
 *
 * Mutates and returns `tokens`. Runs after expandShadeTables, because
 * recipes may name syntax slots and semantic roles.
 */
export function expandOverlays(tokens) {
  for (const fName of Object.keys(tokens.flavors)) {
    const byVariant = {};
    for (const variant of tokens.variant_hues) {
      const out = {};
      for (const name of Object.keys(tokens.overlay.roles)) {
        out[name] = resolveOverlay(tokens, fName, variant, name);
      }
      byVariant[variant] = out;
    }
    tokens.flavors[fName].overlay = byVariant;
  }
  return tokens;
}

/** Parsed tokens.json5 → fully resolved token object (refs, shade tables, overlays). */
export function resolveTokens(parsed) {
  return expandOverlays(expandShadeTables(resolveRefs(parsed, parsed)));
}

/**
 * Convenience for downstream ports: load + parse + resolve in one call.
 *
 *   const tokens = await loadTokens();  // defaults to ../tokens.json5
 *   const accent = resolveAccent(tokens, 'midnight', 'purple');
 *   const sel    = tokens.flavors.midnight.overlay.purple.selection.flat;
 */
export async function loadTokens(path = join(ROOT, "tokens.json5")) {
  const src = await readFile(path, "utf8");
  return resolveTokens(JSON.parse(json5ToJson(src)));
}

/* =====================================================================
   SHAPE VALIDATION  (exported; run before anything is resolved further)
   ─────────────────────────────────────────────────────────────────────
   Role objects are free-form JSON5, so a typo such as `colour:` or
   `style: ["italics"]` used to pass silently and leave a port to fall
   back to whatever its own default was. Every role map is checked for
   allowed keys, known style names, and colour targets that resolve.
   ===================================================================== */

const STYLES = ["italic", "bold", "underline", "reverse"];

/**
 * Structural check of the authored token maps. Takes tokens after
 * resolveRefs + expandShadeTables (overlays need not be expanded) and
 * returns a list of error strings, empty when everything is well-formed.
 */
export function validateShapes(tokens) {
  const errs = [];
  const flavors = Object.keys(tokens.flavors ?? {});
  const variants = tokens.variant_hues ?? [];
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const keysOk = (where, obj, allowed) => {
    for (const k of Object.keys(obj)) {
      if (!allowed.includes(k)) {
        errs.push(`✗ ${where}: unknown key "${k}" (allowed: ${allowed.join(", ")})`);
      }
    }
  };
  const stylesOk = (where, style) => {
    if (style === undefined) return;
    if (!Array.isArray(style)) {
      errs.push(`✗ ${where}.style must be an array`);
      return;
    }
    for (const st of style) {
      if (!STYLES.includes(st)) {
        errs.push(`✗ ${where}.style: unknown style "${st}" (known: ${STYLES.join(", ")})`);
      }
    }
  };
  // A target must resolve on every (flavor, variant) — a palette rung
  // that exists for one hue may be missing for another.
  const targetOk = (where, target, opts = {}) => {
    if (opts.noOverlay && String(target).startsWith("overlay.")) {
      errs.push(`✗ ${where}: "${target}" — overlay targets aren't allowed here`);
      return;
    }
    for (const fl of flavors) {
      for (const v of variants) {
        try {
          resolveColor(tokens, fl, v, target, opts);
        } catch {
          errs.push(`✗ ${where}: colour target "${target}" doesn't resolve on ${fl}/${v}`);
          return;
        }
      }
    }
  };
  const stringList = (where, list) => {
    if (list === undefined) return [];
    if (!Array.isArray(list) || list.some((x) => typeof x !== "string")) {
      errs.push(`✗ ${where} must be an array of strings`);
      return [];
    }
    return list;
  };
  const surfaceOk = (where, s) => {
    for (const fl of flavors) {
      if (!(s in tokens.flavors[fl].surface)) {
        errs.push(`✗ ${where} lists "${s}", missing from ${fl}.surface`);
      }
    }
  };

  // ── overlay (§ 3e) ──────────────────────────────────────────────────
  const ov = tokens.overlay;
  if (!isObj(ov?.roles) || !isObj(ov?.recipes)) {
    errs.push(`✗ overlay needs both "roles" and "recipes"`);
  } else {
    keysOk("overlay", ov, ["roles", "recipes"]);
    for (const [name, role] of Object.entries(ov.roles)) {
      const w = `overlay.roles.${name}`;
      if (!isObj(role)) {
        errs.push(`✗ ${w} must be an object`);
        continue;
      }
      keysOk(w, role, ["behind", "use", "text", "text_on_bg", "surfaces"]);
      if (!["code", "ui"].includes(role.behind)) {
        errs.push(`✗ ${w}.behind is "${role.behind}" — expected "code" or "ui"`);
      }
      if (role.behind === "ui") {
        const text = stringList(`${w}.text`, role.text);
        if (!text.length) errs.push(`✗ ${w}: a "ui" overlay needs a non-empty text list`);
        for (const t of [...text, ...stringList(`${w}.text_on_bg`, role.text_on_bg)]) {
          if (!TEXT_ALIASES.includes(t)) errs.push(`✗ ${w}: "${t}" is not a text role`);
        }
        const surfaces = stringList(`${w}.surfaces`, role.surfaces);
        if (!surfaces.length) {
          errs.push(`✗ ${w}: a "ui" overlay needs a non-empty surfaces list`);
        }
        for (const sName of surfaces) surfaceOk(`${w}.surfaces`, sName);
      }
    }
    for (const fl of Object.keys(ov.recipes)) {
      if (!flavors.includes(fl)) errs.push(`✗ overlay.recipes.${fl}: no such flavor`);
    }
    for (const fl of flavors) {
      const rows = ov.recipes[fl];
      if (!isObj(rows)) {
        errs.push(`✗ overlay.recipes.${fl} missing`);
        continue;
      }
      for (const name of Object.keys(ov.roles)) {
        if (!(name in rows)) errs.push(`✗ overlay.recipes.${fl}.${name} missing`);
      }
      for (const [name, r] of Object.entries(rows)) {
        const w = `overlay.recipes.${fl}.${name}`;
        if (!(name in ov.roles)) {
          errs.push(`✗ ${w}: no overlay.roles entry of that name`);
          continue;
        }
        if (!isObj(r)) {
          errs.push(`✗ ${w} must be an object`);
          continue;
        }
        keysOk(w, r, ["color", "alpha", "border"]);
        if (typeof r.alpha !== "number" || !(r.alpha > 0 && r.alpha <= 1)) {
          errs.push(`✗ ${w}.alpha must be a number in (0, 1]`);
        }
        if (r.color === undefined) errs.push(`✗ ${w}.color missing`);
        else targetOk(`${w}.color`, r.color, { noOverlay: true });
        if (r.border !== undefined) targetOk(`${w}.border`, r.border, { noOverlay: true });
      }
    }
  }

  // ── control_boundary (§ 3f) ─────────────────────────────────────────
  const cb = tokens.control_boundary;
  if (!cb || typeof cb.min !== "number") {
    errs.push(`✗ control_boundary missing or has no numeric min`);
  }
  if (!Array.isArray(cb?.surfaces) || cb.surfaces.length === 0) {
    errs.push(`✗ control_boundary.surfaces missing or empty`);
  } else {
    for (const sName of cb.surfaces) surfaceOk("control_boundary.surfaces", sName);
  }
  for (const fl of flavors) {
    if (!tokens.flavors[fl].border?.control) errs.push(`✗ ${fl}.border.control missing`);
  }

  // ── distinct + apca_targets (§ 3g) ──────────────────────────────────
  const d = tokens.distinct;
  if (!isObj(d) || typeof d.min !== "number" || typeof d.related_min !== "number") {
    errs.push(`✗ distinct needs numeric "min" and "related_min"`);
  } else {
    keysOk("distinct", d, ["min", "related_min", "syntax", "ansi"]);
    const slots = [...Object.keys(tokens.syntax_hues ?? {}), "fg"];
    for (const kind of ["alias", "related"]) {
      for (const pr of d.syntax?.[kind] ?? []) {
        if (!Array.isArray(pr) || pr.length !== 2 || pr.some((x) => !slots.includes(x))) {
          errs.push(`✗ distinct.syntax.${kind}: ${JSON.stringify(pr)} is not a pair of syntax slots`);
        }
      }
    }
    for (const [fl, pairs] of Object.entries(d.ansi?.exempt ?? {})) {
      if (!flavors.includes(fl)) {
        errs.push(`✗ distinct.ansi.exempt.${fl}: no such flavor`);
        continue;
      }
      for (const pr of pairs) {
        const ansi = tokens.flavors[fl].ansi;
        if (!Array.isArray(pr) || pr.length !== 2 || pr.some((x) => !(x in ansi))) {
          errs.push(`✗ distinct.ansi.exempt.${fl}: ${JSON.stringify(pr)} is not a pair of ansi slots`);
        }
      }
    }
  }
  for (const k of ["body", "syntax", "comment"]) {
    if (typeof tokens.apca_targets?.[k] !== "number") {
      errs.push(`✗ apca_targets.${k} missing or not a number`);
    }
  }

  // ── syntax_tokens.extended / semantic_token_recommendations ─────────
  // Targets here are the syntax vocabulary only: core slot, text alias,
  // semantic.<role>.
  const syntaxTarget = (where, target) => {
    const ok =
      target in (tokens.syntax_hues ?? {}) ||
      TEXT_ALIASES.includes(target) ||
      (typeof target === "string" &&
        target.startsWith("semantic.") &&
        target.slice(9) in (tokens.semantic_hues ?? {}));
    if (!ok) errs.push(`✗ ${where}: "${target}" is not a syntax slot, text alias or semantic.<role>`);
  };
  const syntaxEntry = (where, e, { allowNone = false } = {}) => {
    if (typeof e === "string") {
      if (allowNone && e === "none") return;
      syntaxTarget(where, e);
      return;
    }
    if (!isObj(e)) {
      errs.push(`✗ ${where} must be a string or { color?, style? }`);
      return;
    }
    keysOk(where, e, ["color", "style"]);
    if (e.color === undefined && e.style === undefined) {
      errs.push(`✗ ${where} has neither color nor style`);
    }
    if (e.color !== undefined) syntaxTarget(`${where}.color`, e.color);
    stylesOk(where, e.style);
  };
  for (const [k, e] of Object.entries(tokens.syntax_tokens?.extended ?? {})) {
    syntaxEntry(`syntax_tokens.extended.${k}`, e);
  }
  const str = tokens.semantic_token_recommendations ?? {};
  for (const [k, e] of Object.entries(str.types ?? {})) {
    syntaxEntry(`semantic_token_recommendations.types.${k}`, e);
  }
  for (const [k, e] of Object.entries(str.modifiers ?? {})) {
    syntaxEntry(`semantic_token_recommendations.modifiers.${k}`, e, { allowNone: true });
  }

  // ── workbench_color_roles (§ 13) ────────────────────────────────────
  const wb = tokens.workbench_color_roles ?? {};
  for (const group of ["signals", "git"]) {
    for (const [k, target] of Object.entries(wb[group] ?? {})) {
      targetOk(`workbench_color_roles.${group}.${k}`, target);
    }
  }
  for (const target of wb.bracket_pairs ?? []) {
    targetOk(`workbench_color_roles.bracket_pairs`, target);
  }
  if (wb.bracket_unexpected !== undefined) {
    targetOk(`workbench_color_roles.bracket_unexpected`, wb.bracket_unexpected);
  }

  // ── shell_roles / prompt_roles (§ 15–16) ────────────────────────────
  // fish reads one theme file, so a variable may be fed by one role
  // across both maps; likewise one PSReadLine key.
  const fed = { fish: new Map(), psreadline: new Map(), starship: new Map() };
  for (const [mapName, allowed, sinks] of [
    ["shell_roles", ["color", "background", "style", "fish", "psreadline"], ["fish", "psreadline"]],
    ["prompt_roles", ["color", "style", "starship", "fish"], ["starship", "fish"]],
  ]) {
    const m = tokens[mapName];
    if (!isObj(m?.roles)) {
      errs.push(`✗ ${mapName}.roles missing`);
      continue;
    }
    keysOk(mapName, m, mapName === "prompt_roles" ? ["surface", "roles", "language_hues"] : ["surface", "roles"]);
    if (typeof m.surface !== "string") errs.push(`✗ ${mapName}.surface missing`);
    else surfaceOk(`${mapName}.surface`, m.surface);
    for (const [name, role] of Object.entries(m.roles)) {
      const w = `${mapName}.roles.${name}`;
      if (!isObj(role)) {
        errs.push(`✗ ${w} must be an object`);
        continue;
      }
      keysOk(w, role, allowed);
      if (role.color === undefined && role.background === undefined && role.style === undefined) {
        errs.push(`✗ ${w} has no color, background or style`);
      }
      if (role.color !== undefined) targetOk(`${w}.color`, role.color, { surface: m.surface });
      if (role.background !== undefined) {
        targetOk(`${w}.background`, role.background, { surface: m.surface });
      }
      stylesOk(w, role.style);
      for (const sink of sinks) {
        for (const key of stringList(`${w}.${sink}`, role[sink])) {
          if (fed[sink].has(key)) {
            errs.push(`✗ ${w}.${sink}: "${key}" is already fed by ${fed[sink].get(key)}`);
          } else fed[sink].set(key, w);
        }
      }
    }
  }
  for (const [mod, hue] of Object.entries(tokens.prompt_roles?.language_hues ?? {})) {
    if (!variants.includes(hue)) {
      errs.push(`✗ prompt_roles.language_hues.${mod}: "${hue}" is not a variant hue`);
    }
  }

  return errs;
}

/* =====================================================================
   GATES  (used by main(); every one runs before anything is written)
   ===================================================================== */

/**
 * Every contrast gate, plus the distinctness gate. Takes fully resolved
 * tokens (loadTokens / resolveTokens output). Returns failure strings.
 *
 * `onPair(row)` — optional — is called for every contrast pair a gate
 * evaluates, pass or fail: { group, where, fg, bg, ratio, min, apca? }.
 * That is what `--report` prints.
 */
function check(tokens, { onPair } = {}) {
  const warns = [];
  const pair = (group, where, fg, bg, min, apcaTarget) => {
    const ratio = contrast(fg, bg);
    onPair?.({ group, where, fg, bg, ratio, min, apcaTarget });
    if (ratio < min) {
      warns.push(`✗ ${where} (${fg} on ${bg}): ${ratio.toFixed(2)}:1 < ${min}`);
    }
  };

  // The collision gate below is an allowlist (COLLISION_GATED_ROLES), so a
  // role rename or a new semantic_hues entry that lands in neither list
  // would otherwise silently stop being checked. Keep the two lists in
  // lockstep with semantic_hues before trusting the gate.
  for (const role of COLLISION_GATED_ROLES) {
    if (!(role in (tokens.semantic_hues ?? {}))) {
      warns.push(
        `✗ collision gate names role "${role}" but semantic_hues has no such role — the gate is silently not checking it`,
      );
    }
  }
  for (const key of Object.keys(tokens.semantic_hues ?? {})) {
    if (
      !COLLISION_GATED_ROLES.includes(key) &&
      !COLLISION_EXEMPT_ROLES.includes(key)
    ) {
      warns.push(
        `✗ semantic role "${key}" is neither collision-gated nor explicitly exempt — add it to one list in tools/build-tokens.mjs`,
      );
    }
  }
  // No danger/warning/success token may be the same shade as the accent for
  // its own hue, or the states the two exist to distinguish are not
  // distinguishable. Shade-index comparison (string-coerced, so `900` and
  // `"900"` collide); see semanticAccentCollisions.
  for (const c of semanticAccentCollisions(tokens)) {
    warns.push(
      `✗ ${c.flavor}.semantic.${c.role} is ${c.hue}.${c.shade}, the same shade as accent_shade.${c.flavor}.${c.hue} — the two states are indistinguishable`,
    );
  }
  if (warns.length) return warns;

  const t = tokens.apca_targets;
  for (const [fName, f] of Object.entries(tokens.flavors)) {
    const bg = f.surface.bg;
    for (const hue of tokens.variant_hues) {
      const shade = tokens.accent_shade[fName][hue];
      pair("accent", `${fName}/${hue}-${shade} accent on bg`, tokens.palette[hue][shade], bg, 4.5);
    }
    pair("text", `${fName}.text.fg on bg`, f.text.fg, bg, 4.5, t.body);
    pair("text", `${fName}.text.fg_subtle on bg`, f.text.fg_subtle, bg, 4.5, t.comment);

    // Code is body text: the old 3:1 warning here was the large-text
    // threshold. Every slot clears 4.5:1 on the canvas (issue #19).
    for (const [slot, color] of Object.entries(f.syntax)) {
      pair("syntax", `${fName}.syntax.${slot} on bg`, color, bg, 4.5, slot === "comment" ? t.comment : t.syntax);
    }

    // Overlays (§ 3e). A "code" overlay sits behind whole lines of code,
    // so every syntax slot, fg, fg_subtle and the semantic colours must
    // stay readable on it — people read code while it is selected, on
    // the current line, inside a find match. A "ui" overlay gates only
    // its declared text roles, on every surface it may land on.
    const codeText = {
      ...Object.fromEntries(Object.entries(f.syntax).map(([k, v]) => [`syntax.${k}`, v])),
      "text.fg": f.text.fg,
      "text.fg_subtle": f.text.fg_subtle,
      ...Object.fromEntries(Object.entries(f.semantic).map(([k, v]) => [`semantic.${k}`, v])),
    };
    for (const [name, role] of Object.entries(tokens.overlay.roles)) {
      for (const hue of tokens.variant_hues) {
        if (role.behind === "code") {
          const o = f.overlay[hue][name];
          for (const [k, c] of Object.entries(codeText)) {
            pair("overlay", `${fName}/${hue} ${k} on overlay.${name}`, c, o.flat, 4.5);
          }
        } else {
          for (const sName of role.surfaces) {
            const o = resolveOverlay(tokens, fName, hue, name, { surface: sName });
            for (const k of role.text) {
              pair("overlay", `${fName}/${hue} text.${k} on overlay.${name} over ${sName}`, f.text[k], o.flat, 4.5);
            }
          }
          for (const k of role.text_on_bg ?? []) {
            pair("overlay", `${fName}/${hue} text.${k} on overlay.${name} over bg`, f.text[k], f.overlay[hue][name].flat, 4.5);
          }
        }
        const border = f.overlay[hue][name].border;
        if (border) {
          pair("overlay", `${fName}/${hue} overlay.${name} border vs bg`, border, bg, tokens.control_boundary.min);
        }
      }
    }

    // Control boundaries: WCAG 1.4.11 (issue #15). `border.control` is
    // the one token a port can outline a control with and know the
    // component's boundary is identifiable. It has to hold on every
    // surface a control lands on, not just the canvas — a dialog button
    // sits on `bg`, a card button on `bg_soft`, a menu item on
    // `bg_overlay`, an input well on `bg_sunk`. `bg_inset` is exempt,
    // for the reason given in tokens.json5 § 3f.
    for (const sName of tokens.control_boundary.surfaces) {
      pair("control", `${fName}.border.control on ${sName}`, f.border.control, f.surface[sName], tokens.control_boundary.min);
    }

    // ANSI slots must match the ansi_shade ruleset, and must clear
    // 4.5:1 against this flavor's bg_terminal — the one surface a
    // standalone terminal emulator shows. Both checks exist because
    // nothing else gates the 16-color palette: before issue #7 the
    // "verified ≥4.5:1" claims in tokens.json5 were hand-computed and
    // would have gone stale silently on the next shade edit.
    const bgTerm = f.surface.bg_terminal;
    const exempt = new Set(tokens.ansi_exempt?.[fName] ?? []);
    for (const [slot, hue] of Object.entries(tokens.ansi_hues)) {
      for (const [row, name] of [
        ["normal", slot],
        ["bright", `bright_${slot}`],
      ]) {
        const shade = tokens.ansi_shade?.[fName]?.[row]?.[slot];
        const expected = tokens.palette[hue][shade];
        if (f.ansi[name] !== expected) {
          warns.push(
            `✗ ${fName}.ansi.${name} is ${f.ansi[name]}, but ansi_shade says ${hue}-${shade} (${expected})`,
          );
        }
      }
    }
    for (const slot of exempt) {
      if (!(slot in f.ansi)) {
        warns.push(
          `✗ ${fName}: ansi_exempt lists "${slot}", which is not an ansi slot`,
        );
      }
    }
    for (const [slot, color] of Object.entries(f.ansi)) {
      if (exempt.has(slot)) continue;
      pair("ansi", `${fName}.ansi.${slot} on bg_terminal`, color, bgTerm, 4.5);
    }

    // The derived groups must cover their hue map exactly once per
    // flavor: a palette-hue slot needs a shade row entry, a text-alias
    // slot must not have one. expandShadeTables() throws on the missing
    // half, so what is left to catch here is the surplus — a stale shade
    // entry for a slot that resolves from the text ramp, or one for a
    // slot the hue map no longer has.
    for (const [group, hues, shades] of [
      ["semantic", tokens.semantic_hues, tokens.semantic_shade],
      ["syntax", tokens.syntax_hues, tokens.syntax_shade],
    ]) {
      const row = shades?.[fName] ?? {};
      for (const [slot, hue] of Object.entries(hues)) {
        if (hue in f.text && slot in row) {
          warns.push(
            `✗ ${group}_shade.${fName}.${slot} is set, but ${slot} resolves from text.${hue} and takes no shade`,
          );
        }
      }
      for (const slot of Object.keys(row)) {
        if (!(slot in hues)) {
          warns.push(
            `✗ ${group}_shade.${fName}.${slot} has no entry in ${group}_hues`,
          );
        }
      }
    }

    // Semantic colors must be readable (≥4.5:1) on every surface token
    // except bg_scrim (a translucent overlay, not a fill) and bg_inset
    // (docked structural chrome — banners render on bg/bg_soft, never here).
    const semanticSurfaces = Object.entries(f.surface).filter(
      ([k]) => k !== "bg_scrim" && k !== "bg_inset",
    );
    for (const [role, color] of Object.entries(f.semantic)) {
      for (const [sName, sColor] of semanticSurfaces) {
        pair("semantic", `${fName}.semantic.${role} on ${sName}`, color, sColor, 4.5);
      }
    }

    // Shell and prompt roles (§ 15–16): every role with a colour must
    // stay readable on what it is drawn on — its own background if it
    // has one, otherwise the map's surface (bg_terminal) — for every
    // variant, since `accent` and "overlay.*" vary with it.
    for (const mapName of ["shell_roles", "prompt_roles"]) {
      const m = tokens[mapName];
      const surface = m.surface;
      for (const [name, role] of Object.entries(m.roles)) {
        if (role.color === undefined) continue;
        for (const hue of tokens.variant_hues) {
          const fg = resolveColor(tokens, fName, hue, role.color, { surface });
          const back = role.background
            ? resolveColor(tokens, fName, hue, role.background, { surface })
            : f.surface[surface];
          pair(mapName, `${fName}/${hue} ${mapName}.${name}`, fg, back, 4.5);
        }
      }
    }
    for (const [mod, hue] of Object.entries(tokens.prompt_roles.language_hues)) {
      const fg = resolveColor(tokens, fName, hue, `hue.${hue}`);
      pair("prompt_roles", `${fName} prompt_roles.language_hues.${mod}`, fg, f.surface[tokens.prompt_roles.surface], 4.5);
    }
  }

  // The 12 core slots are the contract ports build against, so the hue
  // map has to stay in lockstep with syntax_tokens.core. Flavor-
  // independent, hence outside the loop above.
  for (const slot of tokens.syntax_tokens.core) {
    if (!(slot in tokens.syntax_hues)) {
      warns.push(
        `✗ syntax_tokens.core lists "${slot}", missing from syntax_hues`,
      );
    }
  }

  warns.push(...distinctnessIssues(tokens));
  return warns;
}

/**
 * The distinctness gate (tokens.json5 § 3g): resolved colours that must
 * not look alike, measured in OKLab. Returns failure strings.
 */
export function distinctnessIssues(tokens) {
  const out = [];
  const d = tokens.distinct;
  const key = (a, b) => [a, b].sort().join("|");
  const alias = new Set((d.syntax?.alias ?? []).map(([a, b]) => key(a, b)));
  const related = new Set((d.syntax?.related ?? []).map(([a, b]) => key(a, b)));
  const base = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

  for (const [fName, f] of Object.entries(tokens.flavors)) {
    const colors = { ...f.syntax, fg: f.text.fg };
    const slots = Object.keys(colors);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const k = key(slots[i], slots[j]);
        if (alias.has(k)) continue;
        const min = related.has(k) ? d.related_min : d.min;
        const dist = deltaE(colors[slots[i]], colors[slots[j]]);
        if (dist < min) {
          out.push(
            `✗ ${fName}: syntax ${slots[i]} (${colors[slots[i]]}) and ${slots[j]} (${colors[slots[j]]}) are ${dist.toFixed(1)} apart in OKLab, need ${min} — alias them in distinct.syntax if that's on purpose`,
          );
        }
      }
    }
    const exempt = new Set((d.ansi?.exempt?.[fName] ?? []).map(([a, b]) => key(a, b)));
    for (const prefix of ["", "bright_"]) {
      const row = base.map((s) => prefix + s);
      for (let i = 0; i < row.length; i++) {
        for (let j = i + 1; j < row.length; j++) {
          if (exempt.has(key(row[i], row[j]))) continue;
          const dist = deltaE(f.ansi[row[i]], f.ansi[row[j]]);
          if (dist < d.min) {
            out.push(
              `✗ ${fName}: ansi ${row[i]} (${f.ansi[row[i]]}) and ${row[j]} (${f.ansi[row[j]]}) are ${dist.toFixed(1)} apart in OKLab, need ${d.min}`,
            );
          }
        }
      }
    }
    for (const s of base) {
      if (exempt.has(key(s, `bright_${s}`))) continue;
      const dist = deltaE(f.ansi[s], f.ansi[`bright_${s}`]);
      if (dist < d.related_min) {
        out.push(
          `✗ ${fName}: ansi ${s} (${f.ansi[s]}) and bright_${s} (${f.ansi[`bright_${s}`]}) are ${dist.toFixed(1)} apart in OKLab, need ${d.related_min}`,
        );
      }
    }
  }
  return out;
}

/* =====================================================================
   Tiny self-test  (run when invoked as CLI with --test)
   ===================================================================== */

async function selfTest() {
  const real = await loadTokens();
  // A structural clone with one mutation — for the cases that prove a
  // gate or validator actually rejects something.
  const mutated = (fn) => {
    const t = structuredClone(real);
    fn(t);
    return t;
  };
  const has = (list, needle) => list.some((m) => m.includes(needle));

  const cases = [
    // mix
    [() => mix("#000000", "#ffffff", 0.5), "#808080", "mix 50/50 black+white"],
    [() => mix("#ffffff", "#000000", 0), "#000000", "mix p=0 returns B"],
    [() => mix("#ffffff", "#000000", 1), "#ffffff", "mix p=1 returns A"],
    [
      () => mix("#d8b4fe", "#171717", 0.25),
      "#473e51",
      "midnight selection (purple)",
    ],

    // selectedWash — issue #14
    [
      () => selectedWash({ surface: "#171717", accent: "#d8b4fe" }),
      "#3a3341",
      "midnight selected wash (purple) on bg",
    ],
    [
      () => selectedWash({ surface: "#434f60", accent: "#d8b4fe" }),
      "#5e617c",
      "midnight selected wash (purple) on bg_inset",
    ],

    // alphaOver
    [
      () => alphaOver("#ffffff", "#171717", 0.08),
      "#2a2a2a",
      "8% white over midnight",
    ],
    [
      () => alphaOver("#000000", "#f5f5f5", 0.05),
      "#e9e9e9",
      "5% black over noon",
    ],

    // contrast (just sanity-check)
    [
      () => Math.round(contrast("#ffffff", "#000000")),
      21,
      "pure black/white = 21:1",
    ],
    [() => Math.round(contrast("#171717", "#171717")), 1, "same colour = 1:1"],

    // readableOn
    [() => readableOn("#171717"), "#f5f5f5", "readable on midnight"],
    [() => readableOn("#f5f5f5"), "#171717", "readable on noon"],

    // semanticAccentCollisions — a role whose semantic_shade equals the
    // accent_shade for its own hue is a collision; info is excluded by rule.
    [
      () =>
        semanticAccentCollisions({
          semantic_hues: {
            success: "green",
            warning: "yellow",
            danger: "red",
            info: "blue",
          },
          semantic_shade: {
            x: { success: 900, warning: 900, danger: 900, info: 300 },
          },
          accent_shade: { x: { red: 900, yellow: 700, green: 700, blue: 300 } },
        })
          .map((c) => `${c.flavor}.${c.role}`)
          .join(","),
      "x.danger",
      "collision: danger matches accent, info excluded even when it matches",
    ],
    [
      () =>
        semanticAccentCollisions({
          semantic_hues: {
            success: "green",
            warning: "yellow",
            danger: "red",
            info: "blue",
          },
          semantic_shade: {
            x: { success: 900, warning: 900, danger: 900, info: 900 },
          },
          accent_shade: { x: { red: 800, yellow: 800, green: 800, blue: 900 } },
        }).length,
      0,
      "no collision when every gated role differs from its accent",
    ],

    // perceptual helpers
    [() => deltaE("#123456", "#123456"), 0, "deltaE of a colour with itself is 0"],
    [() => Math.round(deltaE("#000000", "#ffffff")), 100, "deltaE black/white = 100"],
    [() => Math.round(apcaContrast("#000000", "#ffffff")), 106, "APCA black on white ≈ Lc 106"],
    [() => Math.round(apcaContrast("#ffffff", "#000000")), -108, "APCA white on black ≈ Lc -108"],

    // resolveColor / resolveOverlay — issue #19
    [() => resolveColor(real, "midnight", "purple", "accent.900"), "#581c87", "accent.<rung> follows the variant hue"],
    [() => resolveColor(real, "dawn", "red", "hue.green"), "#3f6212", "hue.<hue> resolves at that hue's accent rung"],
    [() => resolveColor(real, "dawn", "red", "semantic.danger"), "#7f1d1d", "semantic.<role>"],
    [() => resolveColor(real, "noon", "red", "keyword"), real.flavors.noon.syntax.keyword, "core syntax slot"],
    [
      () => resolveColor(real, "midnight", "purple", "overlay.selected"),
      "#3a3341",
      "overlay.selected over bg = the old 18% wash",
    ],
    [
      () => resolveOverlay(real, "midnight", "purple", "selected", { surface: "bg_inset" }).flat,
      selectedWash({ surface: "#434f60", accent: "#d8b4fe" }),
      "resolveOverlay over another surface matches selectedWash()",
    ],
    [
      () => {
        try {
          resolveColor(real, "midnight", "red", "purple");
          return "resolved";
        } catch {
          return "threw";
        }
      },
      "threw",
      "a bare hue name is not a colour target",
    ],

    // validateShapes — typos fail instead of passing silently
    [() => validateShapes(real).length, 0, "real tokens are well-formed"],
    [
      () => has(validateShapes(mutated((t) => (t.shell_roles.roles.command = { colour: "accent" }))), 'unknown key "colour"'),
      true,
      "shell role with `colour:` is rejected",
    ],
    [
      () => has(validateShapes(mutated((t) => (t.syntax_tokens.extended.label = { color: "fg", style: ["italics"] }))), 'unknown style "italics"'),
      true,
      "unknown style name is rejected",
    ],
    [
      () => has(validateShapes(mutated((t) => (t.prompt_roles.roles.time.color = "fg_mutted"))), '"fg_mutted" doesn\'t resolve'),
      true,
      "unresolvable colour target is rejected",
    ],
    [
      () => has(validateShapes(mutated((t) => delete t.overlay.recipes.noon.find_match)), "overlay.recipes.noon.find_match missing"),
      true,
      "a flavor missing an overlay recipe is rejected",
    ],
    [
      () => has(validateShapes(mutated((t) => t.shell_roles.roles.keyword.fish.push("fish_color_command"))), "already fed by"),
      true,
      "two roles feeding one fish variable is rejected",
    ],

    // gates — the real tokens pass, and each gate bites
    [() => check(real).length, 0, "real tokens pass every gate"],
    [
      () =>
        has(
          check(mutated((t) => {
            for (const v of t.variant_hues) {
              t.flavors.midnight.overlay[v].selection.flat = selection({
                bg: t.flavors.midnight.surface.bg,
                accent: resolveAccent(t, "midnight", v),
              });
            }
          })),
          "on overlay.selection",
        ),
      true,
      "the old lightening selection (25% accent) fails the syntax-on-overlay gate",
    ],
    [
      () => has(check(mutated((t) => (t.flavors.dawn.syntax.number = "#c2410c"))), "dawn.syntax.number on bg"),
      true,
      "syntax below 4.5:1 on bg is an error, not a 3:1 warning",
    ],
    [() => distinctnessIssues(real).length, 0, "real tokens pass the distinctness gate"],
    [
      () => has(distinctnessIssues(mutated((t) => (t.flavors.dawn.syntax.parameter = "#7c2d12"))), "dawn: syntax parameter (#7c2d12) and type"),
      true,
      "dawn's old parameter/type browns (ΔE 4.6) are caught",
    ],
    [
      () => has(distinctnessIssues(mutated((t) => (t.flavors.midnight.ansi.blue = t.flavors.midnight.ansi.bright_blue))), "ansi blue"),
      true,
      "an ANSI colour identical to its bright version is caught",
    ],
  ];

  let pass = 0,
    fail = 0;
  for (const [fn, expected, name] of cases) {
    const got = fn();
    if (got === expected) {
      console.log(`  ✓ ${name}`);
      pass++;
    } else {
      console.log(
        `  ✗ ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`,
      );
      fail++;
    }
  }
  console.log(`\n  ${pass}/${pass + fail} passed.`);
  return fail === 0;
}

/* =====================================================================
   CLI entry
   ===================================================================== */

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    console.log("Self-test:");
    process.exit((await selfTest()) ? 0 : 1);
  }

  const opts = Object.fromEntries(
    args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
  );

  const checkMode = args.includes("--check");
  const reportMode = args.includes("--report");

  const srcPath = join(ROOT, "tokens.json5");
  const outPath = opts.out || join(ROOT, "tokens.json");
  const jsOutPath = join(ROOT, "dist", "tokens.js");

  // Shape first: a typo'd role key would otherwise surface as a
  // confusing resolution error, or not at all.
  const parsed = JSON.parse(json5ToJson(await readFile(srcPath, "utf8")));
  const partial = expandShadeTables(resolveRefs(parsed, parsed));
  const shapeErrs = validateShapes(partial);
  if (shapeErrs.length) {
    console.error("Shape errors in tokens.json5 (nothing written):");
    for (const e of shapeErrs) console.error("  " + e);
    process.exit(1);
  }
  const tokens = expandOverlays(partial);

  // Gates run BEFORE anything is written, so a failing build leaves the
  // previous tokens.json / dist/tokens.js on disk untouched — a port on
  // a local-path dependency never picks up rejected values.
  const rows = [];
  const warns = check(tokens, { onPair: (r) => rows.push(r) });

  if (reportMode) {
    printReport(rows);
    process.exit(warns.length ? 1 : 0);
  }

  if (warns.length) {
    console.error("Gate failures (nothing written):");
    for (const w of warns) console.error("  " + w);
    process.exit(1);
  }

  const jsonOut = JSON.stringify(tokens, null, 2);
  const jsOut =
    `// AUTO-GENERATED from tokens.json5 — do not edit.\n` +
    `export default ${jsonOut};\n`;

  if (checkMode) {
    const drift = [];
    for (const [path, expected] of [
      [outPath, jsonOut],
      [jsOutPath, jsOut],
    ]) {
      let existing = "";
      try {
        existing = await readFile(path, "utf8");
      } catch {}
      if (existing !== expected) drift.push(relative(ROOT, path));
    }
    if (drift.length) {
      console.error(
        `✗ ${drift.join(", ")} out of date — run \`node tools/build-tokens.mjs\`.`,
      );
      process.exit(1);
    }
    console.log(`✓ ${relative(ROOT, outPath)} matches tokens.json5`);
    console.log(`✓ ${relative(ROOT, jsOutPath)} matches tokens.json5`);
  } else {
    await writeFile(outPath, jsonOut);
    await mkdir(join(ROOT, "dist"), { recursive: true });
    await writeFile(jsOutPath, jsOut);
    console.log(`✓ ${relative(ROOT, outPath)}`);
    console.log(`✓ ${relative(ROOT, jsOutPath)}`);
  }

  console.log(`\n✓ ${rows.length} contrast pairs gated, all pass:`);
  console.log("  accents on bg · text and every syntax slot on bg at 4.5:1");
  console.log("  every syntax slot, fg, fg_subtle and semantic colour on every code overlay");
  console.log("  the selected-item wash on every sanctioned surface · overlay borders at 3:1");
  console.log("  border.control at 3:1 on every control surface (WCAG 1.4.11)");
  console.log("  ansi.* on bg_terminal · semantic colours on every surface");
  console.log("  shell_roles and prompt_roles on what they're drawn on");
  console.log("✓ Resolved colours pass the OKLab distinctness gate.");
  console.log("✓ Shade tables, overlay recipes and role maps are well-formed.");
  const below = rows.filter((r) => r.apcaTarget && Math.abs(apcaContrast(r.fg, r.bg)) < r.apcaTarget);
  console.log(
    `ℹ APCA (informational): ${below.length} of ${rows.filter((r) => r.apcaTarget).length} on-canvas text pairs below their Lc target — \`npm run report\` for detail.`,
  );
}

/** `--report`: every gated pair with its WCAG ratio and APCA Lc. */
function printReport(rows) {
  const groups = [...new Set(rows.map((r) => r.group))];
  for (const group of groups) {
    console.log(`\n── ${group} ${"─".repeat(Math.max(0, 60 - group.length))}`);
    for (const r of rows.filter((x) => x.group === group)) {
      printRow(r);
    }
  }
}

function printRow(r) {
  const lc = Math.abs(apcaContrast(r.fg, r.bg));
  const wcagMark = r.ratio < r.min ? "✗" : " ";
  const apcaNote = r.apcaTarget
    ? `Lc ${lc.toFixed(0).padStart(3)}${lc < r.apcaTarget ? ` < ${r.apcaTarget}` : ""}`
    : `Lc ${lc.toFixed(0).padStart(3)}`;
  console.log(
    `${wcagMark} ${r.ratio.toFixed(2).padStart(5)}:1  ${apcaNote.padEnd(12)}  ${r.where}`,
  );
}

// Only run the CLI when invoked directly (not when imported as a module).
const isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
