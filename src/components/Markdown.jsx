import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHeadingIds from '../lib/rehype-heading-ids.js';
import CodeBlock from './CodeBlock.jsx';
import MarkdownLink from './MarkdownLink.jsx';

// Rendered on the server at build time, so the article is in the prerendered HTML and
// react-markdown and highlight.js never reach the browser.

const textOf = (node) => (!node ? '' : node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

function Pre({ node }) {
  const code = node?.children?.find((child) => child.tagName === 'code');
  const classes = [code?.properties?.className ?? []].flat().map(String);
  const lang = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length) ?? '';
  return <CodeBlock code={textOf(code).replace(/\n$/, '')} lang={lang.toLowerCase()} />;
}

const heading = (Tag) =>
  function Heading({ node: _node, children, id, ...props }) {
    return (
      <Tag id={id} {...props}>
        {children}
        {id ? (
          <a className="heading-anchor" href={`#${id}`} aria-label="Link to this section">
            #
          </a>
        ) : null}
      </Tag>
    );
  };

const components = {
  pre: Pre,
  a: MarkdownLink,
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
  table: ({ node: _node, ...props }) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
  img: ({ node: _node, alt = '', ...props }) => <img alt={alt} loading="lazy" {...props} />,
};

const remarkPlugins = [remarkGfm];

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
 * Renders a page's markdown and returns it with its h2 and h3 headings, taken from the same
 * tree, so the table of contents always matches the ids in the article.
 * react-markdown's Markdown is a plain function without hooks, so it can be called directly.
 */
export function renderMarkdown(content) {
  const headings = [];
  const element = ReactMarkdown({
    children: content,
    remarkPlugins,
    rehypePlugins: [rehypeHeadingIds, collectHeadings(headings)],
    components,
  });
  return { element, headings };
}
