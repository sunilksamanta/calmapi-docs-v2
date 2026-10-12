import Link from 'next/link';
import { ArrowLeft, ArrowRight, History } from 'lucide-react';
import { loadPage, neighbours } from '../lib/docs.js';
import { renderMarkdown } from './Markdown.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import Toc from './Toc.jsx';

function LegacyBanner() {
  return (
    <div className="legacy-banner" role="note">
      <History size={18} aria-hidden="true" />
      <p>
        You are reading the docs for <strong>CalmAPI 1.x (legacy)</strong>, which is no longer developed. Run{' '}
        <code>npx calmapi@next doctor</code> in your 1.x project to check it against published advisories, then see{' '}
        <Link href="/migrate-v1">Migrating from 1.x</Link> or the <Link href="/">CalmAPI 2 docs</Link>.
      </p>
    </div>
  );
}

function PrevNext({ page }) {
  const { prev, next } = neighbours(page);
  if (!prev && !next) return null;
  return (
    <nav className="prev-next" aria-label="Previous and next page">
      {prev ? (
        <Link href={prev.path} className="prev-next-link prev" rel="prev">
          <span className="prev-next-label">
            <ArrowLeft size={14} aria-hidden="true" /> Previous
          </span>
          <span className="prev-next-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.path} className="prev-next-link next" rel="next">
          <span className="prev-next-label">
            Next <ArrowRight size={14} aria-hidden="true" />
          </span>
          <span className="prev-next-title">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

/** One documentation page, rendered on the server (prerendered at build time). */
function DocsPage({ page }) {
  const { element, headings } = renderMarkdown(loadPage(page));
  return (
    <div className="doc-shell">
      <article className="doc-article">
        {page.legacy ? <LegacyBanner /> : null}
        <div className="docs-page">
          {element}
        </div>
        <PrevNext page={page} />
      </article>
      <Toc items={headings} />
      <ScrollToTop />
    </div>
  );
}

export default DocsPage;
