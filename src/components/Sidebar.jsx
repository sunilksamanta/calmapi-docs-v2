import {
  Home, Rocket, FolderTree, Database, ShieldCheck, Settings, Route, Filter, KeyRound, TriangleAlert, SlidersHorizontal,
  Gauge, FlaskConical, Terminal, Bot, RefreshCw, Blocks, BookOpen, ClipboardList, Clock, Send, Mail, Plug, Timer, Radio,
  ArchiveRestore, HardDrive, CloudUpload, PackagePlus, Cloud, Shield, ShieldAlert, ArrowRightLeft, Zap, Layers, Package,
  Gamepad2, FileText, Puzzle, Lightbulb, ScanSearch, Smartphone, Bell, BellRing, Key, ToggleRight, Repeat, WandSparkles, Inbox,
  UserX, Webhook, Hammer,
} from 'lucide-react';
import { sections } from '../lib/docs.js';
import LegacyNav from './LegacyNav.jsx';
import NavLink from './NavLink.jsx';
import SidebarShell from './SidebarShell.jsx';

const ICONS = {
  Home, Rocket, FolderTree, Database, ShieldCheck, Settings, Route, Filter, KeyRound, TriangleAlert, SlidersHorizontal,
  Gauge, FlaskConical, Terminal, Bot, RefreshCw, Blocks, BookOpen, ClipboardList, Clock, Send, Mail, Plug, Timer, Radio,
  ArchiveRestore, HardDrive, CloudUpload, PackagePlus, Cloud, Shield, ShieldAlert, ArrowRightLeft, Zap, Layers, Package,
  Gamepad2, FileText, Puzzle, Lightbulb, ScanSearch, Smartphone, Bell, BellRing, Key, ToggleRight, Repeat, WandSparkles, Inbox,
  UserX, Webhook, Hammer,
};

function PageLink({ page }) {
  const Icon = ICONS[page.icon] ?? FileText;
  return (
    <li>
      <NavLink href={page.path}>
        <Icon size={16} className="nav-icon" aria-hidden="true" />
        <span>{page.nav}</span>
      </NavLink>
    </li>
  );
}

/**
 * The sidebar is rendered on the server with every link, so crawlers see the whole site.
 * The open and close state on phones, the active link and the 1.x group run in the browser.
 */
function Sidebar() {
  return (
    <SidebarShell>
      <nav className="sidebar-nav" aria-label="Documentation">
        {sections.map((section) =>
          section.legacy ? (
            <LegacyNav key={section.title} title={section.title} paths={section.pages.map((page) => page.path)}>
              {section.pages.map((page) => (
                <PageLink key={page.path} page={page} />
              ))}
            </LegacyNav>
          ) : (
            <div key={section.title} className="nav-section">
              <h3 className="section-title">{section.title}</h3>
              <ul className="nav-list">
                {section.pages.map((page) => (
                  <PageLink key={page.path} page={page} />
                ))}
              </ul>
            </div>
          ),
        )}
      </nav>
    </SidebarShell>
  );
}

export default Sidebar;
