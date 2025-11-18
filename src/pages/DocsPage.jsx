import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './DocsPage.css';

// Import all markdown files
import introduction from '../docs/README.md?raw';
import gettingStarted from '../docs/01-getting-started.md?raw';
import architecture from '../docs/02-architecture.md?raw';
import creatingModules from '../docs/03-creating-modules.md?raw';
import models from '../docs/04-models.md?raw';
import controllers from '../docs/05-controllers.md?raw';
import services from '../docs/06-services.md?raw';
import dtos from '../docs/07-dtos.md?raw';
import routing from '../docs/08-routing.md?raw';
import builtInModules from '../docs/09-built-in-modules.md?raw';
import advanced from '../docs/10-advanced.md?raw';
import quickReference from '../docs/QUICK-REFERENCE.md?raw';
import exampleProject from '../docs/EXAMPLE-PROJECT.md?raw';

const docsContent = {
  'introduction': introduction,
  'getting-started': gettingStarted,
  'architecture': architecture,
  'creating-modules': creatingModules,
  'models': models,
  'controllers': controllers,
  'services': services,
  'dtos': dtos,
  'routing': routing,
  'built-in-modules': builtInModules,
  'advanced': advanced,
  'quick-reference': quickReference,
  'example-project': exampleProject,
};

function DocsPage({ docKey }) {
  const [content, setContent] = useState('');

  useEffect(() => {
    setContent(docsContent[docKey] || '');
    window.scrollTo(0, 0);
  }, [docKey]);

  return (
    <div className="docs-page">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            return (
              <code className={inline ? 'inline-code' : 'code-block'} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <pre className="pre-block">{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default DocsPage;
