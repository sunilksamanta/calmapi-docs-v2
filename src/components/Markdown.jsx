import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CircleAlert, Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react';
import { imageSize } from '../lib/image-size.js';
import rehypeHeadingIds from '../lib/rehype-heading-ids.js';
import { CALLOUTS, remarkCallouts, remarkKbd } from '../lib/remark-docs.js';
import BlocksCatalog from './BlocksCatalog.jsx';
import CodeBlock from './CodeBlock.jsx';
import MarkdownLink from './MarkdownLink.jsx';

// Rendered on the server at build time, so the article is in the prerendered HTML and
// react-markdown and highlight.js never reach the browser.

const textOf = (node) => (!node ? '' : node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

function Pre({ node }) {
  const code = node?.children?.find((child) => child.tagName === 'code');
  const classes = [code?.properties?.className ?? []].flat().map(String);
  const lang = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length) ?? '';
  return <CodeBlock code={textOf(code).replace(/\n$/, '')} lang={lang.toLowerCase()} meta={code?.data?.meta ?? ''} />;
}

const heading = (Tag) =>
  function Heading({ node: _node, children, id, ...props }) {
    return (
      <Tag id={id} {...props}>
        {children}
        {id ? (
          <a className="heading-anchor" href={`#${id}`} aria-label="Copy link to this section" data-anchor="">
            #
          </a>
        ) : null}
      </Tag>
    );
  };

const CALLOUT_ICONS = { note: Info, tip: Lightbulb, important: CircleAlert, warning: TriangleAlert, caution: OctagonAlert, danger: OctagonAlert };

function Blockquote({ node, children, ...props }) {
  const type = node?.properties?.dataCallout;
  if (!type) return <blockquote {...props}>{children}</blockquote>;
  const Icon = CALLOUT_ICONS[type];
  // "danger" looks like "caution", GitHub's name for the same thing.
  return (
    <div className={`callout callout-${type === 'danger' ? 'caution' : type}`} role="note" aria-label={CALLOUTS[type]}>
      <p className="callout-title" aria-hidden="true">
        <Icon size={16} strokeWidth={1.8} /> {CALLOUTS[type]}
      </p>
      {children}
    </div>
  );
}

const remarkPlugins = [remarkGfm, remarkCallouts, remarkKbd];

/** Collects the h2 and h3 headings (after rehype-heading-ids) for "On this page". */
const collectHeadings = (headings) => () => (tree) => {
  const walk = (node) => {
    const level = node.type === 'element' ? /^h([23])$/.exec(node.tagName)?.[1] : null;
    if (level) {
      const { id, dataTitle } = node.properties ?? {};
      // A heading without text (an image followed by a --- line) is left out.
      if (id && dataTitle) headings.push({ id, text: dataTitle, level: Number(level) });
      return;
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
};

/**
 * On the Blocks page, the "Official blocks" table becomes the searchable catalog. The table
 * stays in the markdown (llms.txt, the .md copy and GitHub show it); the catalog shows the same
 * blocks in the same groups, read from it by scripts/generate-docs-assets.mjs.
 */
const rehypeBlocksCatalog = () => (tree) => {
  const children = tree.children ?? [];
  const h2 = children.findIndex((n) => n.type === 'element' && n.tagName === 'h2' && n.properties?.id === 'official-blocks');
  if (h2 < 0) return;
  const table = children.findIndex((n, i) => i > h2 && n.type === 'element' && (n.tagName === 'table' || n.tagName === 'h2'));
  if (table < 0 || children[table].tagName !== 'table') return;
  children[table] = { type: 'element', tagName: 'blocks-catalog', properties: {}, children: [] };
};

/**
 * Renders a page's markdown and returns it with its h2 and h3 headings, taken from the same
 * tree, so the table of contents always matches the ids in the article.
 * react-markdown's Markdown is a plain function without hooks, so it can be called directly.
 *
 * options.afterTitle(headings): rendered right after the page's h1 (the "On this page" menu on
 * small screens). options.blocksCatalog: replace the official blocks table with the catalog.
 * options.demoteTitle: render the page's h1 as an h2 (on the home page, below the landing h1).
 */
export function renderMarkdown(content, { afterTitle, blocksCatalog = false, demoteTitle = false } = {}) {
  const headings = [];
  const components = {
    pre: Pre,
    a: MarkdownLink,
    blockquote: Blockquote,
    h1: ({ node: _node, children, className, ...props }) => {
      const Title = demoteTitle ? 'h2' : 'h1';
      return (
        <>
          <Title className={['doc-title', className].filter(Boolean).join(' ')} {...props}>
            {children}
          </Title>
          {afterTitle ? afterTitle(headings) : null}
        </>
      );
    },
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
    table: ({ node: _node, ...props }) => (
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Table">
        <table {...props} />
      </div>
    ),
    img: ({ node: _node, alt = '', src, ...props }) => <img alt={alt} src={src} loading="lazy" decoding="async" {...imageSize(src)} {...props} />,
    'blocks-catalog': () => <BlocksCatalog />,
  };
  const element = ReactMarkdown({
    children: content,
    remarkPlugins,
    rehypePlugins: [rehypeHeadingIds, collectHeadings(headings), ...(blocksCatalog ? [rehypeBlocksCatalog] : [])],
    components,
  });
  return { element, headings };
}
