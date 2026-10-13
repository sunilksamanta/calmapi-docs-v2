'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

/**
 * A collapsible group of sidebar links. It opens by itself when the current page is in it.
 * `paths` are the pages of the group: matching them (rather than a URL prefix) keeps the
 * prerendered 404 page, which cannot know the URL it is served at, in step with the browser.
 */
function SidebarGroup({ id, title, count, paths, defaultOpen, legacy = false, nested = false, children }) {
  const current = paths.includes(usePathname());
  const [open, setOpen] = useState(defaultOpen || current);

  useEffect(() => {
    if (current) setOpen(true);
  }, [current]);

  return (
    <div className={`nav-group${nested ? ' nav-group-nested' : ''}${legacy ? ' nav-group-legacy' : ''}${current ? ' has-current' : ''}`}>
      <button type="button" className="nav-group-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className="nav-group-title">{title}</span>
        {count ? <span className="nav-group-count">{count}</span> : null}
        <ChevronRight size={14} strokeWidth={1.7} className="nav-group-chevron" aria-hidden="true" />
      </button>
      <ul className="nav-list" id={id} hidden={!open}>
        {children}
      </ul>
    </div>
  );
}

export default SidebarGroup;
