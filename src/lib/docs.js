// Server-only: pages, their markdown and their URLs, read from src/docs at build time.
// Every page is prerendered, so these files are only read by `next build` (and `next dev`).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSections, normalizePath, markdownPath, SITE } from '../docs/manifest.js';
import { redirectFor as resolveRedirect } from './redirects.js';

const DOCS = join(process.cwd(), 'src', 'docs');

export const sections = resolveSections((file) => existsSync(join(DOCS, file)));
export const pages = sections.flatMap((section) => section.pages);
const byPath = new Map(pages.map((page) => [page.path, page]));

export { SITE };

export const hasPage = (path) => byPath.has(path);
export const findPage = (path) => byPath.get(normalizePath(path)) ?? null;

/** Where an old or alias URL goes, or null (the same rules next.config.mjs redirects with). */
export const redirectFor = (path) => resolveRedirect(path, hasPage);

/** True when an internal link points at a page that exists in this build. */
export const isKnownPath = (path) => Boolean(findPage(path) || redirectFor(path));

/** The page for the [[...slug]] route params (no slug is the introduction at /). */
export const pageForSlug = (slug = []) => findPage(`/${slug.join('/')}`);
export const slugForPage = (page) => (page.path === '/' ? [] : page.path.slice(1).split('/'));

export const loadPage = (page) => readFileSync(join(DOCS, page.file), 'utf8');

/** Previous and next page in sidebar order, within the same docs version. */
export function neighbours(page) {
  const list = pages.filter((p) => p.legacy === page.legacy);
  const i = list.findIndex((p) => p.path === page.path);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}

export const canonicalUrl = (page) => `${SITE.url}${page.path}`;

/** CalmAPI 2 pages have a raw markdown copy at their path plus .md (written by the generator). */
export const markdownUrl = (page) => (page.legacy ? null : markdownPath(page));

export const pageTitle = (page) =>
  page.path === '/' ? `${SITE.name}: ${SITE.tagline.toLowerCase()}` : `${page.title} | ${SITE.name}${page.legacy ? ' 1.x' : ''}`;

export const pageDescription = (page) =>
  page.description ?? (page.legacy ? `CalmAPI 1.x (legacy) documentation: ${page.nav}.` : SITE.description);
