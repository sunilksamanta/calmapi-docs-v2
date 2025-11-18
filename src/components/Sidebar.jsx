import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Rocket, Layers, Package, Database, Gamepad2, Settings, FileText, Route, Puzzle, Zap, BookOpen, Lightbulb, FileCode, Bot, Shield, Cloud, Menu, X } from 'lucide-react';
import './Sidebar.css';

const navigationItems = [
  { path: '/', label: 'Introduction', icon: Home },
  { 
    label: 'Guide',
    items: [
      { path: '/getting-started', label: 'Getting Started', icon: Rocket },
      { path: '/architecture', label: 'Architecture', icon: Layers },
      { path: '/creating-modules', label: 'Creating Modules', icon: Package },
      { path: '/models', label: 'Models', icon: Database },
      { path: '/controllers', label: 'Controllers', icon: Gamepad2 },
      { path: '/services', label: 'Services', icon: Settings },
      { path: '/dtos', label: 'DTOs', icon: FileText },
      { path: '/routing', label: 'Routing', icon: Route },
      { path: '/built-in-modules', label: 'Built-in Modules', icon: Puzzle },
      { path: '/advanced', label: 'Advanced', icon: Zap },
      { path: '/security', label: 'Security', icon: Shield },
      { path: '/deployment', label: 'Deployment', icon: Cloud },
    ]
  },
  {
    label: 'Resources',
    items: [
      { path: '/quick-reference', label: 'Quick Reference', icon: BookOpen },
      { path: '/example-project', label: 'Example Project', icon: Lightbulb },
    ]
  },
  {
    label: 'Copilot Setup',
    items: [
      { path: '/copilot-instructions.md', label: 'copilot-instructions.md', icon: FileCode, isExternal: true },
      { path: '/copilot-setup', label: 'Copilot Setup Guide', icon: Bot },
    ]
  }
];

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <nav className="sidebar-nav">
        {navigationItems.map((item, index) => {
          if (item.items) {
            return (
              <div key={index} className="nav-section">
                <h3 className="section-title">{item.label}</h3>
                <ul className="nav-list">
                  {item.items.map((subItem) => {
                    const Icon = subItem.icon;
                    return (
                      <li key={subItem.path}>
                        {subItem.isExternal ? (
                          <a
                            href={subItem.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-link"
                          >
                            <Icon size={16} className="nav-icon" />
                            <span>{subItem.label}</span>
                          </a>
                        ) : (
                          <NavLink
                            to={subItem.path}
                            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                            onClick={closeSidebar}
                          >
                            <Icon size={16} className="nav-icon" />
                            <span>{subItem.label}</span>
                          </NavLink>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <div key={index} className="nav-section">
              <ul className="nav-list">
                <li>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    onClick={closeSidebar}
                  >
                    <Icon size={16} className="nav-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
    </>
  );
}

export default Sidebar;
