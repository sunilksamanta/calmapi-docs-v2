'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, FileText, Hash, Search as SearchIcon, SearchX } from 'lucide-react';

// Client-side search over page titles, headings and text. The index is generated at build
// time (scripts/generate-docs-assets.mjs) and only downloaded when search is first opened:
//   [{ p: path, t: title, g: sidebar group, l?: 1 for 1.x pages, s: [[id, heading, text], ...] }]
// The text before a page's first h2 is the page itself (id "").

const OPEN_EVENT = 'calm:open-search';
export const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

let indexPromise = null;
const loadIndex = () =>
  (indexPromise ??= import('../generated/search-index.json').then((m) =>
    m.default.map((page) => ({
      ...page,
      tl: page.t.toLowerCase(),
      s: page.s.map(([id, heading, text]) => ({ id, heading, text, hl: heading.toLowerCase(), xl: text.toLowerCase() })),
    })),
  ));

const isTyping = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

// The shortcut hint says ⌘ K on Apple devices. The prerendered HTML says Ctrl K until the page hydrates.
const noSubscription = () => () => {};
const useIsMac = () => useSyncExternalStore(noSubscription, () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent), () => false);

const SUGGESTED = [
  ['/getting-started', 'Getting started', 'Create a project and make your first requests'],
  ['/resources', 'Resources and fields', 'Declare a resource once with f.*() fields'],
  ['/policies', 'Policies', 'Who may do what, owner scoping, 401, 403 and 404'],
  ['/authentication', 'Authentication', 'Register, login, sessions and password reset'],
  ['/blocks', 'Blocks', 'Production features you copy in with calm add'],
  ['/cli', 'CLI reference', 'Every calm command and flag'],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** How well `word` matches `text`: 2 at the start of a word, 1 inside one, 0 not at all. */
function hit(text, word) {
  const at = text.indexOf(word);
  if (at < 0) return 0;
  if (at === 0 || /[^\p{L}\p{N}]/u.test(text[at - 1])) return 2;
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRe(word)}`, 'u').test(text) ? 2 : 1;
}

/**
 * The words of a query, cut to a rough stem so "policy" also finds "policies" and "routes"
 * finds "route": matching is by substring, so a shorter stem matches every form.
 */
export function queryWords(query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return [...new Set(words.map((w) => (w.length > 4 ? w.replace(/(?:ies|es|s|y)$/, '') : w)))];
}

function runSearch(index, query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q || !index) return [];
  const words = queryWords(q);
  const scored = [];
  for (const page of index) {
    for (const section of page.s) {
      const haystack = `${page.tl} ${section.hl} ${section.xl}`;
      if (!words.every((w) => haystack.includes(w))) continue;
      let score = 0;
      if (!section.id) {
        if (page.tl === q) score += 80;
        else if (page.tl.includes(q)) score += 40;
      } else {
        if (section.hl === q) score += 60;
        else if (section.hl.includes(q)) score += 30;
        if (page.tl.includes(q)) score += 6;
      }
      if (words.length > 1 && section.xl.includes(q)) score += 10;
      for (const w of words) {
        score += hit(page.tl, w) * (section.id ? 2 : 6);
        score += hit(section.hl, w) * 6;
        const inText = hit(section.xl, w);
        if (inText) score += inText + Math.min(3, section.xl.split(w).length - 1) * 0.5;
      }
      if (page.l) score -= 30;
      scored.push({ page, section, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  // At most three sections per page, and pages stay together, ordered by their best section.
  const byPage = new Map();
  for (const r of scored) {
    const list = byPage.get(r.page.p) ?? [];
    if (list.length < 3) list.push(r);
    byPage.set(r.page.p, list);
  }
  return [...byPage.values()].flat().slice(0, 40);
}

function Highlighted({ text, words }) {
  if (!words.length || !text) return text;
  const pattern = new RegExp(`(${words.map(escapeRe).join('|')})`, 'gi');
  return text.split(pattern).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

function snippet(text, words) {
  if (!text) return '';
  const lower = text.toLowerCase();
  const at = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0), Infinity);
  if (!Number.isFinite(at)) return text.slice(0, 150) + (text.length > 150 ? '…' : '');
  let start = Math.max(0, at - 50);
  if (start > 0) start = text.indexOf(' ', start) + 1 || start;
  const end = Math.min(text.length, at + 120);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

const hrefOf = (r) => (r.section?.id ? `${r.page.p}#${r.section.id}` : r.page.p);

function SearchDialog({ onClose }) {
  const router = useRouter();
  const [index, setIndex] = useState(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    loadIndex().then(setIndex, () => setFailed(true));
  }, []);

  const words = useMemo(() => queryWords(query), [query]);
  const results = useMemo(() => runSearch(index, query), [index, query]);
  const suggestions = !query.trim();
  const options = suggestions ? SUGGESTED.map(([p, t, d]) => ({ page: { p, t, g: '' }, section: null, description: d })) : results;

  useEffect(() => setSelected(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const go = (option) => {
    if (!option) return;
    onClose();
    router.push(hrefOf(option));
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => (options.length ? (i + 1) % options.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => (options.length ? (i - 1 + options.length) % options.length : 0));
    } else if (e.key === 'Home' && e.ctrlKey) {
      e.preventDefault();
      setSelected(0);
    } else if (e.key === 'End' && e.ctrlKey) {
      e.preventDefault();
      setSelected(Math.max(0, options.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(options[selected]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      // Keep focus in the dialog: the results are reached with the arrow keys.
      e.preventDefault();
    }
  };

  const status = failed
    ? 'The search index could not be loaded.'
    : !index && !suggestions
      ? 'Loading the search index…'
      : suggestions
        ? ''
        : results.length
          ? `${results.length} result${results.length === 1 ? '' : 's'}`
          : `No results for “${query.trim()}”`;

  let lastPage = null;
  return (
    <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search the docs">
        <div className="search-input-row">
          <SearchIcon size={18} strokeWidth={1.7} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search the docs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-label="Search the docs"
            aria-expanded={options.length > 0}
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={options[selected] ? `search-option-${selected}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button type="button" className="search-esc" onClick={onClose} aria-label="Close search">
            Esc
          </button>
        </div>
        <div className="search-body" ref={listRef}>
          {suggestions ? <p className="search-group-label">Suggested</p> : null}
          {!suggestions && !results.length ? (
            <div className="search-empty">
              {failed || !index ? null : <SearchX size={22} strokeWidth={1.5} aria-hidden="true" />}
              <p>{status}</p>
              {index && !failed ? <p className="search-empty-hint">Try fewer words, or a command like “calm add”.</p> : null}
            </div>
          ) : null}
          <ul className="search-results" id="search-results" role="listbox" aria-label={suggestions ? 'Suggested pages' : 'Search results'}>
            {options.map((r, i) => {
              const header = !suggestions && r.page.p !== lastPage;
              lastPage = r.page.p;
              const isPage = !r.section?.id;
              return (
                <li
                  key={hrefOf(r)}
                  id={`search-option-${i}`}
                  role="option"
                  aria-selected={i === selected}
                  className={`search-result${header ? ' first-of-page' : ''}`}
                  onMouseMove={() => i !== selected && setSelected(i)}
                >
                  {header ? (
                    <span className="search-result-page" aria-hidden="true">
                      {r.page.g ? `${r.page.g} / ` : ''}
                      {r.page.t}
                    </span>
                  ) : null}
                  <a
                    href={hrefOf(r)}
                    tabIndex={-1}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      go(r);
                    }}
                  >
                    <span className="search-result-icon" aria-hidden="true">
                      {isPage ? <FileText size={15} strokeWidth={1.7} /> : <Hash size={15} strokeWidth={1.7} />}
                    </span>
                    <span className="search-result-body">
                      <span className="search-result-title">
                        <span>{isPage ? <Highlighted text={r.page.t} words={words} /> : <Highlighted text={r.section.heading} words={words} />}</span>
                        {r.page.l ? <span className="search-badge">1.x</span> : null}
                      </span>
                      <span className="search-result-snippet">
                        {suggestions ? r.description : <Highlighted text={snippet(r.section.text, words)} words={words} />}
                      </span>
                    </span>
                    <CornerDownLeft size={14} strokeWidth={1.7} className="search-result-enter" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="search-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>Enter</kbd> to open
          </span>
          <span>
            <kbd>Esc</kbd> to close
          </span>
          <span className="search-status" role="status" aria-live="polite">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

/** A button that opens the search dialog (for server-rendered pages such as the 404 page). */
export function OpenSearchButton({ className, children }) {
  return (
    <button type="button" className={className} onClick={() => openSearch()}>
      {children}
    </button>
  );
}

/** The search field in the header, the keyboard shortcuts (⌘ K, Ctrl K and /) and the dialog. */
function Search() {
  const isMac = useIsMac();
  const [open, setOpen] = useState(false);
  const returnFocus = useRef(null);
  const openRef = useRef(false);
  openRef.current = open;

  const show = useCallback(() => {
    returnFocus.current = document.activeElement;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        if (openRef.current) close();
        else show();
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, [show, close]);

  useEffect(() => {
    if (!open) return undefined;
    // Start loading the index right away (it may already be cached).
    loadIndex().catch(() => {});
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="search-button"
        onClick={show}
        onPointerEnter={() => loadIndex().catch(() => {})}
        aria-label="Search the docs"
        aria-keyshortcuts={isMac ? 'Meta+K /' : 'Control+K /'}
      >
        <SearchIcon size={16} strokeWidth={1.7} aria-hidden="true" />
        <span className="search-button-label">Search docs</span>
        <kbd className="search-button-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      {/* Portal: keeps the fixed overlay out of the sticky header's stacking context. */}
      {open ? createPortal(<SearchDialog onClose={close} />, document.body) : null}
    </>
  );
}

export default Search;
