import { Link, useLocation } from 'react-router-dom';
import { isKnownPath } from '../lib/docs.js';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const FILE = /\.[a-z0-9]+$/i;

/**
 * Links inside markdown. Pages use react-router (no full reload), files and external
 * URLs stay plain anchors, and links to pages that are not part of this build render
 * as text instead of leading to a 404.
 */
function MarkdownLink({ href = '', children, node: _node, ...props }) {
  const location = useLocation();

  if (!href || href.startsWith('#')) return <a href={href} {...props}>{children}</a>;
  if (EXTERNAL.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }

  const url = new URL(href, `${window.location.origin}${location.pathname}`);
  if (FILE.test(url.pathname)) return <a href={url.pathname + url.search + url.hash} {...props}>{children}</a>;
  if (!isKnownPath(url.pathname)) return <span className="unlinked">{children}</span>;
  return (
    <Link to={url.pathname + url.search + url.hash} {...props}>
      {children}
    </Link>
  );
}

export default MarkdownLink;
