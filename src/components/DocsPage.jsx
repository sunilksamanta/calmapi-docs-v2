import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronRight, FileCode2, History, Pencil } from 'lucide-react';
import { SITE, sections, loadPage, neighbours, lastModified, markdownUrl } from '../lib/docs.js';
import { renderMarkdown } from './Markdown.jsx';
import HeadingAnchors from './HeadingAnchors.jsx';
import Landing from './Landing.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import Toc, { InlineToc } from './Toc.jsx';

function LegacyBanner() {
  return (
    <div className="callout callout-warning legacy-banner" role="note">
      <p className="callout-title">
        <History size={16} strokeWidth={1.8} aria-hidden="true" /> Legacy
      </p>
      <p>
        You are reading the docs for <strong>CalmAPI 1.x (legacy)</strong>, which is no longer developed. Run{' '}
        <code>npx calmapi@next doctor</code> in your 1.x project to check it against published advisories, then see{' '}
        <Link href="/migrate-v1">Migrating from 1.x</Link> or the <Link href="/">CalmAPI 2 docs</Link>.
      </p>
    </div>
  );
}

/** Docs, the sidebar section (linked to its first page) and the page. */
function Breadcrumbs({ page }) {
  if (page.path === '/') return null;
  const section = sections.find((s) => s.title === page.section);
  const first = section?.pages[0];
  const isBlock = page.slug.startsWith('blocks/');
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href="/">Docs</Link>
        </li>
        {section ? (
          <li>
            <ChevronRight size={13} strokeWidth={1.7} aria-hidden="true" />
            {first && first.path !== page.path ? <Link href={first.path}>{section.title}</Link> : <span>{section.title}</span>}
          </li>
        ) : null}
        <li>
          <ChevronRight size={13} strokeWidth={1.7} aria-hidden="true" />
          <span aria-current="page" className={isBlock ? 'mono' : undefined}>
            {page.nav}
          </span>
        </li>
      </ol>
    </nav>
  );
}

const DATE = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** Edit on GitHub, the markdown copy and the date of the last change. */
function PageMeta({ page }) {
  const modified = lastModified(page);
  const markdown = markdownUrl(page);
  return (
    <div className="page-meta">
      <div className="page-meta-links">
        <a href={`${SITE.docsRepo}/edit/${SITE.docsBranch}/src/docs/${page.file}`} target="_blank" rel="noopener noreferrer">
          <Pencil size={14} strokeWidth={1.7} aria-hidden="true" /> Edit this page on GitHub
        </a>
        {markdown ? (
          <a href={markdown} type="text/markdown">
            <FileCode2 size={14} strokeWidth={1.7} aria-hidden="true" /> View as Markdown
          </a>
        ) : null}
      </div>
      {modified ? (
        <p className="page-meta-date">
          Last updated <time dateTime={modified}>{DATE.format(new Date(modified))}</time>
        </p>
      ) : null}
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
            <ArrowLeft size={14} strokeWidth={1.7} aria-hidden="true" /> Previous
          </span>
          <span className="prev-next-title">{prev.nav}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.path} className="prev-next-link next" rel="next">
          <span className="prev-next-label">
            Next <ArrowRight size={14} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="prev-next-title">{next.nav}</span>
        </Link>
      ) : null}
    </nav>
  );
}

/** One documentation page, rendered on the server (prerendered at build time). */
function DocsPage({ page }) {
  const home = page.path === '/';
  const { element, headings } = renderMarkdown(loadPage(page), {
    afterTitle: (items) => <InlineToc items={items} />,
    blocksCatalog: page.path === '/blocks',
    demoteTitle: home,
  });
  return (
    <>
      {home ? <Landing /> : null}
      <div className={`page${home ? ' page-home' : ''}`}>
        <article className="article">
          <Breadcrumbs page={page} />
          {page.legacy ? <LegacyBanner /> : null}
          <div className={`prose${page.legacy ? ' prose-legacy' : ''}`}>{element}</div>
          <PageMeta page={page} />
          <PrevNext page={page} />
        </article>
        <Toc items={headings} />
      </div>
      <HeadingAnchors />
      <ScrollToTop />
    </>
  );
}

export default DocsPage;
