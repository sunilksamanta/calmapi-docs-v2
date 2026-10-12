import Link from 'next/link';
import { SITE, isKnownPath, redirectFor } from '../lib/docs.js';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const FILE = /\.[a-z0-9]+$/i;

/**
 * Links inside markdown. Pages use next/link (no full reload) and links to an old or alias
 * URL point straight at where it redirects. Files and external URLs stay plain anchors, and
 * links to pages that are not part of this build render as text instead of leading to a 404.
 * Pages link with absolute paths (scripts/generate-docs-assets.mjs rejects relative ones).
 */
function MarkdownLink({ href = '', children, node: _node, ...props }) {
  if (!href || href.startsWith('#')) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  if (EXTERNAL.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }

  const url = new URL(href, `${SITE.url}/`);
  if (FILE.test(url.pathname)) {
    return (
      <a href={url.pathname + url.search + url.hash} {...props}>
        {children}
      </a>
    );
  }
  if (!isKnownPath(url.pathname)) return <span className="unlinked">{children}</span>;
  const target = redirectFor(url.pathname);
  const to = target ? (target.includes('#') ? target : `${target}${url.hash}`) : url.pathname + url.search + url.hash;
  return (
    <Link href={to} {...props}>
      {children}
    </Link>
  );
}

export default MarkdownLink;
