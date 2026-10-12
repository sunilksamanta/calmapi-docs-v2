# Security

## Reporting a vulnerability

Please report vulnerabilities **privately** through GitHub: open the [calmapi repository](https://github.com/sunilksamanta/calmapi), go to the **Security** tab and choose **Report a vulnerability**. Do not open a public issue. You will get an answer within a few days.

Include the CalmAPI version (`calm.lock`, or `npx calm --version`), what an attacker can do, and the smallest reproduction you can share.

## Supported versions

| Version | Status |
|---|---|
| 2.x | Supported |
| 1.x (0.x on npm) | Security advisories only. Please [migrate](/migrate-v1). |

## Advisories for code in your project

CalmAPI copies its code into your project, so `npm audit` cannot see problems in it. Instead, CalmAPI publishes advisories with a pattern that identifies affected code, and `calm doctor` matches them against your files:

```bash
npx calm doctor            # inside a CalmAPI 2 project
npx calmapi@next doctor    # inside a CalmAPI 1.x project
```

Each finding names the advisory and the fix. Fixes for framework files reach your project through [`calm upgrade`](/upgrading), which merges them into your copy without discarding your edits. Published advisories are listed on [Security advisories](/security-advisories).

## Secure by default

| Area | Default |
|---|---|
| Mode | Anything but `NODE_ENV=development` or `test` runs as production; production requires `APP_URL` and never runs devtools |
| Access | Every route has a policy; missing ones default to `authenticated` and are reported by doctor |
| Private ids | Records a user cannot read answer `404`, not `403`, so their ids are not confirmed |
| Input | Unknown, hidden and read-only fields are rejected (`422`); no silent type coercion |
| Request bodies | At most 1 MB, 20 levels deep and 10,000 values (see [JSON guard](#json-guard)) |
| Output | Hidden and write-only fields never leave the server, including through `?include=`; raw records returned from resource routes are serialized |
| Queries | Only declared filters, sorts and search fields; flat query parsing, so no operator injection; search input escaped |
| Sessions | Random opaque tokens, stored as SHA-256 hashes, bearer header only, revocable, expire automatically |
| Passwords | scrypt (`node:crypto`) with OWASP parameters, upgraded on login when you raise the cost; common passwords and passwords containing the user's email or name are refused |
| Sign-in | Rate limited per IP, and locked per account after 5 failed attempts (see [Authentication](/authentication#account-lockout)) |
| Password reset | Single-use hashed tokens, short expiry, same answer for unknown emails, all sessions revoked on use |
| Rate limits | Every `/api` route, with stricter limits on auth routes |
| Errors | Internal messages and stack traces never reach clients in production |
| Headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive CSP, CORP/COOP, HSTS in production; `X-Powered-By` removed |
| CORS | No browser origin allowed in production until you list them |
| Data at rest | Fields marked `.encrypted()` are stored as AES-256-GCM ciphertext (see [Encryption at rest](#encryption-at-rest)) |
| Uploads (blocks) | Type and size allowlists, content checks, random names, sandboxed downloads |
| Devtools | Development only, loopback only, `Host` checked, writes need a custom header (see [Devtools](/devtools#safety-model)) |
| Dependencies | Two runtime dependencies: `express` and `mongoose` |

## Encryption at rest

Mark a field `.encrypted()` and CalmAPI encrypts it with AES-256-GCM before it reaches MongoDB. It is decrypted when read through the model. A database dump, a backup or a copied replica only holds ciphertext. Your API, services, hooks and `?include=` all see the plain value, so nothing else changes.

```js
// app/resources/patient/patient.resource.js
import { resource, f } from '#calm';

export default resource('patient', {
  fields: {
    name: f.string().required().searchable(),
    nationalId: f.string().required().encrypted().visibleTo('owner | admin'),
    diagnosis: f.text().encrypted().visibleTo('owner | admin'),
    owner: f.ref('user').owner(),
  },
  policy: { list: 'owner | admin', read: 'owner | admin', create: 'authenticated', update: 'owner | admin', delete: 'admin' },
});
```

MongoDB stores a string like this, where every part after the key id is base64url:

```text
enc:v1:k1:<iv>:<tag>:<ciphertext>
```

The value is encrypted as JSON, so numbers, dates and arrays work as well as strings (a date comes back from the database as its ISO string). Encryption hides the value from the database, not from the API: combine it with `.visibleTo()` or `.hidden()` to decide who reads it.

Ciphertext cannot be queried. An encrypted field cannot also be `.filterable()`, `.sortable()`, `.searchable()`, `.unique()`, `.index()` or `.owner()`, and `f.ref()` and `f.id()` fields cannot be encrypted. Declaring one of these throws at boot:

```text
resource('patient'): "nationalId" is .encrypted() and cannot also be filterable (ciphertext cannot be queried)
```

### Keys

Keys come from the `CALM_ENCRYPTION_KEYS` environment variable: a comma separated list of `<id>:<key>` entries, where each key is 32 random bytes in base64. Generate one with `calm keygen`:

```bash
npx calm keygen            # print a new key line
npx calm keygen --write    # add it to .env
```

```text
CALM_ENCRYPTION_KEYS=k1:<32 random bytes, base64>

• Add this line to .env (and to your production secrets). Never commit it.
```

An app with `.encrypted()` fields refuses to start without keys:

```text
patient: fields nationalId, diagnosis are .encrypted() but CALM_ENCRYPTION_KEYS is not set. Run `npx calm keygen` and add the line to .env.
```

Set the same keys in every environment that reads the same database. Data encrypted with a key you lose cannot be decrypted. Tests need no setup: `createTestApp` uses `CALM_ENCRYPTION_KEYS` when it is set and a random key otherwise.

### Rotating keys

The first key in the list encrypts. Every key in the list decrypts. When `CALM_ENCRYPTION_KEYS` already exists, `calm keygen --write` puts a new key in front and keeps the old ones:

```text
$ npx calm keygen --write
✔ Rotated: k2 encrypts new data; k1 still decrypts existing data.
```

```ini
CALM_ENCRYPTION_KEYS=k2:<new key>,k1:<old key>
```

1. Deploy with both keys. New writes use `k2`, existing records still decrypt with `k1`.
2. Re-save records at your pace. A value is encrypted again with the first key whenever it is written, so updates rotate the fields they touch. To rotate everything, load and save each document:

   ```js
   // scripts/reencrypt.js: node scripts/reencrypt.js
   import { createApp } from '#calm';

   const app = await createApp();
   await app.start();
   for await (const doc of app.model('patient').find()) await doc.save();
   await app.stop();
   ```

3. Once no record uses the old key, remove it from the list.

## JSON guard

`bodyLimit` caps the size of a body (1 MB). On top of that, CalmAPI refuses JSON bodies that are nested deeper than 20 levels or hold more than 10,000 values, with `400 BAD_REQUEST` (`JSON body is nested deeper than 20 levels`). A small but deeply nested payload cannot make validation do unbounded work. Change the limits in `calm.config.js`:

```js
// calm.config.js
export default defineConfig({
  jsonLimits: { maxDepth: 20, maxKeys: 10_000 },
});
```

## Security events

Suspicious activity is emitted on the app's event bus as `security.*` events. The devtools **Security** panel lists them live, and you can forward them to your alerting.

| Event | When | Payload |
|---|---|---|
| `security.login_failed` | Wrong email or password | `{ email, ip, reason }`, `reason` is `unknown_email` or `wrong_password` |
| `security.account_locked` | An account reaches the [lockout](/authentication#account-lockout) limit | `{ email, ip, until }` |
| `security.locked_login_attempt` | A sign-in on a locked account | `{ email, ip }` |
| `security.invalid_token` | A bearer token that is unknown or expired | `{ ip, path }` |
| `security.password_change_failed` | Wrong current password on `POST /api/auth/password` | `{ userId, ip }` |
| `security.invalid_reset_token` | A reset token that is unknown, expired or used | `{}` |
| `security.rate_limited` | A client goes over a rate limit (once per window) | `{ ip, path, limiter }` |
| `security.forbidden` | A request fails with `403` | `{ userId, ip, method, path }` |
| `security.write_rejected` | A body tried to set a hidden, read-only, owner or `writableBy` field | `{ userId, ip, method, path, resource, fields }` |

Emails in these payloads are masked (`a***@example.com`). The [totp](/blocks/totp#security-events) block adds `security.2fa_*` events.

Listen with `calm.on()` in a plugin in `app/blocks/` (or with `app.events.on()` anywhere you hold the app):

```js
// app/blocks/security-alerts/index.js
import { definePlugin } from '#calm';

export default definePlugin({
  name: 'security-alerts',
  setup(calm) {
    calm.on('security.account_locked', ({ email, ip, until }) => {
      calm.log.warn(`Account ${email} locked until ${until.toISOString()}`, { ip });
    });
    calm.on('security.*', (payload, name) => {
      // forward to your monitoring, chat or SIEM
    });
  },
});
```

## Exposure matrix

CalmAPI computes, from your resource definitions alone, who can do what. For every resource and every persona (anonymous, a signed-in user, the record's owner, each custom role used in your policies, and admin), it lists which CRUD actions are allowed and which fields each persona can read and write. It is always in sync with the code, because it is derived from the same policies, `visibleTo` and `writableBy` rules the API enforces.

| Action cell | Meaning |
|---|---|
| `allow` | Allowed |
| `own` | Only records they own (an `'owner'` policy on `list`) |
| `deny` | Denied |
| `off` | The CRUD route is turned off with the resource's `crud` option |
| `custom` | A policy function decides, so the answer can depend on the data |

Field cells are `yes`, `no`, or `never` for fields no client can ever read (hidden, write-only) or write (hidden, read-only). Fields whose name looks like personal data (`email`, `phone`, `address`, `iban`, `salary`...) are flagged, and so are fields you mark with [`.pii()`](/resources#personal-data) (`nickname: f.string().pii()`).

You can see it in the devtools **Security** panel, through the `calm_security` [MCP tool](/ai-agents#calm-mcp-tools-for-coding-agents), and in code with `await app.exposure()`. [`calm audit`](/audit) checks the running API against it, and `calm doctor` turns it into findings:

| Id | Level | Finding |
|---|---|---|
| `pii-public` | warn | A field that looks like personal data that anyone can read |
| `pii-users` | info | The same, readable by every signed-in user on a resource that has an owner |
| `sensitive-unencrypted` | info | A field named like a national id, tax id, passport, IBAN, card or health data that is not `.encrypted()` |

## Testing your policies

Static checks tell you what the rules say. [`calm audit`](/audit) tells you what the API does: it boots your app on a throwaway database, signs up a user per persona, seeds records and calls every route as every persona. It checks status codes, owner-only lists, field leaks, mass assignment, query injection and token handling. Run it after changing policies or fields, and in CI.

## What calm doctor checks

`calm doctor` boots your app in a child process (without connecting to MongoDB) and combines several kinds of checks. Run it after changes, and in CI with `--ci` (add `--prod` to apply production rules).

**Runtime checks** (also live in the devtools Doctor panel):

| Id | Finding |
|---|---|
| `node-version` | Node.js older than 22.12 |
| `cors-wildcard` | CORS allows every origin in production |
| `rate-limit-off` | Rate limiting disabled |
| `trust-proxy` | `TRUST_PROXY` not set in production |
| `no-mail` | Auth enabled but no mail transport in production |
| `policy-defaulted` | A resource action without an explicit policy |
| `public-write` | `create`, `update` or `delete` open to `public` |
| `secret-exposed` | A field named like a secret (`password`, `token`, `apiKey`...) that the API returns |
| `unknown-ref` | A reference to a resource that does not exist |
| `user-email-unique` | `user.email` without `.unique()` |
| `roles-writable` | Users can set their own roles |
| `route-policy` | A custom route without an explicit policy |
| `pii-public`, `pii-users`, `sensitive-unencrypted` | Personal or sensitive data findings from the [exposure matrix](#exposure-matrix) |
| `env-<NAME>` | An environment variable a block [declares](/building-blocks#environment-variables) as required is not set: an error when it is needed now, an info in development for variables needed in production |
| (blocks) | Checks added by blocks, such as `totp-unencrypted`, `webhooks-failing` or `privacy-plan` |
| `doctor-hook` | A block's doctor check crashed |

**Static checks** on your files:

| Id | Finding |
|---|---|
| `secret-*` | A hardcoded credential in a source or config file: AWS access keys, private keys, Stripe live keys, GitHub, Slack and Resend tokens, MongoDB URIs with a password, and `apiKey = '...'` style assignments. The value is masked in the report. |
| `populate-without-select` | `.populate()` without a select, which returns whole referenced documents |
| `regex-from-input` | A `RegExp` built from request input |
| `weak-random` | `Math.random()` in a file that deals with tokens, codes or secrets |
| `raw-res-json` | A handler that writes the response itself instead of returning a value |
| `logs-secrets` | `console.log` of something that looks secret |
| `env-not-ignored` | `.env` missing from `.gitignore` |
| `env-committed` | `.env` tracked by git (when the project is a git repository) |
| `core-modified`, `core-missing` | Framework files changed or deleted locally (informational) |
| `upgrade` | `calm/` is older than the installed CLI |

The secrets scan reads `.js`, `.mjs`, `.cjs`, `.ts`, `.json`, `.yml` and `.yaml` files of the whole project, except `node_modules/`, `calm/`, `test/`, `coverage/`, `.calm/`, `package-lock.json` and `calm.lock`. The code patterns (`populate-without-select` to `logs-secrets`) apply to the files in `app/`.

**Dependencies**: with `--audit`, doctor also runs `npm audit` on production dependencies (`npm-audit`): an error for high or critical vulnerabilities, a warning for moderate ones.

**Advisories**: published CalmAPI advisories that match your files.

```bash
npx calm doctor --ci                    # exit 1 on errors
npx calm doctor --ci --strict           # also on warnings
npx calm doctor --prod --audit --ci     # production rules and npm audit, for CI
npx calm doctor --json                  # for scripts
```

```text
  CalmAPI doctor · my-api

  ✖ error  Looks like a Stripe live key in source code  app/routes.js:1
           Found "sk_liv…" Move it to an environment variable (.env, never committed) and rotate it: anything that reached git is compromised.
  ✖ error  .env is committed to git
           Remove it from the repository (git rm --cached .env), rotate every secret in it, and keep it in .gitignore.
  ! warn   customer.phone looks like personal data and anyone can read it
           Add .visibleTo('owner | admin') (or .hidden()) if it should stay private.
  • info   customer.taxId could be encrypted at rest
           Add .encrypted() so database dumps and backups only hold ciphertext.

  2 errors · 1 warning · 1 info
```

## Your part

CalmAPI's defaults cover the framework. These are up to you:

- Write a policy for every action and route, and review them with `npx calm routes` and the devtools **Security** panel.
- Mark everything private as `hidden()`, `writeOnly()` or `visibleTo()`, and check the devtools **Data** panel to see what each kind of user receives.
- Run `npx calm audit` after changing policies or fields, and in CI.
- Encrypt sensitive fields with `.encrypted()`, and keep `CALM_ENCRYPTION_KEYS` in your secret store, never in git.
- Keep `.env` out of git, and use separate database users and secrets per environment.
- Set `CORS_ORIGINS`, `TRUST_PROXY` and a mail transport in production.
- Keep dependencies up to date (`npx calm doctor --audit` runs `npm audit`) and run `calm upgrade` when CalmAPI releases fixes.
- Forward `security.*` events to your monitoring, and consider the [totp](/blocks/totp) block for two-factor authentication.
