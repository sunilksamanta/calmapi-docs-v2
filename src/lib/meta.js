import { SITE } from '../docs/manifest.js';

function setTag(selector, create, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', value);
}

const meta = (attr, key) => () => {
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  return el;
};

/** Per-page document title, description, canonical URL and robots hint. */
export function setPageMeta({ title, description, path, noindex = false }) {
  document.title = title;
  setTag('meta[name="description"]', meta('name', 'description'), description);
  setTag('meta[property="og:title"]', meta('property', 'og:title'), title);
  setTag('meta[property="og:description"]', meta('property', 'og:description'), description);
  if (path) {
    setTag(
      'link[rel="canonical"]',
      () => {
        const el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        return el;
      },
      `${SITE.url}${path}`,
    );
  }
  const robots = document.head.querySelector('meta[name="robots"]');
  if (noindex && !robots) document.head.appendChild(Object.assign(meta('name', 'robots')(), { content: 'noindex' }));
  if (!noindex && robots) robots.remove();
}
