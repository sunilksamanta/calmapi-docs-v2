# Search with Meilisearch (search-meilisearch)

Full-text search for the resources you choose, with [Meilisearch](https://www.meilisearch.com). Records follow in the index as they are created, updated and deleted (in the background, with retries); a reindex route pages through the collection; and each resource gets `GET /api/<resource>/search?q=`. Meilisearch only finds ids: records are then loaded through the resource's own rules (list policy, service `scope()`, read policy, field visibility), so search never shows a record, or a field, that the caller could not read through the REST API. No SDK, no dependencies.

```bash
npx calm add search-meilisearch
```

| Adds | |
| --- | --- |
| Files | `app/blocks/search-meilisearch/index.js` (fields, sync, search, routes), `meili.js` (HTTP client) |
| Environment | `MEILI_HOST`, `MEILI_MASTER_KEY` (required in production), `MEILI_SEARCH_KEY` (optional) |

## Setup

Meilisearch Cloud: create a project, copy its URL and the Default Admin API Key (and the Default Search API Key). Self-hosted: run it with a master key (`meilisearch --master-key=...`, at least 16 bytes) behind https.

```bash
MEILI_HOST=https://ms-xxxxxxxx.meilisearch.io
MEILI_MASTER_KEY=...   # the master key or an admin API key
MEILI_SEARCH_KEY=...   # optional: a search-only key for queries
```

Choose what to index:

```js
// calm.config.js
export default defineConfig({
  blocks: {
    'search-meilisearch': {
      resources: {
        post: true, // every public field, searchable = the fields marked .searchable()
        product: { fields: ['name', 'description', 'category', 'price'], searchable: ['name', 'description'], filterable: ['category'], sortable: ['price'], index: 'products' },
      },
    },
  },
});
```

Then fill the indexes once (and after any write that skips the services, such as a migration):

```bash
curl -X POST http://localhost:5001/api/search/post/reindex -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{ "clear": true }'
```

```json
{ "data": { "resource": "post", "index": "posts", "indexed": 1234, "batches": 3, "cleared": true } }
```

## What is indexed

The document stored for a record is what an anonymous visitor would get from the API, limited to the chosen fields: `id`, the fields, `createdAt`, `updatedAt`. Never indexed: hidden, write-only and password fields, `.visibleTo()` fields, `.pii()` fields and `.encrypted()` fields. Listing one in `fields` stops the boot with a message, because whoever holds a search key can read the whole index.

## Searching

```http
GET /api/posts/search?q=launch&limit=20&offset=0

200 { "data": [ { "id": "...", "title": "Alpha launch", ... } ], "meta": { "q": "launch", "limit": 20, "offset": 0, "nextOffset": null } }
```

- The route uses the resource's `list` policy (401 or 403 like `GET /api/posts`).
- Hits are loaded with the resource service (`scope()`: drafts, tenants) and checked with `app.canRead()` (read policy, owner), then serialized for the caller (`visibleTo()` applies). Records the caller cannot read are skipped, and the page is filled from the following hits (up to `maxScans` Meilisearch requests).
- Use `meta.nextOffset` for the next page (`null`: no more). There is no total: Meilisearch's count would include records the caller cannot see.
- `limit` is capped by `maxSearchLimit` (50), `q` by 200 characters.

From code: `await ctx.app.ext.search.search('post', { q, limit, offset, filter, sort }, ctx)` (with `ctx.user`), `reindex(name, { clear })`, `configure(name)` (push settings only), `stats`.

## Sync

`<resource>.created`, `.updated` and `.restored` (soft-delete) upsert the record, `.deleted` removes it. Listeners run after the response. Failed writes are retried (`retries: ['1s', '5s', '30s']`); after the last one a warning is logged and a reindex repairs the index. Meilisearch processes writes as asynchronous tasks, so a record becomes searchable a moment later.

## Options

| Option | Default | |
| --- | --- | --- |
| `resources` | `{}` | name to `true` or `{ fields, index, searchable, filterable, sortable }` |
| `indexPrefix` | `''` | `staging_` to share one Meilisearch |
| `host` | `MEILI_HOST` | |
| `batchSize` | `500` | documents per request when reindexing |
| `retries` | `['1s', '5s', '30s']` | waits before each retry |
| `searchLimit` / `maxSearchLimit` | `20` / `50` | |
| `maxScans` | `5` | Meilisearch requests per search while filling a page |
| `timeoutMs` | `10000` | |

## Security notes

- Never give `MEILI_MASTER_KEY` or `MEILI_SEARCH_KEY` to browsers or mobile apps: the index contains records (drafts, other users' items) that only this API filters. Search through `/api/<resource>/search`.
- Use an admin API key rather than the master key where you can, and a search-only key for `MEILI_SEARCH_KEY`.
- Keep Meilisearch on https (or a private network); `calm doctor` warns about `http://` to public hosts in production.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/search-meilisearch/AGENTS.md` and in the devtools Blocks panel.

- [Meilisearch documents API](https://www.meilisearch.com/docs/reference/api/documents)
- [Meilisearch search API](https://www.meilisearch.com/docs/reference/api/search)
- [Meilisearch index settings API](https://www.meilisearch.com/docs/reference/api/settings)
- [Securing your project (API keys)](https://www.meilisearch.com/docs/learn/security/basic_security)
- [Asynchronous operations (tasks)](https://www.meilisearch.com/docs/learn/async/asynchronous_operations)

## For AI agents

Coding agents read these notes in `app/blocks/search-meilisearch/AGENTS.md`:

- Read `app/blocks/search-meilisearch/index.js` (field selection, sync, `search()`) and `meili.js` (HTTP client) first.
- Choose what is indexed in calm.config.js `blocks['search-meilisearch'].resources`; do not edit the block to add a resource.
- Invariant: hidden, write-only, password, visibleTo(), pii() and encrypted fields are never indexed. `indexedFields()` throws at boot if config lists one. Never weaken `privateReason()`.
- Invariant: search results are ids only; records are loaded through the resource service (scope()) and `app.canRead()`, then serialized for the caller. Never return Meilisearch hits or `_formatted` values to clients directly.
- Do not expose `estimatedTotalHits`: it counts records the caller cannot see.
- Keys live in `.env`. Never send `MEILI_MASTER_KEY` or `MEILI_SEARCH_KEY` to browsers: the index holds records that not everybody may read.
- Sync happens in event listeners (`<resource>.created|updated|deleted|restored`). Writes made without the service (insertMany, updateMany, migrations) are not synced: run `POST /api/search/<resource>/reindex` or `app.ext.search.reindex(name)` afterwards.
- After changing searchable, filterable or sortable fields, reindex so the settings are pushed.
- Meilisearch writes are asynchronous tasks: a 202 means queued, a document may take a moment to be searchable.
- Tests: point `MEILI_HOST` at a local node:http fake (see `test/blocks/search-meilisearch.test.js` in the CalmAPI repo).

<!-- block-guide:end -->
