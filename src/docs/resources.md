# Resources and fields

A resource is a model, its API and its rules in one file. You declare fields once with `f.*()`, and CalmAPI derives the Mongoose schema, input validation, output visibility, the allowed list queries and the OpenAPI schema from them.

```js
// app/resources/product/product.resource.js
import { resource, f } from '#calm';

export default resource('product', {
  fields: {
    name: f.string().required().max(120).searchable().sortable(),
    price: f.number().required().min(0).filterable().sortable(),
    cost: f.number().hidden(),                       // stored, never returned
    status: f.enum(['draft', 'live']).default('draft').filterable(['eq', 'in']),
    category: f.ref('category').filterable(),
    tags: f.array(f.string().max(30)).max(10).default([]).filterable(),
    owner: f.ref('user').owner(),                    // set from the session
    supplierNote: f.string().visibleTo('owner | admin'),
  },
  policy: {
    list: 'authenticated',
    read: 'authenticated',
    create: 'authenticated',
    update: 'owner | admin',
    delete: 'owner | admin',
  },
});
```

Every record also gets `id`, `createdAt` and `updatedAt` (unless `timestamps: false`). These names are reserved: declaring a field called `id`, `_id`, `createdAt`, `updatedAt` or `__v` throws at boot.

## Field types

| Builder | Stored as | Accepts | Notes |
|---|---|---|---|
| `f.string()` | String | strings | Trimmed by default (`.trim(false)` to keep spaces) |
| `f.text()` | String | strings | Like `string`, not trimmed; for long text |
| `f.email()` | String | valid email | Trimmed and lowercased |
| `f.url()` | String | `http(s)://` URLs | Other schemes (`javascript:`) are rejected |
| `f.password()` | String | strings, 8 to 128 chars | Hashed with scrypt, never returned, cannot be changed with PATCH |
| `f.number()` | Number | finite numbers | `"5"` is rejected: no silent coercion of JSON strings |
| `f.integer()` | Number | whole numbers | |
| `f.boolean()` | Boolean | `true`, `false` | |
| `f.date()` | Date | ISO strings or epoch milliseconds | Returned as ISO strings |
| `f.enum(['a', 'b'])` | String | one of the values | |
| `f.id()` | ObjectId | 24-char hex id | An id that is not a reference |
| `f.ref('category')` | ObjectId | 24-char hex id | Reference to another resource, can be included |
| `f.array(f.string())` | Array | arrays | Every item is validated with the inner field |
| `f.object({ city: f.string() })` | Subdocument | objects | Unknown keys are rejected, no `_id` |
| `f.json()` | Mixed | any JSON | Not validated; only the `exists` filter applies |

`f.ref()` checks that the value is a well-formed id, not that the record exists. If that matters, check it in a service hook (`beforeCreate`).

```js
fields: {
  address: f.object({
    street: f.string().required(),
    city: f.string().required(),
    zip: f.string().pattern(/^\d{5}$/, 'Must be 5 digits'),
  }),
  coordinates: f.array(f.number()).min(2).max(2),
  launchedAt: f.date().min('2020-01-01'),
  settings: f.json().default({}),
}
```

## Modifiers

| Modifier | Effect |
|---|---|
| `.required(message?)` | Must be present on create (unless it has a default). Empty strings and `null` are rejected. |
| `.optional()` | Undo `required()` |
| `.default(value)` | Default value, or a function: `.default(() => new Date())`. Object defaults are cloned per record. |
| `.min(n, message?)` / `.max(n, message?)` | String length, number value, date bound or array item count |
| `.pattern(regex, message?)` | Strings must match |
| `.trim(on = true)`, `.lowercase()`, `.uppercase()` | Normalize strings before validation and storage |
| `.unique()` | Unique index; a duplicate answers `409 CONFLICT` |
| `.index()` | Plain index |
| `.check(fn, message?)` | Custom rule, sync or async: return `true`, or an error message string |
| `.schema(standardSchema)` | Validate with Zod, Valibot, ArkType or any [Standard Schema](https://standardschema.dev) library |
| `.describe(text)`, `.example(value)` | Description and example in the OpenAPI document |
| `.encrypted()` | Stored as AES-256-GCM ciphertext, decrypted on read (see [Encrypted fields](#encrypted-fields)) |

```js
fields: {
  sku: f.string().required().uppercase().pattern(/^[A-Z0-9-]{4,20}$/, 'Use 4 to 20 letters, digits or dashes').unique(),
  quantity: f.integer().min(0).check((n) => n % 6 === 0 || 'Sold in packs of 6'),
}
```

## Visibility and write rules

These decide what clients may send and what they get back. They apply to every response, including populated references, [realtime events](/blocks/realtime-sse) and [MCP tools](/blocks/mcp-server).

| Modifier | Returned | Accepted from clients | Typical use |
|---|---|---|---|
| `.hidden()` | never | never (422) | Internal data your service sets: costs, storage keys, flags |
| `.writeOnly()` | never | yes | Secrets the client sends but must not read back |
| `.readOnly()` | yes | never (422) | Values your service computes: slugs, totals, timestamps |
| `.immutable()` | yes | on create only (422 on update) | Email, account type |
| `.writableBy(policy)` | yes | only users matching the policy | `roles: ...writableBy('admin')` |
| `.visibleTo(policy)` | only to users matching the policy, per record | yes | `email: ...visibleTo('owner \| admin')` |

Hidden and write-only fields can never be filtered, sorted, selected with `?fields=` or included. Your service still sees them: hooks receive the full record (except password hashes), and API responses are serialized again on the way out.

`visibleTo` and `writableBy` take the same tokens as [policies](/policies), evaluated against each record. With `'owner'`, it means the owner of *that* record:

```js
// app/resources/user/user.resource.js (from the api template)
export default resource('user', {
  owner: '_id', // a user owns their own record
  fields: {
    name: f.string().required().max(100).searchable().sortable(),
    email: f.email().required().unique().immutable().filterable().visibleTo('owner | admin'),
    password: f.password().required(),
    roles: f.array(f.enum(['user', 'admin'])).default(['user']).writableBy('admin').visibleTo('owner | admin').filterable(),
    status: f.enum(['active', 'disabled']).default('active').writableBy('admin').filterable(),
    avatarUrl: f.url(),
  },
  policy: { list: 'admin', read: 'owner | admin', create: 'admin', update: 'owner | admin', delete: 'admin' },
});
```

## Encrypted fields

`.encrypted()` encrypts a value before it reaches MongoDB and decrypts it when it is read, so database dumps and backups only hold ciphertext while the API, your services and hooks see the plain value:

```js
fields: {
  nationalId: f.string().required().encrypted().visibleTo('owner | admin'),
  webhookSecret: f.string().encrypted().hidden(),
}
```

It needs `CALM_ENCRYPTION_KEYS` (create it with `npx calm keygen --write`). Encryption is about storage, not about who reads the field, so combine it with `.visibleTo()` or `.hidden()`. Ciphertext cannot be queried: an encrypted field cannot also be `.filterable()`, `.sortable()`, `.searchable()`, `.unique()`, `.index()` or `.owner()`, and `f.ref()` and `f.id()` fields cannot be encrypted. Keys and rotation are covered in [Security](/security#encryption-at-rest).

## Query modifiers

| Modifier | Lets clients |
|---|---|
| `.filterable(ops?)` | Filter with `?field=value` and `?field[op]=value`. Without `ops`, the defaults for the type apply (see [Querying](/querying#operators)). |
| `.sortable()` | Sort with `?sort=field` or `?sort=-field`. Also adds an index. |
| `.searchable()` | Be matched by `?q=text` (case-insensitive substring) |

Anything not marked cannot be used in a query: the request fails with `400` instead of silently scanning private data.

## Relations

| Modifier | Effect |
|---|---|
| `f.ref('user').owner()` | Marks the record's owner. Set to the signed-in user on create, read-only and indexed. Powers the `'owner'` policy. One per resource. |
| `.populate()` | Always populate this reference on reads, as if every request had `?include=<field>` |

A populated reference is serialized with the **target** resource's rules for the current viewer, so including `author` never leaks the author's email or password hash. Only fields that could ever be returned are loaded from the database in the first place.

For the `user` resource itself, `owner: '_id'` in the resource options says "a user owns their own record".

## Resource options

```js
resource('product-category', {
  fields: { ... },
  policy: { ... },
  path: '/categories',           // default: '/product-categories'
  collection: 'categories',      // default: 'product_categories'
  timestamps: true,              // createdAt / updatedAt (default true)
  defaultSort: '-createdAt',     // default; '_id' when timestamps is false
  crud: ['list', 'read'],        // which CRUD routes exist: true (all, default), false, or a list
  indexes: [{ fields: { status: 1, createdAt: -1 } }, { fields: { name: 'text' } }],
  owner: '_id',                  // owner field when it is not an f.ref('user').owner() field
  description: 'Product groups', // used in MCP tool descriptions (mcp-server block)
  schemaPlugins: [myMongoosePlugin],
});
```

Names are normalized: `resource('ProductCategory')` and `resource('product-category')` both become `product-category`, served at `/api/product-categories`, stored in `product_categories`, and reachable as `ctx.services.productCategory` or `ctx.services['product-category']`.

Any other key (for example `softDelete: true` or `audit: false`) is kept in `def.options`, where [blocks](/blocks) can read it.

## The CRUD routes

| Route | Action | Success | Body |
|---|---|---|---|
| `GET /api/products` | `list` | `200` | `{ data: [...], meta: { total, page, limit, pages } }` |
| `GET /api/products/:id` | `read` | `200` | `{ data }` |
| `POST /api/products` | `create` | `201` | `{ data }` |
| `PATCH /api/products/:id` | `update` | `200` | `{ data }` (partial update) |
| `PUT /api/products/:id` | `update` | `200` | alias of PATCH, hidden from OpenAPI |
| `DELETE /api/products/:id` | `delete` | `204` | empty |

Errors follow one shape (see [Errors](/errors)): `401` when a signed-in user is required, `403` or `404` depending on what the user may see (see [Policies](/policies#401-403-or-404)), `404` for malformed or unknown ids, `422` for invalid bodies and `409` for duplicates on unique fields.

On update, `null` clears an optional field; sending `null` for a required field is a `422`.

## Unknown fields are rejected

Bodies are checked against the fields, so clients cannot write what you did not declare:

```bash
curl -X POST http://localhost:5001/api/products -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Hammer","price":"20","cost":1,"owner":"6acb46a57e4a738ebdd998b9","role":"admin"}'
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "requestId": "8a3c1f4e-6d6b-4a0e-9a57-1f2f5b3a9c11",
    "details": {
      "price": "Must be a number",
      "cost": "Is read-only",
      "owner": "Is read-only",
      "role": "Unknown field"
    }
  }
}
```

The messages per field are:

| Message | Cause |
|---|---|
| `Unknown field` | Not declared (set `unknownFields: 'strip'` in config to drop them silently instead) |
| `Is read-only` | `hidden()`, `readOnly()` or an `owner()` field |
| `Cannot be changed after creation` | `immutable()` field in an update |
| `You are not allowed to set this field` | `writableBy()` policy not met |
| `Use POST /api/auth/password (or the reset flow) to change passwords` | Password field in an update |
| `Is required`, `Must be ...`, your own messages | Validation rules |

`id`, `createdAt` and `updatedAt` in a body are ignored, so a client can send back a record it received.

## Standard Schema

Use any [Standard Schema](https://standardschema.dev) validator (Zod 3.24+, Valibot, ArkType...) for rules the built-ins do not cover. It runs after the built-in checks, and its output replaces the value, so transforms work:

```js
import { z } from 'zod'; // npm install zod

fields: {
  website: f.string().schema(z.string().url().endsWith('.org')),
  slug: f.string().schema(z.string().transform((s) => s.toLowerCase().replace(/\s+/g, '-'))),
}
```

Custom routes accept a Standard Schema as their `input` too (see [Custom routes](/routes#validating-input)). The other way round, `standardSchema(def, mode)` exposes a resource's own input rules as a Standard Schema, for scripts or tests that should validate exactly like the API:

```js
import { standardSchema } from '#calm';
import product from '#app/resources/product/product.resource.js';

const result = await standardSchema(product, 'create')['~standard'].validate({ name: 'Saw' });
// { issues: [{ message: 'Is required', path: ['price'] }] }
```

## OpenAPI

The running app serves an OpenAPI 3.1 document at `/api/openapi.json`, generated from fields, policies and route options. Each resource has three schemas (`Product`, `ProductCreate`, `ProductUpdate`); hidden and write-only fields never appear in the output schema. Write it to a file with `npx calm openapi`, or add the [api-docs](/blocks/api-docs) block for an interactive reference.
