'use strict';

const fuzzy = require('./index.js');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`FAIL: ${name}`);
    console.error('  ' + e.message);
    failed++;
  }
}

// ---- match() basic ----

test('exact match returns score', () => {
  const m = fuzzy.match('abc', 'abc');
  assert.ok(m, 'Should match');
  assert.ok(m.score > 0, 'Score should be positive');
  assert.deepStrictEqual(m.positions, [0, 1, 2]);
});

test('exact match case-insensitive by default', () => {
  const m = fuzzy.match('ABC', 'abc');
  assert.ok(m);
  assert.deepStrictEqual(m.positions, [0, 1, 2]);
});

test('match with uppercase bonus', () => {
  const m1 = fuzzy.match('idx', 'Index');
  const m2 = fuzzy.match('idx', 'index');
  assert.ok(m1.score > m2.score, 'Matching Idx should score higher than idx');
});

test('no match returns null', () => {
  assert.strictEqual(fuzzy.match('xyz', 'abc'), null);
});

test('query longer than target returns null', () => {
  assert.strictEqual(fuzzy.match('hello world', 'hi'), null);
});

test('empty query matches everything', () => {
  const m = fuzzy.match('', 'anything');
  assert.deepStrictEqual(m, { score: 0, positions: [] });
});

test('empty target does not match', () => {
  assert.strictEqual(fuzzy.match('a', ''), null);
});

test('scattered match', () => {
  const m = fuzzy.match('abc', 'aXbXc');
  assert.ok(m);
  assert.deepStrictEqual(m.positions, [0, 2, 4]);
});

test('consecutive bonus', () => {
  const m1 = fuzzy.match('ab', 'a b');
  const m2 = fuzzy.match('ab', 'ab');
  assert.ok(m2.score > m1.score, 'Consecutive should score higher');
});

test('first character position bonus', () => {
  const m1 = fuzzy.match('ab', 'ab');
  const m2 = fuzzy.match('ab', 'Xab');
  assert.ok(m1.score > m2.score, 'Match at start should score higher');
});

test('word boundary bonus', () => {
  const m1 = fuzzy.match('idx', 'my_index');
  const m2 = fuzzy.match('idx', 'myindex');
  assert.ok(m1.score > m2.score, 'Word boundary (_ before i) should score higher');
});

test('camelCase boundary bonus', () => {
  const m1 = fuzzy.match('idx', 'myIndex');
  const m2 = fuzzy.match('idx', 'myindex');
  assert.ok(m1.score > m2.score, 'camelCase boundary should score higher');
});

test('case sensitive mode', () => {
  assert.strictEqual(fuzzy.match('ABC', 'abc', { caseSensitive: true }), null);
  assert.ok(fuzzy.match('abc', 'abc', { caseSensitive: true }));
});

test('repeated characters', () => {
  const m = fuzzy.match('aaa', 'banana');
  assert.ok(m);
  // Should match positions 1, 3, 5
  assert.deepStrictEqual(m.positions, [1, 3, 5]);
});

test('positions are sorted ascending', () => {
  const m = fuzzy.match('sr', 'server');
  assert.ok(m);
  assert.ok(m.positions[0] < m.positions[1]);
});

test('prefers earlier matches', () => {
  const m1 = fuzzy.match('cat', 'category');
  const m2 = fuzzy.match('cat', 'concatenate');
  assert.ok(m1.score > m2.score, 'Match at beginning should score higher');
});

test('duplicate query chars in target', () => {
  const m = fuzzy.match('ss', 'session');
  assert.ok(m);
  assert.strictEqual(m.positions.length, 2);
});

// ---- isMatch() ----

test('isMatch true for matching', () => {
  assert.strictEqual(fuzzy.isMatch('abc', 'aXbXc'), true);
});

test('isMatch false for non-matching', () => {
  assert.strictEqual(fuzzy.isMatch('xyz', 'abc'), false);
});

test('isMatch empty query', () => {
  assert.strictEqual(fuzzy.isMatch('', 'anything'), true);
});

// ---- filter() ----

test('filter basic sort by score', () => {
  const targets = ['server.ts', 'client.ts', 'service.ts', 'utils.ts'];
  const results = fuzzy.filter('ser', targets);
  assert.strictEqual(results.length, 2); // server.ts and service.ts
  // server should be first (ser at beginning, shorter string)
  assert.strictEqual(results[0].target, 'server.ts');
});

test('filter with limit', () => {
  const targets = ['aaa', 'aab', 'aac', 'aad', 'aae'];
  const results = fuzzy.filter('aa', targets, { limit: 3 });
  assert.strictEqual(results.length, 3);
});

test('filter with objects and key', () => {
  const targets = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
    { name: 'Charlie', age: 35 },
  ];
  // 'ali' matches Alice (A-l-i) and Charlie (a-l-i)
  const results = fuzzy.filter('ali', targets, { key: 'name' });
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].item.name, 'Alice');
});

test('filter returns correct structure', () => {
  const results = fuzzy.filter('test', ['testing', 'toast']);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].target, 'testing');
  assert.strictEqual(results[0].item, 'testing');
  assert.ok(results[0].score > 0);
  assert.ok(Array.isArray(results[0].positions));
});

test('filter empty query matches all with score 0', () => {
  const results = fuzzy.filter('', ['a', 'b']);
  assert.strictEqual(results.length, 2);
});

test('filter ties broken alphabetically', () => {
  const results = fuzzy.filter('ab', ['xab', 'yab', 'zab']);
  assert.strictEqual(results[0].target, 'xab');
  assert.strictEqual(results[1].target, 'yab');
  assert.strictEqual(results[2].target, 'zab');
});

test('filter no matches returns empty', () => {
  const results = fuzzy.filter('zzz', ['abc', 'def']);
  assert.strictEqual(results.length, 0);
});

test('filter case sensitive', () => {
  const results = fuzzy.filter('ABC', ['abc', 'ABC', 'aBc'], { caseSensitive: true });
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].target, 'ABC');
});

// ---- highlightRanges() ----

test('highlightRanges basic', () => {
  const ranges = fuzzy.highlightRanges([0, 2], 4);
  assert.deepStrictEqual(ranges, [
    { start: 0, end: 1, matched: true },
    { start: 1, end: 2, matched: false },
    { start: 2, end: 3, matched: true },
    { start: 3, end: 4, matched: false },
  ]);
});

test('highlightRanges consecutive matches', () => {
  const ranges = fuzzy.highlightRanges([0, 1, 2], 4);
  assert.deepStrictEqual(ranges, [
    { start: 0, end: 3, matched: true },
    { start: 3, end: 4, matched: false },
  ]);
});

test('highlightRanges all matched', () => {
  const ranges = fuzzy.highlightRanges([0, 1, 2], 3);
  assert.deepStrictEqual(ranges, [
    { start: 0, end: 3, matched: true },
  ]);
});

test('highlightRanges none matched', () => {
  const ranges = fuzzy.highlightRanges([], 3);
  assert.deepStrictEqual(ranges, [
    { start: 0, end: 3, matched: false },
  ]);
});

test('highlightRanges empty string', () => {
  assert.deepStrictEqual(fuzzy.highlightRanges([], 0), []);
});

// ---- highlight() ----

test('highlight adds ANSI codes', () => {
  const result = fuzzy.highlight('abc', [0, 1, 2]);
  assert.ok(result.includes('\x1b[32m'));
  assert.ok(result.includes('\x1b[0m'));
});

test('highlight partial match', () => {
  const result = fuzzy.highlight('abc', [1]);
  // a + [highlight]b[reset] + c
  assert.ok(result.includes('\x1b[32mb\x1b[0m'));
  assert.ok(result.startsWith('a'));
  assert.ok(result.endsWith('c'));
});

test('highlight no matches returns original', () => {
  const result = fuzzy.highlight('abc', []);
  assert.strictEqual(result, 'abc');
});

test('highlight custom ANSI', () => {
  const result = fuzzy.highlight('ab', [0], '\x1b[31m', '\x1b[39m');
  assert.ok(result.startsWith('\x1b[31ma\x1b[39m'));
});

// ---- _isWordBoundary() ----

test('isWordBoundary: first char', () => {
  assert.strictEqual(fuzzy._isWordBoundary('', 'a'), true);
});

test('isWordBoundary: after space', () => {
  assert.strictEqual(fuzzy._isWordBoundary(' ', 'a'), true);
});

test('isWordBoundary: after underscore', () => {
  assert.strictEqual(fuzzy._isWordBoundary('_', 'a'), true);
});

test('isWordBoundary: camelCase', () => {
  assert.strictEqual(fuzzy._isWordBoundary('a', 'B'), true);
});

test('isWordBoundary: alpha to digit', () => {
  assert.strictEqual(fuzzy._isWordBoundary('a', '1'), true);
});

test('isWordBoundary: same type', () => {
  assert.strictEqual(fuzzy._isWordBoundary('a', 'b'), false);
});

test('isWordBoundary: after hyphen', () => {
  assert.strictEqual(fuzzy._isWordBoundary('-', 'a'), true);
});

// ---- Real-world scenarios ----

test('file search scenario', () => {
  const files = [
    'src/index.ts',
    'src/server.ts',
    'src/client.ts',
    'src/utils/helpers.ts',
    'test/server.test.ts',
    'README.md',
    'package.json',
  ];
  const results = fuzzy.filter('ser', files);
  assert.strictEqual(results[0].target, 'src/server.ts');
  assert.strictEqual(results[1].target, 'test/server.test.ts');
});

test('shorter target scores higher for same query', () => {
  const m1 = fuzzy.match('conf', 'config');
  const m2 = fuzzy.match('conf', 'configuration');
  assert.ok(m1.score > m2.score);
});

test('multi-word query', () => {
  const m = fuzzy.match('sr er', 'server error');
  assert.ok(m);
});

// ---- Version flag ----

test('version flag shows version', () => {
  const { execSync } = require('child_process');
  const out = execSync('node cli.js --version', { encoding: 'utf8' }).trim();
  assert.ok(/^\d+\.\d+\.\d+$/.test(out), `Version should be semver, got: ${out}`);
});

test('-V short flag shows version', () => {
  const { execSync } = require('child_process');
  const out = execSync('node cli.js -V', { encoding: 'utf8' }).trim();
  assert.ok(/^\d+\.\d+\.\d+$/.test(out), `Version should be semver, got: ${out}`);
});

// ---- Edge cases ----

test('special regex chars in query are literal', () => {
  // '.' should match literal dot, not any char
  const m = fuzzy.match('.', 'a.b');
  assert.ok(m);
  assert.strictEqual(m.positions[0], 1); // matches the actual '.' at position 1
});

test('unicode characters match correctly', () => {
  const m = fuzzy.match('cafe', 'café');
  // 'café' contains 'c','a','f','é' — 'cafe' has 'c','a','f','e'
  // 'e' !== 'é' so this should be null
  assert.strictEqual(m, null);
});

test('exact unicode match', () => {
  const m = fuzzy.match('caf', 'café');
  assert.ok(m);
  assert.deepStrictEqual(m.positions, [0, 1, 2]);
});

test('query with spaces matches across word boundary', () => {
  const m = fuzzy.match('sr er', 'server error');
  assert.ok(m);
  assert.ok(m.positions.length === 5);
});

test('very long target string', () => {
  const longStr = 'a'.repeat(10000) + 'needle' + 'b'.repeat(10000);
  const m = fuzzy.match('needle', longStr);
  assert.ok(m);
  assert.deepStrictEqual(m.positions, [10000, 10001, 10002, 10003, 10004, 10005]);
});

test('single character query', () => {
  const m = fuzzy.match('a', 'abc');
  assert.ok(m);
  assert.strictEqual(m.positions[0], 0);
});

test('repeated query chars exhaust target chars', () => {
  // 'aaa' against 'aa' — query longer than available matches
  const m = fuzzy.match('aaa', 'aa');
  assert.strictEqual(m, null);
});

test('filter preserves original objects', () => {
  const items = [
    { name: 'Alice', id: 1 },
    { name: 'Bob', id: 2 },
  ];
  const results = fuzzy.filter('ali', items, { key: 'name' });
  assert.strictEqual(results[0].item.id, 1);
  assert.strictEqual(results[0].item.name, 'Alice');
});

test('filter with numeric values via String conversion', () => {
  const results = fuzzy.filter('12', [123, 456, 127]);
  assert.ok(results.length >= 1);
  assert.ok(results[0].target.includes('12'));
});

test('highlightRanges handles out-of-order positions', () => {
  // positions should be sorted for correct highlighting
  const ranges = fuzzy.highlightRanges([2, 0], 4);
  assert.deepStrictEqual(ranges, [
    { start: 0, end: 1, matched: true },
    { start: 1, end: 2, matched: false },
    { start: 2, end: 3, matched: true },
    { start: 3, end: 4, matched: false },
  ]);
});

test('match returns consistent score for same input', () => {
  const m1 = fuzzy.match('abc', 'abcdef');
  const m2 = fuzzy.match('abc', 'abcdef');
  assert.strictEqual(m1.score, m2.score);
});

test('filter empty targets array', () => {
  const results = fuzzy.filter('test', []);
  assert.strictEqual(results.length, 0);
});

test('isMatch with case sensitive and special chars', () => {
  assert.strictEqual(fuzzy.isMatch('test', 'test/file.js', { caseSensitive: true }), true);
  assert.strictEqual(fuzzy.isMatch('TEST', 'test/file.js', { caseSensitive: true }), false);
});

test('filter limit larger than results', () => {
  const results = fuzzy.filter('a', ['abc', 'def'], { limit: 10 });
  assert.strictEqual(results.length, 1);
});

test('match with all uppercase target', () => {
  const m = fuzzy.match('abc', 'ABC');
  assert.ok(m);
  assert.deepStrictEqual(m.positions, [0, 1, 2]);
});

test('highlight with empty string', () => {
  assert.strictEqual(fuzzy.highlight('', []), '');
});

// ---- CLI Integration ----

test('CLI --list outputs matching results', () => {
  const { execSync } = require('child_process');
  const out = execSync('node cli.js ser --list "server,client,service,utils"', {
    encoding: 'utf8',
  }).trim();
  const lines = out.split('\n');
  assert.ok(lines.length >= 2);
  assert.ok(lines[0].includes('server') || lines[0].includes('service'));
});

test('CLI --json outputs valid JSON', () => {
  const { execSync } = require('child_process');
  const out = execSync('node cli.js test --list "testing,toast" --json', {
    encoding: 'utf8',
  }).trim();
  const parsed = JSON.parse(out);
  assert.ok(Array.isArray(parsed));
  assert.ok(parsed.length >= 1);
  assert.ok(parsed[0].target);
  assert.ok(typeof parsed[0].score === 'number');
});

// ---- Summary ----

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
