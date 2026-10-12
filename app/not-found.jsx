import Link from 'next/link';
import { Search } from 'lucide-react';
import { SITE } from '../src/docs/manifest.js';
import { OpenSearchButton } from '../src/components/Search.jsx';
import RequestedPath from '../src/components/RequestedPath.jsx';

// Next.js adds <meta name="robots" content="noindex"> to 404 responses itself.
export const metadata = {
  title: { absolute: `Page not found | ${SITE.name}` },
  description: 'This page does not exist.',
};

export default function NotFound() {
  return (
    <div className="doc-shell">
      <article className="doc-article">
        <div className="docs-page not-found">
          <p className="not-found-code">404</p>
          <h1>Page not found</h1>
          <p>
            There is no page at <RequestedPath />. It may have moved when the docs switched to CalmAPI 2.
          </p>
          <div className="not-found-actions">
            <Link href="/" className="button primary">
              Go to the introduction
            </Link>
            <OpenSearchButton className="button">
              <Search size={16} aria-hidden="true" /> Search the docs
            </OpenSearchButton>
            <Link href="/v1" className="button">
              CalmAPI 1.x docs
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
