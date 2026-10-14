# CalmAPI documentation

The source of [docs.calmapi.dev](https://docs.calmapi.dev): documentation for CalmAPI 2 (default) and CalmAPI 1.x (legacy), plus the official block registry served at `https://docs.calmapi.dev/r/<name>.json`. The CalmAPI website at [calmapi.dev](https://calmapi.dev) is a separate project.

Next.js 16 (App Router) and React 19, deployed on Vercel. Pages are markdown files rendered on the server with react-markdown and highlighted with highlight.js. Every page is prerendered to static HTML at build time, so search engines and AI crawlers that do not run JavaScript get the full text of each page.

## Run it

Needs Node.js 22.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build in .next/
npm start          # serve that build at http://localhost:3000
```

`npm run dev` and `npm run build` first run `scripts/generate-docs-assets.mjs` (see below). The build fails if a page links to a page, heading or file that does not exist, and if a page could not be prerendered.

## How the app is organized

```text
app/
├── layout.jsx             <html>, header, sidebar, footer, the theme script and the Lyket widget
├── [[...slug]]/page.jsx   every page of the manifest, prerendered (generateStaticParams, dynamicParams = false)
├── not-found.jsx          the 404 page
├── sitemap.js             /sitemap.xml
└── robots.js              /robots.txt
src/
├── components/            server components; the interactive parts are small client components ('use client'):
│                          theme toggle, search, sidebar groups and drawer, table of contents, copy buttons,
│                          heading links, the block catalog filter
├── lib/                   docs.js (pages, read at build time), redirects.js, seo.js (metadata and JSON-LD),
│                          highlighting, remark-docs.js (callouts, <kbd>), image-size.js
├── styles/                base.css (fonts, design tokens, buttons), layout.css (header, sidebar, page, footer),
│                          prose.css (article, tables, callouts, code), search.css, home.css (home page, block catalog)
├── fonts/                 Schibsted Grotesk and Fragment Mono (SIL Open Font License), the website's fonts
└── docs/                  the pages (below)
next.config.mjs            redirects and response headers
```

The article, sidebar and table of contents are in the prerendered HTML; react-markdown and highlight.js never reach the browser. Each page has its title, description, canonical URL, Open Graph and Twitter tags, a `<link rel="alternate" type="text/markdown">` to its markdown copy (CalmAPI 2 pages), and JSON-LD: a `TechArticle` (with `dateModified` from git when the build has the history) and a `BreadcrumbList`, plus a `WebSite` on the home page.

## How pages are organized

```text
src/docs/
├── manifest.js            sidebar order, titles, descriptions, URLs (the single source of truth)
├── introduction.md        CalmAPI 2 pages, served at /<slug> (the introduction at /)
├── getting-started.md
├── ...
├── blocks/<name>.md       one page per block, at /blocks/<name>
└── v1/                    CalmAPI 1.x pages, at /v1/<slug>, with a legacy banner
```

To add a page:

1. Create `src/docs/<slug>.md` starting with a `# Title`.
2. Add an entry to the right section of `src/docs/manifest.js`: `{ slug, title, description, icon }`. `icon` is a [lucide](https://lucide.dev/icons) icon name that must also be listed in `src/components/icons.jsx` (it shows on the home page cards).

Everything else is derived from the manifest: routes, sidebar, previous and next links, page titles and meta descriptions, canonical URLs, structured data, the sitemap, redirects, search, `llms.txt`. Write internal links as absolute paths (`/policies#owner-scoping-on-lists`, `/blocks/jobs`); anchors are the GitHub-style slugs of headings.

A CalmAPI 2 slug must not start with a path that is already taken: `v1`, `r`, `docs`, `advisories`, `_next` (`RESERVED_SEGMENTS` in the manifest) or the name of anything committed in `public/`. The build fails if a page clashes with one of them, with another page or with a redirect.

Old URLs and aliases are redirected in `REDIRECTS` in the manifest (the 1.x site served its pages at the root, for example `/models` now goes to `/v1/models`; the root paths that CalmAPI 2 pages now use, like `/getting-started`, are those pages). CalmAPI 2 pages used to live under `/docs/`: `/docs/<slug>` and `/docs/blocks/<name>` redirect to `/<slug>` and `/blocks/<name>`, and the build rejects links that still use `/docs/`. `/advisories/<id>`, the link printed by `calm doctor`, goes to the advisories page. All of these are permanent (308) HTTP redirects that `next.config.mjs` builds from the manifest (`src/lib/redirects.js`), so they work the same in `npm run dev`, `npm start` and on Vercel. Links in the pages to an old URL point straight at where it redirects. Any other unknown URL gets the 404 page with a real 404 status.

### Writing pages

Plain GitHub flavored markdown, plus a few conventions the site renders specially:

- **Callouts**: GitHub style alerts, `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` and `> [!CAUTION]` (`> [!DANGER]` is the same as caution) on the first line of a blockquote. GitHub renders them the same way in the `.md` copies.
- **Code blocks** get a header with the language (shell sessions are drawn as a terminal) and a copy button. A first line that is only a path comment (`// app/routes.js`, `# compose.yaml`, optionally followed by a note in parentheses) moves into the header as the file name; so does a fence title: ` ```js title="app/routes.js" `.
- **Keys**: `<kbd>Ctrl</kbd>` renders as a key (other raw HTML is shown as text).
- **Images** in `public/` get their width and height at build time, so the page does not move when they load.
- On `/blocks`, the "Official blocks" table is shown as the searchable block catalog. Keep it up to date: its group rows (`| **Messaging** | |`) are the catalog's filters.

### Holding a page back

A manifest entry whose markdown file does not exist is left out everywhere: sidebar, search, `llms.txt`, previous and next links. Links to it from other pages render as plain text, and the build lists them without failing. So to hold back a page such as `src/docs/security-advisories.md`, move the file out of `src/docs/` (for example to a branch) and keep the manifest entry; put the file back to publish it. While the advisories page is held back, `/advisories/<id>` redirects to `/security`.

## Generated files

`scripts/generate-docs-assets.mjs` writes these on every `dev` and `build`; they are git-ignored, so they never drift from the markdown:

| File | Content |
|---|---|
| `public/llms.txt` | [llmstxt.org](https://llmstxt.org) index: every CalmAPI 2 page with its description and a link to its markdown |
| `public/llms-full.txt` | Every CalmAPI 2 page in one file |
| `public/<slug>.md`, `public/blocks/<name>.md` | The raw markdown of each CalmAPI 2 page, served at the page URL plus `.md` (`/policies.md`, `/blocks/jobs.md`, `/introduction.md` for the introduction) |
| `src/generated/search-index.json` | Titles, headings and text for the search dialog (loaded on first use) |
| `src/generated/blocks.json` | The block catalog on `/blocks`: every block in `public/r` with the title and description of its page and its group in the "Official blocks" table of `blocks.md` |
| `src/generated/last-modified.json` | Date of the last commit that changed each markdown file, for `dateModified` and the sitemap (empty without git history) |
| `src/generated/public-files.json` | What the last run wrote to `public/`, so the next run can remove it first |

Next.js serves `public/` as it is, so the generated files are written there at their final URL and listed in `.gitignore` (`/public/*.md` and `/public/blocks/`). A markdown file you do want to commit in `public/` needs a `!` exception there, like `copilot-instructions.md`; the generator warns about generated files that `.gitignore` does not cover.

Run it alone with `npm run generate`.

## Block registry

`public/r/` holds the official CalmAPI block registry (shadcn registry-item JSON), served at `https://docs.calmapi.dev/r/index.json` and `https://docs.calmapi.dev/r/<name>.json`. `calm add --remote` and third-party tools read it from there.

The registry is built in the calmapi repository and copied here:

```bash
# in the calmapi repository
node scripts/build-registry.js

# in this repository
npm run sync-registry -- ../calmapi              # or the path to registry/r
npm run sync-registry -- ../calmapi --prune      # also remove blocks that no longer exist
```

Commit the updated `public/r/` files. The script validates each item and refuses to copy a registry that has not been built.

## Deployment

Vercel builds the site with its Next.js preset (`vercel.json` only sets `"framework": "nextjs"`) and serves it at `https://docs.calmapi.dev`. Leave Build Command, Output Directory and Install Command on their defaults: the build command must stay `npm run build`, so the generator runs first. Node.js comes from `engines` in `package.json` (22.x).

- Every page is static HTML; there is no server rendering at request time.
- `next.config.mjs` sets the headers: `/r/*` is served as `application/json` with `Access-Control-Allow-Origin: *` and a five minute cache; `/llms.txt` and `/llms-full.txt` as UTF-8 text with `Access-Control-Allow-Origin: *`; `*.md` as `text/markdown`.
- `/docs`, `/docs/<slug>` and `/docs/<slug>.md` (the URLs from before the move to this domain) redirect permanently to `/`, `/<slug>` and `/<slug>.md`.
- `/sitemap.xml` lists every page; `/robots.txt` allows all crawlers, AI crawlers included.

## Notes

- The floating "clap" button is the [Lyket](https://lyket.dev) widget, loaded from unpkg with a pinned version (`next/script`, after the page has loaded) in `app/layout.jsx`.
- The look follows the CalmAPI website (calmapi-website-v2): the same design tokens (`src/styles/base.css`), fonts, logo, buttons, code and terminal panels and footer. Change them in both projects.
- The theme follows the system setting until the visitor picks one with the toggle (saved in `localStorage` as `calm-theme`, like the website). The theme script in `app/layout.jsx` applies it before the first paint.
- Search: `/`, Ctrl K or ⌘ K open the dialog. It searches the generated index in the browser (titles, headings and text, with simple stemming) and needs no service.
- Dependencies are pinned to exact versions. Keep it that way, and prefer versions that have been out for at least two weeks.
- No em dashes in content or UI copy, please: use colons, commas, parentheses or periods.
