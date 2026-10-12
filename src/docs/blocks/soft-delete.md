# Soft delete (soft-delete)

Opt-in soft delete per resource: `DELETE` marks a record as deleted instead of removing it, every query hides deleted records, and admins can list and restore them.

```bash
npx calm add soft-delete
```

| Adds | |
|---|---|
| Files | `app/blocks/soft-delete/index.js` |
| Routes, per enabled resource | `GET /api/<names>/trash`, `POST /api/<names>/:recordId/restore` (admin) |

## Enable it on a resource

```js
export default resource('note', {
  softDelete: true,
  fields: {
    text: f.string().required(),
    author: f.ref('user').owner(),
  },
  policy: { list: 'owner | admin', read: 'owner | admin', create: 'authenticated', update: 'owner | admin', delete: 'owner | admin' },
});
```

The block adds a hidden `deletedAt` date field to the resource and replaces its service's `remove()`:

- `DELETE /api/notes/:id` sets `deletedAt` and answers `204`, with the same policy checks and hooks (`beforeDelete`, `afterDelete`) as before.
- Every query (`find`, `findOne`, `countDocuments`, updates and aggregations) ignores records with a `deletedAt`, so they disappear from lists, reads, updates and includes.
- The usual `note.deleted` event is emitted, with `soft: true` in the payload.

## Trash and restore

| Route | Does |
|---|---|
| `GET /api/notes/trash` | Deleted notes, most recently deleted first (up to 100) |
| `POST /api/notes/:recordId/restore` | Clears `deletedAt` and returns the note. Emits `note.restored`. |

From code, `ctx.services.note.restore(id, ctx)` does the same.

## Reading deleted records yourself

Queries skip deleted records unless their filter mentions `deletedAt` or they pass the `withDeleted` option:

```js
const deleted = await this.model.find({ deletedAt: { $ne: null } }).lean();
const everything = await this.model.find({}).setOptions({ withDeleted: true }).lean();
```

Deleted records stay in the collection, including their unique values: a new record cannot reuse the email or slug of a soft-deleted one. Purge old ones with a scheduled [job](/blocks/jobs) if you need to.
