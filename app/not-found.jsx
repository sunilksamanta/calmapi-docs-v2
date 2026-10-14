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
    <div className="not-found">
      <p className="hero-file">
        <span>404</span>
        <span>docs.calmapi.dev</span>
      </p>
      <h1>This page is not here.</h1>
      <p>
        There is no page at <RequestedPath />. It may have moved when the docs switched to CalmAPI 2.
      </p>
      <div className="not-found-actions">
        <Link href="/" className="btn">
          Go to the docs home
        </Link>
        <OpenSearchButton className="btn ghost">
          <Search size={16} strokeWidth={1.7} aria-hidden="true" /> Search the docs
        </OpenSearchButton>
        <Link href="/v1" className="btn ghost">
          CalmAPI 1.x docs
        </Link>
      </div>
    </div>
  );
}
