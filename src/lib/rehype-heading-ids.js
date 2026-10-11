import { createSlugger } from './markdown-text.js';

// Give every heading an id (for anchors and the table of contents) and keep its plain
// text in data-title. Uses the same slugger as the search index, in document order.

const HEADING = /^h[1-6]$/;
const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

export default function rehypeHeadingIds() {
  return (tree) => {
    const slug = createSlugger();
    const walk = (node) => {
      if (node.type === 'element' && HEADING.test(node.tagName)) {
        const text = textOf(node).trim();
        node.properties = { ...node.properties, id: slug(text), dataTitle: text };
        return;
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
