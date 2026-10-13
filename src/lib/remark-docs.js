// Small remark plugins for the conventions the pages use on top of GitHub flavored markdown.
// They run on the server at build time (src/components/Markdown.jsx).

const walk = (node, visit, parent = null) => {
  visit(node, parent);
  for (const child of node.children ?? []) walk(child, visit, node);
};

/** The callout types: GitHub's alerts, plus DANGER as another name for CAUTION. */
export const CALLOUTS = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
  danger: 'Danger',
};

const MARKER = /^\[!(note|tip|important|warning|caution|danger)\][ \t]*(?:\r?\n)?/i;

/**
 * GitHub style alerts: a blockquote that starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING],
 * [!CAUTION] or [!DANGER] becomes a callout. The marker is removed and the blockquote gets
 * data-callout="<type>" (Markdown.jsx renders it with its title and icon).
 *
 *   > [!TIP]
 *   > Run `npx calm doctor` after every upgrade.
 */
export function remarkCallouts() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'blockquote') return;
      const first = node.children?.[0];
      const text = first?.type === 'paragraph' ? first.children?.[0] : null;
      if (text?.type !== 'text') return;
      const match = MARKER.exec(text.value);
      if (!match) return;
      const type = match[1].toLowerCase();
      text.value = text.value.slice(match[0].length);
      if (!text.value) {
        first.children.shift();
        if (first.children[0]?.type === 'break') first.children.shift();
      }
      if (!first.children.length) node.children.shift();
      node.data = { ...node.data, hProperties: { ...(node.data?.hProperties ?? {}), dataCallout: type } };
    });
  };
}

/** Inline <kbd>Ctrl</kbd> in a page becomes a real <kbd> element (other raw HTML stays text). */
export function remarkKbd() {
  return (tree) => {
    walk(tree, (node) => {
      const children = node.children;
      if (!children?.some((c) => c.type === 'html')) return;
      for (let i = 0; i < children.length; i++) {
        const open = children[i];
        if (open.type !== 'html' || !/^<kbd>$/i.test(open.value)) continue;
        const close = children.findIndex((c, j) => j > i && c.type === 'html' && /^<\/kbd>$/i.test(c.value));
        if (close < 0) continue;
        const inner = children.slice(i + 1, close);
        children.splice(i, close - i + 1, { type: 'kbd', children: inner, data: { hName: 'kbd' } });
      }
    });
  };
}
