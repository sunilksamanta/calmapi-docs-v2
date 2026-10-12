# Blocks

Blocks are production features you add with one command. Like [shadcn/ui](https://ui.shadcn.com) components, they are **copied into your project** as source code: you read them, own them and change them. There is no runtime package to keep up with.

```bash
npx calm add jobs
```

```text
  Blocks
  + @calmapi/jobs v1.0.0 · @calmapi (bundled)
    Background jobs and cron on MongoDB (no Redis): retries with backoff, schedules, event triggers, admin API and a devtools panel.

  Files
  create    app/blocks/jobs/cron.js
  create    app/blocks/jobs/index.js
  create    app/blocks/jobs/queue.js
  create    app/jobs/welcome-email.js

  Environment (.env.example and .env)
  + JOBS_WORKER=on
  + JOBS_CONCURRENCY=4

? Apply these changes? [Y/n]
```

`calm add` writes the files, adds npm dependencies to `package.json` and installs them, appends environment variables to `.env.example` and `.env` (without touching values you already have), records the block in `calm.lock`, and prints the block's notes. Restart (or let `npm run dev` restart) and the block is live: every folder in `app/blocks/` with an `index.js` is loaded at boot.

## Official blocks

| Block | What you get |
|---|---|
| [jobs](/blocks/jobs) | MongoDB job queue and cron (no Redis): retries, schedules, event triggers, admin API |
| [storage-local](/blocks/storage-local) | Uploads to disk with type and size allowlists, magic-byte checks and safe downloads |
| [storage-s3](/blocks/storage-s3) | Direct-to-S3 uploads with presigned URLs (AWS S3, Cloudflare R2, MinIO) |
| [realtime-sse](/blocks/realtime-sse) | Live resource events, filtered per subscriber by the same policies |
| [mcp-server](/blocks/mcp-server) | Your resources as MCP tools for AI agents, enforced by your API's rules |
| [audit-log](/blocks/audit-log) | Who changed what, with field diffs (private values never logged) |
| [soft-delete](/blocks/soft-delete) | `softDelete: true` per resource, with trash and restore |
| [totp](/blocks/totp) | Two-factor authentication with authenticator apps, recovery codes and replay protection |
| [api-docs](/blocks/api-docs) | Interactive API reference at `/docs` |
| [mail-resend](/blocks/mail-resend) / [mail-smtp](/blocks/mail-smtp) | Email delivery |
| [push-expo](/blocks/push-expo) / [push-fcm](/blocks/push-fcm) | [Push notification](/push-notifications) delivery through Expo or Firebase Cloud Messaging |
| [rate-limit-mongo](/blocks/rate-limit-mongo) | Rate limits shared across instances |

```bash
npx calm add --list                 # official blocks
npx calm add jobs audit-log         # several at once
npx calm add jobs --dry-run         # show the plan, write nothing
```

## Where blocks come from

An address is resolved like this:

| Address | Source |
|---|---|
| `jobs` or `@calmapi/jobs` | The official registry. The CLI carries a copy of it, so this works offline. `--remote` fetches `https://docs.calmapi.dev/r/jobs.json` instead. |
| `@acme/billing` | The `@acme` registry declared in your `package.json` |
| `https://example.com/r/thing.json` | Any URL |
| `./blocks/thing.json` | A local file |

Registries are declared in `package.json`:

```json
{
  "calm": {
    "registries": { "@acme": "https://acme.dev/r/{name}.json" }
  }
}
```

The official registry is served as JSON at [https://docs.calmapi.dev/r/index.json](/r/index.json), one file per block (for example [/r/jobs.json](/r/jobs.json)), in the [shadcn registry-item format](https://ui.shadcn.com/docs/registry). See [Publishing your own block](/publishing-blocks).

## Safety rules

- A block can only write inside your project, never to `calm/` or `calm.lock`.
- Existing files with different content are kept and reported as **conflicts**; pass `--overwrite` to replace them.
- Blocks that provide the same resource refuse to be installed together (`storage-local` and `storage-s3` both provide `file`).
- `registryDependencies` are installed first; dependencies already in `package.json` are left as they are.
- Review third-party blocks before adding them: they run in your app with full access, like any code you paste.

## After adding a block

The block's code is now in your project, and it is yours. Change it, delete parts you do not need, or remove the block by deleting its folder (and its entry in `calm.lock`). Re-running `calm add <block>` later shows which files differ from the current upstream version. `calm upgrade` never touches block files.
