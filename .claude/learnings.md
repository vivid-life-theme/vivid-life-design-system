# Learnings

- **formatter-hook corrupts .mjs template literals**: The global PostToolUse formatter hook converts straight `"` inside JS template literals to curly quotes (U+201C/U+201D), breaking SVG XML attribute delimiters and causing "Invalid image source" on GitHub. Workaround: generate SVG files via Python scripts (f-strings are not affected). Do not attempt to generate SVG content inside `.mjs` template literals.
- **gitleaks not installed**: Pre-commit secret scanning (gitleaks) was recommended but not yet installed. If adding it, append `gitleaks git --pre-commit --staged || exit 1` to `.githooks/pre-commit`.
- **Re-pushing a release tag requires a signed annotated tag**: `tag.gpgsign=true` is set globally. When cycling a tag (delete + recreate), use `git tag -s vX.Y.Z <commit> -m "vX.Y.Z"` — lightweight tags (`git tag vX.Y.Z`) fail with "keine Tag-Beschreibung?" on push.
