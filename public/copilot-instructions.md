# Copilot instructions for CalmAPI 2 projects

Save this file as `.github/copilot-instructions.md` in a CalmAPI 2 project. It mirrors the
`AGENTS.md` that `npm create calmapi` puts at the root of every project; if your project has
one, keep the two in sync (or point one at the other). Documentation: https://docs.calmapi.dev

## What this project is

A REST API built with CalmAPI 2 (Node.js 22.12+, Express 5, MongoDB via Mongoose, ESM).
The framework itself lives in `calm/` as plain source code. It is owned by this project.

## Layout

```
calm/                     framework code (owned). Upgrade with `npx calm upgrade`, do not rewrite casually
app/resources/<name>/     one folder per resource
  <name>.resource.js      fields + access policy (required)
  <name>.service.js       business logic, extends ResourceService (optional)
  <name>.routes.js        custom endpoints (optional)
app/blocks/<name>/        blocks installed with `npx calm add`
app/routes.js             app-wide custom routes (optional)
calm.config.js            config overrides; secrets go in .env
test/                     node:test tests, use createTestApp from '#calm/testing.js'
```

Imports: use `#calm` for the framework and `#app/...` for app code. Never deep-import mongoose models
across resources; use `this.service('name')` inside services or `ctx.services.name` in routes.

## Golden rules

1. **Add a resource with the CLI**, then edit it:
   `npx calm make resource product title:string! price:number category:ref:category`
2. **Declare fields once** in `<name>.resource.js` with `f.*()`. Visibility and validation come from there:
   `.hidden()` never returned, `.writeOnly()` input only, `.readOnly()` output only, `.immutable()`,
   `.writableBy('admin')`, `.visibleTo('owner | admin')`, `.filterable()`, `.sortable()`, `.searchable()`.
3. **Every route needs a policy**: `'public' | 'authenticated' | 'owner' | 'admin' | '<role>' | (ctx) => bool`,
   combined with `|`. Owner comes from a `f.ref('user').owner()` field.
4. **Handlers return values**; do not call `res.json`. Throw `notFound()`, `forbidden()`, `badRequest()`,
   `validationError({ field: 'msg' })` from `#calm`. No try/catch needed.
5. **Business logic goes in the service**, using hooks (`beforeCreate`, `afterUpdate`, `scope`...) before
   overriding whole methods. Keep queries scoped with `this.filterFor(ctx, filter)`.
6. **Never return raw documents from non-resource routes**; use `ctx.serialize(doc, 'resource')`.
7. Sensitive data: `.visibleTo('owner | admin')` for personal fields, `.encrypted()` for secrets at rest
   (needs `CALM_ENCRYPTION_KEYS`, see `npx calm keygen --write`). Never log secrets.
8. Before finishing: `npm test`, `npx calm doctor` (fix every `error`) and, after changing policies or
   fields, `npx calm audit` (it calls every route as every role and must pass).

## Patterns

Resource:

```js
// app/resources/post/post.resource.js
import { resource, f } from '#calm';

export default resource('post', {
  fields: {
    title: f.string().required().max(200).searchable().sortable(),
    body: f.text().required(),
    status: f.enum(['draft', 'published']).default('draft').filterable(),
    author: f.ref('user').owner(),
    internalNote: f.string().hidden(),
  },
  policy: {
    list: 'public',
    read: 'public',
    create: 'authenticated',
    update: 'owner | admin',
    delete: 'owner | admin',
  },
});
```

Service:

```js
// app/resources/post/post.service.js
import { ResourceService, hasRole } from '#calm';

export default class PostService extends ResourceService {
  scope({ user } = {}) {
    if (hasRole(user, 'admin')) return {};
    return user ? { $or: [{ status: 'published' }, { author: user.id }] } : { status: 'published' };
  }

  async beforeCreate(data, ctx) {
    return { ...data, internalNote: `created by ${ctx.user?.id ?? 'system'}` };
  }
}
```

Custom routes (mounted under the resource path, before the CRUD routes):

```js
// app/resources/post/post.routes.js
import { f, badRequest } from '#calm';

export default (r) => {
  r.get('/featured', { policy: 'public', summary: 'Latest published posts' }, async (ctx) => {
    const { items } = await ctx.service.list({ filter: { status: 'published' }, limit: 5 }, ctx);
    return items; // serialized with the post visibility rules
  });

  r.post('/:id/publish', { policy: 'owner | admin' }, (ctx) => ctx.service.update(ctx.doc._id, { status: 'published' }, ctx));

  r.post('/preview', { policy: 'authenticated', input: { body: f.text().required() } }, (ctx) => {
    if (ctx.body.body.length > 10_000) throw badRequest('Too long to preview');
    return { length: ctx.body.body.length };
  });
};
```

Test:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createTestApp } from '#calm/testing.js';

let t;
before(async () => { t = await createTestApp({ root: join(import.meta.dirname, '..') }); });
after(() => t.close());

test('only the author can edit', async () => {
  const alice = await t.signup();
  const bob = await t.signup();
  const post = await t.post('/posts', { title: 'Mine', body: '...' }, alice);
  assert.equal(post.status, 201);
  assert.equal((await t.patch(`/posts/${post.body.data.id}`, { title: 'x' }, bob)).status, 404); // bob cannot see a draft
});
```

## Responses and errors

- Success: `{ data }`, lists `{ data, meta: { total, page, limit, pages } }`; create is `201`, delete `204`.
- Errors: `{ error: { code, message, requestId, details? } }`; `422 VALIDATION_ERROR` for bad bodies,
  `400 BAD_REQUEST` for bad list queries, `401`/`403`/`404` from policies.
- List queries only accept declared fields: `?status=published&price[gte]=10&tags[in]=a,b&q=text&sort=-createdAt&page=2&limit=20&include=author&fields=title`.

## Useful commands

```
npm run dev                 start with watch mode and devtools (http://localhost:5001/_calm)
npx calm routes             every route with its policy
npx calm doctor             security and config checks
npx calm audit              authorization test of every route as every role (throwaway database)
npx calm add <block>        add a block from the registry (e.g. @calmapi/jobs)
npx calm openapi            write openapi.json
npm test                    run tests (needs MongoDB; MONGODB_TEST_URI to override)
```

## Do not

- Do not add fields to request bodies that are not declared in the resource; unknown fields are rejected.
- Do not write `res.json(...)` in handlers or bypass services to query another resource's model.
- Do not put secrets in `calm.config.js`; use `.env`.
- Do not edit `calm/` for app-specific behavior when a service hook, route, plugin in `app/blocks/` or config option works.
