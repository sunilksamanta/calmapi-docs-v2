# Audit log (audit-log)

Records who created, updated or deleted what, and when, with a field-level diff. Hidden, write-only and password fields are never written to the log: only the fact that they changed.

```bash
npx calm add audit-log
```

| Adds | |
|---|---|
| Files | `app/blocks/audit-log/index.js` |
| Environment | `AUDIT_RETENTION_DAYS=365` |
| Collection | `calm_audit_log` (entries expire after the retention period) |
| Route | `GET /api/audit-log` (admin) |

Every resource write is recorded automatically, because the block listens to the `<resource>.created`, `.updated` and `.deleted` events that services emit. That includes writes from jobs and scripts that go through services.

## Reading the log

```bash
curl -g "http://localhost:5001/api/audit-log?resource=post&recordId=6acb46a57e4a738ebdd998b4" -H "Authorization: Bearer $ADMIN_TOKEN"
```

```json
{
  "data": [
    {
      "id": "6acb5b2f7e4a738ebdd998e1",
      "user": { "id": "6acb46a57e4a738ebdd998b1", "name": "Ada Lovelace" },
      "action": "updated",
      "resource": "post",
      "recordId": "6acb46a57e4a738ebdd998b4",
      "changes": {
        "title": { "from": "Hello CalmAPI", "to": "Hello again" },
        "internalNote": { "changed": true }
      },
      "requestId": "3e0c7a51-1d4b-4a9c-8f55-6f2d0b1c9e27",
      "ip": "127.0.0.1",
      "at": "2026-10-11T09:02:11.204Z"
    }
  ]
}
```

Filters: `resource`, `recordId`, `action` (`created`, `updated`, `deleted`), `user` (a user id) and `limit` (default 50, at most 200). Entries are newest first.

## Options

- Exclude a resource with `audit: false` in its options: `resource('session-note', { audit: false, fields: { ... } })`.
- Change the retention with `AUDIT_RETENTION_DAYS`. It is the TTL of an index, so once the index exists, changing the value also means updating that index in MongoDB (`collMod`).
- The model is available as `app.ext.audit` for your own queries or an export job.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/audit-log/AGENTS.md` and in the devtools Blocks panel.

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Logging Vocabulary Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)
- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [Mongoose: populate](https://mongoosejs.com/docs/populate.html)

## For AI agents

Coding agents read these notes in `app/blocks/audit-log/AGENTS.md`:

- Read first: `app/blocks/audit-log/index.js` (under 80 lines).
- What it does: a `calm.on('*')` listener records every `<resource>.created|updated|deleted` event into `calm_audit_log` as `{ action, resource, recordId, user, changes, requestId, ip, at }`. `app.ext.audit` is the Mongoose model.
- Reading: `GET /api/audit-log` (policy `admin`) with `resource`, `recordId`, `action`, `user` and `limit` (max 200) query filters.
- Configuration: env `AUDIT_RETENTION_DAYS` (default 365) sets the TTL index on `at`. No `calm.config.js` options. MongoDB keeps the old `expireAfterSeconds` of an existing index, so changing the value later needs a `collMod` (or dropping the `at_1` index).
- Invariant: `diff()` stores values only for fields with `field.isOutput`; hidden, write-only and password fields are recorded as `{ changed: true }`. Never store raw values of those fields, and never log `payload.doc`.
- Invariant: the read route stays admin only: entries hold previous values of visible fields.
- Opt a resource out: `resource('x', { audit: false, ... })`.
- Only writes that go through resource services emit events. `model.updateOne()` or `model.collection` calls are not audited: use `ctx.service` or `app.services` for writes that must appear in the trail.
- Custom entry (for example a login or an export): `await app.ext.audit.create({ action, resource, recordId, user, changes })`; `action` must be `created`, `updated` or `deleted` (schema enum).
- Privacy: the privacy block erases accounts without per record events on purpose. To also remove a deleted user's audit entries, add `calm_audit_log: 'user'` to `blocks.privacy.alsoDelete` if your retention policy allows it.
- Pitfall: `requestId` and `ip` come from `currentRequest()`, so writes made by jobs or scripts have none.
- Pitfall: the listener runs on every event; keep it cheap, and add an index before adding a new query filter (existing: `resource + recordId + at`, `user + at`).

<!-- block-guide:end -->
