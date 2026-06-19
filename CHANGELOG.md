# Changelog

## v1.1.0 (2026-06-19)

### Added
- `--version` / `-V` flag to CLI
- `exports` field in package.json for clean ESM/CJS interop
- `prepublishOnly` script (runs tests before publish)
- CHANGELOG.md
- 3 real-world examples in README (interactive file picker, autocomplete ranking, command palette)
- Comparison table vs fzf, Fuse.js, fuzzysort in README

### Fixed
- Simplified CLI output loop — removed convoluted `--highlight-only` conditional logic
  that produced inconsistent output on TTY vs non-TTY

## v1.0.0 (2026-06-14)

### Initial Release
- Zero-dependency fuzzy string matching with DP-based scoring algorithm
- `match()` — fuzzy match with score and positions
- `isMatch()` — boolean check
- `filter()` — filter and sort arrays of strings or objects
- `highlight()` — ANSI terminal highlighting
- `highlightRanges()` — structured ranges for custom rendering
- Scoring: word boundary bonus, camelCase bonus, consecutive bonus, first char bonus,
  uppercase bonus, gap penalty, unmatched penalty
- CLI with stdin, `--file`, `--list`, `--json`, `--limit`, `--case-sensitive`, `--no-color`
- 47 tests, all passing
