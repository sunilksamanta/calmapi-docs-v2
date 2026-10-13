# Idempotency keys (idempotency)

A client creates an order, the network drops before the answer arrives, and the client cannot tell whether the order exists. Retrying blindly can charge twice. With this block, the client sends an `Idempotency-Key` header with each `POST`, `PATCH`, `PUT` or `DELETE`. If it sends the same request again with the same key, the API answers with the response it stored the first time instead of running the operation again. It follows the IETF draft [The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), the scheme Stripe and others use.

```bash
npx calm add idempotency
```

| Adds | |
|---|---|
| Files | `app/blocks/idempotency/index.js` |
| Environment | none (settings live in `calm.config.js` under `blocks.idempotency`) |
| Collection | `calm_idempotency` (keys and stored responses, removed by a TTL index) |

## Send a key

Generate one key per operation (a UUID is a good choice) and reuse it only for retries of that operation:

```bash
KEY=$(uuidgen)
curl -i -X POST http://localhost:5001/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: \"$KEY\"" \
  -d '{ "item": "book", "qty": 2 }'
# HTTP/1.1 201 Created
# { "data": { "id": "6acd...", "item": "book", "qty": 2 } }
```

The draft writes the key as a quoted string (`"8e03978e-..."`). The bare form (`8e03978e-...`) works too and is the same key. A key is 1 to 255 visible ASCII characters; anything else answers `400 IDEMPOTENCY_KEY_INVALID`.

```js
// In a client: one key per operation, the same key for its retries
const key = crypto.randomUUID();
const send = () => fetch('/api/orders', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': key },
  body: JSON.stringify(order),
});
```

## Retry safely

Send exactly the same request again (same method, path, body and key):

```bash
curl -i -X POST http://localhost:5001/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: \"$KEY\"" \
  -d '{ "item": "book", "qty": 2 }'
# HTTP/1.1 201 Created
# Idempotent-Replayed: true
# { "data": { "id": "6acd...", "item": "book", "qty": 2 } }   (the same order, not a new one)
```

The replay has the stored status, body and a safe set of headers (`Content-Type`, `Location`, `ETag`, `Last-Modified`, `Link`, `Cache-Control`, `Content-Disposition`, `Content-Language`, `Content-Location`), plus `Idempotent-Replayed: true`, which CORS exposes to browsers. Cookies, rate limit headers and the request id are never stored; each request keeps its own `X-Request-Id`.

| Situation | Answer |
|---|---|
| First time | The route runs normally and its response is stored |
| Same key, same request, first one finished | The stored response, with `Idempotent-Replayed: true` |
| Same key, same request, first one still running | `409 IDEMPOTENCY_IN_PROGRESS`, `Retry-After: 1` |
| Same key, different body or query string | `422 IDEMPOTENCY_KEY_REUSED` |
| First one answered `5xx` | Nothing was stored: the retry runs the route again |
| First one answered `4xx` | Stored and replayed: fix the request and use a new key |
| No key | The route runs normally (unless the route is in `required`) |

"Same request" means the same SHA-256 fingerprint of the JSON body (object keys sorted, so key order does not matter) and the query string. Multipart uploads are not part of the fingerprint, neither the files nor the form fields: the key is checked before the upload is parsed.

## Who can see a stored response

Keys are scoped to the caller: the signed-in user (any credential that resolves to that user, such as an [API key](/blocks/api-keys)), or the client IP for anonymous requests, plus the method and the path. Another user sending the same key gets their own fresh execution, never your response. The record id is a SHA-256 of the scope, method, path and key.

`GET`, `HEAD` and `OPTIONS` ignore the header: they are safe to retry already.

## Require a key on some routes

```js
// calm.config.js
export default defineConfig({
  blocks: {
    idempotency: {
      required: ['POST /api/orders', 'POST /api/payments/:id/capture'],
      docsUrl: 'https://example.com/docs/idempotency',
    },
  },
});
```

Patterns are a method (or `*`) and a path with the `/api` prefix. `:name` and `*` match one path segment, and a final `**` matches the rest. Without the header those routes answer:

```bash
curl -i -X POST http://localhost:5001/api/orders -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{ "item": "book" }'
# HTTP/1.1 400 Bad Request
# Link: <https://example.com/docs/idempotency>; rel="describedby"; type="text/html"
# { "error": { "code": "IDEMPOTENCY_KEY_MISSING", "message": "POST /api/orders needs an Idempotency-Key header: a unique value per operation, such as a UUID" } }
```

With `docsUrl` set, every idempotency error carries the `Link` header the draft recommends. `calm doctor` warns about patterns that match no route, and about patterns whose method the block ignores.

## Expiry

Keys and responses are kept for `ttlHours` (default 24) after the response, then MongoDB removes them. A retry after that runs the operation again, so tell your API clients that retries are safe for 24 hours. The draft asks servers to publish this.

A request that is still running holds its key for at most `lockTimeoutSeconds` (default 300). If the process crashed mid-request, a retry after that takes the key over and runs the operation.

## How it works

The block is a [guard](/building-blocks#guards) with `order: 100`, so it runs after authentication, body parsing and the other guards (such as API key scopes), and before the route's policy check. A request another guard refuses is never stored.

1. It claims the key by inserting a `{ status: 'running' }` document. The unique `_id` makes the insert the lock, so two instances cannot both run the same key.
2. The response is captured as it is written. Before it is released to the client, the document becomes `{ status: 'done', response }`, so a retry arriving right after the response always finds it.
3. A `5xx` deletes the document instead.

Responses over `maxResponseKb` (default 1024) are not stored: a replay gets the stored status and headers with an empty body, and the operation still does not run twice.

## Settings

| Option | Default | |
|---|---|---|
| `methods` | `['POST', 'PATCH', 'PUT', 'DELETE']` | Methods that honor the header |
| `required` | `[]` | Route patterns that must carry a key (`400` otherwise) |
| `ttlHours` | `24` | How long keys and responses are kept |
| `lockTimeoutSeconds` | `300` | After this, a running request's key is considered abandoned |
| `maxResponseKb` | `1024` | Larger response bodies are not stored |
| `docsUrl` | `null` | Documentation link sent with idempotency errors |

From code: `app.ext.idempotency.model` (the Mongoose model of `calm_idempotency`) and `app.ext.idempotency.parseKey(header)`.

The [privacy](/blocks/privacy) block removes a user's stored responses when their account is deleted.

## Testing

The test client does not send custom headers, so use `fetch` with `t.origin`:

```js
test('a retried order is created once', async () => {
  const alice = await t.signup();
  const send = () => fetch(`${t.origin}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${alice.token}`, 'idempotency-key': 'order-1' },
    body: JSON.stringify({ item: 'book', qty: 2 }),
  });

  const first = await send();
  const second = await send();
  assert.equal(second.status, first.status);
  assert.equal(second.headers.get('idempotent-replayed'), 'true');
  assert.equal(await t.app.model('order').countDocuments(), 1);
});
```

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/idempotency/AGENTS.md` and in the devtools Blocks panel.

- [IETF draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [RFC 9110: HTTP Semantics (idempotent methods)](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 8941: Structured Field Values for HTTP](https://www.rfc-editor.org/rfc/rfc8941.html)
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)

## For AI agents

Coding agents read these notes in `app/blocks/idempotency/AGENTS.md`:

- Read first: `app/blocks/idempotency/index.js` (`parseKey`, `canonicalJSON`, `compilePattern`, `claim`, `settle`, `capture`, `replay`, the guard).
- Configuration: `calm.config.js` `blocks.idempotency`: `methods`, `required`, `ttlHours`, `lockTimeoutSeconds`, `maxResponseKb`, `docsUrl` (defaults in `options`). No env vars.
- Task, require the header on a route: add `'POST /api/orders'` to `required` (method or `*`, full path with the `/api` prefix, `:name` or `*` for one segment, a final `**` for the rest). `calm doctor` warns about patterns that match no route.
- Invariant: the record `_id` is `sha256(scope, method, path, key)` with scope `user:<id>` or `anonymous:<ip>`. Never drop the scope: one caller's key must never replay another caller's response.
- Invariant: 5xx outcomes delete the lock so the retry runs again; 2xx to 4xx are stored and replayed with `Idempotent-Replayed: true`. Same key with another fingerprint is `422 IDEMPOTENCY_KEY_REUSED`; a running lock is `409 IDEMPOTENCY_IN_PROGRESS` with `Retry-After: 1`.
- Invariant: only `SAFE_HEADERS` are stored and replayed. Never add `set-cookie`, rate limit headers or `x-request-id`.
- Invariant: the guard is registered with `{ order: 100 }` so it runs after other guards (API key scopes, maintenance): refused requests are never stored. Keep it last.
- Handlers can read `req.idempotency` (`{ key, replayed }`); a replayed request never reaches the handler.
- Pitfall: the fingerprint is the canonical JSON of `req.body` plus the query string. Multipart bodies are parsed after guards, so uploads are not fingerprinted: one key per upload.
- Pitfall: side effects (emails, enqueued jobs, calls to other APIs) happen once per execution. A handler that fails with 5xx after a side effect runs again on retry, so make those effects idempotent too.
- Pitfall: bodies over `maxResponseKb` are not stored; the replay has the status and headers only.
- Tell API clients the retention (`ttlHours`, default 24): a retry after it runs the operation again. The privacy block deletes a user's `calm_idempotency` rows on account deletion (`alsoDelete`).

<!-- block-guide:end -->
