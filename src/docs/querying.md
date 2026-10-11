# Querying

`GET /api/<resources>` accepts filters, search, sorting, pagination, includes and field selection. Only what you declared on the fields is allowed, so clients can never filter on private data or send raw MongoDB operators.

```text
GET /api/products?status=live&price[gte]=10&price[lt]=50&tags[in]=tools,garden
                 &q=saw&sort=-price,name&page=2&limit=20
                 &include=category&fields=name,price,category
```

```json
{
  "data": [{ "id": "...", "name": "Saw (large)", "price": 30, "category": { "id": "...", "name": "Tools" }, "createdAt": "...", "updatedAt": "..." }],
  "meta": { "total": 41, "page": 2, "limit": 20, "pages": 3 }
}
```

With curl, add `-g` so the square brackets are not read as globs: `curl -g "http://localhost:5001/api/products?price[gte]=10"`.

## Filters

Mark a field `.filterable()` to allow `?field=value` (equality) and `?field[op]=value`:

```js
price: f.number().filterable(),                      // default operators for numbers
status: f.enum(['draft', 'live']).filterable(['eq', 'in']), // only these two
```

```text
?status=live                      status equals "live"
?price[gte]=10&price[lt]=50       10 <= price < 50 (operators on one field combine)
?status[in]=draft,live            one of (comma separated, 1 to 100 values)
?tags=garden                      array contains "garden"
?tags[all]=garden,tools           array contains both
?category[exists]=false           field is missing
?id[in]=6acb46a5...,6acb46a6...   by id (eq, in, nin)
```

### Operators

| Operator | Meaning |
|---|---|
| `eq` (or no operator) | equals |
| `ne` | not equal |
| `gt`, `gte`, `lt`, `lte` | greater or less than (numbers and dates) |
| `in`, `nin` | in / not in a comma separated list |
| `all` | array contains all values |
| `exists` | `true`/`false` (or `1`/`0`) |

Default operators by field type, when you call `.filterable()` without a list:

| Field types | Operators |
|---|---|
| `string`, `text`, `email`, `url`, `enum` | `eq ne in nin exists` |
| `number`, `integer` | `eq ne gt gte lt lte in nin exists` |
| `date` | `eq ne gt gte lt lte exists` |
| `boolean` | `eq ne exists` |
| `id`, `ref` | `eq ne in nin exists` |
| `array` | `eq in nin all exists` |
| `json` | `exists` |

Values are converted to the field's type and checked: numbers must be numbers, booleans `true`/`false`/`1`/`0`, dates anything `new Date()` understands (`2026-01-31`, ISO timestamps), ids 24 hex characters, enum values must be in the list, and `email` values are lowercased. The query string is parsed flat (Express `simple` parser), so nested objects or `$` operators cannot be injected.

## Search

`?q=text` searches every `.searchable()` field with a case-insensitive substring match. The text is escaped, so `?q=(a+)+$` searches for those characters literally. It is limited to 100 characters, and a resource without searchable fields answers `400`.

```js
name: f.string().searchable(),
description: f.text().searchable(),
```

Search uses regular expressions, which cannot use a normal index. That is fine for thousands of records; for large collections, add a text index (`indexes: [{ fields: { name: 'text' } }]`) and a custom route that uses `$text`.

## Sorting

`?sort=` takes a comma separated list; prefix a field with `-` for descending:

```text
?sort=-price,name
```

You can sort by `.sortable()` fields, `id`, and `createdAt`/`updatedAt` (when timestamps are on). Without `sort`, the resource's `defaultSort` applies (`-createdAt` by default). `_id` is always added as a final tie-breaker, so pagination is stable.

## Pagination

| Parameter | Default | Rules |
|---|---|---|
| `page` | `1` | integer, 1 or more |
| `limit` | `pagination.defaultLimit` (20) | integer from 1 to `pagination.maxLimit` (100) |

Every list response has `meta: { total, page, limit, pages }`. Change the defaults in `calm.config.js`:

```js
export default defineConfig({ pagination: { defaultLimit: 25, maxLimit: 200 } });
```

## Include references

`?include=` populates `f.ref()` fields (and arrays of refs), comma separated. It works on lists and on `GET /:id`:

```text
GET /api/posts?include=author
GET /api/products/6acb46a5...?include=category,owner
```

The included record is serialized with the **target** resource's rules for the current viewer: a visitor including `author` sees the author's name, not their email, roles or password hash. Fields marked `.populate()` are always included. Hidden refs cannot be included.

## Pick fields

`?fields=name,price` returns only those fields (plus `id`, `createdAt` and `updatedAt`). Unknown, hidden and write-only fields are rejected.

## Errors

Anything not allowed fails the whole request with `400 BAD_REQUEST` and one message per parameter, so mistakes are never silently ignored:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid query",
    "requestId": "86f489d3-d343-4d90-a614-86bdca30b700",
    "details": {
      "cost": "Not filterable. Filterable fields: name, price, status, owner",
      "status[ne]": "Operator \"ne\" not allowed on status. Allowed: eq, in",
      "sort": "Cannot sort by \"cost\". Sortable: id, name, price, createdAt, updatedAt",
      "limit": "Must be an integer between 1 and 100"
    }
  }
}
```

Unknown query parameters are rejected the same way. If your frontend adds its own parameters (cache busters, tracking), strip them before calling the API, or handle them in a custom route.

## From code

Inside services and routes, the same options are available as plain objects:

```js
const { items, total } = await ctx.service.list(
  { filter: { status: 'published' }, sort: { publishedAt: -1 }, skip: 0, limit: 5, populate: [{ path: 'author', select: 'name' }] },
  ctx,
);
```

Code is trusted: filters there are not restricted to filterable fields. When you populate by hand, always pass a `select` (or serialize the result) so private fields of the referenced record are not exposed. `calm doctor` warns about `populate()` calls without one.
