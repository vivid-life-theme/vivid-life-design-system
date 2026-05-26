---
name: release
description: Use when publishing a new version of @vivid-life-theme/design-system to npm — covers semver determination, CHANGELOG update, version bump, npm publish via CI or manual, GitHub release creation, and post-release verification.
---

# Release — @vivid-life-theme/design-system

Step-by-step guide for publishing a new version to npm.

## 1 — Pre-release verification

- [ ] `npm run test` — build-tokens self-tests pass
- [ ] `npm run build` — regenerate tokens.json, dist/tokens.js, colors_and_type.css
- [ ] `npm run check` — all outputs in sync with tokens.json5 (exits non-zero on drift)
- [ ] `npm pack --dry-run` — confirm package contents match the `files` array; no sensitive files

## 2 — Determine version (semver)

| Bump  | When                                                                        |
| ----- | --------------------------------------------------------------------------- |
| Patch | Value tweak, WCAG fix, doc-only, bug fix                                    |
| Minor | New token, new variant, new flavor — additive and backward compatible       |
| Major | ⚠️ Token renamed or removed — breaks any downstream port that references it |

## 3 — Update CHANGELOG.md

**Do this BEFORE running `npm version`.**

- Move all items from `[Unreleased]` to a new `## [X.Y.Z] - YYYY-MM-DD` section
- Categories: Added · Changed · Fixed · Removed
- Flag breaking token changes with **⚠️** — port maintainers scan for this
- Update the two comparison links at the bottom of the file:
  - `[unreleased]` → compare new version with HEAD
  - Add `[X.Y.Z]` → compare previous version with new version
- Leave an empty `[Unreleased]` stub above the new section for the next cycle

## 4 — Update README if needed

- New flavor or variant → update accent-shade table section
- New token → add to the syntax token map table

## 5 — Commit docs

```bash
git add CHANGELOG.md README.md   # and any other modified docs
git commit -m "📝 docs: update changelog for vX.Y.Z"
```

## 6 — Bump version

```bash
npm version patch   # or minor / major
```

This updates package.json, creates a commit ("X.Y.Z"), and creates the git tag "vX.Y.Z".

## 7 — Publish to npm

**Check first whether a GitHub Actions publish workflow exists:**

```bash
ls .github/workflows/publish.yml
```

- **If it exists** (normal path): skip manual publish — just push the tag in step 8 and the
  workflow handles it automatically via OIDC.
- **If it does not exist yet** (first-time / fallback): publish manually:

  ```bash
  npm publish --access public
  ```

  After publishing, configure the npm OIDC Trusted Publisher on
  https://www.npmjs.com/package/@vivid-life-theme/design-system so future releases
  are automated.

## 8 — Push to GitHub

```bash
git push && git push --tags
```

If the publish workflow exists, watch it at:
https://github.com/vivid-life-theme/vivid-life-design-system/actions

## 9 — Create GitHub release

```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes "$(cat <<'EOF'
## Changes

- [copy bullet points from CHANGELOG.md]

## For downstream ports

Re-read \`tokens.json\` / \`dist/tokens.js\`. If this release contains ⚠️ breaking
changes, update any hard-coded token references in your port before regenerating.

Full changelog: https://github.com/vivid-life-theme/vivid-life-design-system/blob/main/CHANGELOG.md
EOF
)"
```

## 10 — Post-release verification

- [ ] Package appears on npm: https://www.npmjs.com/package/@vivid-life-theme/design-system
- [ ] Correct version shown: `npm view @vivid-life-theme/design-system version`
- [ ] Install smoke test:
  ```bash
  mkdir /tmp/vl-test && cd /tmp/vl-test && npm init -y
  npm install @vivid-life-theme/design-system
  node -e "import('@vivid-life-theme/design-system').then(m => console.log(Object.keys(m)))"
  ```
- [ ] GitHub release visible with correct notes

## Rollback

**Recommended for any timing — deprecate and fix:**

```bash
npm deprecate @vivid-life-theme/design-system@X.Y.Z "Breaking bug — upgrade to X.Y.Z+1"
```

**Within 72 hours only — unpublish:**

```bash
npm unpublish @vivid-life-theme/design-system@X.Y.Z
```

To delete a tag (e.g. to re-cut the same version after fixing a workflow):

```bash
git tag -d vX.Y.Z
git push --delete origin vX.Y.Z
```
