import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { setPageMeta } from '../lib/meta.js';
import { SITE } from '../lib/docs.js';
import { openSearch } from '../components/Search.jsx';
import './DocsPage.css';

function NotFound() {
  const { pathname } = useLocation();

  useEffect(() => {
    setPageMeta({ title: `Page not found | ${SITE.name}`, description: 'This page does not exist.', noindex: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="doc-shell">
      <article className="doc-article">
        <div className="docs-page not-found">
          <p className="not-found-code">404</p>
          <h1>Page not found</h1>
          <p>
            There is no page at <code>{pathname}</code>. It may have moved when the docs switched to CalmAPI 2.
          </p>
          <div className="not-found-actions">
            <Link to="/" className="button primary">
              Go to the introduction
            </Link>
            <button type="button" className="button" onClick={() => openSearch()}>
              <Search size={16} aria-hidden="true" /> Search the docs
            </button>
            <Link to="/v1" className="button">
              CalmAPI 1.x docs
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

export default NotFound;
