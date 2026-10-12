'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * "On this page": the h2 and h3 headings of the article (rendered on the server), with the
 * section being read highlighted as the page scrolls.
 */
function Toc({ items }) {
  const ref = useRef(null);
  const [active, setActive] = useState(items[0]?.id ?? null);

  useEffect(() => {
    const article = ref.current?.closest('.doc-shell')?.querySelector('.doc-article');
    if (!article) return undefined;
    const byId = new Map([...article.querySelectorAll('h2[id], h3[id]')].map((h) => [h.id, h]));
    const headings = items.map((item) => byId.get(item.id)).filter(Boolean);

    let frame = 0;
    const update = () => {
      frame = 0;
      let current = headings[0]?.id ?? null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top - 96 > 0) break;
        current = h.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  if (items.length < 2) return <aside className="toc toc-empty" aria-hidden="true" />;
  return (
    <aside className="toc" aria-label="On this page" ref={ref}>
      <p className="toc-title">On this page</p>
      <ul>
        {items.map((item) => (
          <li key={item.id} className={`toc-level-${item.level}`}>
            <a href={`#${item.id}`} className={item.id === active ? 'active' : undefined} aria-current={item.id === active ? 'location' : undefined}>
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Toc;
