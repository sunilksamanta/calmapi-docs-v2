import { useEffect, useState } from 'react';
import './Toc.css';

/** "On this page": h2 and h3 of the rendered article, with the current section highlighted. */
function Toc({ articleRef, renderKey }) {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const root = articleRef.current;
    if (!root || !renderKey) {
      setItems([]);
      return undefined;
    }
    const headings = [...root.querySelectorAll('h2[id], h3[id]')];
    setItems(headings.map((h) => ({ id: h.id, text: h.dataset.title || h.textContent, level: Number(h.tagName[1]) })));

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
  }, [articleRef, renderKey]);

  if (items.length < 2) return <aside className="toc toc-empty" aria-hidden="true" />;
  return (
    <aside className="toc" aria-label="On this page">
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
