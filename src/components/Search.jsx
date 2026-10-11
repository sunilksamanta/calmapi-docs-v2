import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, CornerDownLeft, FileText, Hash } from 'lucide-react';
import './Search.css';

// Client-side search over page titles, headings and text. The index is generated at build
// time (scripts/generate-docs-assets.mjs) and only downloaded when search is first opened.

const OPEN_EVENT = 'calm:open-search';
export const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

let indexPromise = null;
const loadIndex = () => (indexPromise ??= import('../generated/search-index.json').then((m) => m.default));

const isTyping = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function runSearch(index, query) {
  const q = query.trim().toLowerCase();
  if (!q || !index) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const results = [];
  for (const page of index) {
    const title = page.title.toLowerCase();
    for (const section of page.sections) {
      const heading = section.heading.toLowerCase();
      const text = section.text.toLowerCase();
      const haystack = `${title} ${heading} ${text}`;
      if (!words.every((w) => haystack.includes(w))) continue;
      let score = 0;
      if (title.includes(q)) score += section.id ? 3 : 14;
      if (heading.includes(q)) score += 10;
      for (const w of words) {
        if (title.includes(w)) score += 2;
        if (heading.includes(w)) score += 3;
        if (text.includes(w)) score += 1;
      }
      if (page.legacy) score -= 15;
      results.push({ page, section, score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  const perPage = new Map();
  return results
    .filter((r) => {
      const n = perPage.get(r.page.path) ?? 0;
      perPage.set(r.page.path, n + 1);
      return n < 3;
    })
    .slice(0, 20);
}

function Highlighted({ text, words }) {
  if (!words.length) return text;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pattern).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

function snippet(text, words) {
  if (!text) return '';
  const lower = text.toLowerCase();
  const at = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0), Infinity);
  if (!Number.isFinite(at)) return text.slice(0, 140) + (text.length > 140 ? '…' : '');
  const start = Math.max(0, at - 50);
  const end = Math.min(text.length, at + 110);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function SearchDialog({ onClose }) {
  const navigate = useNavigate();
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

  const words = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(() => runSearch(index, query), [index, query]);
  useEffect(() => setSelected(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const go = (result) => {
    if (!result) return;
    onClose();
    navigate(result.section.id ? `${result.page.path}#${result.section.id}` : result.page.path);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[selected]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search the docs">
        <div className="search-input-row">
          <SearchIcon size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            placeholder="Search the docs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search the docs"
            aria-controls="search-results"
            aria-activedescendant={results[selected] ? `search-result-${selected}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="search-esc" onClick={onClose} aria-label="Close search">
            Esc
          </button>
        </div>
        <div className="search-results" id="search-results" role="listbox" ref={listRef}>
          {failed ? (
            <p className="search-hint">The search index could not be loaded.</p>
          ) : !index ? (
            <p className="search-hint">Loading…</p>
          ) : !query.trim() ? (
            <p className="search-hint">Search titles, headings and text. Try “owner policy”, “include” or “calm add”.</p>
          ) : !results.length ? (
            <p className="search-hint">No results for “{query.trim()}”.</p>
          ) : (
            results.map((r, i) => (
              <button
                type="button"
                key={`${r.page.path}#${r.section.id}`}
                id={`search-result-${i}`}
                role="option"
                aria-selected={i === selected}
                className="search-result"
                onMouseMove={() => setSelected(i)}
                onClick={() => go(r)}
              >
                <span className="search-result-icon">{r.section.id ? <Hash size={15} /> : <FileText size={15} />}</span>
                <span className="search-result-body">
                  <span className="search-result-title">
                    {r.page.title}
                    {r.section.id ? (
                      <>
                        <span className="search-result-sep"> › </span>
                        <Highlighted text={r.section.heading} words={words} />
                      </>
                    ) : null}
                    {r.page.legacy ? <span className="search-badge">1.x</span> : null}
                  </span>
                  <span className="search-result-snippet">
                    <Highlighted text={snippet(r.section.text, words)} words={words} />
                  </span>
                </span>
                {i === selected ? <CornerDownLeft size={14} className="search-result-enter" aria-hidden="true" /> : null}
              </button>
            ))
          )}
        </div>
        <div className="search-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>Enter</kbd> to open
          </span>
          <span>
            <kbd>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}

function Search() {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef(null);

  const show = useCallback(() => {
    returnFocus.current = document.activeElement;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        show();
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
  }, [show]);

  useEffect(() => {
    if (!open) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" className="search-button" onClick={show} aria-label="Search the docs" title={`Search (${isMac ? '⌘' : 'Ctrl'} K)`}>
        <SearchIcon size={16} aria-hidden="true" />
        <span className="search-button-label">Search</span>
        <kbd className="search-button-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      {/* Portal: the sticky header uses backdrop-filter, which would trap a fixed overlay inside it. */}
      {open ? createPortal(<SearchDialog onClose={close} />, document.body) : null}
    </>
  );
}

export default Search;
