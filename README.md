# CalmAPI documentation

The source of [calmapi.dev](https://calmapi.dev): documentation for CalmAPI 2 (default) and CalmAPI 1.x (legacy), plus the official block registry served at `https://calmapi.dev/r/<name>.json`.

React 18, React Router 7 and Vite 7. Pages are markdown files rendered with react-markdown, highlighted with highlight.js, and deployed on Vercel.

## Run it

Needs Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/ at http://localhost:4173
```

`npm run dev` and `npm run build` first run `scripts/generate-docs-assets.mjs` (see below). The build fails if a page links to a page, heading or file that does not exist.

## How pages are organized

```text
src/docs/
├── manifest.js            sidebar order, titles, descriptions, URLs (the single source of truth)
├── introduction.md        CalmAPI 2 pages, served at /docs/<slug> (the introduction at /)
├── getting-started.md
├── ...
├── blocks/<name>.md       one page per block, at /docs/blocks/<name>
└── v1/                    CalmAPI 1.x pages, at /v1/<slug>, with a legacy banner
```

To add a page:

1. Create `src/docs/<slug>.md` starting with a `# Title`.
2. Add an entry to the right section of `src/docs/manifest.js`: `{ slug, title, description, icon }`. `icon` is a [lucide](https://lucide.dev/icons) icon name that must also be listed in `src/components/Sidebar.jsx`.

Everything else is derived from the manifest: routes, sidebar, previous and next links, page titles and meta descriptions, search, `llms.txt`. Write internal links as absolute paths (`/docs/policies#owner-scoping-on-lists`); anchors are the GitHub-style slugs of headings.

Old URLs and aliases are redirected in `REDIRECTS` in the manifest (the 1.x site served its pages at the root, for example `/models` now goes to `/v1/models`). `/advisories/<id>`, the link printed by `calm doctor`, goes to the advisories page.

### Holding a page back

A manifest entry whose markdown file does not exist is left out everywhere: sidebar, search, `llms.txt`, previous and next links. Links to it from other pages render as plain text, and the build lists them without failing. So to hold back a page such as `src/docs/security-advisories.md`, move the file out of `src/docs/` (for example to a branch) and keep the manifest entry; put the file back to publish it. While the advisories page is held back, `/advisories/<id>` redirects to `/docs/security`.

## Generated files

`scripts/generate-docs-assets.mjs` writes these on every `dev` and `build`; they are git-ignored, so they never drift from the markdown:

| File | Content |
|---|---|
| `public/llms.txt` | [llmstxt.org](https://llmstxt.org) index: every CalmAPI 2 page with its description and a link to its markdown |
| `public/llms-full.txt` | Every CalmAPI 2 page in one file |
| `public/docs/**/*.md` | The raw markdown of each page, served next to the HTML page (`/docs/policies.md`) |
| `src/generated/search-index.json` | Titles, headings and text for the search dialog (loaded on first use) |

Run it alone with `npm run generate`.

## Block registry

`public/r/` holds the official CalmAPI block registry (shadcn registry-item JSON), served at `https://calmapi.dev/r/index.json` and `https://calmapi.dev/r/<name>.json`. `calm add --remote` and third-party tools read it from there.

The registry is built in the calmapi repository and copied here:

```bash
# in the calmapi repository
cd v2 && node scripts/build-registry.js

# in this repository
npm run sync-registry -- ../calmapi/v2           # or the path to v2/registry/r
npm run sync-registry -- ../calmapi/v2 --prune   # also remove blocks that no longer exist
```

Commit the updated `public/r/` files. The script validates each item and refuses to copy a registry that has not been built.

## Deployment

Vercel runs `npm run build` and serves `dist/` (see `vercel.json`):

- The SPA fallback to `index.html` only applies to paths **without a file extension**, so `/r/*.json`, `/llms.txt`, `/llms-full.txt`, `/docs/*.md` and `/copilot-instructions.md` are served as files (or a real 404).
- `/r/*` is served as `application/json` with `Access-Control-Allow-Origin: *`; the text files as UTF-8.

## Notes

- The floating "clap" button is the [Lyket](https://lyket.dev) widget, loaded from unpkg with a pinned version in `index.html`.
- Dependencies are pinned to exact versions. Keep it that way, and prefer versions that have been out for at least two weeks.
- No em dashes in content or UI copy, please: use colons, commas, parentheses or periods.
