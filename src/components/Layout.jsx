import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

function Layout() {
  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <div className="layout-container">
        <Sidebar />
        <main className="main-content" id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
