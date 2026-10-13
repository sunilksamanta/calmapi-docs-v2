'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

/** Docs, Blocks and the website. "Blocks" is current on the block pages, "Docs" on every other page. */
function HeaderLinks({ website }) {
  const path = usePathname() ?? '';
  const inBlocks = path === '/blocks' || path.startsWith('/blocks/');
  return (
    <nav className="header-links" aria-label="Site">
      <Link href="/" aria-current={!inBlocks ? 'true' : undefined}>
        Docs
      </Link>
      <Link href="/blocks" aria-current={inBlocks ? 'true' : undefined}>
        Blocks
      </Link>
      <a href={website} target="_blank" rel="noopener noreferrer">
        calmapi.dev
        <ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true" />
      </a>
    </nav>
  );
}

export default HeaderLinks;
