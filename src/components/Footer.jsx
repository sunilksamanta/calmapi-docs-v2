import Link from 'next/link';
import { SITE } from '../docs/manifest.js';
import { hasPage } from '../lib/docs.js';
import { Logo } from './Logo.jsx';

// The site footer, built like the CalmAPI website's: the logo and a line about the project,
// then three columns of links with mono headings.

const NPM = 'https://www.npmjs.com/package/calmapi';

const columns = [
  {
    title: 'docs',
    links: [
      ['Getting started', '/getting-started'],
      ['Resources', '/resources'],
      ['Security audit', '/audit'],
      ['AI agents', '/ai-agents'],
      ['Devtools', '/devtools'],
      ['CLI reference', '/cli'],
    ],
  },
  {
    title: 'project',
    links: [
      ['Website', SITE.website],
      ['GitHub', SITE.github],
      ['npm', NPM],
      ['Blocks', '/blocks'],
      ['Report a vulnerability', `${SITE.github}/security`],
    ],
  },
  {
    title: 'more',
    links: [
      ['Migrating from 1.x', '/migrate-v1'],
      ['1.x documentation', '/v1'],
      ['llms.txt', '/llms.txt'],
      ['Block registry', '/r/index.json'],
    ],
  },
];

const isPage = (href) => href.startsWith('/') && !/\.[a-z]+$/.test(href);

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="brand" aria-label="CalmAPI docs home">
            <Logo className="logo" />
          </Link>
          <p className="fine">The Node.js backend framework you own. MIT licensed. Created by Sunil Kumar Samanta.</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="footer-title">{column.title}</h2>
            <ul>
              {column.links
                .filter(([, href]) => !isPage(href) || hasPage(href))
                .map(([label, href]) => (
                  <li key={label}>
                    {isPage(href) ? (
                      <Link href={href}>{label}</Link>
                    ) : (
                      <a href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                        {label}
                      </a>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}

export default Footer;
