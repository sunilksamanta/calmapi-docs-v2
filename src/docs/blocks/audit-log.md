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
