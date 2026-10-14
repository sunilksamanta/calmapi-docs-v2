'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Search as SearchIcon, X } from 'lucide-react';

function CopyAdd({ name }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const command = `npx calm add ${name}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard: the command is visible on the card.
    }
  };
  return (
    <button type="button" className={`block-add${copied ? ' copied' : ''}`} onClick={copy} aria-label={copied ? 'Copied' : `Copy: ${command}`}>
      <span className="block-add-cmd">
        <span aria-hidden="true">$ </span>
        {command}
      </span>
      {copied ? <Check size={13} strokeWidth={2} aria-hidden="true" /> : <Copy size={13} strokeWidth={1.7} aria-hidden="true" />}
    </button>
  );
}

const matches = (block, words) => {
  const haystack = [block.name, block.title, block.description, block.group, ...block.tags, ...block.dependencies].join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
};

function BlocksCatalogClient({ groups, blocks }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');

  // ?group=Messaging or ?q=push in the URL preselects the filter.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) setQuery(params.get('q'));
    if (groups.includes(params.get('group'))) setGroup(params.get('group'));
  }, [groups]);

  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const visible = useMemo(() => new Set(blocks.filter((b) => (!group || b.group === group) && matches(b, words)).map((b) => b.name)), [blocks, group, words]);
  const counts = useMemo(() => Object.fromEntries(groups.map((g) => [g, blocks.filter((b) => b.group === g && matches(b, words)).length])), [groups, blocks, words]);

  return (
    <section className="catalog" aria-label="Official blocks">
      <div className="catalog-tools">
        <label className="catalog-search">
          <SearchIcon size={16} strokeWidth={1.7} aria-hidden="true" />
          <span className="sr-only">Filter blocks</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${blocks.length} blocks: push, auth, s3…`}
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="catalog-clear" onClick={() => setQuery('')} aria-label="Clear the filter">
              <X size={14} strokeWidth={1.7} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className="catalog-groups" role="group" aria-label="Filter by group">
          <button type="button" aria-pressed={!group} onClick={() => setGroup('')}>
            All <span>{blocks.filter((b) => matches(b, words)).length}</span>
          </button>
          {groups.map((g) => (
            <button type="button" key={g} aria-pressed={group === g} onClick={() => setGroup(group === g ? '' : g)}>
              {g} <span>{counts[g]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="catalog-status" role="status" aria-live="polite">
        {visible.size === blocks.length ? `${blocks.length} official blocks` : `${visible.size} of ${blocks.length} blocks`}
      </p>
      {groups.map((g) => {
        const list = blocks.filter((b) => b.group === g);
        const shown = list.filter((b) => visible.has(b.name)).length;
        return (
          <div key={g} className="catalog-group" hidden={!shown}>
            <h3 className="catalog-group-title">
              <span>{g}</span>
              <span className="meta">{shown}</span>
            </h3>
            <ul className="block-grid">
              {list.map((b) => (
                <li key={b.name} className="block-card" hidden={!visible.has(b.name)}>
                  <div className="block-top">
                    <code className="block-name">{b.name}</code>
                    <span className="block-version">v{b.version}</span>
                  </div>
                  <p className="block-title">
                    {b.path ? (
                      <Link href={b.path} className="block-link">
                        {b.title}
                      </Link>
                    ) : (
                      b.title
                    )}
                  </p>
                  <p className="block-desc">{b.description}</p>
                  <p className="block-facts">
                    <span>{b.dependencies.length ? b.dependencies.join(', ') : 'no deps'}</span>
                    <span>
                      {b.files} file{b.files === 1 ? '' : 's'}
                    </span>
                    {b.env.length ? (
                      <span>
                        {b.env.length} env var{b.env.length === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </p>
                  <CopyAdd name={b.name} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {!visible.size ? (
        <div className="catalog-empty">
          <p>No block matches “{query}”.</p>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setQuery('');
              setGroup('');
            }}
          >
            Show all blocks
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default BlocksCatalogClient;
