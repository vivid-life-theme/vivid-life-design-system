#!/usr/bin/env node
/**
 * build-previews.mjs
 * ────────────────────────────────────────────────────────────────────
 * Validator for preview HTML files. Catches the kind of drift that
 * silently breaks the kitchen-sink and stress-test pages when tokens
 * or assets get renamed:
 *
 *   - `var(--xxx)` references with no matching declaration in
 *     colors_and_type.css, preview/_syntax.css, or the preview itself
 *   - relative `href`/`src` URLs that point to files that don't exist
 *
 *   node tools/build-previews.mjs           → report findings
 *   node tools/build-previews.mjs --check   → exit 1 on any finding
 *
 * Not a regenerator. The kitchen-sink and typography pages are visually
 * designed artifacts, not templatable — this just catches the drift
 * that would otherwise break them.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PREVIEW_DIR = join(ROOT, "preview");

function collectDeclaredVars(css) {
  const vars = new Set();
  for (const m of css.matchAll(/--([a-zA-Z0-9_-]+)\s*:/g)) vars.add(m[1]);
  return vars;
}

function collectVarRefs(html) {
  const refs = new Set();
  for (const m of html.matchAll(/var\(\s*--([a-zA-Z0-9_-]+)/g)) refs.add(m[1]);
  return refs;
}

function collectUrlRefs(html) {
  const refs = new Set();
  for (const m of html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)) {
    const url = m[1].split("#")[0].split("?")[0];
    if (!url) continue;
    if (/^(https?:|mailto:|tel:|data:)/i.test(url)) continue;
    if (url.startsWith("//")) continue;
    refs.add(url);
  }
  return refs;
}

async function loadCssDeclarations() {
  const cssPath = join(ROOT, "colors_and_type.css");
  const syntaxPath = join(PREVIEW_DIR, "_syntax.css");
  const declared = new Set();
  for (const p of [cssPath, syntaxPath]) {
    if (existsSync(p)) {
      collectDeclaredVars(await readFile(p, "utf8")).forEach((v) =>
        declared.add(v),
      );
    }
  }
  return declared;
}

async function validate() {
  const systemVars = await loadCssDeclarations();
  const files = existsSync(PREVIEW_DIR)
    ? (await readdir(PREVIEW_DIR)).filter((f) => f.endsWith(".html")).sort()
    : [];

  const findings = [];

  for (const f of files) {
    const filePath = join(PREVIEW_DIR, f);
    const html = await readFile(filePath, "utf8");
    const localVars = collectDeclaredVars(html);
    const known = new Set([...systemVars, ...localVars]);

    for (const v of collectVarRefs(html)) {
      if (!known.has(v)) {
        findings.push(`preview/${f}: undeclared CSS var \`--${v}\``);
      }
    }

    for (const u of collectUrlRefs(html)) {
      const resolved = resolve(dirname(filePath), u);
      if (!existsSync(resolved)) {
        findings.push(`preview/${f}: missing file \`${u}\``);
      }
    }
  }

  return { files, findings };
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes("--check");
  const { files, findings } = await validate();

  if (!files.length) {
    console.log("No preview HTML files found — nothing to validate.");
    return;
  }

  if (findings.length) {
    const verb = checkMode ? "✗" : "⚠";
    console.error(
      `${verb} ${findings.length} drift finding(s) across ${files.length} preview(s):\n`,
    );
    for (const f of findings) console.error(`  ${f}`);
    if (checkMode) process.exit(1);
    return;
  }

  console.log(
    `✓ all ${files.length} previews reference valid CSS vars and files`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
