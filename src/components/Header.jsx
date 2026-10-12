import Link from 'next/link';
import { Globe, Github } from 'lucide-react';
import { SITE } from '../docs/manifest.js';
import ThemeToggle from './ThemeToggle.jsx';
import Search from './Search.jsx';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <Link href="/" className="logo" aria-label="CalmAPI docs home">
          <img src="/calm-icon.svg" alt="" width="26" height="26" className="logo-mark" />
          <span className="logo-name">CalmAPI</span>
          <span className="tagline">Keep Calm and REST</span>
        </Link>
        <div className="header-actions">
          <Search />
          <ThemeToggle />
          <nav className="header-nav" aria-label="External links">
            <a href={SITE.website} target="_blank" rel="noopener noreferrer" className="header-link-website" title="CalmAPI website">
              <Globe size={18} />
              <span>Website</span>
            </a>
            <a href="https://github.com/sunilksamanta/calmapi" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github size={18} />
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
