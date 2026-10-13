import { highlight } from '../lib/highlight.js';
import CopyButton from './CopyButton.jsx';

// A fenced code block, highlighted on the server; only the copy button runs in the browser.
// Built like the code panels on the CalmAPI website: a header bar with the file name or the
// language in mono, and shell sessions in a dark terminal panel.
//
// The file name comes from the fence's title (```js title="app/routes.js") or from a first
// line that is only a path comment (// app/routes.js, # compose.yaml), which then moves into
// the header. A note in parentheses after the path stays next to it: // app/x.js (a bug).

const TERMINAL = new Set(['bash', 'sh', 'shell', 'console', 'zsh']);
const PATH_COMMENT =
  /^(?:\/\/|#)\s*((?:[\w.@-]+\/)*(?:[\w@-][\w.@-]*\.(?:js|mjs|cjs|jsx|ts|json|ya?ml|md|env|sh|toml|ini|conf)|\.env(?:\.[\w-]+)?|Dockerfile))(?:\s+\(([^)]+)\))?\s*$/;

function fileName(code, meta) {
  const title = /(?:^|\s)title=(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(meta);
  if (title) return { file: title[1] ?? title[2] ?? title[3], note: '', body: code };
  const [first, ...rest] = code.split('\n');
  const match = PATH_COMMENT.exec(first);
  if (!match || !rest.length) return { file: '', note: '', body: code };
  return { file: match[1], note: match[2] ?? '', body: rest.join('\n').replace(/^\n/, '') };
}

function CodeBlock({ code, lang, meta = '' }) {
  const { file, note, body } = fileName(code, meta);
  const { html, label } = highlight(body, lang);
  const terminal = TERMINAL.has(lang);
  const kind = terminal ? 'Terminal' : label || 'Text';
  return (
    <figure className={`code-block${terminal ? ' is-terminal' : ''}`}>
      <figcaption className="code-head">
        <span className="code-title">
          {file ? (
            <>
              <span className="code-file">{file}</span>
              {note ? <span className="code-note">({note})</span> : null}
            </>
          ) : (
            <span className="code-kind">{kind}</span>
          )}
        </span>
        {file ? <span className="code-kind code-kind-side">{kind}</span> : null}
        <CopyButton />
      </figcaption>
      <pre tabIndex={0}>
        <code className={`hljs${lang ? ` language-${lang}` : ''}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </figure>
  );
}

export default CodeBlock;
