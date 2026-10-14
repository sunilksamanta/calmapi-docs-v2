import Link from 'next/link';
import { SITE } from '../docs/manifest.js';
import { GithubMark } from './icons.jsx';
import HeaderLinks from './HeaderLinks.jsx';
import { Logo } from './Logo.jsx';
import NavToggle from './NavToggle.jsx';
import Search from './Search.jsx';
import ThemeToggle from './ThemeToggle.jsx';

/** The top bar, laid out like the CalmAPI website's: logo, links, then icon buttons. */
function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <NavToggle />
        <Link href="/" className="brand" aria-label="CalmAPI docs home">
          <Logo className="logo" />
          <span className="brand-tag">docs</span>
        </Link>
        <Search />
        <HeaderLinks website={SITE.website} />
        <div className="header-actions">
          <a className="icon-btn" href={SITE.github} target="_blank" rel="noopener noreferrer" aria-label="CalmAPI on GitHub" title="GitHub">
            <GithubMark />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default Header;
