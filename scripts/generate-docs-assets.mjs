#!/usr/bin/env node
// Generates everything that is derived from the markdown in src/docs, so it never drifts:
//
//   public/llms.txt              llmstxt.org index of the CalmAPI 2 docs
//   public/llms-full.txt         every CalmAPI 2 page in one file
//   src/generated/md/<slug>.md   raw markdown of each page (linked from llms.txt), served at
//                                /<slug>.md: vite.config.js serves it in dev and copies it into dist/
//   src/generated/search-index.json   titles, headings and text for the search dialog
//
// It also checks internal links and #anchors, and that no page URL collides with another
// page, a redirect or a file in public/. Runs before `npm run dev` and `npm run build`
// (with --strict, the build fails on any problem).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
const RAW = join(GENERATED, 'md');
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
  if (existsSync(join(PUBLIC, markdownPath(page)))) problems.push(`${where}: its markdown copy ${markdownPath(page)} would clash with public${markdownPath(page)}`);
}

// ---- raw markdown copies ---------------------------------------------------------------------
rmSync(RAW, { recursive: true, force: true });
rmSync(join(PUBLIC, 'docs'), { recursive: true, force: true }); // older versions wrote the copies to public/docs/
for (const page of current) {
  const file = join(RAW, markdownPath(page));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page.markdown);
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
writeFileSync(join(PUBLIC, 'llms.txt'), llms.join('\n'));

// ---- llms-full.txt -----------------------------------------------------------------------
const full = [`# ${SITE.name} documentation`, '', `> ${SITE.description}`, ''];
for (const page of current) {
  full.push('---', '', `Source: ${SITE.url}${page.path}`, '', page.markdown.trim(), '');
}
writeFileSync(join(PUBLIC, 'llms-full.txt'), full.join('\n'));

// ---- search index --------------------------------------------------------------------------
const index = pages.map((page) => ({
  path: page.path,
  title: page.title,
  legacy: page.legacy || undefined,
  sections: page.parsed.sections
    .map((s) => ({ id: s.id, heading: s.heading, text: linesToText(s.lines).slice(0, page.legacy ? 400 : 1200) }))
    .filter((s) => s.id || s.text),
}));
mkdirSync(GENERATED, { recursive: true });
writeFileSync(join(GENERATED, 'search-index.json'), JSON.stringify(index));

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
