// Every page of the site, in sidebar order. This file is plain data so that both the
// React app and scripts/generate-docs-assets.mjs (llms.txt, search index) can import it.
//
// A page: { slug, title, description, icon?, nav?, path?, file? }
//   path defaults to /<slug> (CalmAPI 2 pages at /getting-started, blocks at /blocks/<name>,
//   1.x pages at /v1/<name>), file (relative to src/docs) defaults to <slug>.md.
//   A page whose file does not exist is left out everywhere (sidebar, search, llms.txt),
//   so a page can be held back by moving its markdown file out of src/docs.
//   The raw markdown of each CalmAPI 2 page is served at its path plus .md (/getting-started.md,
//   /introduction.md for the introduction at /).

export const SITE = {
  name: 'CalmAPI',
  // Where the docs are served. The block registry is at <url>/r/<name>.json.
  url: 'https://docs.calmapi.dev',
  // The CalmAPI website (a separate project).
  website: 'https://calmapi.dev',
  tagline: 'The backend framework you own',
  description:
    'CalmAPI 2 is a backend framework for Node.js and MongoDB where every line of framework code lives in your repo: resources, policies, auth, devtools, blocks and an upgrade path.',
};

const block = (name, title, description, icon) => ({
  slug: `blocks/${name}`,
  nav: name,
  title: `${title} (${name})`,
  description,
  icon,
});

export const SECTIONS = [
  {
    title: 'Getting started',
    pages: [
      {
        slug: 'introduction',
        path: '/',
        nav: 'Introduction',
        title: 'Why CalmAPI',
        icon: 'Home',
        description: 'What CalmAPI 2 is, what makes it different, and what a resource looks like.',
      },
      {
        slug: 'getting-started',
        title: 'Getting started',
        icon: 'Rocket',
        description: 'Create a project with npm create calmapi@latest, run it, and make your first requests with curl.',
      },
      {
        slug: 'project-structure',
        title: 'Project structure',
        icon: 'FolderTree',
        description: 'What lives in calm/, app/, calm.config.js and calm.lock, and how #calm and #app imports work.',
      },
    ],
  },
  {
    title: 'Guide',
    pages: [
      {
        slug: 'resources',
        title: 'Resources and fields',
        icon: 'Database',
        description: 'Declare a resource once with f.*() fields: schema, validation, visibility, queries, CRUD routes and status codes.',
      },
      {
        slug: 'policies',
        title: 'Policies',
        icon: 'ShieldCheck',
        description: 'Who may do what: policy tokens, combinations, functions, owner scoping and 401, 403 and 404 semantics.',
      },
      {
        slug: 'services',
        title: 'Services and hooks',
        icon: 'Settings',
        description: 'Business logic with ResourceService: scope(), before and after hooks, filterFor, other services and events.',
      },
      {
        slug: 'routes',
        title: 'Custom routes',
        icon: 'Route',
        description: 'Add endpoints with the route builder: options, return values, ctx.reply, ctx.serialize and route order.',
      },
      {
        slug: 'querying',
        title: 'Querying',
        icon: 'Filter',
        description: 'Filter, search, sort, paginate, include references and pick fields on list endpoints.',
      },
      {
        slug: 'authentication',
        title: 'Authentication',
        icon: 'KeyRound',
        description: 'Register, login, sessions, password change and reset, lockout and password rules: every /api/auth endpoint with examples.',
      },
      {
        slug: 'push-notifications',
        title: 'Push notifications',
        icon: 'BellRing',
        description: 'Send notifications to phones and browsers with app.push, register devices, try them on simulated phones in devtools and deliver with Expo or FCM.',
      },
      {
        slug: 'errors',
        title: 'Errors',
        icon: 'TriangleAlert',
        description: 'The error response shape, CalmError helpers, how database errors are mapped, and what never leaks.',
      },
      {
        slug: 'configuration',
        title: 'Configuration',
        icon: 'SlidersHorizontal',
        description: 'calm.config.js, every config key with its default, environment variables and production defaults.',
      },
    ],
  },
  {
    title: 'Tools',
    pages: [
      {
        slug: 'devtools',
        title: 'Devtools',
        icon: 'Gauge',
        description: 'The local dashboard at /_calm: requests with their MongoDB queries, data privacy lens and sample data, mail, push notifications on simulated phones, installed blocks, act as any user, agent activity and security.',
      },
      {
        slug: 'testing',
        title: 'Testing',
        icon: 'FlaskConical',
        description: 'Write API tests with createTestApp and node:test against a throwaway database.',
      },
      {
        slug: 'audit',
        title: 'Security audit',
        icon: 'ScanSearch',
        description: 'calm audit calls every route as every role on a throwaway database and checks policies, field leaks, mass assignment and token handling.',
      },
      {
        slug: 'cli',
        title: 'CLI reference',
        icon: 'Terminal',
        description: 'Every calm command and flag: create, dev, make, add, block, seed, routes, openapi, doctor, audit, admin, keygen, upgrade and mcp.',
      },
      {
        slug: 'ai-agents',
        title: 'AI agents',
        icon: 'Bot',
        description: 'AGENTS.md, the calm mcp server for coding agents, the activity log that shows what they change, and the mcp-server block.',
      },
      {
        slug: 'upgrading',
        title: 'Upgrading',
        icon: 'RefreshCw',
        description: 'How calm.lock and calm upgrade merge framework fixes into your edited calm/ folder.',
      },
    ],
  },
  {
    title: 'Blocks',
    pages: [
      {
        slug: 'blocks',
        nav: 'Overview',
        title: 'Blocks',
        icon: 'Blocks',
        description: 'Production features you copy into your project with calm add: notifications, webhooks, API keys, feature flags, jobs, storage, realtime, push, two-factor auth and more.',
      },
      block('api-docs', 'API docs', 'An interactive API reference at /docs, rendered from your OpenAPI document.', 'BookOpen'),
      block('api-keys', 'API keys', 'Personal and service API keys with scopes for scripts and integrations: shown once, hashed at rest, expiry and revoke.', 'Key'),
      block('audit-log', 'Audit log', 'Who changed what and when, with field-level diffs that never record private values.', 'ClipboardList'),
      block('feature-flags', 'Feature flags', 'Kill switches, gradual rollouts, per user and per role targeting, weighted variants and route gates, stored in MongoDB.', 'ToggleRight'),
      block('idempotency', 'Idempotency keys', 'Safe retries for writes: the Idempotency-Key header replays the stored response instead of running an operation twice.', 'Repeat'),
      block('jobs', 'Background jobs', 'A MongoDB job queue and cron: retries, schedules, event triggers and an admin API. No Redis.', 'Clock'),
      block('magic-link', 'Magic link sign-in', 'Passwordless sign-in by email: single use links, a cooldown per address, a redirect allowlist and links bound to the browser that asked.', 'WandSparkles'),
      block('mail-resend', 'Email via Resend', 'Deliver password resets and notifications through the Resend HTTP API.', 'Send'),
      block('mail-smtp', 'Email via SMTP', 'Deliver email through any SMTP server with Nodemailer.', 'Mail'),
      block('mcp-server', 'MCP server', 'Expose your resources to AI agents as MCP tools, enforced by your API rules.', 'Plug'),
      block('notifications', 'Notifications: inbox, push and email', 'One call writes the in-app inbox, sends a push and an email, following each user\'s preferences and quiet hours.', 'Inbox'),
      block('privacy', 'Privacy: export and delete', 'Users download everything they own and delete their account; per resource delete, anonymize or keep, with admin routes and a grace period.', 'UserX'),
      block('push-expo', 'Push notifications via Expo', 'Deliver push notifications to Expo and React Native apps through the Expo push service.', 'Bell'),
      block('push-fcm', 'Push notifications via Firebase Cloud Messaging', 'Deliver push notifications to Android, iOS and web through Firebase Cloud Messaging HTTP v1, no SDK.', 'BellRing'),
      block('rate-limit-mongo', 'Shared rate limits', 'Keep rate limit counters in MongoDB so limits hold across instances.', 'Timer'),
      block('realtime-sse', 'Realtime (SSE)', 'Live resource events over Server-Sent Events, filtered per subscriber by your policies.', 'Radio'),
      block('soft-delete', 'Soft delete', 'Opt-in soft delete per resource, with trash and restore for admins.', 'ArchiveRestore'),
      block('storage-local', 'Local file storage', 'File uploads to local disk with type and size allowlists, magic-byte checks and safe downloads.', 'HardDrive'),
      block('storage-s3', 'S3 file storage', 'Direct-to-S3 uploads with presigned URLs for AWS S3, Cloudflare R2 and MinIO.', 'CloudUpload'),
      block('totp', 'Two-factor authentication', 'Authenticator-app codes on login, with single-use recovery codes, replay protection and secrets encrypted at rest.', 'Smartphone'),
      block('webhooks', 'Webhooks', 'Outgoing webhooks for resource events: signed, queued, retried and logged, filtered by what each subscriber may read, SSRF safe.', 'Webhook'),
      {
        slug: 'building-blocks',
        nav: 'Building a block',
        title: 'Building your own block',
        icon: 'Hammer',
        description: 'Write a block with definePlugin: settings, env vars, routes, guards, credentials, named policies, doctor checks, the auth service helpers, and the calm make block, block check, block pack and gh: installs toolkit.',
      },
      {
        slug: 'publishing-blocks',
        nav: 'Publishing a block',
        title: 'Publishing your own block',
        icon: 'PackagePlus',
        description: 'The registry item format, hosting blocks on GitHub or any static host, and registries of your own for calm add.',
      },
    ],
  },
  {
    title: 'Production',
    pages: [
      {
        slug: 'deployment',
        title: 'Deployment',
        icon: 'Cloud',
        description: 'Run CalmAPI in production: environment, health checks, graceful shutdown, proxies, Docker and several instances.',
      },
      {
        slug: 'security',
        title: 'Security',
        icon: 'Shield',
        description: 'Reporting vulnerabilities, secure defaults, encryption at rest, login lockout, security events, the exposure matrix and calm doctor.',
      },
      {
        slug: 'security-advisories',
        nav: 'Advisories',
        title: 'Security advisories',
        icon: 'ShieldAlert',
        description: 'Published advisories for code CalmAPI copied into projects, with the fix for each.',
      },
      {
        slug: 'migrate-v1',
        nav: 'Migrating from 1.x',
        title: 'Migrating from CalmAPI 1.x',
        icon: 'ArrowRightLeft',
        description: 'Move a CalmAPI 1.x project to 2.0: concept map, API changes for clients, auth changes and a step by step plan.',
      },
    ],
  },
  {
    title: 'Reference',
    pages: [
      {
        slug: 'quick-reference',
        title: 'Quick reference',
        icon: 'Zap',
        description: 'A one-page cheat sheet: fields, policies, services, routes, queries, auth endpoints and CLI.',
      },
    ],
  },
  {
    title: 'CalmAPI 1.x (legacy)',
    legacy: true,
    pages: [
      { slug: 'v1', path: '/v1', file: 'v1/README.md', nav: 'Introduction', title: 'CalmAPI 1.x documentation', icon: 'Home' },
      { slug: 'v1/getting-started', file: 'v1/01-getting-started.md', nav: 'Getting Started', title: 'Getting started (1.x)', icon: 'Rocket' },
      { slug: 'v1/architecture', file: 'v1/02-architecture.md', nav: 'Architecture', title: 'Architecture (1.x)', icon: 'Layers' },
      { slug: 'v1/creating-modules', file: 'v1/03-creating-modules.md', nav: 'Creating Modules', title: 'Creating modules (1.x)', icon: 'Package' },
      { slug: 'v1/models', file: 'v1/04-models.md', nav: 'Models', title: 'Models (1.x)', icon: 'Database' },
      { slug: 'v1/controllers', file: 'v1/05-controllers.md', nav: 'Controllers', title: 'Controllers (1.x)', icon: 'Gamepad2' },
      { slug: 'v1/services', file: 'v1/06-services.md', nav: 'Services', title: 'Services (1.x)', icon: 'Settings' },
      { slug: 'v1/dtos', file: 'v1/07-dtos.md', nav: 'DTOs', title: 'DTOs (1.x)', icon: 'FileText' },
      { slug: 'v1/routing', file: 'v1/08-routing.md', nav: 'Routing', title: 'Routing (1.x)', icon: 'Route' },
      { slug: 'v1/built-in-modules', file: 'v1/09-built-in-modules.md', nav: 'Built-in Modules', title: 'Built-in modules (1.x)', icon: 'Puzzle' },
      { slug: 'v1/advanced', file: 'v1/10-advanced.md', nav: 'Advanced', title: 'Advanced (1.x)', icon: 'Zap' },
      { slug: 'v1/security', file: 'v1/11-security.md', nav: 'Security', title: 'Security (1.x)', icon: 'Shield' },
      { slug: 'v1/deployment', file: 'v1/12-deployment.md', nav: 'Deployment', title: 'Deployment (1.x)', icon: 'Cloud' },
      { slug: 'v1/quick-reference', file: 'v1/QUICK-REFERENCE.md', nav: 'Quick Reference', title: 'Quick reference (1.x)', icon: 'BookOpen' },
      { slug: 'v1/example-project', file: 'v1/EXAMPLE-PROJECT.md', nav: 'Example Project', title: 'Example project (1.x)', icon: 'Lightbulb' },
      { slug: 'v1/copilot-setup', file: 'v1/copilot-setup.md', nav: 'Copilot Setup', title: 'Copilot setup (1.x)', icon: 'Bot' },
    ],
  },
];

// Old URLs and convenience aliases. The 1.x site served its pages at the root; the root
// paths that CalmAPI 2 pages now use (/getting-started, /services, /security, /deployment,
// /quick-reference) are those pages, the others still go to the 1.x page.
export const REDIRECTS = {
  '/docs': '/',
  '/docs/introduction': '/',
  '/introduction': '/',
  '/v1/introduction': '/v1',
  '/architecture': '/v1/architecture',
  '/creating-modules': '/v1/creating-modules',
  '/models': '/v1/models',
  '/controllers': '/v1/controllers',
  '/dtos': '/v1/dtos',
  '/routing': '/v1/routing',
  '/built-in-modules': '/v1/built-in-modules',
  '/advanced': '/v1/advanced',
  '/example-project': '/v1/example-project',
  '/copilot-setup': '/v1/copilot-setup',
};

/**
 * CalmAPI 2 pages used to be served under /docs/ (/docs/policies, /docs/blocks/jobs):
 * /docs/<slug> now redirects to /<slug>. vercel.json does the same with permanent redirects.
 */
export const OLD_DOCS_PREFIX = '/docs/';
export const movedDocsPath = (path) => (path.startsWith(OLD_DOCS_PREFIX) ? path.slice(OLD_DOCS_PREFIX.length - 1) : null);

/**
 * First path segments a CalmAPI 2 page must not use, because something else is served there:
 * the 1.x docs, the block registry (/r/<name>.json), old /docs/ URLs, advisory links and the
 * build output (/assets). scripts/generate-docs-assets.mjs also rejects names used in public/.
 */
export const RESERVED_SEGMENTS = ['v1', 'r', 'docs', 'advisories', 'assets'];

/** Advisory links printed by `calm doctor` look like /advisories/<advisory id>. */
export const ADVISORY_PREFIX = '/advisories/';
export const ADVISORIES_PAGE = '/security-advisories';
/** Where advisory links go while the advisories page is held back. */
export const ADVISORIES_FALLBACK = '/security';

/** URL of the raw markdown of a page: its path plus .md (/introduction.md for the introduction). */
export const markdownPath = (page) => `${page.path === '/' ? `/${page.slug}` : page.path}.md`;

/**
 * Fill in defaults and drop pages whose markdown file is missing.
 * @param {(file: string) => boolean} exists
 */
export function resolveSections(exists) {
  return SECTIONS.map((section) => ({
    ...section,
    pages: section.pages
      .map((page) => ({
        ...page,
        nav: page.nav ?? page.title,
        path: page.path ?? `/${page.slug}`,
        file: page.file ?? `${page.slug}.md`,
        legacy: Boolean(section.legacy),
        section: section.title,
      }))
      .filter((page) => exists(page.file)),
  })).filter((section) => section.pages.length);
}

/** Strip a trailing slash (but keep "/"). */
export const normalizePath = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path) || '/';
