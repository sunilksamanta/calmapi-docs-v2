#!/usr/bin/env node
// Copy the built CalmAPI block registry into public/r so it is served at
// https://docs.calmapi.dev/r/<name>.json (the URL `calm add --remote` and custom tooling use).
//
//   node scripts/sync-registry.mjs ../calmapi               a calmapi checkout
//   node scripts/sync-registry.mjs ../calmapi/registry/r    or the built folder itself
//   node scripts/sync-registry.mjs <path> --prune             also remove blocks that no longer exist
//
// Build the registry first in the calmapi repo: `node scripts/build-registry.js`.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'r');
const args = process.argv.slice(2);
const prune = args.includes('--prune');
const input = args.find((a) => !a.startsWith('--'));

const fail = (message) => {
  console.error(`sync-registry: ${message}`);
  process.exit(1);
};

if (!input) fail('pass the path to a calmapi checkout (or its registry/r folder).\n  node scripts/sync-registry.mjs ../calmapi');

const base = resolve(input);
const candidates = [base, join(base, 'registry', 'r'), join(base, 'v2', 'registry', 'r')];
const source = candidates.find((dir) => existsSync(join(dir, 'index.json')) && statSync(dir).isDirectory());
if (!source) {
  const blocks = [join(base, 'registry', 'blocks'), join(base, 'v2', 'registry', 'blocks')].find((d) => existsSync(d));
  fail(
    blocks
      ? `found ${blocks} but no built registry. Build it first:\n  node ${join(dirname(dirname(blocks)), 'scripts', 'build-registry.js')}`
      : `no registry/r/index.json under ${base}`,
  );
}

const files = readdirSync(source).filter((f) => f.endsWith('.json')).sort();
const index = JSON.parse(readFileSync(join(source, 'index.json'), 'utf8'));
const listed = new Set((index.items ?? []).map((item) => `${item.name}.json`));

for (const file of files) {
  const item = JSON.parse(readFileSync(join(source, file), 'utf8'));
  if (file === 'index.json') {
    if (!Array.isArray(item.items)) fail('index.json has no "items" array');
    continue;
  }
  if (!item.name || !Array.isArray(item.files) || `${item.name}.json` !== file) fail(`${file} is not a registry item (needs a matching "name" and "files")`);
  if (!listed.has(file)) console.warn(`sync-registry: ${file} is not listed in index.json`);
}

mkdirSync(OUT, { recursive: true });
for (const file of files) copyFileSync(join(source, file), join(OUT, file));

const stale = readdirSync(OUT).filter((f) => f.endsWith('.json') && !files.includes(f));
if (stale.length && prune) for (const f of stale) rmSync(join(OUT, f));

console.log(`sync-registry: copied ${files.length} files from ${source} to public/r`);
if (stale.length) console.log(`sync-registry: ${prune ? 'removed' : 'not in the source (use --prune to remove)'}: ${stale.join(', ')}`);
