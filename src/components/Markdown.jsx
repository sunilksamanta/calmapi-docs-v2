import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHeadingIds from '../lib/rehype-heading-ids.js';
import CodeBlock from './CodeBlock.jsx';
import MarkdownLink from './MarkdownLink.jsx';

// Loaded lazily (React.lazy) so react-markdown and highlight.js stay out of the main bundle.

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
const rehypePlugins = [rehypeHeadingIds];

function Markdown({ content, onRendered }) {
  useEffect(() => {
    onRendered?.();
  }, [content, onRendered]);

  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
      {content}
    </ReactMarkdown>
  );
}

export default Markdown;
