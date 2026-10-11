# Security

## Reporting a vulnerability

Please report vulnerabilities **privately** through GitHub: open the [calmapi repository](https://github.com/sunilksamanta/calmapi), go to the **Security** tab and choose **Report a vulnerability**. Do not open a public issue. You will get an answer within a few days.

Include the CalmAPI version (`calm.lock`, or `npx calm --version`), what an attacker can do, and the smallest reproduction you can share.

## Supported versions

| Version | Status |
|---|---|
| 2.x | Supported |
| 1.x (0.x on npm) | Security advisories only. Please [migrate](/docs/migrate-v1). |

## Advisories for code in your project

CalmAPI copies its code into your project, so `npm audit` cannot see problems in it. Instead, CalmAPI publishes advisories with a pattern that identifies affected code, and `calm doctor` matches them against your files:

```bash
npx calm doctor            # inside a CalmAPI 2 project
npx calmapi@next doctor    # inside a CalmAPI 1.x project
```

Each finding names the advisory and the fix. Fixes for framework files reach your project through [`calm upgrade`](/docs/upgrading), which merges them into your copy without discarding your edits. Published advisories are listed on [Security advisories](/docs/security-advisories).

## Secure by default

| Area | Default |
|---|---|
| Mode | `NODE_ENV` defaults to `production`; production requires `APP_URL` and never runs devtools |
| Access | Every route has a policy; missing ones default to `authenticated` and are reported by doctor |
| Private ids | Records a user cannot read answer `404`, not `403`, so their ids are not confirmed |
| Input | Unknown, hidden and read-only fields are rejected (`422`); no silent type coercion |
| Output | Hidden and write-only fields never leave the server, including through `?include=`; raw records returned from resource routes are serialized |
| Queries | Only declared filters, sorts and search fields; flat query parsing, so no operator injection; search input escaped |
| Sessions | Random opaque tokens, stored as SHA-256 hashes, bearer header only, revocable, expire automatically |
| Passwords | scrypt (`node:crypto`) with OWASP parameters, upgraded on login when you raise the cost |
| Password reset | Single-use hashed tokens, short expiry, same answer for unknown emails, all sessions revoked on use |
| Rate limits | Every `/api` route, with stricter limits on auth routes |
| Errors | Internal messages and stack traces never reach clients in production |
| Headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive CSP, CORP/COOP, HSTS in production; `X-Powered-By` removed |
| CORS | No browser origin allowed in production until you list them |
| Uploads (blocks) | Type and size allowlists, content checks, random names, sandboxed downloads |
| Devtools | Development only, loopback only, `Host` checked, writes need a custom header (see [Devtools](/docs/devtools#safety-model)) |
| Dependencies | Two runtime dependencies: `express` and `mongoose` |

## What calm doctor checks

`calm doctor` boots your app in a child process (without connecting to MongoDB) and combines three kinds of checks. Run it after changes, and in CI with `--ci` (add `--prod` to apply production rules).

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
| (blocks) | Checks added by blocks, such as a missing `S3_BUCKET` or `RESEND_API_KEY` |

**Static checks** on the files in `app/`:

| Id | Finding |
|---|---|
| `populate-without-select` | `.populate()` without a select, which returns whole referenced documents |
| `regex-from-input` | A `RegExp` built from request input |
| `weak-random` | `Math.random()` in a file that deals with tokens, codes or secrets |
| `raw-res-json` | A handler that writes the response itself instead of returning a value |
| `logs-secrets` | `console.log` of something that looks secret |
| `env-not-ignored` | `.env` missing from `.gitignore` |
| `core-modified`, `core-missing` | Framework files changed or deleted locally (informational) |
| `upgrade` | `calm/` is older than the installed CLI |

**Advisories**: published CalmAPI advisories that match your files.

```bash
npx calm doctor --ci            # exit 1 on errors
npx calm doctor --ci --strict   # also on warnings
npx calm doctor --json          # for scripts
```

## Your part

CalmAPI's defaults cover the framework. These are up to you:

- Write a policy for every action and route, and review them with `npx calm routes`.
- Mark everything private as `hidden()`, `writeOnly()` or `visibleTo()`, and check the devtools **Data** panel to see what each kind of user receives.
- Keep `.env` out of git, and use separate database users and secrets per environment.
- Set `CORS_ORIGINS`, `TRUST_PROXY` and a mail transport in production.
- Keep dependencies up to date (`npm audit` covers them) and run `calm upgrade` when CalmAPI releases fixes.
