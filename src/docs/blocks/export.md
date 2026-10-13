# Data export and import (export)

Admins download any resource as CSV, NDJSON or JSON, and load records back from the same formats. Exports stream from a MongoDB cursor, so collection size does not matter, and they follow the API's own rules: the list route's filters and sorting, and field visibility (hidden, write-only and encrypted fields never leave the database). Imports run every row through the resource's validation and service, with a dry run that reports errors row by row. Optionally, users can export their own records.

```bash
npx calm add export
```

## Adds

| | |
| --- | --- |
| Files | `app/blocks/export/index.js`, `app/blocks/export/csv.js` |
| Environment | Nothing new. |
| Routes | `GET /api/admin/export`, `GET /api/admin/export/:resource`, `POST /api/admin/import/:resource`, and with the `self` option `GET /api/export/:resource` |
| Collections | none |

## Exporting

```http
GET /api/admin/export/post?format=csv&status=published&sort=-createdAt&fields=title,status
Authorization: Bearer <admin token>
```

```
200 Content-Type: text/csv; charset=utf-8
    Content-Disposition: attachment; filename="post-export-2026-10-13.csv"

id,title,status,createdAt,updatedAt
66f0...,Hello world,published,2026-10-12T09:00:00.000Z,2026-10-12T09:00:00.000Z
```

| `format` | Content type | Shape |
| --- | --- | --- |
| `csv` (default) | `text/csv` | header row, then one row per record, CRLF line ends; arrays and objects as JSON in one cell |
| `ndjson` | `application/x-ndjson` | one JSON record per line |
| `json` | `application/json` | one JSON array |

- Filters are the list route's: `?status=published&price[gte]=10&tags[in]=a,b&q=hello`. Only `.filterable()` fields, `?sort=` only `.sortable()` ones; anything else is a `400`. Without `?sort=` records come in `_id` order.
- `?fields=title,status` limits the columns (`id` and timestamps are always there).
- The service `scope()` applies, so soft-deleted or tenant-scoped records stay out exactly as they do in the API.
- `GET /api/admin/export` lists the exportable resources with their columns.

Each record is what the admin would get from the API: `.hidden()`, `.writeOnly()` and password fields are never read from MongoDB, `.visibleTo()` rules apply (a field the viewer can never see gets no column), and `.encrypted()` fields are not exported at all, not even decrypted for admins, because an export is a copy outside the database.

Downloading from a browser:

```js
const res = await fetch('/api/admin/export/order?format=csv&status=paid', { headers: { authorization: `Bearer ${token}` } });
const url = URL.createObjectURL(await res.blob());
Object.assign(document.createElement('a'), { href: url, download: 'orders.csv' }).click();
```

## Importing

```http
POST /api/admin/import/post?dryRun=true
Content-Type: text/csv

title,status,tags
First post,draft,"[""news""]"
,published,
```

```json
200 {
  "data": {
    "dryRun": true, "format": "csv", "mode": "create",
    "total": 2, "valid": 1, "invalid": 1, "created": 0, "updated": 0, "failed": 0,
    "ignoredColumns": [],
    "errors": [{ "row": 2, "errors": { "title": "Is required" } }]
  }
}
```

- Bodies: CSV (`text/csv`), NDJSON (`application/x-ndjson`), or JSON (`application/json`, an array or `{ "rows": [...] }`). `?format=` overrides the content type.
- `row` counts data rows from 1 (the CSV header is not a row).
- Every row is validated by the resource (`validateInput`): types, required fields, enums, `writableBy`, unknown and hidden columns. CSV cells are converted to the field's type first (`"10"` to a number for `f.number()`, `true`/`false`, JSON for arrays and objects; an empty cell is "not set").
- Columns that are in every export but cannot be written (`id`, `createdAt`, `updatedAt`, read-only fields) are skipped and listed in `ignoredColumns`, so an exported file imports back as is. The owner column is kept on create: an admin import restores who owns each record.
- Without `dryRun`, nothing is written if any row is invalid: `422 VALIDATION_ERROR` with `details` such as `{ "rows.2.title": "Is required" }`. Add `?skipInvalid=true` to import the valid rows anyway.
- Writes go through the resource's service, so `beforeCreate`, defaults, password hashing and `<resource>.created` events all happen. Unique conflicts are reported per row (`{ "code": "Already taken" }`). Rows are written one by one, not in a transaction.
- `?mode=upsert` updates the records whose `id` exists (with update validation) and creates the others.
- Limits: CSV and NDJSON bodies up to `importLimitMb` (10 MB), JSON bodies up to `config.bodyLimit`, at most `importMaxRows` rows (10,000). Use CSV or NDJSON for big files.

## Self export

```js
export default defineConfig({ blocks: { export: { self: ['note', 'order'] } } });   // or self: true
```

`GET /api/export/note?format=json` then returns the caller's own notes (the resource's owner field), with the same filters and formats. The resource's `read` policy must let the user read their own records. For a complete personal data export across every resource, see the `privacy` block.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `resources` | `null` | Resources admins may export and import. `null`: all. |
| `exclude` | `[]` | Never exported or imported. |
| `self` | `false` | `true` or a list: users export their own records. |
| `batchSize` | `500` | Records per MongoDB batch and per write. |
| `exportLimit` | `{ windowMs: 3600000, max: 30 }` | Exports per user (when `config.rateLimit` is on). `false`: the global limit only. |
| `importLimitMb` | `10` | Largest CSV or NDJSON body. |
| `importMaxRows` | `10000` | Rows per import. |
| `maxErrors` | `100` | Row errors listed in a report. |

## Security

- Admin routes need the `admin` role; for imports it is checked before the body is read.
- Admin exports read every record inside the service `scope()`, regardless of the resource's `list` policy. Use `resources` or `exclude` to keep collections out.
- CSV cells are escaped as RFC 4180 says. Text starting with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading `'`, so spreadsheets show it instead of running it as a formula (CSV injection). Imports remove that quote again, so values round trip.
- A failure after the download started cuts the connection instead of ending the file, so a partial export never looks complete.
- Every export and import emits an event (`export.exported`, `export.imported`) with the user id and counts: hook the `audit-log` block or your alerts to it.

## Events

| Event | Payload |
| --- | --- |
| `export.exported` | `{ resource, count, userId, self, format }` |
| `export.imported` | `{ resource, created, updated, failed, userId }` |

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/export/AGENTS.md` and in the devtools Blocks panel.

- [RFC 4180: Common Format for CSV Files](https://www.rfc-editor.org/rfc/rfc4180)
- [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [NDJSON specification](https://github.com/ndjson/ndjson-spec)
- [MongoDB cursors (iterate a cursor)](https://www.mongodb.com/docs/manual/tutorial/iterate-a-cursor/)
- [Node.js stream backpressure](https://nodejs.org/en/learn/modules/backpressuring-in-streams)
- [MDN: Content-Disposition header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition)

## For AI agents

Coding agents read these notes in `app/blocks/export/AGENTS.md`:

- Read `app/blocks/export/index.js` (routes, export stream, import) and `app/blocks/export/csv.js` (escaping) first.
- Options live in `calm.config.js` under `blocks.export`: `resources`, `exclude`, `self`, limits.
- Never load a whole collection: exports iterate `model.find(...).lean().cursor()` and write through `writer(res)`, which waits for `drain`. Keep both.
- Field rules: only `isOutput && !opts.encrypted` fields are selected and every record goes through `serialize()` with the caller as viewer. Do not add `+field` selects or skip `serialize`.
- Filters, sort and `?fields=` must keep going through `parseListQuery` (from '#calm'): no raw Mongo filters from query strings.
- CSV cells go through `csvCell`: RFC 4180 quoting plus a leading `'` before = + - @ tab and CR. Do not write cells by hand.
- Import validates every row with `validateInput` before writing anything; writes go through `service.create`/`service.update` so hooks run. Keep the all or nothing default (`skipInvalid` opts out).
- Read-only columns from an export (id, timestamps, computed fields) are skipped on import and listed in `ignoredColumns`; hidden or unknown columns are row errors.
- Admin import keeps the owner field of each row on create (a restore); it never changes owners on update.
- Self export (`GET /api/export/:resource`) is limited to the owner scope and the resource's read policy; keep both checks.
- A failure after the first byte destroys the response, so a partial file never looks complete.
- Tests in the CalmAPI repo: `test/blocks/export.test.js` (streaming 5000 records, escaping, injection, dry run, permissions).

<!-- block-guide:end -->
