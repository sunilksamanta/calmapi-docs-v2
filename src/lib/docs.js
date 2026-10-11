import { resolveSections, normalizePath, REDIRECTS, ADVISORY_PREFIX, ADVISORIES_PAGE, SITE } from '../docs/manifest.js';

// Markdown is loaded lazily: every page becomes its own small chunk.
const loaders = import.meta.glob('../docs/**/*.md', { query: '?raw', import: 'default' });
const keyFor = (file) => `../docs/${file}`;

export const sections = resolveSections((file) => Boolean(loaders[keyFor(file)]));
export const pages = sections.flatMap((section) => section.pages);
const byPath = new Map(pages.map((page) => [page.path, page]));

export { SITE, normalizePath };

export const findPage = (path) => byPath.get(normalizePath(path)) ?? null;

/** Where an old or alias URL should go, or null. */
export function redirectFor(path) {
  const p = normalizePath(path);
  if (REDIRECTS[p]) return REDIRECTS[p];
  if (p.startsWith(ADVISORY_PREFIX)) return byPath.has(ADVISORIES_PAGE) ? ADVISORIES_PAGE : '/docs/security';
  return null;
}

/** True when an internal link points at a page that exists in this build. */
export const isKnownPath = (path) => Boolean(findPage(path) || redirectFor(path));

export const loadPage = (page) => loaders[keyFor(page.file)]();

/** Previous and next page in sidebar order, within the same docs version. */
export function neighbours(page) {
  const list = pages.filter((p) => p.legacy === page.legacy);
  const i = list.findIndex((p) => p.path === page.path);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}
