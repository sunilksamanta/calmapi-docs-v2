'use client';

import { useEffect } from 'react';

// Opening another page starts at its top, like a full page load. Next.js only scrolls when the
// new page's top edge is out of view, so after a small scroll it would keep the old position.
// Not on the first page of a visit, on back and forward (the browser restores the position)
// or when the URL has a #section to jump to.

let firstPage = true;
let historyNavigation = false;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    historyNavigation = true;
  });
}

function ScrollToTop() {
  useEffect(() => {
    const skip = firstPage || historyNavigation || window.location.hash;
    firstPage = false;
    historyNavigation = false;
    if (!skip) window.scrollTo(0, 0);
  }, []);
  return null;
}

export default ScrollToTop;
