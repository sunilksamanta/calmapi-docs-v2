#!/usr/bin/env node
// Block pages from a calmapi v2 checkout: a page for every block that has none yet (from its
// docs.md), and on every block page the generated "Official documentation" and "For AI agents"
// sections from block.json (links, agents), between markers so they can be written again.
//
//   node scripts/sync-block-guides.mjs ../calmapi/v2

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? '../calmapi/v2');
const blocksDir = join(source, 'registry', 'blocks');
if (!existsSync(blocksDir)) {
  console.error(`sync-block-guides: no registry/blocks under ${source}`);
  process.exit(1);
}

const START = '<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->';
const END = '<!-- block-guide:end -->';
const created = [];
const updated = [];
for (const name of readdirSync(blocksDir).sort()) {
  const metaFile = join(blocksDir, name, 'block.json');
  if (!existsSync(metaFile)) continue;
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const page = join(ROOT, 'src', 'docs', 'blocks', `${name}.md`);
  if (!existsSync(page)) {
    const docs = join(blocksDir, name, 'docs.md');
    writeFileSync(page, existsSync(docs) ? readFileSync(docs, 'utf8') : `# ${meta.title}\n\n${meta.description}\n`);
    created.push(name);
  }
  const links = (meta.links ?? []).filter((l) => /^https?:\/\//.test(l?.url ?? ''));
  const parts = [START];
  if (links.length) parts.push('', '## Official documentation', '', 'Read these before changing the block; they are also in `app/blocks/' + name + '/AGENTS.md` and in the devtools Blocks panel.', '', ...links.map((l) => `- [${l.title}](${l.url})`));
  if (meta.agents) parts.push('', '## For AI agents', '', `Coding agents read these notes in \`app/blocks/${name}/AGENTS.md\`:`, '', meta.agents.trim());
  parts.push('', END);
  const text = readFileSync(page, 'utf8');
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  const next = s !== -1 && e > s ? `${text.slice(0, s).trimEnd()}\n\n${parts.join('\n')}\n${text.slice(e + END.length).replace(/^\n+/, '')}` : `${text.trimEnd()}\n\n${parts.join('\n')}\n`;
  if (next !== text) {
    writeFileSync(page, next);
    updated.push(name);
  }
}
console.log(`sync-block-guides: created ${created.length} page(s)${created.length ? ` (${created.join(', ')})` : ''}, updated ${updated.length}`);
