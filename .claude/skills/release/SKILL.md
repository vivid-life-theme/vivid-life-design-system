---
name: release
description: Use when publishing a new version of @vivid-life-theme/design-system to npm. Invoke any time the user mentions releasing, publishing, cutting a release, bumping the version, shipping a new version, or tagging — even if they phrase it casually ("ready to release", "let's ship 0.3", "bump to minor"). Covers the full pipeline: change analysis, semver recommendation with explicit user confirmation, CHANGELOG update, version bump, CI publish via OIDC, GitHub release creation, and post-release verification.
---

# Release — @vivid-life-theme/design-system

Step-by-step guide for publishing a new version to npm.

## 0 — Preflight

Confirm the workspace is in a clean, releasable state before touching anything:

```bash
git branch --show-current        # must be: main
git status --short               # must be empty (clean working tree)
```

If the branch is wrong or there are uncommitted changes, stop and tell the user. `npm version` will fail on a dirty tree, and tagging a non-main branch creates a confusing release history.

## 1 — Pre-release verification

- [ ] `npm run test` — build-tokens self-tests pass
- [ ] `npm run build` — regenerate tokens.json, dist/tokens.js, colors_and_type.css
- [ ] `npm run check` — all outputs in sync with tokens.json5 (exits non-zero on drift)
- [ ] `npm pack --dry-run` — confirm package contents match the `files` array; no sensitive files

## 2 — Analyze changes and propose version

Find the last release tag and show what has changed since then:

```bash
git describe --tags --abbrev=0          # last tag, e.g. v0.2.0
git log v0.2.0..HEAD --oneline          # commits since that tag
```

If no tags exist yet, use `git log --oneline` (all commits = initial release).

**If no commits appear since the last tag, stop.** There is nothing to release — tell the user and exit the skill.

Categorize each commit against the semver rules:

| Bump  | When                                                                        |
| ----- | --------------------------------------------------------------------------- |
| Patch | Value tweak, WCAG fix, doc-only, bug fix                                    |
| Minor | New token, new variant, new flavor — additive and backward compatible       |
| Major | ⚠️ Token renamed or removed — breaks any downstream port that references it |

**Present your proposed version to the user with a short rationale** — e.g.:

> "Since v0.2.0 the changes are all additive (two new tokens, one WCAG fix), so I'm proposing **0.3.0** (minor bump). Confirm, or tell me a different number."

Wait for the user to confirm or override before proceeding to any following step.

## 3 — Update CHANGELOG.md

**Do this BEFORE running `npm version`.** Use the confirmed version number.

Check that `[Unreleased]` actually has content. If it's empty (only the `---` divider), stop and ask the user whether to proceed with an empty changelog entry or cancel.

- Move all items from `[Unreleased]` to a new `## [X.Y.Z] - YYYY-MM-DD` section
- Categories: Added · Changed · Fixed · Removed
- Flag breaking token changes with **⚠️** — port maintainers scan for this
- Update the two comparison links at the bottom of the file:
  - `[unreleased]` → compare new version tag with HEAD
  - Add `[X.Y.Z]` → compare previous version tag with new version tag
- Leave an empty `[Unreleased]` stub above the new section for the next cycle

## 4 — Update README if needed

- New flavor or variant → update accent-shade table section
- New token → add to the syntax token map table

## 5 — Commit docs

```bash
git add CHANGELOG.md README.md   # and any other modified docs
git commit -m "📝 docs: update changelog for vX.Y.Z"
```

## 6 — Bump version and tag

Use the bump type confirmed in step 2:

```bash
npm version minor   # patch | minor | major — must match what was confirmed in step 2
```

This updates package.json, creates a commit (`v0.3.0`), and creates the git tag `vX.Y.Z`.

## 7 — Push to GitHub (triggers CI publish)

```bash
git push && git push --tags
```

The publish workflow (`.github/workflows/publish.yml`) fires automatically on any `v*` tag push and runs `npm publish --provenance --access public` via OIDC — no token needed.

Watch the workflow run at:
https://github.com/vivid-life-theme/vivid-life-design-system/actions

> **Manual publish** — required for the very first release (OIDC needs the package to exist on npm first), or as a fallback if CI is broken:
>
> ```bash
> npm publish --access public
> ```
>
> After a manual first publish, OIDC will work automatically for all subsequent releases.

## 8 — Create GitHub release

Extract release notes from the CHANGELOG section you just wrote:

```bash
# Replace X.Y.Z with the actual version, e.g. 0.3.0
VERSION="X.Y.Z"
awk "/^## \[${VERSION}\]/{p=1; next} p && /^## /{exit} p" CHANGELOG.md > /tmp/vl-release-notes.md
```

Then create the release:

```bash
gh release create "v${VERSION}" \
  --title "v${VERSION}" \
  --notes-file /tmp/vl-release-notes.md
```

Add a downstream-ports note at the end of the release body if this release contains ⚠️ breaking changes:

> **For downstream ports:** Re-read `tokens.json` / `dist/tokens.js`. Update any hard-coded token references before regenerating.
>
> Full changelog: https://github.com/vivid-life-theme/vivid-life-design-system/blob/main/CHANGELOG.md

## 9 — Post-release verification

- [ ] Workflow succeeded: https://github.com/vivid-life-theme/vivid-life-design-system/actions
- [ ] Package appears on npm: `npm view @vivid-life-theme/design-system version`
- [ ] Install smoke test:
  ```bash
  mkdir /tmp/vl-test && cd /tmp/vl-test && npm init -y
  npm install @vivid-life-theme/design-system
  node -e "import('@vivid-life-theme/design-system').then(m => console.log(Object.keys(m)))"
  ```
- [ ] GitHub release visible with correct notes

## Rollback

See `docs/release-recovery.md` for deprecation, unpublish, tag deletion, and signed-tag recreation steps.

## Feedback

Did this release go smoothly? If anything went wrong or was unexpected, share it here — I'll log a correction to `.claude/learnings.md` so the next session doesn't repeat it.
