#!/usr/bin/env node
'use strict';

/**
 * fuzzyfind CLI — fuzzy search files/strings from command line.
 *
 * Usage:
 *   fuzzyfind <query> [options]              # read from stdin
 *   fuzzyfind <query> --file <path>          # search lines in a file
 *   fuzzyfind <query> --list a,b,c           # search comma-separated list
 *
 * Options:
 *   --file <path>        Read candidates from file (one per line)
 *   --list <items>       Comma-separated candidate list
 *   --limit <n>          Max results (default: all)
 *   --json               JSON output with scores
 *   --no-color           Disable ANSI highlighting
 *   --case-sensitive     Case sensitive matching
 *   --highlight-only     Output matched strings with highlighting (no scores)
 *   --score-only         Output scores only (one per line)
 *   -V, --version        Show version
 *   -h, --help           Show help
 */

const fuzzy = require('./index.js');
const pkg = require('./package.json');

function showVersion() {
  console.log(pkg.version);
  process.exit(0);
}

function showHelp() {
  const lines = [
    'Usage: fuzzyfind <query> [options]',
    '',
    'Search strings with fuzzy matching. Reads from stdin by default.',
    '',
    'Options:',
    '  --file <path>        Read candidates from file (one per line)',
    '  --list <items>       Comma-separated candidate list',
    '  --limit <n>          Max results (default: all)',
    '  --json               JSON output with scores',
    '  --no-color           Disable ANSI highlighting',
    '  --case-sensitive     Case sensitive matching',
    '  --highlight-only     Output matched strings with highlighting (no scores)',
    '  --score-only         Output scores only (one per line)',
    '  -h, --help           Show this help',
    '',
    'Examples:',
    '  cat package.json | fuzzyfind name',
    '  fuzzyfind src --file index.js --limit 5',
    '  ls | fuzzyfind test',
    '  find . -name "*.js" | fuzzyfind config',
  ];
  console.log(lines.join('\n'));
  process.exit(0);
}

function parseArgs(argv) {
  const opts = {
    query: null,
    file: null,
    list: null,
    limit: 0,
    json: false,
    color: true,
    caseSensitive: false,
    highlightOnly: false,
    scoreOnly: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        showHelp();
        break;
      case '-V':
      case '--version':
        showVersion();
        break;
      case '--file':
        opts.file = argv[++i];
        break;
      case '--list':
        opts.list = argv[++i];
        break;
      case '--limit':
        opts.limit = parseInt(argv[++i], 10) || 0;
        break;
      case '--json':
        opts.json = true;
        break;
      case '--no-color':
        opts.color = false;
        break;
      case '--case-sensitive':
        opts.caseSensitive = true;
        break;
      case '--highlight-only':
        opts.highlightOnly = true;
        break;
      case '--score-only':
        opts.scoreOnly = true;
        break;
      default:
        if (!opts.query) {
          opts.query = arg;
        } else {
          // Append to query (allow multi-word queries)
          opts.query += ' ' + arg;
        }
    }
    i++;
  }

  return opts;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.query) {
    showHelp();
  }

  // Gather candidates
  let candidates = [];

  if (opts.list) {
    candidates = opts.list.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (opts.file) {
    const fs = require('fs');
    const content = fs.readFileSync(opts.file, 'utf8');
    candidates = content.split('\n').filter(Boolean);
  } else {
    // Read from stdin
    const isTTY = process.stdin.isTTY;
    if (isTTY) {
      console.error('Error: no input. Pipe data via stdin, use --file, or --list');
      console.error('Run "fuzzyfind --help" for usage.');
      process.exit(1);
    }
    const data = await readStdin();
    candidates = data.split('\n').filter(Boolean);
  }

  if (candidates.length === 0) {
    process.exit(0);
  }

  const results = fuzzy.filter(opts.query, candidates, {
    caseSensitive: opts.caseSensitive,
    limit: opts.limit,
  });

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }

  if (opts.scoreOnly) {
    for (const r of results) {
      console.log(r.score);
    }
    process.exit(0);
  }

  const useColor = opts.color && process.stdout.isTTY;
  for (const r of results) {
    if (useColor) {
      console.log(fuzzy.highlight(r.target, r.positions));
    } else {
      console.log(r.target);
    }
  }
}

main();
