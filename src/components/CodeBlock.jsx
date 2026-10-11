import { useMemo, useState, useRef, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { highlight } from '../lib/highlight.js';

function CodeBlock({ code, lang }) {
  const { html, label } = useMemo(() => highlight(code, lang), [code, lang]);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // No clipboard access (insecure context, old browser): select the code instead.
      const selection = window.getSelection();
      if (!selection || !codeRef.current) return;
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="code-block">
      {label ? <span className="code-lang">{label}</span> : null}
      <button
        type="button"
        className={`copy-button${copied ? ' copied' : ''}`}
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        title={copied ? 'Copied' : 'Copy'}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <pre className="pre-block" tabIndex={0}>
        <code ref={codeRef} className={`hljs${lang ? ` language-${lang}` : ''}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

export default CodeBlock;
