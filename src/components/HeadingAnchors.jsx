'use client';

import { useEffect } from 'react';

// The "#" link next to every heading: following it jumps to the section as usual, and the
// section's full URL is copied to the clipboard ("Link copied" shows next to it for a moment).

function HeadingAnchors() {
  useEffect(() => {
    let timer = 0;
    const onClick = async (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[data-anchor]') : null;
      if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const url = new URL(anchor.getAttribute('href'), window.location.href).href;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        return; // No clipboard: the link still jumps to the section.
      }
      document.querySelectorAll('a[data-anchor].copied').forEach((a) => a.classList.remove('copied'));
      anchor.classList.add('copied');
      clearTimeout(timer);
      timer = setTimeout(() => anchor.classList.remove('copied'), 1600);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      clearTimeout(timer);
    };
  }, []);
  return null;
}

export default HeadingAnchors;
