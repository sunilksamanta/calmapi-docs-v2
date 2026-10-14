'use client';

import { useEffect, useRef, useState } from 'react';

/** A command in a field with a copy button, like the install field on the CalmAPI website. */
function InstallCommand({ command, className = '' }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <div className={`install ${className}`}>
      <span className="prompt" aria-hidden="true">
        $
      </span>
      <code ref={codeRef}>{command}</code>
      <button type="button" onClick={copy} className={copied ? 'copied' : undefined} aria-label={copied ? 'Copied' : `Copy: ${command}`}>
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  );
}

export default InstallCommand;
