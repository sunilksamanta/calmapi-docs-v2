import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>CalmAPI</h1>
          <span className="tagline">Keep Calm and REST</span>
        </div>
        <nav className="header-nav">
          <a href="https://calmapi.dev" target="_blank" rel="noopener noreferrer">Website</a>
          <a href="https://github.com/sunilksamanta/calmapi" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
