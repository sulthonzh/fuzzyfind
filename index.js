'use strict';

/**
 * fuzzyfind — Zero-dependency fuzzy string matching.
 *
 * Scoring algorithm inspired by fzf / Sublime Text.
 * Matches are scored by:
 *   - Consecutive character matches (bonus)
 *   - Matches at word boundaries (bonus)
 *   - Matches at beginning of string (bonus)
 *   - Earlier matches score higher
 *   - Shorter strings with full match score higher
 */

// ---- Character classification ----

function isAlpha(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/**
 * Is this character at a word boundary?
 * True if: previous char is non-alphanumeric, or this is the first char,
 * or transition from lower to upper case.
 */
function isWordBoundary(prev, curr) {
  if (prev === '') return true;
  if (isWhitespace(prev)) return true;
  if (isAlpha(prev) && !isAlpha(curr)) return true;
  if (!isAlpha(prev) && isAlpha(curr)) return true;
  if (isDigit(prev) && !isDigit(curr)) return true;
  if (!isDigit(prev) && isDigit(curr)) return true;
  if (prev === prev.toLowerCase() && curr === curr.toUpperCase() && isAlpha(curr)) return true; // camelCase
  if (prev === '-' || prev === '_' || prev === '.' || prev === '/' || prev === '\\') return true;
  return false;
}

// ---- Scoring constants ----

const SCORE_MATCH = 16;
const SCORE_WORD_BOUNDARY = 8;
const SCORE_CAMEL_BOUNDARY = 7;
const SCORE_CONSECUTIVE = 12;
const SCORE_FIRST_CHAR = 10;
const SCORE_UPPERCASE_MATCH = 2;
const PENALTY_GAP = -1;
const PENALTY_UNMATCHED = -0.1;

/**
 * Core fuzzy match using a dynamic programming approach.
 * Returns { score, positions } or null.
 *
 * @param {string} query — The search query (what you type)
 * @param {string} target — The string to search within
 * @param {object} [opts]
 * @param {boolean} [opts.caseSensitive=false]
 * @returns {{ score: number, positions: number[] } | null}
 */
function match(query, target, opts) {
  if (!query || !target) {
    return query === '' ? { score: 0, positions: [] } : null;
  }

  opts = opts || {};
  const caseSensitive = opts.caseSensitive === true;

  const q = caseSensitive ? query : query.toLowerCase();
  const t = caseSensitive ? target : target.toLowerCase();

  const qlen = q.length;
  const tlen = t.length;

  if (qlen > tlen) return null;

  // DP tables:
  // dp[i][j] = best score matching q[0..i] against t[0..j] (using t[j] for q[i])
  // We also track positions via backtracking.

  // Use two rows for memory efficiency: previous row (i-1) and current row (i)
  const NEG_INF = -1e9;

  // For backtracking we store the DP values in a full 2D array
  // Given typical use (short queries, moderate targets), this is fine.
  const dp = [];
  for (let i = 0; i < qlen; i++) {
    dp.push(new Float64Array(tlen));
  }
  const back = [];
  for (let i = 0; i < qlen; i++) {
    back.push(new Int32Array(tlen).fill(-1));
  }

  for (let i = 0; i < qlen; i++) {
    let maxInRow = NEG_INF;
    for (let j = i; j < tlen; j++) {
      if (q[i] !== t[j]) {
        dp[i][j] = NEG_INF;
        continue;
      }

      // Base char match score
      let s = SCORE_MATCH;

      // First char of query bonus
      if (i === 0) {
        s += SCORE_FIRST_CHAR;
      }

      // Boundary bonus
      const prevChar = j > 0 ? t[j - 1] : '';
      if (isWordBoundary(prevChar, t[j])) {
        const origPrev = j > 0 ? target[j - 1] : '';
        const origCurr = target[j];
        if (origPrev === origPrev.toLowerCase() && origCurr === origCurr.toUpperCase() && isAlpha(origCurr)) {
          s += SCORE_CAMEL_BOUNDARY;
        } else {
          s += SCORE_WORD_BOUNDARY;
        }
      }

      // Uppercase match bonus (matching an uppercase letter in target)
      if (target[j] === target[j].toUpperCase() && isAlpha(target[j])) {
        s += SCORE_UPPERCASE_MATCH;
      }

      // Compute best score from all previous j positions
      if (i === 0) {
        // For first query char, just use the base score minus gap penalty
        s += j * PENALTY_UNMATCHED;
        dp[i][j] = s;
        back[i][j] = -1;
      } else {
        // Find best dp[i-1][k] for k < j, including consecutive bonus and gap penalty
        let bestTotal = NEG_INF;
        let bestK = -1;
        for (let k = i - 1; k < j; k++) {
          if (dp[i - 1][k] === NEG_INF) continue;
          const gap = j - k - 1;
          let candidate = dp[i - 1][k] + s + (gap * PENALTY_GAP);
          // Consecutive bonus only if previous match was at j-1
          if (k === j - 1) {
            candidate += SCORE_CONSECUTIVE;
          }
          if (candidate > bestTotal) {
            bestTotal = candidate;
            bestK = k;
          }
        }
        dp[i][j] = bestTotal;
        back[i][j] = bestK;
      }

      if (dp[i][j] > maxInRow) {
        maxInRow = dp[i][j];
      }
    }
  }

  // Find best ending position in last row
  let bestJ = -1;
  let bestScore = NEG_INF;
  for (let j = qlen - 1; j < tlen; j++) {
    if (dp[qlen - 1][j] > bestScore) {
      bestScore = dp[qlen - 1][j];
      bestJ = j;
    }
  }

  if (bestJ === -1 || bestScore === NEG_INF) {
    return null;
  }

  // Backtrack to find positions
  const positions = new Array(qlen);
  let row = qlen - 1;
  let col = bestJ;
  while (row >= 0) {
    positions[row] = col;
    col = back[row][col];
    row--;
  }

  return { score: bestScore + (tlen - 1 - bestJ) * PENALTY_UNMATCHED, positions };
}

/**
 * Check if query fuzzy-matches target (boolean only).
 * @param {string} query
 * @param {string} target
 * @param {object} [opts]
 * @returns {boolean}
 */
function isMatch(query, target, opts) {
  return match(query, target, opts) !== null;
}

/**
 * Filter and sort targets by fuzzy match score.
 * Returns array of { item, score, positions } sorted by score descending.
 *
 * @param {string} query
 * @param {Array<string>|Array<{item: string}>} targets — strings or objects with .item
 * @param {object} [opts]
 * @param {string} [opts.key] — property to match if targets are objects
 * @param {boolean} [opts.caseSensitive]
 * @param {number} [opts.limit] — max results
 * @returns {Array<{item: *, score: number, positions: number[], target: string}>}
 */
function filter(query, targets, opts) {
  opts = opts || {};
  const key = opts.key;
  const limit = opts.limit || 0;

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const entry = targets[i];
    const targetStr = key ? entry[key] : (typeof entry === 'string' ? entry : String(entry));

    const m = match(query, targetStr, opts);
    if (m) {
      results.push({
        item: entry,
        score: m.score,
        positions: m.positions,
        target: targetStr,
      });
    }
  }

  // Sort by score descending, then alphabetically for ties
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.target.localeCompare(b.target);
  });

  if (limit > 0 && results.length > limit) {
    return results.slice(0, limit);
  }
  return results;
}

/**
 * Get highlight ranges for ANSI terminal output.
 * Returns array of { start, end, matched } for rendering.
 *
 * @param {number[]} positions — Match positions from match()
 * @param {number} length — Total string length
 * @returns {Array<{start: number, end: number, matched: boolean}>}
 */
function highlightRanges(positions, length) {
  if (length === 0) return [];
  const ranges = [];
  const matched = new Set(positions);
  let i = 0;
  while (i < length) {
    const isMatched = matched.has(i);
    let j = i;
    while (j < length && matched.has(j) === isMatched) j++;
    ranges.push({ start: i, end: j, matched: isMatched });
    i = j;
  }
  return ranges;
}

/**
 * Render a string with matched characters highlighted using ANSI codes.
 *
 * @param {string} str
 * @param {number[]} positions
 * @param {string} [ansi='\x1b[32m'] — ANSI code for highlight (green by default)
 * @param {string} [reset='\x1b[0m']
 * @returns {string}
 */
function highlight(str, positions, ansi, reset) {
  ansi = ansi || '\x1b[32m';
  reset = reset || '\x1b[0m';
  const ranges = highlightRanges(positions, str.length);
  let result = '';
  for (const r of ranges) {
    const segment = str.slice(r.start, r.end);
    result += r.matched ? ansi + segment + reset : segment;
  }
  return result;
}

module.exports = {
  match,
  isMatch,
  filter,
  highlight,
  highlightRanges,
  // Export for testing
  _isWordBoundary: isWordBoundary,
};
