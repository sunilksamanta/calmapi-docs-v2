# Quick reference

CalmAPI 2 on one page. Follow the links for details.

## Commands

```bash
npm create calmapi@latest my-api           # new project (templates: api, minimal)
npm run dev                                 # watch mode + devtools at /_calm
npx calm make resource product name:string!+searchable price:number! status:enum:draft,live=draft category:ref --service --routes
npx calm add jobs storage-s3 api-docs       # blocks (calm add --list)
npx calm add gh:acme/blocks/billing         # a block from GitHub, reviewed before it is written
npx calm make block slack-notify            # your own block (calm block check | pack | list)
npx calm seed product --count 50            # sample data that looks real
npx calm routes                             # routes and policies
npx calm doctor --prod --ci                 # checks, CI friendly (--audit adds npm audit)
npx calm audit --ci                         # every route as every role, on a throwaway database
npx calm admin ada@example.com              # grant the admin role (--revoke to remove)
npx calm keygen --write                     # CALM_ENCRYPTION_KEYS for .encrypted() fields (rotates)
npx calm openapi --out openapi.json
npx calm upgrade --dry-run                  # merge framework updates into calm/
claude mcp add calm -- npx calm mcp         # MCP server for coding agents
npm test                                    # node --test, needs MongoDB
```

[CLI reference](/cli)

## Resource

```js
// app/resources/product/product.resource.js
import { resource, f } from '#calm';

export default resource('product', {
  fields: {
    name: f.string().required().max(120).searchable().sortable(),
    price: f.number().required().min(0).filterable().sortable(),
    cost: f.number().hidden(),
    status: f.enum(['draft', 'live']).default('draft').filterable(['eq', 'in']),
    category: f.ref('category').filterable(),
    tags: f.array(f.string()).default([]).filterable(),
    owner: f.ref('user').owner(),
  },
  policy: { list: 'public', read: 'public', create: 'authenticated', update: 'owner | admin', delete: 'owner | admin' },
  // path, collection, timestamps, defaultSort, crud: ['list', 'read'], indexes, owner: '_id', description
});
```

[Resources and fields](/resources)

## Fields

| | |
|---|---|
| Types | `f.string() text() email() url() password() number() integer() boolean() date() enum([...]) id() ref('name') array(f) object({...}) json()` |
| Validation | `.required() .optional() .default(v) .min(n) .max(n) .pattern(re) .trim() .lowercase() .uppercase() .unique() .index() .check(fn) .schema(standardSchema)` |
| Visibility | `.hidden() .writeOnly() .readOnly() .immutable() .writableBy('admin') .visibleTo('owner \| admin')` |
| Storage | `.encrypted()` (AES-256-GCM at rest, needs `CALM_ENCRYPTION_KEYS`, cannot be queried) |
| Queries | `.filterable([ops]) .sortable() .searchable()` |
| Relations | `.owner()` (on `f.ref('user')`) `.populate()` |
| Docs | `.describe(text) .example(value)` |

## Policies

`'public'`, `'authenticated'`, `'owner'`, `'admin'` or any role, `'none'`, combined with `|`, or functions `({ user, action, doc, req }) => boolean` in an array: `['owner | admin', isPublished]`.

Item routes: `401` signed out, `404` cannot read (or hidden by `scope()`), `403` can read but not act. `'owner'` on `list` filters to the user's records.

[Policies](/policies)

## CRUD routes

| | | |
|---|---|---|
| `GET /api/products` | list | `200 { data, meta: { total, page, limit, pages } }` |
| `GET /api/products/:id` | read | `200 { data }` |
| `POST /api/products` | create | `201 { data }` |
| `PATCH /api/products/:id` | update | `200 { data }` (PUT alias) |
| `DELETE /api/products/:id` | delete | `204` |

## Queries

```text
?status=live  ?price[gte]=10&price[lt]=50  ?tags[in]=a,b  ?tags[all]=a,b  ?category[exists]=true  ?id[in]=x,y
?q=saw  ?sort=-price,name  ?page=2&limit=20  ?include=category,owner  ?fields=name,price
```

Operators: `eq ne gt gte lt lte in nin all exists`. Anything undeclared is a `400`. [Querying](/querying)

## Service

```js
// app/resources/product/product.service.js
import { ResourceService, hasRole, conflict } from '#calm';

export default class ProductService extends ResourceService {
  scope({ user } = {}) { return hasRole(user, 'admin') ? {} : { status: 'live' }; }
  async beforeCreate(data, ctx) { return { ...data, cost: data.price / 2 }; }
  async beforeUpdate(data, existing, ctx) { return data; }
  async beforeDelete(doc, ctx) { if (doc.status === 'live') throw conflict('Unpublish it first'); }
  // afterCreate(doc, ctx), afterUpdate(doc, previous, ctx), afterDelete(doc, ctx)
}
```

Methods: `list({ filter, sort, skip, limit, populate }, ctx)`, `get(id, { populate }, ctx)`, `find(filter, ctx)`, `findOne(filter, ctx)`, `create(data, ctx)`, `update(id, data, ctx)`, `remove(id, ctx)`, `filterFor(ctx, extra)`, `service(name)`. Events: `product.created|updated|deleted`. [Services and hooks](/services)

## Custom routes

```js
// app/resources/product/product.routes.js (mounted before CRUD)
import { f, badRequest } from '#calm';

export default (r) => {
  r.get('/cheap', { policy: 'public' }, (ctx) => ctx.service.find({ price: { $lt: 10 } }, ctx));
  r.post('/:id/discount', { policy: 'owner', input: { percent: f.integer().required().min(1).max(90) } }, async (ctx) => {
    if (ctx.doc.price < 1) throw badRequest('Too cheap');
    return ctx.service.update(ctx.doc._id, { price: ctx.doc.price * (1 - ctx.body.percent / 100) }, ctx);
  });
  r.post('/import', { policy: 'admin', status: 202, rateLimit: { windowMs: 60_000, max: 5 } }, (ctx) => ctx.reply({ queued: true }, { status: 202 }));
};
```

Options: `policy input status summary description tags middleware rateLimit hidden`. Return a value (`200 { data }`), `undefined` (`204`) or `ctx.reply(data, { status, meta, headers })`. `ctx`: `user params query body doc service services serialize reply req res app config log events`. [Custom routes](/routes)

## Errors

`badRequest(msg, details)` 400 · `unauthorized(msg)` 401 · `forbidden(msg)` 403 · `notFound(msg)` 404 · `conflict(msg, details)` 409 · `validationError(details)` 422 · `tooManyRequests()` 429 · `new CalmError(status, code, message, details)`.

Shape: `{ error: { code, message, requestId, details? } }`. [Errors](/errors)

## Auth

```text
POST /api/auth/register          { name, email, password }        -> 201 { data: { user, token, expiresAt } }
POST /api/auth/login             { email, password }              -> 200 { data: { user, token, expiresAt } }
POST /api/auth/logout | logout-all                                -> 204
GET  /api/auth/me   PATCH /api/auth/me
POST /api/auth/password          { currentPassword, newPassword } -> 204
POST /api/auth/password/forgot   { email }                        -> 202
POST /api/auth/password/reset    { token, password }              -> 204
GET  /api/auth/sessions   DELETE /api/auth/sessions/:sessionId
```

Devices for push: `POST /api/auth/devices { token, platform }`, `GET /api/auth/devices`, `DELETE /api/auth/devices/:deviceId`, `POST /api/auth/devices/unregister { token }`. Signing out removes the session's devices.

Header: `Authorization: Bearer calm_...`. 5 failed sign-ins for an email lock it for 15 minutes (`429`). Two-factor: the [totp](/blocks/totp) block. [Authentication](/authentication)

## Push notifications

```js
await ctx.push.send({ to: userId, title: 'Your order shipped', body: 'Arrives Thursday', url: '/orders/42', data: { orderId: '42' } });
// -> { id, status: 'captured' | 'sent' | 'partial' | 'failed' | 'no-devices', devices, results }
```

Development: previews in devtools **Push**, simulated phones that are offline, muted or uninstalled, nothing delivered. Deliver: `npx calm add push-expo` and/or `push-fcm`. Inbox, push and email in one call: the [notifications](/blocks/notifications) block. Tests: `t.pushes`. [Push notifications](/push-notifications)

## Config and environment

```js
// calm.config.js
import { defineConfig } from '#calm';
export default defineConfig({ pagination: { maxLimit: 100 }, auth: { register: true }, mail: { from: 'App <no-reply@example.com>' } });
```

`NODE_ENV` (default production) · `MONGODB_URI` · `APP_URL` (required in production) · `PORT` (5001) · `CORS_ORIGINS` · `TRUST_PROXY` · `LOG_LEVEL` · `CALM_ENCRYPTION_KEYS`. [Configuration](/configuration)

## Testing

```js
import { createTestApp } from '#calm/testing.js';
const t = await createTestApp({ root: join(import.meta.dirname, '..') });
const alice = await t.signup();                          // { token, user, id, email, password }
const admin = await t.signup({ roles: ['user', 'admin'] });
const res = await t.post('/products', { name: 'Saw', price: 12 }, alice);  // { status, body, headers }
await t.idle(); await t.close();
```

[Testing](/testing)

## Imports

`#calm` (framework API), `#calm/testing.js` (any framework file), `#app/...` (your code). Other resources: `this.service('name')` in services, `ctx.services.name` in routes.
