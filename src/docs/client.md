# Typed client

Your frontend should not guess what your API accepts. `calm client` writes one file for your web or mobile app: a client generated from the API's own OpenAPI document, with every route as a function, its input and output types, and typed errors. It has no dependencies (it uses `fetch`), so it works in browsers, React Native, Node, Deno and Bun.

```bash
npx calm client --out ../web/src/api/calm-client.ts         # TypeScript
npx calm client --out ../app/api/calm-client.js --js        # JavaScript plus calm-client.d.ts
npx calm client --stdout                                    # print it
```

```ts
import { createClient, CalmApiError } from './api/calm-client';

const api = createClient({
  baseUrl: 'https://api.example.com',
  token: () => localStorage.getItem('token'),
  onUnauthorized: () => router.push('/login'),
});

const session = await api.auth.login({ email, password });
if ('mfaRequired' in session) {
  // ask for the code (the totp block)
} else {
  localStorage.setItem('token', session.token);
}

const page = await api.products.list({ status: 'live', sort: '-price', limit: 20 }); // Page<Product>
const lamp = await api.products.create({ name: 'Lamp', price: 30 });                 // Product
await api.products.update(lamp.id, { price: 25 });
await api.products.delete(lamp.id);

try {
  await api.products.create({ name: '' });
} catch (err) {
  if (err instanceof CalmApiError && err.code === 'VALIDATION_ERROR') showErrors(err.details); // { name: 'Required' }
}
```

## Keep it current while you work

Point `client.out` at your frontend and `calm dev` writes the client again every time the API restarts. Change a field in a resource, save, and your editor shows the new type in the frontend a second later. The file is only rewritten when it changed, so bundlers in watch mode do not rebuild for nothing.

```js
// calm.config.js
export default defineConfig({
  client: { out: '../web/src/api/calm-client.ts' },
});
```

## What you get

| | |
|---|---|
| Groups | One per first path segment under `/api`: `api.products`, `api.auth`, `api.teams`, `api.billing`... |
| Resource routes | `list(query?)`, `get(id)`, `create(body)`, `update(id, body)`, `delete(id)` |
| Other routes | Named after their path: `api.auth.me()`, `api.auth.updateMe(body)`, `api.posts.publish(id)`, `api.auth.passwordForgot({ email })` |
| Lists | `Page<T>`: `{ data: T[], meta: { total, page, limit, pages } }` |
| Other answers | The `data` of the response, typed: `Product`, `User`, the session... |
| Errors | `CalmApiError` with `status`, `code`, `message`, `details` (field errors) and `requestId` |
| Options | `baseUrl`, `token` (a string or a function, sync or async), `headers`, `credentials`, `fetch` (your own), `onUnauthorized` |
| Per call | The last argument: `{ signal, headers }` (cancel with an `AbortController`) |
| Escape hatch | `api.request(method, path, { body, query })` for routes added after the file was generated |

Types come from your resources: `Product` is what the API returns (read-only fields marked), `ProductCreate` and `ProductUpdate` are what it accepts, enums become unions (`'draft' | 'live'`), references are ids. Each function's comment shows its route and who may call it (`Access: owner | admin`).

## Custom routes

Routes with `input` are typed automatically. For handlers that validate on their own, describe them with the `openapi` route option (documentation only, nothing is validated by it):

```js
r.post('/quote', {
  policy: 'authenticated',
  openapi: {
    body: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'string' } } } },
    response: { type: 'object', properties: { total: { type: 'number' }, currency: { type: 'string' } } },
  },
}, async (ctx) => quote(ctx.req.body));
// api.orders.quote({ items: ['a', 'b'] }) -> Promise<{ total?: number; currency?: string }>
```

The same schemas appear in `/api/openapi.json`, so Swagger, Scalar and other generators see them too.

## For AI agents

Agents get the client through MCP: `calm_client` returns the TypeScript source, or writes it with `{ out }` (the `scaffold` scope). In devtools, any request in **Requests** has **Copy as client call**, which turns it into the matching line of code.
