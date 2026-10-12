import { highlight } from '../lib/highlight.js';
import CopyButton from './CopyButton.jsx';

/** A fenced code block, highlighted on the server. Only the copy button runs in the browser. */
function CodeBlock({ code, lang }) {
  const { html, label } = highlight(code, lang);
  return (
    <div className="code-block">
      {label ? <span className="code-lang">{label}</span> : null}
      <CopyButton />
      <pre className="pre-block" tabIndex={0}>
        <code className={`hljs${lang ? ` language-${lang}` : ''}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

export default CodeBlock;
