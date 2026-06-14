# fuzzyfind

Zero-dependency fuzzy string matching with scoring, filtering, and highlighting. Inspired by [fzf](https://github.com/junegunn/fzf) and Sublime Text's fuzzy search.

## Why

You need fuzzy search in your CLI tool, autocomplete, or file finder — without pulling in a massive dependency. Every function is pure JS with zero runtime deps.

## Install

```bash
npm install @sulthonzh/fuzzyfind
```

## Quick Start

```js
const fuzzy = require('@sulthonzh/fuzzyfind');

// Basic match
const m = fuzzy.match('sr', 'server');
// → { score: 54, positions: [0, 2] }

// Boolean check
fuzzy.isMatch('abc', 'aXbXc'); // → true

// Filter and rank
const results = fuzzy.filter('ser', [
  'server.ts',
  'client.ts',
  'service.ts',
  'utils.ts'
]);
// → [{ target: 'server.ts', score: ..., positions: [...] }, ...]

// Highlight for terminal output
const hl = fuzzy.highlight('server', [0, 2]);
// → '\x1b[32ms\x1b[0me\x1b[32mr\x1b[0mver'
```

## API

### `match(query, target, opts?) → { score, positions } | null`

Fuzzy match `query` against `target`. Returns match info or `null`.

**Scoring factors:**
- Character match base score
- First character bonus (query char matches early in target)
- Word boundary bonus (after spaces, `/`, `_`, `-`, `.`, camelCase transitions)
- Consecutive match bonus (adjacent matched characters)
- Uppercase match bonus
- Gap penalty (unmatched characters between matched ones)
- Leading/trailing unmatched penalty

```js
fuzzy.match('idx', 'myIndex');
// → { score: 51, positions: [2, 3, 4] }

fuzzy.match('xyz', 'abc');
// → null
```

Options:
- `caseSensitive` (default: `false`) — case-sensitive matching

### `isMatch(query, target, opts?) → boolean`

Quick boolean check without computing full score.

### `filter(query, targets, opts?) → Array`

Filter and sort an array of strings or objects by fuzzy match score.

```js
// With objects
const results = fuzzy.filter('ali', users, { key: 'name', limit: 5 });
```

Options:
- `key` — property name to match if targets are objects
- `caseSensitive` — case-sensitive matching
- `limit` — max number of results

Returns `{ item, score, positions, target }[]` sorted by score descending.

### `highlight(str, positions, ansi?, reset?) → string`

Wrap matched characters in ANSI escape codes for terminal display.

```js
const m = fuzzy.match('srv', 'server');
console.log(fuzzy.highlight('server', m.positions));
// Matched chars appear green
```

### `highlightRanges(positions, length) → Array`

Get structured highlight ranges for custom rendering.

```js
fuzzy.highlightRanges([0, 2], 5);
// → [
//   { start: 0, end: 1, matched: true },
//   { start: 1, end: 2, matched: false },
//   { start: 2, end: 3, matched: true },
//   { start: 3, end: 5, matched: false }
// ]
```

## CLI

```bash
# Search stdin
ls | fuzzyfind test

# Search a file
fuzzyfind config --file package.json

# Search a comma-separated list
fuzzyfind js --list "javascript,typescript,python,rust"

# JSON output with scores
cat files.txt | fuzzyfind src --json

# Limit results
ls | fuzzyfind spec --limit 5
```

Options:
```
--file <path>        Read candidates from file
--list <items>       Comma-separated list
--limit <n>          Max results
--json               JSON output with scores
--no-color           Disable ANSI highlighting
--case-sensitive     Case sensitive matching
--score-only         Output scores only
-h, --help           Show help
```

## License

MIT
