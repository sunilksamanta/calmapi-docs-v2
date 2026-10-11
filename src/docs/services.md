# Services and hooks

Every resource has a service: an instance of `ResourceService` that does all reads and writes. CRUD routes, custom routes, blocks and jobs go through it, so logic you put here applies everywhere.

Create `app/resources/<name>/<name>.service.js` (or pass `--service` to `calm make resource`) and override only what you need: hooks for small tweaks, whole methods for full control.

```js
// app/resources/post/post.service.js (from the api template)
import { ResourceService, hasRole } from '#calm';

export default class PostService extends ResourceService {
  // Every query goes through scope(): visitors see published posts, authors also see
  // their own drafts, admins see everything.
  scope({ user } = {}) {
    if (hasRole(user, 'admin')) return {};
    if (user) return { $or: [{ status: 'published' }, { author: user.id }] };
    return { status: 'published' };
  }

  async beforeCreate(data) {
    return {
      ...data,
      slug: await this.uniqueSlug(data.title),
      publishedAt: data.status === 'published' ? new Date() : undefined,
    };
  }

  async beforeUpdate(data, existing) {
    if (data.status === 'published' && existing.status !== 'published') data.publishedAt = new Date();
    return data;
  }

  /** Used by POST /api/posts/:id/publish (post.routes.js). */
  async publish(id, ctx) {
    return this.update(id, { status: 'published' }, ctx);
  }

  async uniqueSlug(title) {
    const base = title.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 80) || 'post';
    let slug = base;
    for (let i = 2; await this.model.exists({ slug }); i++) slug = `${base}-${i}`;
    return slug;
  }
}
```

The class must `export default` and extend `ResourceService`, otherwise the app refuses to boot with a clear message.

## Methods

All methods take the request context `ctx` as their last argument. Pass it along: it carries the user and the owner scope.

| Method | Returns |
|---|---|
| `list({ filter, sort, skip, limit, populate }, ctx)` | `{ items, total }` |
| `get(id, { populate }, ctx)` | the record, or throws `notFound()` |
| `find(filter, ctx)` | an array of records |
| `findOne(filter, ctx)` | a record or `null` |
| `create(data, ctx)` | the created record |
| `update(id, data, ctx)` | the updated record (throws `notFound()` if it is not visible) |
| `remove(id, ctx)` | the deleted record (throws `notFound()` if it is not visible) |

Records are plain objects (Mongoose `lean()`) with `_id`. Every service method (`list`, `get`, `find`, `findOne`, `create`, `update`, `remove`) and every hook works with the whole record, `hidden()` and `writeOnly()` fields included. Password hashes are never included. Return records from a resource route and they are serialized for you (see [Custom routes](/docs/routes#auto-serialization)).

Services trust their input: they do not run field validation or policies. The CRUD routes validate the body before calling `create` and `update`. When you call a service from your own route, validate with the route's `input` option first.

Useful properties: `this.model` (the Mongoose model), `this.def` (the resource definition), `this.app`, `this.log`, `this.events`, `this.name`.

## Hooks

| Hook | Called | Return |
|---|---|---|
| `scope(ctx)` | before every query | a Mongo filter (`{}` for no restriction) |
| `beforeCreate(data, ctx)` | after validation, before insert. The owner field is already set. | the data to insert |
| `afterCreate(doc, ctx)` | after insert | nothing |
| `beforeUpdate(data, existing, ctx)` | before the update, with the current record | the changes to apply |
| `afterUpdate(doc, previous, ctx)` | after the update | nothing |
| `beforeDelete(doc, ctx)` | before delete. Throw to prevent it. | nothing |
| `afterDelete(doc, ctx)` | after delete | nothing |

`before*` hooks are the place to set `hidden()` and `readOnly()` fields, which clients cannot send:

```js
export default class ProductService extends ResourceService {
  async beforeCreate(data) {
    return { ...data, cost: data.price / 2 };           // cost is .hidden()
  }

  async beforeDelete(doc) {
    const orders = await this.service('order').find({ product: doc._id });
    if (orders.length) throw conflict('This product has orders and cannot be deleted');
  }
}
```

(`conflict` is imported from `#calm`, like every [error helper](/docs/errors).)

## scope()

`scope(ctx)` returns a filter that is added to **every** query the service makes: lists, reads, updates, deletes, and the record lookup that authorizes `/:id` routes. A record outside the scope does not exist for that user: it is a `404`.

```js
// Multi-tenancy: everyone only ever sees their organization's data.
scope({ user } = {}) {
  return user ? { org: user.org } : { _id: null }; // signed out: nothing
}
```

`scope()` also applies to calls without a user, which are treated like anonymous visitors. For trusted internal work (jobs, scripts, migrations) pass `{ system: true }` as the context: `scope()` is skipped and the call sees every record.

```js
await ctx.app.service('post').update(id, { status: 'archived' }, { system: true });
```

Service methods return whole records, hidden fields included (password hashes excepted): they are server-side data. Routes serialize them with the resource rules before anything is sent.

## filterFor()

`this.filterFor(ctx, extra)` builds the full filter for a request: your `scope()`, the owner filter when the policy is `'owner'`, and `extra`. Use it whenever you query `this.model` yourself, so custom queries obey the same rules:

```js
async countPublished(ctx) {
  return this.model.countDocuments(this.filterFor(ctx, { status: 'published' }));
}
```

Mongoose casts ids in `find` and `countDocuments`, but not in `aggregate`. In an aggregation pipeline, convert ids yourself. Mongoose's `strictQuery` is on, so conditions on fields the resource does not declare are dropped from filters rather than matching nothing.

## Calling other services

```js
// inside a service
const author = await this.service('user').get(post.author, {}, ctx);

// inside a route handler
const categories = await ctx.services.category.find({}, ctx);
const sub = ctx.services['product-category'];   // or ctx.services.productCategory
```

Go through services rather than importing another resource's model: you keep its scope, hooks and events.

## Overriding whole methods

When hooks are not enough, override the method and call `super`:

```js
async list(query, ctx) {
  const result = await super.list(query, ctx);
  this.log.debug('Listed products', { total: result.total });
  return result;
}
```

## Events

After each write, the service emits an event on the app's in-process bus:

| Event | Payload |
|---|---|
| `<resource>.created` | `{ doc, resource, user }` |
| `<resource>.updated` | `{ doc, previous, resource, user }` |
| `<resource>.deleted` | `{ doc, resource, user }` |
| `auth.registered`, `auth.login`, `auth.password_changed`, `auth.password_reset_requested` | `{ user }` |
| `auth.password_reset` | `{ userId }` |
| `security.login_failed`, `security.account_locked`, `security.forbidden`... | Depends on the event: failed sign-ins, lockouts, bad tokens, rejected writes, `403`s, rate limits (see [Security events](/docs/security#security-events)) |

`user` is the signed-in user who made the change, or `null`. Blocks add their own (`job.completed`, `job.failed`, `<resource>.restored`).

Listeners run after the write, asynchronously. They never break a request: an exception is logged. Patterns are an exact name, `'post.*'` or `'*'`. Register listeners in a small plugin in `app/blocks/` (any folder there with an `index.js` is loaded at boot):

```js
// app/blocks/notifications/index.js
import { definePlugin } from '#calm';

export default definePlugin({
  name: 'notifications',
  setup(calm) {
    calm.on('post.created', async ({ doc, user }) => {
      calm.log.info(`New post "${doc.title}" by ${user?.name ?? 'system'}`);
    });
  },
});
```

`app.events.on()` returns a function that removes the listener, which is handy in tests. For work that must survive a restart or be retried, use the [jobs](/docs/blocks/jobs) block, whose jobs can be triggered by these events.
