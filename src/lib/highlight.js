// Syntax highlighting with highlight.js core and only the grammars these docs use,
// so the bundle stays small. Output is escaped HTML from highlight.js.
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import yaml from 'highlight.js/lib/languages/yaml';
import ini from 'highlight.js/lib/languages/ini';
import diff from 'highlight.js/lib/languages/diff';
import http from 'highlight.js/lib/languages/http';
import nginx from 'highlight.js/lib/languages/nginx';
import apache from 'highlight.js/lib/languages/apache';
import plaintext from 'highlight.js/lib/languages/plaintext';

const LANGUAGES = { javascript, bash, json, dockerfile, yaml, ini, diff, http, nginx, apache, plaintext };
for (const [name, grammar] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, grammar);
hljs.registerAliases(['js', 'jsx', 'mjs', 'cjs'], { languageName: 'javascript' });
hljs.registerAliases(['sh', 'shell', 'console', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['env', 'dotenv', 'toml'], { languageName: 'ini' });
hljs.registerAliases(['docker'], { languageName: 'dockerfile' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['text', 'txt', 'plain'], { languageName: 'plaintext' });

const LABELS = { javascript: 'JavaScript', bash: 'Shell', json: 'JSON', dockerfile: 'Dockerfile', yaml: 'YAML', ini: 'INI', diff: 'Diff', http: 'HTTP', nginx: 'nginx', apache: 'Apache' };

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** @returns {{ html: string, label: string }} */
export function highlight(code, lang = '') {
  const language = lang ? hljs.getLanguage(lang) : null;
  const name = language ? Object.keys(LANGUAGES).find((key) => hljs.getLanguage(key) === language) : null;
  if (!name || name === 'plaintext') return { html: escapeHtml(code), label: '' };
  const label = lang === 'env' || lang === 'dotenv' ? '.env' : LABELS[name];
  return { html: hljs.highlight(code, { language: name, ignoreIllegals: true }).value, label };
}
