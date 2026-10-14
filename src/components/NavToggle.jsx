'use client';

import { Menu, X } from 'lucide-react';
import { setNavOpen, useNavOpen } from './nav-store.js';

/** The menu button that opens the sidebar as a drawer below 1024px. */
function NavToggle() {
  const open = useNavOpen();
  return (
    <button
      type="button"
      className="icon-btn nav-toggle"
      onClick={() => setNavOpen(!open)}
      aria-expanded={open}
      aria-controls="docs-sidebar"
      aria-label={open ? 'Close navigation' : 'Open navigation'}
    >
      {open ? <X strokeWidth={1.7} aria-hidden="true" /> : <Menu strokeWidth={1.7} aria-hidden="true" />}
    </button>
  );
}

export default NavToggle;
