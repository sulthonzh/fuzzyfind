# fuzzyfind

Zero-dependency fuzzy string matching with scoring, filtering, and highlighting — for when you need fzf-like search inside your Node app or CLI without shipping a native binary.

Inspired by [fzf](https://github.com/junegunn/fzf) and Sublime Text's fuzzy search.

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
  'server.ts', 'client.ts', 'service.ts', 'utils.ts'
]);
// → [{ target: 'server.ts', score: ..., positions: [...] }, ...]

// Highlight for terminal output
const hl = fuzzy.highlight('server', [0, 2]);
// → '\x1b[32ms\x1b[0me\x1b[32mr\x1b[0mver'
```

## Real-World Examples

### 1. Interactive File Picker

Build a fast file finder that ranks results by relevance — perfect for CLI tools, editors, or dashboards.

```js
const fuzzy = require('@sulthonzh/fuzzyfind');
const { readFileSync } = require('fs');

const allFiles = readFileSync('file-list.txt', 'utf8').split('\n').filter(Boolean);

function findFiles(query, limit = 10) {
  return fuzzy.filter(query, allFiles, { limit }).map(r => ({
    path: r.target,
    score: Math.round(r.score),
  }));
}

console.log(findFiles('src test'));
// [{ path: 'src/test.ts', score: 72 }, { path: 'test/src.js', score: 65 }, ...]
```

### 2. Autocomplete Ranking

Score and rank suggestions for an autocomplete dropdown. The scoring algorithm naturally prefers prefix matches, word boundaries, and consecutive characters.

```js
const fuzzy = require('@sulthonzh/fuzzyfind');

const commands = [
  'git commit', 'git push', 'git pull', 'git checkout',
  'git cherry-pick', 'git config', 'git clone', 'git branch',
];

function suggest(input) {
  return fuzzy.filter(input, commands, { limit: 5 }).map(r => ({
    command: r.target,
    score: r.score,
    positions: r.positions, // use for HTML <mark> highlighting
  }));
}

console.log(suggest('gck'));
// [{ command: 'git checkout', score: ..., positions: [0, 4, 7] }]
```

### 3. Command Palette (VS Code style)

Build a Sublime/VS Code-style command palette where users type abbreviated queries to find actions.

```js
const fuzzy = require('@sulthonzh/fuzzyfind');

const actions = [
  { id: 'file.save', label: 'File: Save' },
  { id: 'file.open', label: 'File: Open Folder' },
  { id: 'view.terminal', label: 'View: Toggle Terminal' },
  { id: 'git.commit', label: 'Git: Commit' },
  { id: 'preferences.settings', label: 'Preferences: Open Settings' },
];

function searchPalette(query) {
  return fuzzy.filter(query, actions, { key: 'label', limit: 5 })
    .map(r => ({ ...r.item, score: r.score }));
}

console.log(searchPalette('pref set'));
// [{ id: 'preferences.settings', label: 'Preferences: Open Settings', score: ... }]
```

## How It Works

The scoring algorithm uses dynamic programming to find the optimal alignment of query characters within the target string. Scoring factors:

| Factor | Effect |
|--------|--------|
| Character match | +16 base |
| First query char matched early | +10 bonus |
| Word boundary (after space, `/`, `_`, `-`, `.`) | +8 bonus |
| camelCase transition | +7 bonus |
| Consecutive match (no gap) | +12 bonus |
| Uppercase letter matched | +2 bonus |
| Gap between matched chars | −1 per char |
| Leading/trailing unmatched chars | −0.1 per char |

## API

### `match(query, target, opts?) → { score, positions } | null`

Fuzzy match `query` against `target`. Returns match info or `null`.

Options:
- `caseSensitive` (default: `false`) — case-sensitive matching

### `isMatch(query, target, opts?) → boolean`

Quick boolean check without computing full score.

### `filter(query, targets, opts?) → Array`

Filter and sort an array of strings or objects by fuzzy match score.

Options:
- `key` — property name to match if targets are objects
- `caseSensitive` — case-sensitive matching
- `limit` — max number of results

Returns `{ item, score, positions, target }[]` sorted by score descending.

### `highlight(str, positions, ansi?, reset?) → string`

Wrap matched characters in ANSI escape codes for terminal display.

### `highlightRanges(positions, length) → Array`

Get structured highlight ranges for custom rendering (e.g., HTML `<mark>`).

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

# Version
fuzzyfind --version
```

## Comparison

| Feature | fuzzyfind | [fzf](https://github.com/junegunn/fzf) | [Fuse.js](https://fusejs.io) | [fuzzysort](https://github.com/farzher/fuzzysort) |
|---------|-----------|-------|---------|------------|
| Dependencies | **Zero** | Zero (Go binary) | 1 | Zero |
| Language | JavaScript | Go (native binary) | JavaScript | JavaScript |
| Scoring algorithm | DP (fzf-inspired) | Custom | Bitap + scoring | Prepared-index |
| Runtime | Node.js | Standalone CLI | Browser/Node | Browser/Node |
| Object key filtering | ✅ | Via `--filter` | ✅ | Manual |
| Position tracking | ✅ | ✅ | ❌ | ✅ |
| ANSI highlighting | ✅ | ✅ | ❌ | ❌ |
| CLI included | ✅ | ✅ (standalone) | ❌ | ❌ |
| Bundle size | ~6 KB | 2+ MB | ~15 KB | ~6 KB |
| Pre-built index | ❌ | N/A | Optional | ✅ (faster cold start) |

**When to use fuzzyfind:** You need fuzzy search as a library inside a Node app or CLI tool, with no native dependencies, and fzf-like scoring quality.

**When to use fzf:** You need a standalone interactive terminal fuzzy finder.

**When to use Fuse.js:** You need fuzzy search in the browser with loose/fuzzy matching (typo tolerance).

**When to use fuzzysort:** You have large datasets and can afford a pre-indexing step for sub-millisecond lookups.

## License

MIT
