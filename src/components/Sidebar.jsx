import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navigationItems = [
  { path: '/', label: 'Introduction', icon: '🏠' },
  { 
    label: 'Guide',
    items: [
      { path: '/getting-started', label: '1. Getting Started', icon: '🚀' },
      { path: '/architecture', label: '2. Architecture', icon: '🏗️' },
      { path: '/creating-modules', label: '3. Creating Modules', icon: '📦' },
      { path: '/models', label: '4. Models', icon: '🗃️' },
      { path: '/controllers', label: '5. Controllers', icon: '🎮' },
      { path: '/services', label: '6. Services', icon: '⚙️' },
      { path: '/dtos', label: '7. DTOs', icon: '📋' },
      { path: '/routing', label: '8. Routing', icon: '🛤️' },
      { path: '/built-in-modules', label: '9. Built-in Modules', icon: '🧩' },
      { path: '/advanced', label: '10. Advanced', icon: '🚀' },
    ]
  },
  {
    label: 'Resources',
    items: [
      { path: '/quick-reference', label: 'Quick Reference', icon: '📖' },
      { path: '/example-project', label: 'Example Project', icon: '💡' },
    ]
  },
  {
    label: 'Copilot Setup',
    items: [
      { path: '/copilot-setup', label: 'Copilot Setup', icon: '🤖' },
      { path: '/src/docs/copilot-instructions.md', label: 'copilot-instructions.md', icon: '📄', isExternal: true },
    ]
  }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navigationItems.map((item, index) => {
          if (item.items) {
            return (
              <div key={index} className="nav-section">
                <h3 className="section-title">{item.label}</h3>
                <ul className="nav-list">
                  {item.items.map((subItem) => (
                    <li key={subItem.path}>
                      {subItem.isExternal ? (
                        <a
                          href={subItem.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nav-link"
                        >
                          <span className="nav-icon">{subItem.icon}</span>
                          <span>{subItem.label}</span>
                        </a>
                      ) : (
                        <NavLink
                          to={subItem.path}
                          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        >
                          <span className="nav-icon">{subItem.icon}</span>
                          <span>{subItem.label}</span>
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div key={index} className="nav-section">
              <ul className="nav-list">
                <li>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
