# Custom routes

CRUD covers most endpoints. For everything else, add routes with the route builder: in `app/resources/<name>/<name>.routes.js` (mounted under the resource path) or in `app/routes.js` (mounted under `/api`).

```js
// app/resources/post/post.routes.js (from the api template)
export default (r) => {
  r.get('/featured', { policy: 'public', summary: 'Latest published posts' }, async (ctx) => {
    const { items } = await ctx.service.list({ filter: { status: 'published' }, sort: { publishedAt: -1 }, limit: 5 }, ctx);
    return items; // raw documents are serialized with the post visibility rules
  });

  r.post('/:id/publish', { policy: 'owner | admin', summary: 'Publish a draft' }, (ctx) => ctx.service.publish(ctx.params.id, ctx));
};
```

This adds `GET /api/posts/featured` and `POST /api/posts/:id/publish`.

## The route builder

`r.get`, `r.post`, `r.put`, `r.patch` and `r.delete` take `(path, options, handler)`; `options` can be left out. Paths are relative to the resource path (or to `/api` in `app/routes.js`) and use Express syntax (`/:id`, `/:id/comments/:commentId`).

| Option | Default | Meaning |
|---|---|---|
| `policy` | `'authenticated'` | Who may call it ([Policies](/docs/policies)). Always set it: `calm doctor` warns when it is missing. |
| `input` | none | Validate the JSON body: an object of `f.*()` fields or a Standard Schema. The result is `ctx.body`. |
| `status` | `200` | Status code for a returned value |
| `summary`, `description`, `tags` | | OpenAPI documentation |
| `middleware` | `[]` | Express middleware run before the handler (after a quick sign-in check), for example an upload parser |
| `rateLimit` | none | `'auth'` for the auth limiter, or `{ windowMs, max }` for a limit on this route only |
| `hidden` | `false` | Leave the route out of OpenAPI and `calm routes` |

## The handler context

Handlers receive `ctx`:

| Property | What it is |
|---|---|
| `ctx.user` | The signed-in user (with `id` as a string), or `null` |
| `ctx.params`, `ctx.query` | Route parameters and query string |
| `ctx.body` | The validated body when `input` is set, otherwise the raw JSON body |
| `ctx.doc` | For resource routes with `:id`: the record, loaded and authorized (see below) |
| `ctx.service` | This resource's service (resource routes only) |
| `ctx.services` | Every service: `ctx.services.post`, `ctx.services['product-category']` |
| `ctx.scope` | `'owner'` when the policy matched through `owner`, else `null` |
| `ctx.reply(data, { status, meta, headers })` | Build a response with a custom status, `meta` or headers |
| `ctx.serialize(doc, resourceName?)` | Apply a resource's visibility rules to a raw record |
| `ctx.req`, `ctx.res` | The Express request and response |
| `ctx.app`, `ctx.config`, `ctx.log`, `ctx.events` | The app, its config, the logger (every line is tagged with the request id) and the event bus |
| `ctx.session`, `ctx.requestId` | The current session `{ id, expiresAt }` and the request id |

## Return values

| Handler returns | Response |
|---|---|
| a value | `200` (or `status`) with `{ "data": value }` |
| `undefined` | `204 No Content` |
| `ctx.reply(data, { status: 201, meta, headers })` | that status, `{ data, meta }` and headers |
| `ctx.reply(undefined, { status: 202 })` | that status with an empty body |
| throws `notFound()`, `forbidden()`, `badRequest()`... | the [error response](/docs/errors) |

```js
import { badRequest, notFound } from '#calm';

export default (r) => {
  r.get('/stats', { policy: 'admin', summary: 'Post counts by status' }, async (ctx) => {
    const [drafts, published] = await Promise.all([
      ctx.service.model.countDocuments({ status: 'draft' }),
      ctx.service.model.countDocuments({ status: 'published' }),
    ]);
    return { drafts, published };                       // 200 { data: { drafts, published } }
  });

  r.post('/import', { policy: 'admin', status: 202 }, async (ctx) => {
    if (!Array.isArray(ctx.body?.items)) throw badRequest('items must be an array');
    ctx.app.background(() => ctx.service.importMany(ctx.body.items)); // your method, runs after the response
    return { queued: ctx.body.items.length };            // 202 { data: { queued } }
  });

  r.get('/by-slug/:slug', { policy: 'public' }, async (ctx) => {
    const post = await ctx.service.findOne({ slug: ctx.params.slug }, ctx);
    if (!post) throw notFound('Post not found');
    return post;                                          // serialized automatically
  });
};
```

Errors thrown in async handlers reach the error handler by themselves (Express 5), so there is no `try/catch` and no `next`.

You can still write to `ctx.res` directly (file downloads, redirects, streams); CalmAPI does not send a second response. Prefer returning values when you can: you get serialization and a consistent shape for free.

## Routes with :id

In a resource's routes file, a path parameter named exactly `id` gets the same treatment as the CRUD routes: the record is loaded through the service's `scope()`, the policy is checked with the record in hand (so `'owner'` means the owner of *this* record), and the answer is `401`, `403` or `404` [as for CRUD](/docs/policies#401-403-or-404). The record is in `ctx.doc`:

```js
r.post('/:id/discount', { policy: 'owner' }, async (ctx) => {
  if (ctx.doc.price < 1) throw badRequest('Too cheap to discount');
  return ctx.service.update(ctx.doc._id, { price: ctx.doc.price - 1 }, ctx);
});
```

`ctx.doc` does not contain `hidden()` fields; load them explicitly when you need one (`ctx.service.model.findById(ctx.doc._id).select('+key').lean()`). Name a parameter differently (`:postId`) when you do not want this behavior.

## Validating input

`input` validates the body before your handler runs. Invalid bodies get a `422` with per-field details, unknown fields included:

```js
import { f } from '#calm';

r.post('/quote', {
  policy: 'public',
  input: { qty: f.integer().required().min(1), coupon: f.string().max(20) },
}, (ctx) => ({ total: ctx.body.qty * 3 }));
```

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "requestId": "...", "details": { "qty": "Must be at least 1" } } }
```

A Standard Schema works too:

```js
import { z } from 'zod';

r.post('/contact', {
  policy: 'public',
  input: z.object({ email: z.string().email(), message: z.string().min(10).max(2000) }),
  rateLimit: { windowMs: 60_000, max: 5 },
}, async (ctx) => {
  await ctx.app.mailer.send({ to: 'team@example.com', subject: 'Contact form', text: `${ctx.body.email}\n\n${ctx.body.message}` });
});
```

## Auto-serialization

Raw records returned from a **resource** route (a record, an array of records, or the `data` of `ctx.reply()`) are serialized with that resource's visibility rules: hidden, write-only and `visibleTo` fields are removed for the current user. This is a safety net, so `return ctx.service.find(...)` never leaks a private field.

It does not look inside other shapes. When you return `{ file, upload }`, or records of another resource, or anything from `app/routes.js` or a block, serialize explicitly:

```js
// app/routes.js
r.get('/me/summary', { policy: 'authenticated' }, async (ctx) => {
  const posts = await ctx.services.post.find({ author: ctx.user.id }, ctx);
  return {
    user: await ctx.serialize(ctx.user, 'user'),
    posts: await Promise.all(posts.map((p) => ctx.serialize(p, 'post'))),
  };
});
```

## Order: custom routes before CRUD

Routes are registered in this order: auth routes, block routes, `app/routes.js`, then for each resource its custom routes followed by its CRUD routes. That is why `GET /api/posts/featured` works: it is registered before `GET /api/posts/:id`, which would otherwise treat `featured` as an id.

If two routes have the same method and path, the first one wins and the app logs a warning at boot.

## Middleware

Express middleware in `middleware` runs after a cheap check that rejects signed-out users when the policy needs a user, so an upload parser never runs for anonymous requests. This is how the [storage-local](/docs/blocks/storage-local) block handles uploads:

```js
r.post('/upload', {
  policy: 'authenticated',
  status: 201,
  summary: 'Upload a file (multipart/form-data, field "file")',
  middleware: [uploadMiddleware('file')],
}, async (ctx) => {
  const file = ctx.req.file;
  if (!file) throw badRequest('Send the file as multipart/form-data in a field named "file"');
  return ctx.service.create({ originalName: file.originalname, mimeType: file.mimetype, size: file.size, key: file.filename }, ctx);
});
```

## App-wide routes

`app/routes.js` is for endpoints that do not belong to a resource. Paths are relative to `/api`:

```js
// app/routes.js
export default (r) => {
  r.get('/hello', { policy: 'public', summary: 'Say hello' }, (ctx) => ({
    message: `Hello from ${ctx.config.app.name}`,
    time: new Date().toISOString(),
  }));

  r.get('/dashboard', { policy: 'authenticated' }, async (ctx) => {
    const { total } = await ctx.services.post.list({ limit: 1 }, ctx);
    return { posts: total };
  });
};
```

There is no `ctx.service`, `ctx.doc` or auto-serialization here: use `ctx.services.<name>` and `ctx.serialize(doc, '<name>')`.
