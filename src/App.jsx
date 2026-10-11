import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import DocsPage from './pages/DocsPage';
import NotFound from './pages/NotFound';
import { findPage, redirectFor } from './lib/docs.js';
import './App.css';

/** Every URL is resolved against src/docs/manifest.js: a page, a redirect, or the 404 page. */
function PageResolver() {
  const { pathname, hash } = useLocation();
  const page = findPage(pathname);
  if (page) return <DocsPage key={page.path} page={page} />;
  const target = redirectFor(pathname);
  if (target) return <Navigate to={target.includes('#') ? target : `${target}${hash}`} replace />;
  return <NotFound />;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="*" element={<PageResolver />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
