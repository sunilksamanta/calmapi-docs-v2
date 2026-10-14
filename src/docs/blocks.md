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

There are 35, each with its own page here and its own guide in the project after you add it (below).

| Block | What you get |
|---|---|
| **Users and access** | |
| [api-keys](/blocks/api-keys) | Personal and service API keys with scopes, hashed at rest, expiry and revoke |
| [magic-link](/blocks/magic-link) | Passwordless sign-in by email, bound to the browser that asked |
| [totp](/blocks/totp) | Two-factor authentication with authenticator apps, recovery codes and replay protection |
| [privacy](/blocks/privacy) | Users export their data and delete their account (delete, anonymize or keep per resource) |
| [oauth](/blocks/oauth) | Sign in with Google, GitHub or any OpenID Connect provider: PKCE, verified ID tokens, safe account linking |
| [teams](/blocks/teams) | Organizations, roles, invitations and team-scoped resources with strict isolation |
| [email-verification](/blocks/email-verification) | Verify emails after sign-up and changes; a `verified` policy |
| [captcha](/blocks/captcha) | Turnstile, hCaptcha or reCAPTCHA v3 on sign-up, sign-in and reset |
| **Messaging** | |
| [notifications](/blocks/notifications) | `ctx.notify()`: in-app inbox, push and email in one call, with preferences and quiet hours |
| [push-expo](/blocks/push-expo) / [push-fcm](/blocks/push-fcm) | [Push notification](/push-notifications) delivery through Expo or Firebase Cloud Messaging, alone or together |
| [mail-resend](/blocks/mail-resend) / [mail-smtp](/blocks/mail-smtp) / [mail-postmark](/blocks/mail-postmark) | Email delivery |
| [webhooks](/blocks/webhooks) | Outgoing webhooks for resource events: signed, retried, logged, SSRF safe |
| [realtime-sse](/blocks/realtime-sse) | Live resource events, filtered per subscriber by the same policies |
| [sms-twilio](/blocks/sms-twilio) | SMS and phone verification with hashed one-time codes |
| [slack](/blocks/slack) | App events and security alerts to Slack, escaped and digested |
| **Data and files** | |
| [storage-local](/blocks/storage-local) | Uploads to disk with type and size allowlists, magic-byte checks and safe downloads |
| [storage-s3](/blocks/storage-s3) | Direct-to-S3 uploads with presigned URLs (AWS S3, Cloudflare R2, MinIO) |
| [audit-log](/blocks/audit-log) | Who changed what, with field diffs (private values never logged) |
| [soft-delete](/blocks/soft-delete) | `softDelete: true` per resource, with trash and restore |
| [export](/blocks/export) | Streamed CSV, NDJSON or JSON exports and validated imports |
| [search-meilisearch](/blocks/search-meilisearch) | Full-text search that never shows what the caller cannot read |
| **Running in production** | |
| [jobs](/blocks/jobs) | MongoDB job queue and cron (no Redis): retries, schedules, event triggers, admin API |
| [feature-flags](/blocks/feature-flags) | Kill switches, gradual rollouts, targeting, variants and route gates |
| [idempotency](/blocks/idempotency) | The `Idempotency-Key` header: safe retries for payments and other writes |
| [rate-limit-mongo](/blocks/rate-limit-mongo) | Rate limits shared across instances |
| [cache](/blocks/cache) | Per-identity response caching with invalidation, ETag and 304 |
| [sentry](/blocks/sentry) | Errors to Sentry without the SDK, secrets scrubbed |
| [maintenance](/blocks/maintenance) | Maintenance and read-only modes, scheduled windows |
| **Payments and growth** | |
| [payments-stripe](/blocks/payments-stripe) | Stripe Checkout, subscriptions and the customer portal, verified webhooks, plan-gated routes |
| [waitlist](/blocks/waitlist) | Launch waitlist with referral codes and invite-only registration |
| **APIs and agents** | |
| [api-docs](/blocks/api-docs) | Interactive API reference at `/docs` |
| [mcp-server](/blocks/mcp-server) | Your resources as MCP tools for AI agents, enforced by your API's rules |

```bash
npx calm add --list                 # official blocks
npx calm add jobs audit-log         # several at once
npx calm add jobs --dry-run         # show the plan, write nothing
npx calm block list                 # blocks in this project, and the files you changed
```

The devtools **Blocks** panel shows every installed block: where it came from, the files you changed since, what it hooks into, its environment variables (set or missing), its routes, links to the official documentation of what it integrates, and its instructions for AI agents.

## Each block brings its own guide

Every block is added with an `app/blocks/<name>/AGENTS.md` next to its code: the rules it must keep, its options, common tasks, and links to the official documentation of the service it integrates (Stripe, Twilio, Slack, OpenID Connect, OWASP...). The project's `AGENTS.md` tells coding agents to read it before they change the block, so they follow the provider's documentation rather than memory. It comes from the `links` and `agents` fields of the block's `block.json`; see [Agents and links](/building-blocks#agents-and-links-the-blocks-own-guide).

## Where blocks come from

An address is resolved like this:

| Address | Source |
|---|---|
| `jobs` or `@calmapi/jobs` | The official registry. The CLI carries a copy of it, so this works offline. `--remote` fetches `https://docs.calmapi.dev/r/jobs.json` instead. |
| `gh:acme/blocks/billing` | `r/billing.json` in a GitHub repository, what `calm block pack` writes. Add `@v1.2.0` (or a branch or commit) to pin it. |
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

The official registry is served as JSON at [https://docs.calmapi.dev/r/index.json](/r/index.json), one file per block (for example [/r/jobs.json](/r/jobs.json)), in the [shadcn registry-item format](https://ui.shadcn.com/docs/registry). To write and share your own, see [Building your own block](/building-blocks) and [Publishing your own block](/publishing-blocks).

## Safety rules

- A block can only write inside your project, never to `calm/` or `calm.lock`.
- Existing files with different content are kept and reported as **conflicts**; pass `--overwrite` to replace them.
- Blocks that provide the same resource refuse to be installed together (`storage-local` and `storage-s3` both provide `file`).
- `registryDependencies` are installed first; dependencies already in `package.json` are left as they are.
- Blocks can declare the oldest CalmAPI they work with (`minVersion`); older projects are asked to run `calm upgrade` first.
- Blocks that are not official are reviewed before anything is written: `calm add` lists in plain language what their code does (network requests, file writes, child processes, `eval`, request hooks, the environment variables it reads, the hosts it mentions). Risky findings must be confirmed, and with `--yes` they also need `--trust`. A block runs in your app with full access, like any code you paste, so read it. See [What people see before installing](/building-blocks#what-people-see-before-installing).

## After adding a block

The block's code is now in your project, and it is yours. Change it, delete parts you do not need, or remove the block by deleting its folder (and its entry in `calm.lock`). Re-running `calm add <block>` later shows which files differ from the current upstream version. `calm upgrade` never touches block files.
