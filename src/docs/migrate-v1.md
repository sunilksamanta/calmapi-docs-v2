# Migrating from CalmAPI 1.x

CalmAPI 2 keeps the idea of 1.x (the framework code lives in your project) and replaces almost everything else: ESM, Express 5, resources instead of six files per module, policies, opaque sessions, devtools and an upgrade path. There is no in-place upgrade. You create a 2.0 project and move your modules over; most modules shrink to one or two files.

## Step 0: check your 1.x project first

Inside your 1.x project, run the doctor from the new CLI:

```bash
npx calmapi@next doctor
```

It checks the project against the advisories published for 1.x templates and prints the fix for each finding. Apply those fixes to the 1.x app running in production before you start migrating.

## Concept map

| 1.x | 2.0 |
|---|---|
| `src/modules/x/x.model.js` + `x.dto.js` (Get/Insert/Update DTOs) | `app/resources/x/x.resource.js`: fields with `f.*()`, validation and visibility in one place |
| `x.controller.js` (CalmController, autoBind, try/catch) | Gone: CRUD is generated. Custom endpoints go in `x.routes.js` and return values. |
| `x.service.js` (CalmService) | `x.service.js` extending `ResourceService`, with hooks (`beforeCreate`, `scope`...) |
| `x.route.js` + `AuthController.checkLogin` | `policy: { list, read, create, update, delete }`, and `{ policy }` on custom routes |
| `x.settings.js` (`moduleRoute`) | `resource('x', { path: '/custom-path' })` |
| `populateFields` | `f.ref('user').populate()` or `?include=author`, serialized with the target's rules |
| `system/` | `calm/`, upgradeable with `calm upgrade` |
| `calmapi generate module x` | `calm make resource x field:type ...` |
| `src/configs/config.js` | `calm.config.js` + `.env` |
| JWT tokens in the `auth` collection | Opaque session tokens, hashed, in `calm_sessions` |
| `media` module (S3) | `calm add storage-s3` (presigned uploads) or `calm add storage-local` |
| CommonJS (`require`) | ESM (`"type": "module"`), imports via `#calm` and `#app/*` |

### A module, before and after

In 1.x a post module is six files: a Mongoose model class, three DTO classes, a controller, a service, a router and settings. In 2.0:

```js
// app/resources/post/post.resource.js
import { resource, f } from '#calm';

export default resource('post', {
  fields: {
    title: f.string().required().max(200).searchable().sortable(),
    slug: f.string().readOnly().unique().filterable(),     // was set by a pre('save') hook
    content: f.text().required(),
    createdBy: f.ref('user').owner(),                      // was set by the controller
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

```js
// app/resources/post/post.service.js
import { ResourceService } from '#calm';

export default class PostService extends ResourceService {
  async beforeCreate(data) {
    return { ...data, slug: slugify(data.title) }; // your slug helper
  }
}
```

`updatedBy` has no direct equivalent; set it in `beforeUpdate` from `ctx.user.id` if you need it, or add the [audit-log](/docs/blocks/audit-log) block for a full history. Keep the existing field names so the stored documents still match.

## API changes your clients will see

| | 1.x | 2.0 |
|---|---|---|
| Success | `{ error: false, status: true, statusCode, responseTimestamp, data, totalCount }` | `{ data }`; lists add `meta: { total, page, limit, pages }` |
| Errors | `{ error: true, name, message, statusCode }` | `{ error: { code, message, details?, requestId } }` |
| Status codes | `200` for every success | `201` on create, `204` on delete, specific 4xx codes |
| Ids | `_id` | `id` |
| Pagination | `skip`, `limit` | `page`, `limit` (max 100 by default) |
| Sorting | `sortBy=-createdAt` | `sort=-createdAt,title` (only `.sortable()` fields) |
| Filters | any field | only `.filterable()` fields: `status=x`, `price[gte]=10`, `tags[in]=a,b` |
| Updates | `PUT /:id` | `PATCH /:id` (PUT still works as an alias) |
| Auth header | `Authorization: Bearer <jwt>` | `Authorization: Bearer <session token>`, header only |
| Login response | `{ token, user }` | `{ data: { token, expiresAt, user } }` |
| Password reset | 6-digit code | Emailed single-use link (`/api/auth/password/forgot`, `/api/auth/password/reset`) |

See [Errors](/docs/errors) and [Querying](/docs/querying) for the details.

## Authentication changes

- **Users sign in again.** 1.x issued JWTs; 2.0 uses opaque session tokens stored as hashes in `calm_sessions`. Existing tokens are not accepted, so every user logs in once after the switch.
- **Password hashes.** 1.x stored bcrypt hashes; 2.0 uses scrypt. Either ask existing users to use "forgot password" once, or add bcrypt verification to `calm/auth/password.js` (it is your code) and let the rehash on login move them to scrypt.
- **Reset flow.** The reset email now contains a link to your frontend (`auth.resetUrl`, default `${APP_URL}/reset-password?token=...`). Build that page; it posts `{ token, password }` to `/api/auth/password/reset`.
- **Roles.** Use a `roles` array on the user (`['user', 'admin']`) and role names in policies.

## Step by step

1. **Create the project** and point it at a copy of your database:

   ```bash
   npm create calmapi@latest my-api-v2
   ```

   Set `MONGODB_URI` in `.env`. Keep collection names (`collection: 'posts'`) when they differ from the defaults.

2. **Recreate each module as a resource**: `npx calm make resource <name> ...fields`, then copy the types from the 1.x model. Mark visibility from your DTOs: what your GetDTO left out becomes `.hidden()` or `.writeOnly()`, and what InsertDTO and UpdateDTO left out becomes `.readOnly()`.

3. **Write explicit policies** for every action. Decide who may list, read and change each kind of record, and mark the creator field with `f.ref('user').owner()` so `'owner'` policies work.

4. **Move custom controller methods** into `<name>.routes.js` (return values, no `res`) and business logic into the service.

5. **Move the user model** into `app/resources/user/user.resource.js` and decide how existing passwords are handled (see above).

6. **Check and test**:

   ```bash
   npx calm doctor
   npx calm routes
   npm test
   ```

7. **Update your frontend** for the new response shape, status codes, pagination and auth.

8. **Switch over** and let users sign in again.

Questions are welcome in [GitHub Discussions](https://github.com/sunilksamanta/calmapi/discussions). The [1.x documentation](/v1) stays available while you migrate.
