'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { setNavOpen, useNavOpen } from './nav-store.js';

/**
 * The sidebar container. From 1024px up it is a sticky column; below that it is a drawer that
 * the menu button in the header opens, and that closes on Escape, on the overlay, when a link is
 * followed and when the page changes.
 */
function SidebarShell({ children }) {
  const open = useNavOpen();
  const path = usePathname();
  const ref = useRef(null);

  // Keep the current page's link in view inside the sidebar (without scrolling the page).
  useEffect(() => {
    const aside = ref.current;
    const link = aside?.querySelector('.nav-link.active');
    if (!aside || !link) return;
    const a = aside.getBoundingClientRect();
    const l = link.getBoundingClientRect();
    if (l.top < a.top + 40 || l.bottom > a.bottom - 40) aside.scrollTop += l.top - a.top - a.height / 3;
  }, [path]);

  useEffect(() => setNavOpen(false), [path]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setNavOpen(false);
        document.querySelector('.nav-toggle')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('.nav-link.active, .nav-link')?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const onClick = (e) => {
    if (e.target instanceof Element && e.target.closest('a')) setNavOpen(false);
  };

  return (
    <>
      <div className={`sidebar-overlay${open ? ' is-open' : ''}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <aside id="docs-sidebar" ref={ref} className={`sidebar${open ? ' is-open' : ''}`} onClick={onClick}>
        {children}
      </aside>
    </>
  );
}

export default SidebarShell;
