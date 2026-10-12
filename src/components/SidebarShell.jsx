'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

/** The sidebar container and its menu button: a drawer on phones that closes when a link is followed. */
function SidebarShell({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const closeSidebar = () => setIsOpen(false);
  const onClick = (e) => {
    if (e.target instanceof Element && e.target.closest('a')) closeSidebar();
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} onClick={onClick}>
        {children}
      </aside>
    </>
  );
}

export default SidebarShell;
