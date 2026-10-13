'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copies the code of the code block it sits in (the text of its <pre><code>). */
function CopyButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(event) {
    const code = event.currentTarget.closest('.code-block')?.querySelector('pre code');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent);
    } catch {
      // No clipboard access (insecure context, old browser): select the code instead.
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button type="button" className={`copy-button${copied ? ' copied' : ''}`} onClick={copy} aria-label={copied ? 'Copied' : 'Copy code'}>
      {copied ? <Check size={13} strokeWidth={2} aria-hidden="true" /> : <Copy size={13} strokeWidth={1.7} aria-hidden="true" />}
      <span>{copied ? 'copied' : 'copy'}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Code copied to the clipboard' : ''}
      </span>
    </button>
  );
}

export default CopyButton;
