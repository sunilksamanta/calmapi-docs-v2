import {
  REDIRECTS,
  ADVISORY_PREFIX,
  ADVISORIES_PAGE,
  ADVISORIES_FALLBACK,
  OLD_DOCS_PREFIX,
  movedDocsPath,
  normalizePath,
} from '../docs/manifest.js';

// Every redirect of the site, derived from src/docs/manifest.js. next.config.mjs serves them
// as permanent HTTP redirects (redirectRules), and the markdown renderer uses redirectFor to
// link straight to the final URL. Both take hasPage(path), which tells whether a page is
// published in this build (a page whose markdown file is held back is not).

const advisoriesTarget = (hasPage) => (hasPage(ADVISORIES_PAGE) ? ADVISORIES_PAGE : ADVISORIES_FALLBACK);

/** Where an old or alias URL goes, or null. */
export function redirectFor(path, hasPage) {
  const p = normalizePath(path);
  if (REDIRECTS[p]) return REDIRECTS[p];
  if (p.startsWith(ADVISORY_PREFIX)) return advisoriesTarget(hasPage);
  const moved = movedDocsPath(p);
  if (moved && hasPage(moved)) return moved;
  return null;
}

/** The same redirects as next.config.mjs redirects() rules, in match order. */
export function redirectRules(hasPage) {
  return [
    // Old URLs and aliases (/introduction, the 1.x pages that used to live at the root).
    ...Object.entries(REDIRECTS).map(([source, destination]) => ({ source, destination, permanent: true })),
    // /advisories/<id>, the link printed by `calm doctor`.
    { source: `${ADVISORY_PREFIX}:id+`, destination: advisoriesTarget(hasPage), permanent: true },
    // CalmAPI 2 pages and their markdown copies used to be served under /docs/.
    { source: `${OLD_DOCS_PREFIX}:path+`, destination: '/:path+', permanent: true },
  ];
}
