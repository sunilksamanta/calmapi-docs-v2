'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown } from 'lucide-react';

/** Follows the scroll position: the id of the last h2 or h3 that has passed the top of the page. */
function useActiveHeading(items) {
  const [active, setActive] = useState(items[0]?.id ?? null);

  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!headings.length) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 96;
      let current = headings[0].id;
      for (const h of headings) {
        if (h.getBoundingClientRect().top - offset - 8 > 0) break;
        current = h.id;
      }
      // At the very bottom, the last heading may never reach the top: mark it anyway.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = headings.at(-1).id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return active;
}

function TocList({ items, active }) {
  return (
    <ul className="toc-list">
      {items.map((item) => (
        <li key={item.id} className={`toc-level-${item.level}`}>
          <a href={`#${item.id}`} className={item.id === active ? 'active' : undefined} aria-current={item.id === active ? 'location' : undefined}>
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

function backToTop(event) {
  event.preventDefault();
  window.scrollTo({ top: 0 });
  document.getElementById('main')?.focus({ preventScroll: true });
}

/**
 * "On this page": the h2 and h3 headings of the article (rendered on the server), with the
 * section being read highlighted as the page scrolls. A column from 1200px up.
 */
function Toc({ items }) {
  const ref = useRef(null);
  const active = useActiveHeading(items);

  // Keep the current entry visible when the list is taller than the column.
  useEffect(() => {
    const list = ref.current;
    const link = list?.querySelector('a.active');
    if (!list || !link || list.scrollHeight <= list.clientHeight) return;
    const l = link.offsetTop;
    if (l < list.scrollTop + 24 || l > list.scrollTop + list.clientHeight - 48) list.scrollTop = l - list.clientHeight / 3;
  }, [active]);

  if (items.length < 2) return <aside className="toc toc-empty" aria-hidden="true" />;
  return (
    <aside className="toc" aria-labelledby="toc-title">
      <div className="toc-inner" ref={ref}>
        <p className="toc-title" id="toc-title">
          On this page
        </p>
        <TocList items={items} active={active} />
        <a href="#main" className="toc-top" onClick={backToTop}>
          <ArrowUp size={13} strokeWidth={1.7} aria-hidden="true" /> Back to top
        </a>
      </div>
    </aside>
  );
}

/** The same list as a menu under the page title, below 1200px where the column is hidden. */
export function InlineToc({ items }) {
  const [open, setOpen] = useState(false);
  if (items.length < 2) return null;
  return (
    <nav className="toc-inline" aria-label="On this page">
      <button type="button" className="toc-inline-toggle" aria-expanded={open} aria-controls="toc-inline-list" onClick={() => setOpen((o) => !o)}>
        <span>On this page</span>
        <span className="toc-inline-count">{items.filter((i) => i.level === 2).length} sections</span>
        <ChevronDown size={15} strokeWidth={1.7} aria-hidden="true" className="toc-inline-chevron" />
      </button>
      <div id="toc-inline-list" hidden={!open} onClick={(e) => e.target.closest('a') && setOpen(false)}>
        <TocList items={items} active={null} />
      </div>
    </nav>
  );
}

export default Toc;
