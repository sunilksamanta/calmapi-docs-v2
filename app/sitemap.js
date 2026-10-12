import { pages, canonicalUrl, lastModified } from '../src/lib/docs.js';

// Every page is indexable (only the 404 page is noindex), so every page is listed.
export default function sitemap() {
  return pages.map((page) => {
    const modified = lastModified(page);
    return { url: canonicalUrl(page), ...(modified ? { lastModified: modified } : {}) };
  });
}
