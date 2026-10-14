import { sections } from '../lib/docs.js';
import NavLink from './NavLink.jsx';
import SidebarGroup from './SidebarGroup.jsx';
import SidebarShell from './SidebarShell.jsx';

const isBlockPage = (page) => page.slug.startsWith('blocks/');

function PageLinks({ pages }) {
  return pages.map((page) => (
    <li key={page.path}>
      <NavLink href={page.path} mono={isBlockPage(page)}>
        {page.nav}
      </NavLink>
    </li>
  ));
}

/**
 * The sidebar is rendered on the server with every link (collapsed groups keep theirs in the
 * HTML, hidden), so crawlers see the whole site. Which group is open, the current page and the
 * drawer on small screens run in the browser. The official blocks get a group of their own
 * inside "Blocks", open on a block page.
 */
function Sidebar() {
  return (
    <SidebarShell>
      <nav className="sidebar-nav" aria-label="Documentation">
        {sections.map((section) => {
          const paths = section.pages.map((page) => page.path);
          const blocks = section.pages.filter(isBlockPage);
          const id = `nav-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          if (!blocks.length) {
            return (
              <SidebarGroup key={section.title} id={id} title={section.title} paths={paths} defaultOpen={!section.legacy} legacy={section.legacy}>
                <PageLinks pages={section.pages} />
              </SidebarGroup>
            );
          }
          // Blocks: the overview, the official blocks (a nested group), then building and publishing.
          const first = section.pages.indexOf(blocks[0]);
          const before = section.pages.slice(0, first);
          const after = section.pages.slice(first).filter((page) => !isBlockPage(page));
          return (
            <SidebarGroup key={section.title} id={id} title={section.title} paths={paths} defaultOpen>
              <PageLinks pages={before} />
              <li>
                <SidebarGroup
                  id={`${id}-official`}
                  title="Official blocks"
                  count={blocks.length}
                  paths={blocks.map((page) => page.path)}
                  defaultOpen={false}
                  nested
                >
                  <PageLinks pages={blocks} />
                </SidebarGroup>
              </li>
              <PageLinks pages={after} />
            </SidebarGroup>
          );
        })}
      </nav>
    </SidebarShell>
  );
}

export default Sidebar;
