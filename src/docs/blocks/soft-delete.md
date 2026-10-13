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

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/soft-delete/AGENTS.md` and in the devtools Blocks panel.

- [Mongoose: Middleware](https://mongoosejs.com/docs/middleware.html)
- [Mongoose: Plugins](https://mongoosejs.com/docs/plugins.html)
- [Mongoose: Query API](https://mongoosejs.com/docs/api/query.html)
- [MongoDB partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/)
- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)

## For AI agents

Coding agents read these notes in `app/blocks/soft-delete/AGENTS.md`:

- Read first: `app/blocks/soft-delete/index.js` (about 90 lines).
- Enable per resource: `resource('post', { softDelete: true, ... })`. That adds a hidden `deletedAt` field and a schema plugin that hides deleted records, replaces `service.remove` and adds `service.restore`. No other configuration.
- Routes for enabled resources: `DELETE /api/<path>/:id` sets `deletedAt`; admins get `GET /api/<path>/trash` (last 100) and `POST /api/<path>/:recordId/restore`.
- Query rule: `find`, `findOne`, `countDocuments`, `findOneAndUpdate`, `updateOne`, `updateMany` and `aggregate` skip records with `deletedAt` set, unless the filter mentions `deletedAt` or the query has the `withDeleted: true` option (`Model.find(filter).setOptions({ withDeleted: true })`).
- Not covered: `deleteOne`, `deleteMany`, `findOneAndDelete`, `distinct`, `estimatedDocumentCount`, raw `model.collection` calls and `$lookup` from other collections still see deleted records. Add `deletedAt: null` yourself there.
- Invariant: `deletedAt` stays `.hidden()`, and the trash and restore routes stay admin only.
- Events: remove emits `<name>.deleted` with `soft: true` (audit-log, webhooks and realtime-sse treat it as a delete); restore emits `<name>.restored`.
- Pitfall: `beforeDelete`/`afterDelete` hooks still run on a soft delete. The storage blocks' `FileService.afterDelete` removes the stored bytes, so do not enable soft delete on `file` without moving that cleanup.
- Pitfall: unique indexes still count deleted records (a deleted slug blocks a new one). Include `deletedAt` in the unique index, or restore instead of recreating.
- Purging: nothing removes old soft deleted records. Add a TTL index on `deletedAt` (`indexes: [{ fields: { deletedAt: 1 }, options: { expireAfterSeconds: 30 * 86400 } }]`) or a job.
- Privacy: soft deleted records are still personal data; the privacy block exports and erases them through raw collection calls.

<!-- block-guide:end -->
