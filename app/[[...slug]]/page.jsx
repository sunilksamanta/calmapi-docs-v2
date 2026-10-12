import { notFound } from 'next/navigation';
import DocsPage from '../../src/components/DocsPage.jsx';
import { pages, pageForSlug, slugForPage } from '../../src/lib/docs.js';
import { pageMetadata, structuredData, jsonLd } from '../../src/lib/seo.js';

// One prerendered page per manifest page (CalmAPI 2 and 1.x); the introduction is at /.
// Any other URL is a 404 (or one of the redirects in next.config.mjs).
export const dynamicParams = false;
// Fail the build instead of rendering a page on request if anything here becomes dynamic.
export const dynamic = 'error';

export function generateStaticParams() {
  return pages.map((page) => ({ slug: slugForPage(page) }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = pageForSlug(slug);
  return page ? pageMetadata(page) : {};
}

export default async function Page({ params }) {
  const { slug } = await params;
  const page = pageForSlug(slug);
  if (!page) notFound();
  return (
    <>
      <DocsPage page={page} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(page)) }} />
    </>
  );
}
