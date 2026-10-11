# Why CalmAPI

**CalmAPI 2 is the backend framework you own.** Resources, policies, auth, devtools and an upgrade path for Node.js and MongoDB, with every line of framework code living in your repo.

```bash
npm create calmapi@latest my-api
cd my-api
npm run dev
```

```text
  CalmAPI my-api v0.1.0 (development)

  ➜  API       http://localhost:5001/api
  ➜  OpenAPI   http://localhost:5001/api/openapi.json
  ➜  Devtools  http://localhost:5001/_calm
```

> **Status: 2.0.0-alpha.** APIs may still change before 2.0. Coming from CalmAPI 1.x? Run `npx calmapi@next doctor` inside your 1.x project first, then read [Migrating from 1.x](/docs/migrate-v1).

## What makes it different

### Owned code, nothing hidden in node_modules

`npm create calmapi` copies the framework into your project as `calm/`: around 3,000 lines of plain, commented JavaScript on Express 5 and Mongoose. Read it, step through it in a debugger, change it. When something behaves unexpectedly, the answer is in your editor, not in a minified dependency.

A new project has **two runtime dependencies**: `express` and `mongoose`. The CLI (`calmapi`) and the devtools UI (`@calmapi/devtools`) are dev dependencies and never ship to production.

### Owned, but upgradeable

Copied code usually means "no more updates". CalmAPI keeps a `calm.lock` with a hash of every framework file you started from. `calm upgrade` replaces files you never touched, three-way merges upstream fixes into files you edited, and marks real conflicts for you to resolve. See [Upgrading](/docs/upgrading).

### Declare a field once

One `f.*()` line drives the Mongoose schema, input validation, what the API returns (and to whom), which filters and sorts clients may use, and the OpenAPI document. No DTO classes to keep in sync.

### Secure by default

- Hidden fields never leave the server, not even through populated references.
- Every route has an access policy. Routes without an explicit one default to `authenticated` and `calm doctor` flags them.
- Unknown, read-only and hidden fields in a request body are rejected with `422`, so there is no mass assignment.
- List queries are allowlisted: clients can only filter, sort and search on fields you marked.
- Sessions and password reset tokens are random, opaque and stored as SHA-256 hashes. Passwords use scrypt from `node:crypto`.
- Auth endpoints are rate limited and never reveal whether an email is registered.
- `NODE_ENV` defaults to `production`. Production refuses to boot without `APP_URL`, and devtools cannot be turned on there.

### Devtools

A local dashboard at `/_calm` shows every request with its MongoDB queries and timings, explain plans, logs, a privacy lens that puts what is stored next to what the API returns, a mail catcher for password reset links, "act as" any user, and doctor findings. See [Devtools](/docs/devtools).

### Agent native

Every project ships with `AGENTS.md`. `calm mcp` is an MCP server that gives coding agents tools to inspect routes and resources, scaffold resources, add blocks, run doctor and read live requests from the dev server. See [AI agents](/docs/ai-agents).

### Blocks, shadcn style

`calm add jobs` copies production code into your project: a MongoDB job queue, file storage on disk or S3, realtime events, an audit log, soft delete, an MCP server for your API and more. You own that code too, and anyone can publish blocks in the shadcn registry format. See [Blocks](/docs/blocks).

## A resource

```js
// app/resources/post/post.resource.js
import { resource, f } from '#calm';

export default resource('post', {
  fields: {
    title: f.string().required().max(200).searchable().sortable(),
    body: f.text().required(),
    status: f.enum(['draft', 'published']).default('draft').filterable(),
    tags: f.array(f.string()).filterable(),
    author: f.ref('user').owner(),     // set from the session, powers 'owner'
    internalNote: f.string().hidden(), // stored, never returned or accepted
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

That file alone gives you:

| Route | Notes |
|---|---|
| `GET /api/posts` | filters, search, sort, pages, includes: `?status=published&tags[in]=a,b`, `q=hello`, `sort=-createdAt`, `page=2&limit=20`, `include=author`, `fields=title` |
| `GET /api/posts/:id` | `?include=author` populates the author with fields the viewer may see |
| `POST /api/posts` | validated, unknown or read-only fields rejected with 422, owner set automatically, 201 |
| `PATCH /api/posts/:id` | partial update; 403 for users who can read the post, 404 for those who cannot |
| `DELETE /api/posts/:id` | 204 |

Business logic goes in a service, custom endpoints in a routes file:

```js
// app/resources/post/post.service.js
import { ResourceService, hasRole } from '#calm';

export default class PostService extends ResourceService {
  // Applied to every query: visitors see published posts, authors also see their drafts.
  scope({ user } = {}) {
    if (hasRole(user, 'admin')) return {};
    return user ? { $or: [{ status: 'published' }, { author: user.id }] } : { status: 'published' };
  }
}
```

```js
// app/resources/post/post.routes.js (mounted before CRUD, so /featured never hits /:id)
export default (r) => {
  r.post('/:id/publish', { policy: 'owner | admin' }, (ctx) =>
    ctx.service.update(ctx.params.id, { status: 'published' }, ctx));
};
```

Handlers **return** values (`{ data }` responses, `undefined` becomes `204`) and throw `notFound()`, `forbidden()` or `validationError({...})`. Express 5 forwards async errors, so there is no try/catch boilerplate.

## Where to go next

- [Getting started](/docs/getting-started): create a project and make your first requests.
- [Resources and fields](/docs/resources): everything a resource can declare.
- [Policies](/docs/policies): who may do what, and why some errors are 404 instead of 403.
- [Blocks](/docs/blocks): jobs, uploads, realtime, MCP and more, one command each.
- [Quick reference](/docs/quick-reference): the whole API on one page.
