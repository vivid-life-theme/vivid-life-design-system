#!/usr/bin/env node
/**
 * build-tokens.mjs
 * ────────────────────────────────────────────────────────────────────
 * Two roles in one file:
 *
 * 1.  CLI — when run directly:
 *       node tools/build-tokens.mjs           → emit + WCAG check
 *       node tools/build-tokens.mjs --check   → exit 1 if outputs would change
 *     Reads `tokens.json5` and emits:
 *       tokens.json     — flat JSON with all $palette.x.y refs resolved
 *       dist/tokens.js  — ES module that exports the resolved object
 *     Then runs WCAG checks against every accent / syntax token.
 *
 * 2.  Library — imported by downstream ports:
 *       import { loadTokens, mix, alphaOver, contrast } from
 *         'vivid-life-theme/tools/build-tokens.mjs';
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

/* =====================================================================
   FOUNDATION RECIPES  (exported)
   ─────────────────────────────────────────────────────────────────────
   Same color math we apply in CSS via color-mix, but exposed as plain
   functions for ports that bake values at build time.
   ===================================================================== */

/**
 * Selection background for a (flavor, variant) combo.
 * Equivalent to `color-mix(in srgb, var(--vl-accent) 25%, var(--vl-bg))`.
 *
 *   selection({ bg: '#171717', accent: '#d8b4fe' })  → '#473e51'
 */
export function selection({ bg, accent, mixPct = 0.25 } = {}) {
  if (!bg || !accent) throw new Error("selection: bg and accent required");
  return mix(accent, bg, mixPct);
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
 * Convenience for downstream ports: load + parse + resolve in one call.
 *
 *   const tokens = await loadTokens();  // defaults to ../tokens.json5
 *   const accent = resolveAccent(tokens, 'midnight', 'purple');
 *   const selBg  = selection({ bg: tokens.flavors.midnight.surface.bg,
 *                              accent });
 */
export async function loadTokens(path = join(ROOT, "tokens.json5")) {
  const src = await readFile(path, "utf8");
  const parsed = JSON.parse(json5ToJson(src));
  return resolveRefs(parsed, parsed);
}

/* =====================================================================
   WCAG sanity check  (used by main())
   ===================================================================== */

function check(tokens) {
  const warns = [];
  for (const [fName, f] of Object.entries(tokens.flavors)) {
    const bg = f.surface.bg;
    for (const hue of tokens.variant_hues) {
      const shade = tokens.accent_shade[fName][hue];
      const accent = tokens.palette[hue][shade];
      const r = contrast(accent, bg);
      if (r < 4.5) {
        warns.push(
          `✗ ${fName}/${hue}-${shade} (${accent}) on ${bg}: ${r.toFixed(2)}:1`,
        );
      }
    }
    for (const [tName, color] of Object.entries(f.syntax)) {
      const r = contrast(color, bg);
      if (r < 3) {
        warns.push(
          `⚠ ${fName}.syntax.${tName} (${color}) on ${bg}: ${r.toFixed(2)}:1`,
        );
      }
    }
    // Also: every (flavor, variant) selection must remain readable.
    for (const hue of tokens.variant_hues) {
      const accent = resolveAccent(tokens, fName, hue);
      const sel = selection({ bg, accent });
      const r = contrast(f.text.fg, sel);
      if (r < 4.5) {
        warns.push(
          `✗ ${fName}/${hue} selection text on ${sel}: ${r.toFixed(2)}:1`,
        );
      }
    }
    // Semantic colors must be readable (≥4.5:1) on every surface token.
    const semanticSurfaces = Object.entries(f.surface).filter(
      ([k]) => k !== "bg_scrim",
    );
    for (const [role, color] of Object.entries(f.semantic)) {
      for (const [sName, sColor] of semanticSurfaces) {
        const r = contrast(color, sColor);
        if (r < 4.5) {
          warns.push(
            `✗ ${fName}.semantic.${role} (${color}) on ${sName} (${sColor}): ${r.toFixed(2)}:1`,
          );
        }
      }
    }
  }
  return warns;
}

/* =====================================================================
   Tiny self-test  (run when invoked as CLI with --test)
   ===================================================================== */

function selfTest() {
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
    process.exit(selfTest() ? 0 : 1);
  }

  const opts = Object.fromEntries(
    args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
  );

  const checkMode = args.includes("--check");

  const srcPath = join(ROOT, "tokens.json5");
  const outPath = opts.out || join(ROOT, "tokens.json");
  const jsOutPath = join(ROOT, "dist", "tokens.js");

  const tokens = await loadTokens(srcPath);

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

  const warns = check(tokens);
  if (warns.length) {
    console.log("\nContrast warnings:");
    for (const w of warns) console.log("  " + w);
    process.exit(1);
  }
  console.log("\n✓ All accent variants meet WCAG AA against their flavor bg.");
  console.log(
    "✓ All (flavor, variant) selections remain readable for body text.",
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
