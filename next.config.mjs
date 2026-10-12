import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveSections } from './src/docs/manifest.js';
import { redirectRules } from './src/lib/redirects.js';

const DOCS = fileURLToPath(new URL('./src/docs/', import.meta.url));
const pagePaths = new Set(
  resolveSections((file) => existsSync(DOCS + file))
    .flatMap((section) => section.pages)
    .map((page) => page.path),
);

const CORS = { key: 'Access-Control-Allow-Origin', value: '*' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep `next dev` from writing AGENTS.md and CLAUDE.md into the repository.
  agentRules: false,

  // Old URLs, aliases, /advisories/<id> and the old /docs/ prefix, all derived from
  // src/docs/manifest.js (permanent, 308).
  async redirects() {
    return redirectRules((path) => pagePaths.has(path));
  },

  async headers() {
    return [
      // The block registry, read by `calm add --remote` and third-party tools.
      {
        source: '/r/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          CORS,
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
        ],
      },
      {
        source: '/:file(llms\\.txt|llms-full\\.txt)',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }, CORS],
      },
      // Raw markdown of the pages (/getting-started.md) and the other .md files in public/.
      {
        source: '/:path(.+\\.md)',
        headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }],
      },
    ];
  },
};

export default nextConfig;
