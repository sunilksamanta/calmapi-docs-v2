// Server-only: per page <head> metadata and JSON-LD structured data.
import { SITE, sections, canonicalUrl, markdownUrl, pageTitle, pageDescription, lastModified } from './docs.js';

const SITE_NAME = `${SITE.name} docs`;
// The Calm API social card (the lotus banner), in public/og.png.
const OG_IMAGE = { url: `${SITE.url}/og.png`, width: 1200, height: 630, alt: 'Calm API: Keep Calm & REST. The backend framework you own, for Node.js and MongoDB' };
const HOME_URL = `${SITE.url}/`;

/** generateMetadata() result for a page: title, description, canonical URL, Open Graph, Twitter, markdown copy. */
export function pageMetadata(page) {
  const title = pageTitle(page);
  const description = pageDescription(page);
  const url = canonicalUrl(page);
  const markdown = markdownUrl(page);
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      ...(markdown ? { types: { 'text/markdown': markdown } } : {}),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: page.path === '/' ? 'website' : 'article',
      locale: 'en_US',
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
  };
}

const publisher = { '@type': 'Organization', name: SITE.name, url: SITE.website };

/** Home, the page's sidebar section (linked to its first page) and the page. */
function breadcrumbs(page) {
  const section = sections.find((s) => s.title === page.section);
  const trail = [];
  if (page.path !== '/') trail.push({ name: SITE_NAME, url: HOME_URL });
  const first = section?.pages[0];
  if (first && first.path !== '/' && first.path !== page.path) trail.push({ name: section.title, url: canonicalUrl(first) });
  trail.push({ name: page.title, url: canonicalUrl(page) });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: crumb.url })),
  };
}

/** TechArticle and BreadcrumbList for every page, plus the WebSite on the home page. */
export function structuredData(page) {
  const url = canonicalUrl(page);
  const modified = lastModified(page);
  const graph = [
    {
      '@type': 'TechArticle',
      headline: page.title,
      description: pageDescription(page),
      url,
      mainEntityOfPage: url,
      inLanguage: 'en',
      ...(modified ? { dateModified: modified } : {}),
      publisher,
    },
    breadcrumbs(page),
  ];
  if (page.path === '/') {
    graph.push({ '@type': 'WebSite', name: SITE_NAME, url: HOME_URL, description: SITE.description, inLanguage: 'en', publisher });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** JSON for a <script type="application/ld+json">, safe to inline in HTML. */
export const jsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
