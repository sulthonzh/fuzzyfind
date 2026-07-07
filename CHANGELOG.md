# Changelog

## v1.1.1 (2026-07-08)

### Fixed
- `match()` now returns `null` for non-string inputs instead of throwing TypeError
- `filter()` skips `null`/`undefined` entries instead of matching `String(null)`
- `filter()` with `key` option skips objects where the key is missing or null
- `highlight()` filters out-of-range positions instead of producing broken output
- `highlight()` returns empty string for empty input without crashing

### Added
- 18 edge-case tests (67 → 85): input type validation, null/undefined entry handling,
  missing object key handling, position bounds validation, Unicode surrogate pairs,
  duplicate positions, CLI score-only and case-sensitive integration tests

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
