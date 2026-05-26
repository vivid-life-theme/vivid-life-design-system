#!/usr/bin/env node

/**
 * build-css.mjs
 * ────────────────────────────────────────────────────────────────────
 * Generate `colors_and_type.css` from `tokens.json5`.
 *
 * The CSS file is the consumer-facing API:
 *   <link rel="stylesheet" href="colors_and_type.css">
 *   <body class="vl-midnight variant-purple">
 *
 * Every value comes from `tokens.json5`. Edit tokens, run this, ship.
 * Output is deterministic — same input → byte-identical output.
 *
 * Usage:
 *   node tools/build-css.mjs            → writes colors_and_type.css
 *   node tools/build-css.mjs --check    → exits 1 if output would change
 *
 * No npm deps. Uses the same minimal JSON5 reader as build-tokens.mjs.
 * ────────────────────────────────────────────────────────────────────
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── JSON5 reader (subset; shared with build-tokens.mjs) ──────────────
function json5ToJson(src) {
  let out = "",
    i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i],
      c2 = src.slice(i, i + 2);
    if (c2 === "//") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c2 === "/*") {
      const e = src.indexOf("*/", i + 2);
      if (e < 0) throw new Error("Unterminated block comment");
      i = e + 2;
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
function resolveRefs(node, root) {
  if (typeof node === "string") {
    if (!node.startsWith("$")) return node;
    const path = node.slice(1).split(".");
    let cur = root;
    for (const p of path) {
      if (cur == null || !(p in cur)) throw new Error(`Unknown ref: ${node}`);
      cur = cur[p];
    }
    if (typeof cur === "string" && cur.startsWith("$"))
      return resolveRefs(cur, root);
    return cur;
  }
  if (Array.isArray(node)) return node.map((v) => resolveRefs(v, root));
  if (node && typeof node === "object") {
    const o = {};
    for (const [k, v] of Object.entries(node)) o[k] = resolveRefs(v, root);
    return o;
  }
  return node;
}

// ── CSS emitter ──────────────────────────────────────────────────────
// Conventions:
//   • All custom properties prefixed `--vl-` (or `--syn-` for syntax tokens).
//   • Flavor selector: `.vl-<flavor>`  (e.g. `.vl-midnight`)
//   • Variant selector: `.variant-<variant>`  (e.g. `.variant-purple`)
//   • Combined: `.vl-midnight.variant-purple`
//
// Keys with underscores in JSON become hyphenated CSS names:
//   bg_soft → --vl-bg-soft

const VARIANT_HUES = ["red", "orange", "yellow", "green", "blue", "purple"];
const FLAVOR_NAMES = ["midnight", "twilight", "dawn", "noon"];

const kebab = (s) => s.replace(/_/g, "-");
const indent = (s, n = 2) =>
  s
    .split("\n")
    .map((l) => (l ? " ".repeat(n) + l : l))
    .join("\n");

function header() {
  return `/* ====================================================================
   Vivid Life Theme — Foundation CSS
   --------------------------------------------------------------------
   AUTO-GENERATED from tokens.json5 by tools/build-css.mjs.
   DO NOT EDIT BY HAND — your changes will be overwritten.

   Source palette: https://farben.van-laar.de/
   Underlying ramps: Tailwind v3 defaults (900 / 700 / 500 / 300 / 100).

   Apply by adding two classes to a container:
     <body class="vl-midnight variant-purple"> … </body>

   The flavor class sets the canvas, text, borders, syntax map.
   The variant class only sets --vl-accent (and --vl-selection, which
   is derived from --vl-accent via color-mix at runtime).
   ==================================================================== */
`;
}

function fontFaceBlock(typography) {
  const lines = [
    `\n/* ── Typography — @font-face declarations ───────────────────────── */\n`,
  ];
  for (const [role, fam] of Object.entries(typography.families)) {
    if (!fam.files) continue;
    for (const file of fam.files) {
      const italic = /italic/i.test(file);
      lines.push(`@font-face {`);
      lines.push(`  font-family: '${fam.primary}';`);
      lines.push(`  src: url('${file}') format('truetype-variations');`);
      const weights = fam.weights || [400];
      const wMin = Math.min(...weights),
        wMax = Math.max(...weights);
      lines.push(`  font-weight: ${wMin} ${wMax};`);
      lines.push(`  font-style: ${italic ? "italic" : "normal"};`);
      lines.push(`  font-display: swap;`);
      lines.push(`}\n`);
    }
  }
  return lines.join("\n");
}

function paletteBlock(palette) {
  const lines = [
    `\n/* ── Base palette — 7 hues × 5 shades + cyan extension ─────────── */\n`,
  ];
  lines.push(":root {");
  for (const [hue, shades] of Object.entries(palette)) {
    const isExtension = hue === "cyan";
    if (isExtension)
      lines.push(
        `\n  /* extension hue — protocol/convention-required cyan only */`,
      );
    for (const shade of [900, 700, 500, 300, 100]) {
      const val = shades[shade];
      if (!val) continue;
      const name = `--vl-${hue}-${shade}`.padEnd(20);
      lines.push(`  ${name}: ${val};`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}

function rootBlock(tokens) {
  // Type stacks + spacing + radii + shadows + motion.
  const lines = [
    `\n/* ── Root tokens — type, spacing, radii, shadows, motion ───────── */\n`,
  ];
  lines.push(":root {");

  // Type stacks
  lines.push("  /* type stacks */");
  for (const [role, fam] of Object.entries(tokens.typography.families)) {
    const name = `--vl-font-${role}`;
    lines.push(`  ${name}: ${fam.stack};`);
  }

  // Spacing
  lines.push("\n  /* spacing — 4px base scale */");
  for (const [k, v] of Object.entries(tokens.spacing)) {
    lines.push(`  --vl-space-${k}: ${v};`);
  }

  // Radii
  lines.push("\n  /* radii */");
  for (const [k, v] of Object.entries(tokens.radii)) {
    lines.push(`  --vl-radius-${kebab(k)}: ${v};`);
  }

  // Shadows
  lines.push("\n  /* shadows + focus ring */");
  for (const [k, v] of Object.entries(tokens.shadows)) {
    const prop = k.startsWith("focus_ring")
      ? `--vl-${kebab(k)}`
      : `--vl-shadow-${kebab(k)}`;
    lines.push(`  ${prop}: ${v};`);
  }

  // Motion
  lines.push("\n  /* motion */");
  for (const [k, v] of Object.entries(tokens.motion.duration)) {
    lines.push(`  --vl-duration-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(tokens.motion.easing)) {
    lines.push(`  --vl-ease-${k}: ${v};`);
  }

  lines.push("}");
  return lines.join("\n");
}

function flavorBlock(name, flavor) {
  const lines = [];
  lines.push(
    `\n/* ── Flavor: ${flavor.label} (${flavor.type}, bg ${flavor.surface.bg}) ── */`,
  );
  lines.push(`.vl-${name} {`);
  const groups = [
    ["surface", flavor.surface, "--vl-"],
    ["text", flavor.text, "--vl-"],
    ["border", flavor.border, "--vl-border-", /^default$/, "--vl-border"],
    ["state", flavor.state, "--vl-state-"],
    ["semantic", flavor.semantic, "--vl-semantic-"],
    ["syntax", flavor.syntax, "--syn-"],
    ["ansi", flavor.ansi, "--vl-ansi-"],
  ];

  for (const [groupName, obj, prefix, defaultRegex, defaultName] of groups) {
    lines.push(`  /* ${groupName} */`);
    for (const [k, v] of Object.entries(obj)) {
      let prop;
      if (defaultRegex && defaultRegex.test(k)) {
        prop = defaultName;
      } else if (groupName === "border") {
        prop = `--vl-border-${kebab(k)}`;
      } else if (groupName === "surface") {
        prop =
          k === "bg" ? "--vl-bg" : `--vl-bg-${kebab(k.replace(/^bg_/, ""))}`;
      } else if (groupName === "text") {
        prop =
          k === "fg" ? "--vl-fg" : `--vl-fg-${kebab(k.replace(/^fg_/, ""))}`;
      } else {
        prop = prefix + kebab(k);
      }
      lines.push(`  ${prop.padEnd(24)}: ${v};`);
    }
  }

  // text-on-accent: derived from flavor type
  const accentOn = flavor.type === "dark" ? "#171717" : "#f5f5f5";
  lines.push(`\n  /* text color for use on top of --vl-accent */`);
  lines.push(`  --vl-accent-on: ${accentOn};`);

  // selection is now derived from accent at runtime via .vl-* + variant
  lines.push(`}`);
  return lines.join("\n");
}

function variantBlock(tokens) {
  const lines = [
    `\n/* ── Variants — UI accent only (cursor, link, focus ring, fill) ─── */`,
  ];
  lines.push(
    `/* Selection is derived from --vl-accent via color-mix at runtime. */\n`,
  );

  for (const fname of FLAVOR_NAMES) {
    lines.push(`/* ${tokens.flavors[fname].label} accents */`);
    for (const vname of VARIANT_HUES) {
      const shade = tokens.accent_shade[fname][vname];
      const accent = tokens.palette[vname][shade];
      const sel = `.vl-${fname}.variant-${vname}`.padEnd(28);
      lines.push(`${sel} { --vl-accent: ${accent}; }`);
    }
    lines.push("");
  }

  // Selection tint — color-mix at 25% accent + 75% bg.
  // Works on dark and light bg without needing per-flavor rules.
  lines.push(`/* Selection tinted toward accent (25% mix over bg). */`);
  lines.push(`[class*="vl-"][class*="variant-"] {`);
  lines.push(
    `  --vl-selection: color-mix(in srgb, var(--vl-accent) 25%, var(--vl-bg));`,
  );
  lines.push(`}`);

  return lines.join("\n");
}

function selectionRule() {
  return `\n/* ── Native ::selection rule, opt-in helper class ───────────────── */
.vl-flavor-body { background: var(--vl-bg); color: var(--vl-fg); font-family: var(--vl-font-sans); caret-color: var(--vl-accent); }
.vl-flavor-body ::selection { background: var(--vl-selection); color: var(--vl-fg); }
.vl-flavor-body a { color: var(--vl-accent); }
.vl-flavor-body :focus-visible {
  outline: var(--vl-focus-ring-width) solid var(--vl-accent);
  outline-offset: var(--vl-focus-ring-offset);
}
`;
}

function buildCss(tokens) {
  return (
    [
      header(),
      fontFaceBlock(tokens.typography),
      paletteBlock(tokens.palette),
      rootBlock(tokens),
      ...FLAVOR_NAMES.map((n) => flavorBlock(n, tokens.flavors[n])),
      variantBlock(tokens),
      selectionRule(),
    ].join("\n") + "\n"
  );
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");

  const src = await readFile(join(ROOT, "tokens.json5"), "utf8");
  const parsed = JSON.parse(json5ToJson(src));
  const tokens = resolveRefs(parsed, parsed);

  const cssPath = join(ROOT, "colors_and_type.css");
  const css = buildCss(tokens);

  if (check) {
    let existing = "";
    try {
      existing = await readFile(cssPath, "utf8");
    } catch {}
    if (existing !== css) {
      console.error(
        `✗ ${relative(ROOT, cssPath)} is out of date — run \`node tools/build-css.mjs\`.`,
      );
      process.exit(1);
    }
    console.log(`✓ ${relative(ROOT, cssPath)} matches tokens.json5`);
    return;
  }

  await writeFile(cssPath, css);
  console.log(
    `✓ wrote ${relative(ROOT, cssPath)} (${(css.length / 1024).toFixed(1)} kB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
