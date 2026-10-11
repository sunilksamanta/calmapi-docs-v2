import { Link } from 'react-router-dom';
import { Globe, Github } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Search from './Search';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo" aria-label="CalmAPI docs home">
          <img src="/calm-icon.svg" alt="" width="26" height="26" className="logo-mark" />
          <h1>CalmAPI</h1>
          <span className="tagline">Keep Calm and REST</span>
        </Link>
        <div className="header-actions">
          <Search />
          <ThemeToggle />
          <nav className="header-nav" aria-label="External links">
            <a href="https://calmapi.dev" target="_blank" rel="noopener noreferrer" className="header-link-website">
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
