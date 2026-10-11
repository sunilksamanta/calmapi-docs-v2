# Policies

A policy says who may perform an action. Every CRUD action and every custom route has one, and the same rules drive field visibility, [realtime events](/docs/blocks/realtime-sse) and [MCP tool calls](/docs/blocks/mcp-server).

```js
export default resource('post', {
  fields: { ... , author: f.ref('user').owner() },
  policy: {
    list: 'public',
    read: 'public',
    create: 'authenticated',
    update: 'owner | admin',
    delete: 'owner | admin',
  },
});
```

## Tokens

| Token | Allows |
|---|---|
| `'public'` | Anyone, signed in or not |
| `'authenticated'` | Any signed-in user |
| `'owner'` | The record's owner (the resource's `.owner()` field). On `create` it always passes: you become the owner. |
| `'admin'`, `'editor'`, any other word | Users whose `roles` array contains that role |
| `'none'` | Nobody. The route still exists and answers 401, 403 or 404; to remove CRUD routes use the resource's `crud` option. |
| `(ctx) => boolean` | Your own rule (sync or async) |

Aliases: `'auth'` and `'user'` mean `'authenticated'`, `'self'` means `'owner'`, `'nobody'` means `'none'`, and `'role:editor'` is the same as `'editor'`.

## Combining

Alternatives are combined with `|`: the action is allowed if **any** of them allows it. You can also pass an array, which is how you mix strings and functions:

```js
const isPublished = ({ doc }) => doc?.status === 'published';

policy: {
  read: ['owner | editor | admin', isPublished],
}
```

Functions receive `{ user, action, doc, req }`. `doc` is the stored record for routes with an `:id`, and `undefined` for collection routes (`list`, `create`, custom routes without `:id`). Name your functions: the name is what `calm routes` and devtools display.

There is no "and". When you need one, write a function, or narrow what users can see with the service's [scope()](/docs/services#scope).

## Defaults

Leave an action out and it gets a default:

| Action | Default |
|---|---|
| `list`, `read` | `'authenticated'` |
| `create`, `update`, `delete` | `'owner \| admin'` when the resource has an owner field, `'admin'` otherwise |

Custom routes without a `policy` option default to `'authenticated'`. Both cases work, but `calm doctor` warns about them (`policy-defaulted`, `route-policy`) so the intent is written down.

## Owner scoping on lists

`'owner'` on `list` does not reject anyone who is signed in: it **filters**. `list: 'owner | admin'` lets admins list everything and everyone else only their own records:

```js
// app/resources/note/note.resource.js
export default resource('note', {
  fields: { text: f.string().required(), author: f.ref('user').owner() },
  policy: { list: 'owner', read: 'owner', create: 'authenticated', update: 'owner', delete: 'owner' },
});
```

```text
GET /api/notes   as Alice   -> only Alice's notes
GET /api/notes   as Bob     -> only Bob's notes
GET /api/notes   signed out -> 401
```

The same applies to custom routes without `:id`: with `policy: 'owner'`, `ctx.scope` is `'owner'` and service calls that receive `ctx` only see the user's records.

## 401, 403 or 404

For routes with an `:id`, CalmAPI first loads the record (through the service's `scope()`), then applies the policy with the record in hand. The answer is chosen so that private ids are never confirmed to people who cannot see them:

| Situation | Status |
|---|---|
| The route needs a signed-in user and there is no valid session | `401 UNAUTHORIZED` |
| The id is malformed, does not exist, or `scope()` hides it from this user | `404 NOT_FOUND` |
| The user may read the record but not do this (for example edit someone else's post) | `403 FORBIDDEN` |
| The user may not even read the record | `404 NOT_FOUND` |
| Collection routes (`list`, `create`, custom without `:id`): signed in but not allowed | `403 FORBIDDEN` |

With the post resource above, Bob gets `403` when he tries to edit Alice's published post (he can read it), but `404` for her notes, which he cannot read at all.

## Field-level policies

`.visibleTo(policy)` and `.writableBy(policy)` take the same tokens and are evaluated per record:

```js
fields: {
  email: f.email().required().visibleTo('owner | admin'),          // others do not see it
  roles: f.array(f.enum(['user', 'editor', 'admin'])).writableBy('admin'),
  internalRating: f.integer().visibleTo('editor | admin').writableBy('editor | admin'),
}
```

- A field a viewer may not see is left out of the response, including when the record is populated into another one with `?include=`.
- A field a user may not write answers `422` with `You are not allowed to set this field`. On create, `'owner'` passes (the creator becomes the owner).

## Roles

Roles are strings in the user's `roles` array. The `api` template allows `user` and `admin`; add your own to the enum in `user.resource.js`:

```js
roles: f.array(f.enum(['user', 'editor', 'admin'])).default(['user']).writableBy('admin').visibleTo('owner | admin').filterable(),
```

Then use them in policies (`'editor | admin'`) and in code with `hasRole(ctx.user, 'editor')` from `#calm`.

Users cannot give themselves roles: `roles` is `writableBy('admin')`, and `calm doctor` reports an error if the user resource has a writable `roles` field without a `writableBy` rule. To make your first admin, sign up normally, then:

```bash
npx calm admin ada@example.com            # add the admin role
npx calm admin ada@example.com --revoke   # remove it
```

After that, admins can change roles through `PATCH /api/users/:id`.

## Function policies in practice

```js
// Only the author, and only while the post is a draft.
const ownDraft = ({ user, doc }) => Boolean(user && doc && String(doc.author) === user.id && doc.status === 'draft');

// Only users with a verified flag (a boolean field you added to user.resource.js).
const verified = ({ user }) => user?.verified === true;

policy: {
  update: ['admin', ownDraft],
  create: [verified],
}
```

A function that returns `true` allows the action outright, without owner scoping. On `list` there is no `doc`, so filter lists with `scope()` in the service instead.

## Checking policies

```bash
npx calm routes
```

```text
  METHOD  PATH                           POLICY         FROM
  POST    /api/auth/login                public         calm/auth/index.js
  GET     /api/posts/featured            public         app/resources/post/post.routes.js
  POST    /api/posts/:id/publish         owner | admin  app/resources/post/post.routes.js
  GET     /api/posts                     public         app/resources/post/post.resource.js
  PATCH   /api/posts/:id                 owner | admin  app/resources/post/post.resource.js
  GET     /api/users                     admin          app/resources/user/user.resource.js
```

Defaulted policies are shown as `authenticated (default)`. The devtools **Routes** panel shows the same, with a filter for routes whose policy is not explicit.

To see the result of all your rules at once, open the devtools **Security** panel: the [exposure matrix](/docs/security#exposure-matrix) lists, for each resource, what anonymous visitors, signed-in users, owners, each custom role and admins may do, and which fields each of them can read and write. Then check that the running API agrees:

```bash
npx calm audit
```

[`calm audit`](/docs/audit) calls every route as every one of those personas on a throwaway database, and reports each answer that does not match the policy, owner-only lists that return other people's records, and fields that leak to someone who should not see them.
