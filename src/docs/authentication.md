# Authentication

Projects created from the `api` template have accounts, sessions and password flows under `/api/auth`. The code is in `calm/auth/`, so you can read and change every decision.

Auth turns on when `config.auth.enabled` is `true` (the default) **and** the project has a `user` resource with an `email` field and an `f.password()` field. The `minimal` template has no `user` resource and therefore no auth.

## Endpoints

| Method and path | Policy | Body | Success |
|---|---|---|---|
| `POST /api/auth/register` | public, rate limited | user fields (`name`, `email`, `password`...) | `201 { data: { user, token, expiresAt } }` |
| `POST /api/auth/login` | public, rate limited | `{ email, password }` | `200 { data: { user, token, expiresAt } }` |
| `POST /api/auth/logout` | authenticated | | `204`, ends this session |
| `POST /api/auth/logout-all` | authenticated | | `204`, ends every session of the user |
| `GET /api/auth/me` | authenticated | | `200 { data: user }` |
| `PATCH /api/auth/me` | authenticated | profile fields | `200 { data: user }` |
| `POST /api/auth/password` | authenticated, rate limited | `{ currentPassword, newPassword }` | `204`, other sessions end |
| `POST /api/auth/password/forgot` | public, rate limited | `{ email }` | `202`, always the same answer |
| `POST /api/auth/password/reset` | public, rate limited | `{ token, password }` | `204`, every session ends |
| `GET /api/auth/sessions` | authenticated | | `200 { data: [session...] }` |
| `DELETE /api/auth/sessions/:sessionId` | authenticated | | `204` |

### Register

```bash
curl -X POST http://localhost:5001/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"correct-horse-battery"}'
```

```json
{
  "data": {
    "user": { "id": "6acb46a57e4a738ebdd998b1", "name": "Ada Lovelace", "email": "ada@example.com", "roles": ["user"], "status": "active", "createdAt": "2026-10-11T08:19:49.069Z", "updatedAt": "2026-10-11T08:19:49.069Z" },
    "token": "calm_M_vAh-pIohIgNEe8gapu1LMoYxlH6oYvepNVGWtYPWk",
    "expiresAt": "2026-11-10T08:19:49.085Z"
  }
}
```

The body is validated against the `user` resource, like `POST /api/users`, but with no signed-in user: fields protected by `writableBy('admin')` (`roles`, `status`) are rejected with `422`. A duplicate email is `409 CONFLICT`, a password shorter than 8 characters is `422`. Set `auth.register: false` to close sign-ups (`403`).

### Login

```bash
curl -X POST http://localhost:5001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
```

Same response shape as register. A wrong email and a wrong password both answer `401` with `Invalid email or password`, after the same amount of work, so the response does not reveal whether an account exists. A user whose `status` is `disabled` gets `403`.

### Use the token

Send it as a bearer token on every request:

```bash
curl http://localhost:5001/api/auth/me -H "Authorization: Bearer calm_M_vAh-pIohIgNEe8gapu1LMoYxlH6oYvepNVGWtYPWk"
```

Only the `Authorization` header is read: tokens in query strings or cookies are ignored. A malformed, expired or revoked token answers `401 Session is invalid or has expired` on **every** route, public ones included, so clients notice a dead session instead of silently browsing as a visitor.

### Profile

`PATCH /api/auth/me` updates your own user with the `user` resource rules: `email` is immutable, `roles` and `status` are admin only, and the password cannot be changed here (use `/api/auth/password`).

```bash
curl -X PATCH http://localhost:5001/api/auth/me -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Ada King"}'
```

### Change password

```bash
curl -X POST http://localhost:5001/api/auth/password -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"currentPassword":"correct-horse-battery","newPassword":"a-much-longer-passphrase"}'
```

`204` on success. A wrong current password is `422` with `details.currentPassword`. Every other session of the user is revoked; the current one stays signed in.

### Sessions

```bash
curl http://localhost:5001/api/auth/sessions -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": [
    { "id": "6acb46a57e4a738ebdd998b3", "current": true, "createdAt": "2026-10-11T08:19:49.389Z", "lastUsedAt": "2026-10-11T08:19:49.388Z", "expiresAt": "2026-11-10T08:19:49.388Z", "ip": "127.0.0.1", "userAgent": "curl/8.5.0" },
    { "id": "6acb46a57e4a738ebdd998b2", "current": false, "createdAt": "2026-10-11T08:19:49.087Z", "lastUsedAt": "2026-10-11T08:19:49.085Z", "expiresAt": "2026-11-10T08:19:49.085Z", "ip": "127.0.0.1", "userAgent": "curl/8.5.0" }
  ]
}
```

`DELETE /api/auth/sessions/:sessionId` revokes one of your sessions (for a "sign out other devices" screen), `POST /api/auth/logout-all` revokes all of them.

## Password reset

1. The user asks for a reset link:

   ```bash
   curl -X POST http://localhost:5001/api/auth/password/forgot -H 'Content-Type: application/json' -d '{"email":"ada@example.com"}'
   ```

   ```json
   { "data": { "message": "If that email is registered, a reset link is on its way." } }
   ```

   The answer (`202`) is identical whether or not the email exists, and the work happens in the background so timing does not tell either.

2. CalmAPI emails a link to `auth.resetUrl` (default `${APP_URL}/reset-password`) with a `token` query parameter. The link is valid for `auth.resetTokenTtlMinutes` (30). In development the email lands in the devtools **Mail** panel; in production you need a mail block ([Resend](/docs/blocks/mail-resend) or [SMTP](/docs/blocks/mail-smtp)).

3. Your frontend's reset page reads the token and posts the new password:

   ```bash
   curl -X POST http://localhost:5001/api/auth/password/reset -H 'Content-Type: application/json' \
     -d '{"token":"reset_f9l4o-ANKiqUMnW512f5ksuDjZLNh1GwNJSDXCIRGwc","password":"a-brand-new-password"}'
   ```

   `204` on success. Every session of the user is revoked and other pending reset links stop working. An unknown, expired or already used token answers:

   ```json
   { "error": { "code": "INVALID_TOKEN", "message": "This reset link is invalid or has expired", "requestId": "..." } }
   ```

## Rate limits

Register, login, password change, forgot and reset share the **auth** limiter: 10 requests per 15 minutes per client IP and endpoint (`rateLimit.auth`). Every `/api` route also has a **global** limit of 300 requests per minute per IP (`rateLimit.global`). Responses carry `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`; over the limit you get `429 RATE_LIMITED` with `Retry-After`.

Limits are counted per process in memory. Behind a proxy set `TRUST_PROXY` so the real client IP is used, and with several instances add [rate-limit-mongo](/docs/blocks/rate-limit-mongo). Rate limiting is off in tests (`mode: 'test'`).

## Configuration

```js
// calm.config.js
export default defineConfig({
  auth: {
    enabled: true,
    register: true,               // false: no public sign-up
    sessionTtlDays: 30,
    resetTokenTtlMinutes: 30,
    resetUrl: 'https://app.example.com/reset-password', // default: APP_URL + /reset-password
    password: { logN: 15, r: 8, p: 3 },                 // scrypt cost
  },
  rateLimit: { auth: { windowMs: 15 * 60_000, max: 10 } },
});
```

## Design choices

- **Opaque session tokens, not JWT.** A token is 32 random bytes (`calm_...`). Only its SHA-256 hash is stored (collection `calm_sessions`), so a database leak does not leak usable sessions. There is no signing secret to configure, rotate or leak, and logout really ends a session. The price is one indexed lookup per request.
- **scrypt from `node:crypto`.** No native addon to compile. Parameters follow the OWASP cheat sheet (N=2^15, r=8, p=3) and are stored inside each hash, so raising `auth.password` later upgrades users transparently the next time they log in.
- **No account enumeration.** Login spends the same time for unknown emails, and forgot always answers the same.
- **Single-use reset tokens.** Random, hashed at rest (collection `calm_password_resets`), claimed atomically, short-lived, and they revoke every session when used.
- **Expiry is automatic.** Both collections have TTL indexes, so MongoDB deletes expired sessions and tokens itself. `lastUsedAt` is refreshed at most every 5 minutes.
- **Disabled accounts stop at once.** Setting `status: 'disabled'` rejects their existing sessions on the next request.

## In your code

`ctx.user` is the signed-in user (the stored record with `id` as a string, without the password hash), `ctx.session` is `{ id, expiresAt }`. The auth service is available as `app.auth.service` (for example `app.auth.service.createSession(user)` in a script). Events: `auth.registered`, `auth.login`, `auth.password_changed`, `auth.password_reset_requested`, `auth.password_reset`.

There are no social logins, magic links or two-factor authentication built in. Since `calm/auth/` is your code, you can add them, and the session model stays the same.
