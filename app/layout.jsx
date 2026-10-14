import Script from 'next/script';
import { SITE } from '../src/docs/manifest.js';
import Header from '../src/components/Header.jsx';
import Sidebar from '../src/components/Sidebar.jsx';
import Footer from '../src/components/Footer.jsx';
import '../src/styles/base.css';
import '../src/styles/layout.css';
import '../src/styles/prose.css';
import '../src/styles/search.css';
import '../src/styles/home.css';

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.name}: ${SITE.tagline.toLowerCase()}`,
  description: SITE.description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0f0e' },
  ],
};

// Applies the theme before the first paint, as on the website: the saved choice, else the
// system setting. "theme" is the key older versions of the docs saved the choice under.
// data-theme is not in the prerendered HTML, hence suppressHydrationWarning on <html>.
const THEME_SCRIPT = `(function () {
  var saved = null;
  try {
    saved = localStorage.getItem('calm-theme');
    var old = localStorage.getItem('theme');
    if (!saved && (old === 'light' || old === 'dark')) { saved = old; localStorage.setItem('calm-theme', old); }
    if (old) localStorage.removeItem('theme');
  } catch (e) {}
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <div className="shell">
          <Sidebar />
          <main className="main" id="main" tabIndex={-1}>
            {children}
          </main>
        </div>
        <Footer />
        {/* The Lyket clap button: the widget fills this container once it has loaded. */}
        <div className="floating-like-button">
          <div data-lyket-type="clap" data-lyket-id="calmapi-docs" />
        </div>
        <Script src="https://unpkg.com/@lyket/widget@2.1.0/dist/lyket.js?apiKey=acc0dbccce8e557db5ebbe6d605aaa" strategy="lazyOnload" />
      </body>
    </html>
  );
}
