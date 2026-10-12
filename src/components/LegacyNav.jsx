'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, History } from 'lucide-react';

/**
 * The collapsible "CalmAPI 1.x (legacy)" group, open on 1.x pages. Its links stay in the HTML
 * while it is closed (hidden), so crawlers still find the 1.x pages.
 * `paths` are the 1.x page paths: matching them (not just /v1/) keeps the prerendered 404 page,
 * which cannot know the URL it is served at, in step with the browser.
 */
function LegacyNav({ title, paths, children }) {
  const onLegacyPage = paths.includes(usePathname());
  const [open, setOpen] = useState(onLegacyPage);

  useEffect(() => {
    if (onLegacyPage) setOpen(true);
  }, [onLegacyPage]);

  return (
    <div className="nav-section nav-section-legacy">
      <button type="button" className="section-toggle" aria-expanded={open} aria-controls="legacy-nav" onClick={() => setOpen((o) => !o)}>
        <History size={14} aria-hidden="true" />
        <span>{title}</span>
        <ChevronRight size={14} className="section-chevron" aria-hidden="true" />
      </button>
      <ul className="nav-list" id="legacy-nav" hidden={!open}>
        {children}
      </ul>
    </div>
  );
}

export default LegacyNav;
