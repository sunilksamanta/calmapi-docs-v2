import Link from 'next/link';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { SITE, sections, hasPage } from '../lib/docs.js';
import { PageIcon } from './icons.jsx';
import InstallCommand from './InstallCommand.jsx';
import { OpenSearchButton } from './Search.jsx';

// The top of the docs home page (/): a hero in the style of the CalmAPI website, the quick
// start, cards for the main topics and every section of the sidebar at a glance. The
// introduction (introduction.md) follows it.

const TOPICS = [
  ['/getting-started', 'Getting started', 'Create a project, run it and make your first requests.'],
  ['/resources', 'Resources', 'Declare a resource once: schema, validation, routes and OpenAPI.'],
  ['/policies', 'Policies', 'Who may do what, owner scoping and 401, 403 and 404.'],
  ['/authentication', 'Auth', 'Register, login, sessions, password reset and lockout.'],
  ['/blocks', 'Blocks', 'Production features you copy into your project with calm add.'],
  ['/devtools', 'Devtools', 'Requests, queries, mail, push and agent activity at /_calm.'],
  ['/ai-agents', 'AI agents', 'AGENTS.md, the calm mcp server and the activity log.'],
  ['/cli', 'CLI', 'Every calm command and flag, from create to upgrade.'],
  ['/audit', 'Security audit', 'Call every route as every role and prove your policies hold.'],
  ['/testing', 'Testing', 'API tests with createTestApp and node:test.'],
  ['/deployment', 'Deploy', 'Environment, health checks, proxies, Docker and scaling.'],
  ['/upgrading', 'Upgrading', 'Merge framework fixes into the calm/ code you edited.'],
];

const QUICK_START = [
  ['cmd', `${SITE.install} my-api`],
  ['cmd', 'cd my-api && npm run dev'],
  ['out', ''],
  ['dim', '  CalmAPI my-api v0.1.0 (development)'],
  ['out', ''],
  ['url', ' API       ', 'http://localhost:5001/api'],
  ['url', ' Devtools  ', 'http://localhost:5001/_calm'],
];

const isBlockPage = (page) => page.slug.startsWith('blocks/');

function Landing() {
  const byPath = new Map(sections.flatMap((s) => s.pages).map((page) => [page.path, page]));
  const topics = TOPICS.filter(([path]) => hasPage(path));
  const current = sections.filter((s) => !s.legacy);
  const pageCount = current.reduce((n, s) => n + s.pages.length, 0);
  return (
    <section className="landing" aria-labelledby="landing-title">
      <div className="hero-file">
        <span>docs.calmapi.dev</span>
        <span>CalmAPI 2 · Node.js 22.12+ · MongoDB</span>
      </div>
      <h1 id="landing-title" className="landing-title">
        Learn CalmAPI, <span className="soft">line by line.</span>
      </h1>
      <div className="landing-hero">
        <div>
          <p className="lede">{SITE.description}</p>
          <div className="cta">
            <InstallCommand command={SITE.install} />
            <Link className="btn" href="/getting-started">
              Get started <ArrowRight strokeWidth={1.7} aria-hidden="true" />
            </Link>
            <OpenSearchButton className="btn ghost">
              <SearchIcon strokeWidth={1.7} aria-hidden="true" /> Search <kbd>/</kbd>
            </OpenSearchButton>
          </div>
        </div>
        <figure className="term landing-term">
          <figcaption className="term-head">
            <span>quick start</span>
            <span>Node.js 22.12+</span>
          </figcaption>
          <pre>
            <code>
              {QUICK_START.map(([kind, text, rest], i) => (
                <span key={i} className="t-line">
                  {kind === 'cmd' ? <span className="t-p">$ </span> : null}
                  {kind === 'url' ? (
                    <>
                      <span className="t-g">  ➜ </span>
                      {text}
                      <span className="t-b">{rest}</span>
                    </>
                  ) : (
                    <span className={kind === 'dim' ? 't-d' : undefined}>{text}</span>
                  )}
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        </figure>
      </div>

      <div className="sh-file">
        <h2 className="sh-title">Start with a topic</h2>
        <span className="meta">{topics.length} topics</span>
      </div>
      <ul className="topic-grid">
        {topics.map(([path, title, blurb]) => (
          <li key={path}>
            <Link href={path} className="topic-card">
              <span className="topic-top">
                <span className="topic-path">{path}</span>
                <PageIcon name={byPath.get(path)?.icon} size={18} className="topic-icon" />
              </span>
              <span className="topic-title">
                {title}
                <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" className="topic-arrow" />
              </span>
              <span className="topic-blurb">{blurb}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="sh-file">
        <h2 className="sh-title">Every section</h2>
        <span className="meta">{pageCount} pages</span>
      </div>
      <div className="section-cols">
        {current.map((section) => {
          const blocks = section.pages.filter(isBlockPage);
          const pages = section.pages.filter((page) => !isBlockPage(page));
          return (
            <div key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {pages.map((page, i) => (
                  <li key={page.path}>
                    <Link href={page.path}>{page.nav}</Link>
                    {i === 0 && blocks.length ? (
                      <>
                        {' '}
                        <span className="section-cols-more">
                          and <Link href="/blocks#official-blocks">{blocks.length} official blocks</Link>
                        </span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="landing-legacy">
        Using CalmAPI 1.x? Its documentation stays online at <Link href="/v1">/v1</Link>, and{' '}
        <Link href="/migrate-v1">Migrating from 1.x</Link> walks you through the move.
      </p>
    </section>
  );
}

export default Landing;
