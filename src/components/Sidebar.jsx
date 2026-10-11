import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Rocket, FolderTree, Database, ShieldCheck, Settings, Route, Filter, KeyRound, TriangleAlert, SlidersHorizontal,
  Gauge, FlaskConical, Terminal, Bot, RefreshCw, Blocks, BookOpen, ClipboardList, Clock, Send, Mail, Plug, Timer, Radio,
  ArchiveRestore, HardDrive, CloudUpload, PackagePlus, Cloud, Shield, ShieldAlert, ArrowRightLeft, Zap, Layers, Package,
  Gamepad2, FileText, Puzzle, Lightbulb, ChevronRight, Menu, X, History,
} from 'lucide-react';
import { sections } from '../lib/docs.js';
import './Sidebar.css';

const ICONS = {
  Home, Rocket, FolderTree, Database, ShieldCheck, Settings, Route, Filter, KeyRound, TriangleAlert, SlidersHorizontal,
  Gauge, FlaskConical, Terminal, Bot, RefreshCw, Blocks, BookOpen, ClipboardList, Clock, Send, Mail, Plug, Timer, Radio,
  ArchiveRestore, HardDrive, CloudUpload, PackagePlus, Cloud, Shield, ShieldAlert, ArrowRightLeft, Zap, Layers, Package,
  Gamepad2, FileText, Puzzle, Lightbulb,
};

function PageLink({ page, onNavigate }) {
  const Icon = ICONS[page.icon] ?? FileText;
  return (
    <li>
      <NavLink to={page.path} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={onNavigate}>
        <Icon size={16} className="nav-icon" aria-hidden="true" />
        <span>{page.nav}</span>
      </NavLink>
    </li>
  );
}

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const onLegacyPage = pathname === '/v1' || pathname.startsWith('/v1/');
  const [legacyOpen, setLegacyOpen] = useState(onLegacyPage);

  useEffect(() => {
    if (onLegacyPage) setLegacyOpen(true);
  }, [onLegacyPage]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <nav className="sidebar-nav" aria-label="Documentation">
          {sections.map((section) => {
            if (section.legacy) {
              return (
                <div key={section.title} className="nav-section nav-section-legacy">
                  <button
                    type="button"
                    className="section-toggle"
                    aria-expanded={legacyOpen}
                    aria-controls="legacy-nav"
                    onClick={() => setLegacyOpen((open) => !open)}
                  >
                    <History size={14} aria-hidden="true" />
                    <span>{section.title}</span>
                    <ChevronRight size={14} className="section-chevron" aria-hidden="true" />
                  </button>
                  {legacyOpen ? (
                    <ul className="nav-list" id="legacy-nav">
                      {section.pages.map((page) => (
                        <PageLink key={page.path} page={page} onNavigate={closeSidebar} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            }
            return (
              <div key={section.title} className="nav-section">
                <h3 className="section-title">{section.title}</h3>
                <ul className="nav-list">
                  {section.pages.map((page) => (
                    <PageLink key={page.path} page={page} onNavigate={closeSidebar} />
                  ))}
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
