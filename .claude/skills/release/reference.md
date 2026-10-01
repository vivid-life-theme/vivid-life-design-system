# Release — reference details

Detail for steps 3, 8 and 9 of `SKILL.md`.

## Changelog format (step 3)

- Move all items from `[Unreleased]` to a new `## [X.Y.Z] - YYYY-MM-DD` section
- Categories: Added · Changed · Fixed · Removed
- Flag breaking token changes with **⚠️** — port maintainers scan for this
- Update the two comparison links at the bottom of the file:
  - `[unreleased]` → compare new version tag with HEAD
  - Add `[X.Y.Z]` → compare previous version tag with new version tag
- Leave an empty `[Unreleased]` stub above the new section for the next cycle

## GitHub release (step 8)

Extract release notes from the CHANGELOG section you just wrote:

```bash
# Replace X.Y.Z with the actual version, e.g. 0.3.0
VERSION="X.Y.Z"
NOTES=$(mktemp)
awk "/^## \[${VERSION}\]/{p=1; next} p && /^## /{exit} p" CHANGELOG.md > "$NOTES"
```

Then create the release:

```bash
gh release create "v${VERSION}" \
  --title "v${VERSION}" \
  --notes-file "$NOTES"
```

Add a downstream-ports note at the end of the release body if this release contains ⚠️ breaking changes:

> **For downstream ports:** Re-read `tokens.json` / `dist/tokens.js`. Update any hard-coded token references before regenerating.
>
> Full changelog: https://github.com/vivid-life-theme/vivid-life-design-system/blob/main/CHANGELOG.md

## Post-release verification (step 9)

- [ ] Workflow succeeded: https://github.com/vivid-life-theme/vivid-life-design-system/actions
- [ ] Package appears on npm: `npm view @vivid-life-theme/design-system version`
- [ ] Install smoke test:
  ```bash
  dir=$(mktemp -d) && cd "$dir" && npm init -y
  npm install @vivid-life-theme/design-system
  node -e "import('@vivid-life-theme/design-system').then(m => console.log(Object.keys(m)))"
  ```
- [ ] GitHub release visible with correct notes
