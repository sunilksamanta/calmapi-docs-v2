#!/usr/bin/env node
// Generates everything that is derived from the markdown in src/docs, so it never drifts:
//
//   public/llms.txt              llmstxt.org index of the CalmAPI 2 docs
//   public/llms-full.txt         every CalmAPI 2 page in one file
//   public/<slug>.md             raw markdown of each CalmAPI 2 page (linked from llms.txt and from
//                                each page's <link rel="alternate">), served at /<slug>.md
//   src/generated/search-index.json    titles, headings and text for the search dialog
//   src/generated/blocks.json          the block catalog on /blocks (public/r, the manifest and the
//                                      groups of the "Official blocks" table in blocks.md)
//   src/generated/last-modified.json   date of the last commit that changed each markdown file
//
// Files in public/ are served as they are by Next.js, so the generated ones are written there
// directly (and git-ignored, see .gitignore). src/generated/public-files.json lists them, so the
// next run removes them before checking for clashes and a removed page's copy does not linger.
//
// It also checks internal links and #anchors, and that no page URL collides with another
// page, a redirect or a file in public/. Runs before `npm run dev` and `npm run build`
// (with --strict, the build fails on any problem).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE,
  REDIRECTS,
  RESERVED_SEGMENTS,
  OLD_DOCS_PREFIX,
  ADVISORY_PREFIX,
  ADVISORIES_PAGE,
  resolveSections,
  normalizePath,
  markdownPath,
  movedDocsPath,
} from '../src/docs/manifest.js';
import { parseMarkdown, linesToText } from '../src/lib/markdown-text.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'src', 'docs');
const PUBLIC = join(ROOT, 'public');
const GENERATED = join(ROOT, 'src', 'generated');
const RECORD = join(GENERATED, 'public-files.json');
const strict = process.argv.includes('--strict');

const sections = resolveSections((file) => existsSync(join(DOCS, file)));
// Pages listed in the manifest whose markdown was moved out (held back): links to them are
// rendered as plain text by the site, so they are reported but do not fail the build.
const heldBack = new Set(resolveSections(() => true).flatMap((s) => s.pages).map((p) => p.path).filter((path) => !sections.some((s) => s.pages.some((p) => p.path === path))));
const notes = [];
const pages = sections.flatMap((s) => s.pages).map((page) => {
  const markdown = readFileSync(join(DOCS, page.file), 'utf8');
  return { ...page, markdown, parsed: parseMarkdown(markdown) };
});
const byPath = new Map(pages.map((p) => [p.path, p]));
const current = pages.filter((p) => !p.legacy);
const problems = [];

// ---- remove the files the previous run wrote to public/ -------------------------------------
let previous = [];
try {
  previous = JSON.parse(readFileSync(RECORD, 'utf8'));
} catch {
  // First run, or src/generated was deleted.
}
for (const rel of previous) {
  const file = resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + sep)) continue;
  rmSync(file, { force: true });
  // Drop folders that only held generated files (public/blocks/), never public/ itself.
  for (let dir = dirname(file); dir.startsWith(PUBLIC + sep) && existsSync(dir) && !readdirSync(dir).length; dir = dirname(dir)) rmSync(dir, { recursive: true });
}
rmSync(RECORD, { force: true });
rmSync(join(GENERATED, 'md'), { recursive: true, force: true }); // older versions wrote the copies to src/generated/md/
rmSync(join(PUBLIC, 'docs'), { recursive: true, force: true }); // and before that to public/docs/

// ---- URL collisions --------------------------------------------------------------------------
// Every page, including held back ones, so a page cannot be published onto a taken URL.
const publicNames = new Set(readdirSync(PUBLIC));
const seenPaths = new Set();
for (const page of resolveSections(() => true).flatMap((s) => s.pages)) {
  const where = `src/docs/manifest.js (${page.slug})`;
  if (seenPaths.has(page.path)) problems.push(`${where}: ${page.path} is used by another page`);
  seenPaths.add(page.path);
  if (REDIRECTS[page.path]) problems.push(`${where}: ${page.path} is also a redirect in REDIRECTS, remove one of them`);
  if (page.legacy) continue;
  const first = page.path.split('/')[1];
  if (first && (RESERVED_SEGMENTS.includes(first) || publicNames.has(first))) {
    problems.push(`${where}: ${page.path} starts with /${first}, which is reserved (RESERVED_SEGMENTS or a file in public/)`);
  }
  if (existsSync(join(PUBLIC, markdownPath(page)))) {
    problems.push(`${where}: its markdown copy ${markdownPath(page)} would clash with public${markdownPath(page)} (delete that file if it is a stale generated copy)`);
  }
}

// ---- files written to public/ ----------------------------------------------------------------
const written = [];
const writePublic = (path, content) => {
  const file = join(PUBLIC, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  written.push(path.replace(/^\//, ''));
};

// ---- raw markdown copies ---------------------------------------------------------------------
for (const page of current) {
  // Never overwrite a committed file (reported as a clash above).
  if (!existsSync(join(PUBLIC, markdownPath(page)))) writePublic(markdownPath(page), page.markdown);
}

// ---- llms.txt --------------------------------------------------------------------------
const llms = [
  `# ${SITE.name}`,
  '',
  `> ${SITE.description}`,
  '',
  'CalmAPI 2 (npm package `calmapi`, Node.js 22.12+, Express 5, MongoDB with Mongoose, ESM) copies its framework code into each project as `calm/`. Resources are declared once with `f.*()` fields and access policies; services, custom routes, blocks and the `calm` CLI build on that. Each link below is the markdown source of a page; the same page is at the URL without `.md`.',
  '',
];
for (const section of sections.filter((s) => !s.legacy)) {
  llms.push(`## ${section.title}`, '');
  for (const page of section.pages) llms.push(`- [${page.title}](${SITE.url}${markdownPath(page)}): ${page.description}`);
  llms.push('');
}
llms.push(
  '## Optional',
  '',
  `- [All CalmAPI 2 docs in one file](${SITE.url}/llms-full.txt): every page above, concatenated`,
  `- [Block registry](${SITE.url}/r/index.json): official blocks in the shadcn registry-item format, one item per block at ${SITE.url}/r/<name>.json`,
  `- [CalmAPI 1.x docs (legacy)](${SITE.url}/v1): documentation for the previous major version, no longer developed`,
  '',
);
writePublic('/llms.txt', llms.join('\n'));

// ---- llms-full.txt -----------------------------------------------------------------------
const full = [`# ${SITE.name} documentation`, '', `> ${SITE.description}`, ''];
for (const page of current) {
  full.push('---', '', `Source: ${SITE.url}${page.path}`, '', page.markdown.trim(), '');
}
writePublic('/llms-full.txt', full.join('\n'));
mkdirSync(GENERATED, { recursive: true });
writeFileSync(RECORD, `${JSON.stringify(written, null, 2)}\n`);

// Generated files must not be committed: warn when .gitignore misses one (a page in a new folder).
const git = (args, input) =>
  execFileSync('git', args, { cwd: ROOT, input, encoding: 'utf8', stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'ignore'] });
try {
  const paths = written.map((rel) => `public/${rel}`);
  let out;
  try {
    out = git(['check-ignore', '--no-index', '--stdin'], paths.join('\n'));
  } catch (error) {
    if (error.status !== 1) throw error; // 1: none of them is ignored
    out = '';
  }
  const ignored = new Set(out.split('\n').filter(Boolean));
  const missing = paths.filter((path) => !ignored.has(path));
  if (missing.length) console.warn(`docs: add these generated files to .gitignore:\n  ${missing.join('\n  ')}`);
} catch {
  // Not a git checkout (some CI builds).
}

// ---- search index --------------------------------------------------------------------------
// One entry per page: its URL, title, sidebar group and one item per h2 and h3 section (the text
// before the first h2 is the page itself, id ""). Short keys keep the file small; it is
// downloaded the first time the search dialog opens and searched in the browser
// (src/components/Search.jsx).
const index = pages.map((page) => ({
  p: page.path,
  t: page.title,
  g: page.legacy ? 'CalmAPI 1.x' : page.section,
  ...(page.legacy ? { l: 1 } : {}),
  s: page.parsed.sections
    .map((s) => [s.id, s.heading, linesToText(s.lines).slice(0, page.legacy ? 400 : 1200)])
    .filter(([id, , text]) => id || text),
}));
writeFileSync(join(GENERATED, 'search-index.json'), JSON.stringify(index));

// ---- block catalog -------------------------------------------------------------------------
// Every block of the registry in public/r, with the title and description of its page in the
// manifest and its group in the "Official blocks" table of blocks.md (rows like
// "| **Messaging** | |" start a group). Rendered by src/components/BlocksCatalog.jsx.
const REGISTRY = join(PUBLIC, 'r');
const blockGroups = new Map();
const groupOrder = [];
{
  const overview = byPath.get('/blocks')?.markdown ?? '';
  const start = overview.indexOf('\n## Official blocks');
  const table = start < 0 ? '' : overview.slice(start + 1).split(/\n## /)[0];
  let group = 'Other';
  for (const line of table.split('\n')) {
    const heading = /^\|\s*\*\*([^*]+)\*\*\s*\|\s*\|?\s*$/.exec(line);
    if (heading) {
      group = heading[1].trim();
      groupOrder.push(group);
      continue;
    }
    for (const [, name] of line.matchAll(/\]\(\/blocks\/([a-z0-9-]+)\)/g)) if (!blockGroups.has(name)) blockGroups.set(name, group);
  }
}
const blocks = [];
if (existsSync(REGISTRY)) {
  for (const file of readdirSync(REGISTRY).filter((f) => f.endsWith('.json') && f !== 'index.json').sort()) {
    let item;
    try {
      item = JSON.parse(readFileSync(join(REGISTRY, file), 'utf8'));
    } catch {
      problems.push(`public/r/${file}: not valid JSON`);
      continue;
    }
    const page = byPath.get(`/blocks/${item.name}`);
    const group = blockGroups.get(item.name);
    if (!page) notes.push(`public/r/${file}: block ${item.name} has no page at /blocks/${item.name}`);
    if (!group) notes.push(`public/r/${file}: block ${item.name} is not in the "Official blocks" table of blocks.md`);
    blocks.push({
      name: item.name,
      title: (page?.title ?? item.title ?? item.name).replace(new RegExp(`\\s*\\(${item.name}\\)$`), ''),
      description: page?.description ?? item.description ?? '',
      version: item.version ?? '',
      group: group ?? 'Other',
      tags: item.categories ?? [],
      dependencies: (item.dependencies ?? []).map((d) => d.replace(/(?!^)@.*$/, '')),
      env: Object.keys(item.envVars ?? {}),
      files: (item.files ?? []).length,
      path: page ? page.path : null,
    });
  }
}
if (blocks.some((b) => b.group === 'Other')) groupOrder.push('Other');
writeFileSync(join(GENERATED, 'blocks.json'), JSON.stringify({ groups: groupOrder.filter((g) => blocks.some((b) => b.group === g)), blocks }));

// ---- last modified dates ---------------------------------------------------------------------
// Date of the last commit that changed each markdown file (keyed by its path in src/docs), for
// the pages' structured data and the sitemap. Left empty without git; in a shallow clone the
// oldest commit stands in for all earlier history, so a date from it would be wrong and is skipped.
const modified = {};
try {
  const shallow = resolve(ROOT, git(['rev-parse', '--git-path', 'shallow']).trim());
  const boundary = new Set(existsSync(shallow) ? readFileSync(shallow, 'utf8').split('\n').filter(Boolean) : []);
  const log = execFileSync('git', ['log', '--format=%x00%H %cI', '--name-only', '--no-renames', '--relative', '--', '.'], {
    cwd: DOCS,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  });
  for (const entry of log.split('\0').slice(1)) {
    const [head, ...files] = entry.trim().split('\n');
    const [hash, date] = head.split(' ');
    if (boundary.has(hash)) continue;
    for (const file of files) if (file && !(file in modified)) modified[file] = date;
  }
} catch {
  // Not a git checkout.
}
writeFileSync(join(GENERATED, 'last-modified.json'), `${JSON.stringify(modified, null, 2)}\n`);

// ---- link check ------------------------------------------------------------------------------
const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const GENERATED_FILES = new Set(['/llms.txt', '/llms-full.txt', ...current.map(markdownPath)]);
const resolvePage = (path) => {
  const p = normalizePath(path);
  if (byPath.has(p)) return byPath.get(p);
  if (REDIRECTS[p]) return byPath.get(REDIRECTS[p].split('#')[0]) ?? null;
  if (p.startsWith(ADVISORY_PREFIX)) return byPath.get(ADVISORIES_PAGE) ?? null;
  return null;
};
const anchors = (page) => new Set(page.parsed.headings.map((h) => h.id));

for (const page of pages) {
  let fence = false;
  page.markdown.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) return;
    for (const [, raw] of line.replace(/`[^`]*`/g, '').matchAll(LINK)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) continue;
      const where = `src/docs/${page.file}:${i + 1}`;
      const [pathPart, hash] = raw.split('#');
      if (!pathPart) {
        if (hash && !anchors(page).has(hash)) problems.push(`${where}: no heading #${hash} on this page`);
        continue;
      }
      if (!pathPart.startsWith('/')) {
        problems.push(`${where}: use an absolute link (/policies, /blocks/jobs) instead of "${raw}"`);
        continue;
      }
      if (pathPart === '/docs' || pathPart.startsWith(OLD_DOCS_PREFIX)) {
        problems.push(`${where}: ${pathPart} is an old URL, link to ${movedDocsPath(pathPart) ?? '/'} instead`);
        continue;
      }
      if (/\.[a-z0-9]+$/i.test(pathPart)) {
        if (!GENERATED_FILES.has(pathPart) && !existsSync(join(PUBLIC, pathPart))) problems.push(`${where}: file ${pathPart} does not exist in public/`);
        continue;
      }
      const target = resolvePage(pathPart);
      if (!target && (heldBack.has(normalizePath(pathPart)) || (pathPart.startsWith(ADVISORY_PREFIX) && heldBack.has(ADVISORIES_PAGE)))) {
        notes.push(`${where}: links to held back page ${pathPart} (shown as plain text)`);
        continue;
      }
      if (!target) {
        problems.push(`${where}: no page at ${pathPart}`);
        continue;
      }
      if (hash && !anchors(target).has(hash)) problems.push(`${where}: ${target.path} has no heading #${hash}`);
    }
  });
}

const words = current.reduce((n, p) => n + p.markdown.split(/\s+/).length, 0);
console.log(`docs: ${current.length} pages (${words} words) + ${pages.length - current.length} legacy pages -> llms.txt, llms-full.txt, search index`);
if (notes.length) console.log(`docs: ${notes.length} link(s) to held back pages:\n  ${notes.join('\n  ')}`);
if (problems.length) {
  console.warn(`docs: ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  if (strict) process.exit(1);
}
