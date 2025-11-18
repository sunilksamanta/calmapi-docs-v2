import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DocsPage from './pages/DocsPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DocsPage docKey="introduction" />} />
          <Route path="/getting-started" element={<DocsPage docKey="getting-started" />} />
          <Route path="/architecture" element={<DocsPage docKey="architecture" />} />
          <Route path="/creating-modules" element={<DocsPage docKey="creating-modules" />} />
          <Route path="/models" element={<DocsPage docKey="models" />} />
          <Route path="/controllers" element={<DocsPage docKey="controllers" />} />
          <Route path="/services" element={<DocsPage docKey="services" />} />
          <Route path="/dtos" element={<DocsPage docKey="dtos" />} />
          <Route path="/routing" element={<DocsPage docKey="routing" />} />
          <Route path="/built-in-modules" element={<DocsPage docKey="built-in-modules" />} />
          <Route path="/advanced" element={<DocsPage docKey="advanced" />} />
          <Route path="/quick-reference" element={<DocsPage docKey="quick-reference" />} />
          <Route path="/example-project" element={<DocsPage docKey="example-project" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
