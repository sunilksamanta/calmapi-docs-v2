'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** A sidebar link, highlighted while its page is open. */
function NavLink({ href, children }) {
  const active = usePathname() === href;
  return (
    <Link href={href} className={active ? 'nav-link active' : 'nav-link'} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}

export default NavLink;
