'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** A sidebar link, highlighted while its page is open. */
function NavLink({ href, mono = false, children }) {
  const active = usePathname() === href;
  return (
    <Link href={href} className={`nav-link${mono ? ' mono' : ''}${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}

export default NavLink;
