import Script from 'next/script';
import { SITE } from '../src/docs/manifest.js';
import Header from '../src/components/Header.jsx';
import Sidebar from '../src/components/Sidebar.jsx';
// Same order as the Vite bundle had them, so equal-specificity rules resolve the same way.
import '../src/components/Sidebar.css';
import '../src/components/ThemeToggle.css';
import '../src/components/Search.css';
import '../src/components/Header.css';
import '../src/components/Layout.css';
import '../src/components/Toc.css';
import '../src/components/DocsPage.css';
import '../src/index.css';

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.name}: ${SITE.tagline.toLowerCase()}`,
  description: SITE.description,
  icons: { icon: { url: '/calm-icon.svg', type: 'image/svg+xml' } },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#24272e' },
  ],
};

// Apply the saved theme before the first paint (no light flash in dark mode). The class it adds
// to <html> is not in the prerendered HTML, hence suppressHydrationWarning on <html>.
const THEME_SCRIPT = `try {
  var t = localStorage.getItem('theme') || 'system';
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.add(dark ? 'dark' : 'light');
} catch (e) {}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt" />
      </head>
      <body>
        <div className="layout">
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          <div className="layout-container">
            <Sidebar />
            <main className="main-content" id="main" tabIndex={-1}>
              {children}
            </main>
          </div>
        </div>
        {/* The Lyket clap button: the widget fills this container once it has loaded. */}
        <div className="floating-like-button">
          <div data-lyket-type="clap" data-lyket-id="calmapi-docs" />
        </div>
        <Script src="https://unpkg.com/@lyket/widget@2.1.0/dist/lyket.js?apiKey=acc0dbccce8e557db5ebbe6d605aaa" strategy="lazyOnload" />
      </body>
    </html>
  );
}
