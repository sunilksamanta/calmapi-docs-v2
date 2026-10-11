import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, History } from 'lucide-react';
import { loadPage, neighbours, SITE } from '../lib/docs.js';
import { setPageMeta } from '../lib/meta.js';
import Toc from '../components/Toc.jsx';
import './DocsPage.css';

const Markdown = lazy(() => import('../components/Markdown.jsx'));

function LegacyBanner() {
  return (
    <div className="legacy-banner" role="note">
      <History size={18} aria-hidden="true" />
      <p>
        You are reading the docs for <strong>CalmAPI 1.x (legacy)</strong>, which is no longer developed. Run{' '}
        <code>npx calmapi@next doctor</code> in your 1.x project to check it against published advisories, then see{' '}
        <Link to="/docs/migrate-v1">Migrating from 1.x</Link> or the <Link to="/">CalmAPI 2 docs</Link>.
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
        <Link to={prev.path} className="prev-next-link prev" rel="prev">
          <span className="prev-next-label">
            <ArrowLeft size={14} aria-hidden="true" /> Previous
          </span>
          <span className="prev-next-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={next.path} className="prev-next-link next" rel="next">
          <span className="prev-next-label">
            Next <ArrowRight size={14} aria-hidden="true" />
          </span>
          <span className="prev-next-title">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

function Loading() {
  return (
    <div className="docs-loading" aria-busy="true" aria-label="Loading page">
      <div className="skeleton skeleton-title" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}

function scrollToHash(hash) {
  if (!hash) return false;
  const el = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!el) return false;
  el.scrollIntoView();
  return true;
}

function DocsPage({ page }) {
  const location = useLocation();
  const articleRef = useRef(null);
  const [loaded, setLoaded] = useState({ path: null, content: '', error: null });
  const [renderKey, setRenderKey] = useState(null);

  useEffect(() => {
    let alive = true;
    setRenderKey(null);
    loadPage(page)
      .then((content) => alive && setLoaded({ path: page.path, content, error: null }))
      .catch((error) => alive && setLoaded({ path: page.path, content: '', error }));
    return () => {
      alive = false;
    };
  }, [page]);

  useEffect(() => {
    const home = page.path === '/';
    setPageMeta({
      title: home ? `${SITE.name}: ${SITE.tagline.toLowerCase()}` : `${page.title} | ${SITE.name}${page.legacy ? ' 1.x' : ''}`,
      description: page.description ?? (page.legacy ? `CalmAPI 1.x (legacy) documentation: ${page.nav}.` : SITE.description),
      path: page.path,
    });
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [page]);

  const ready = loaded.path === page.path;
  const onRendered = useCallback(() => setRenderKey(`${page.path}:${Date.now()}`), [page.path]);

  // Jump to #anchors once the markdown is on screen, and on in-page hash changes.
  useEffect(() => {
    if (renderKey) scrollToHash(location.hash);
  }, [renderKey, location.hash]);

  return (
    <div className="doc-shell">
      <article className="doc-article" ref={articleRef}>
        {page.legacy ? <LegacyBanner /> : null}
        <div className="docs-page">
          {!ready ? (
            <Loading />
          ) : loaded.error ? (
            <p className="docs-error">This page could not be loaded. Check your connection and reload.</p>
          ) : (
            <Suspense fallback={<Loading />}>
              <Markdown content={loaded.content} onRendered={onRendered} />
            </Suspense>
          )}
        </div>
        {ready ? <PrevNext page={page} /> : null}
      </article>
      <Toc articleRef={articleRef} renderKey={renderKey} />
    </div>
  );
}

export default DocsPage;
