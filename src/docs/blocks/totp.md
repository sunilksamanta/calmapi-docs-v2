# Two-factor authentication (totp)

Adds a second step to sign-in with an authenticator app (Google Authenticator, 1Password, Authy and the like). Codes follow RFC 6238 (6 digits, every 30 seconds) and are computed with `node:crypto`, so the block has no dependencies. Users who turn it on also get 10 single-use recovery codes.

```bash
npx calm add totp
```

| Adds | |
|---|---|
| Files | `app/blocks/totp/index.js`, `totp.js` |
| Environment | `TOTP_ISSUER=My App` (the name authenticator apps show; empty: the app name) |
| User fields | `twoFactorEnabledAt` (read-only, visible to the owner and admins), and the hidden `totpSecret`, `totpPendingSecret`, `totpLastStep` and `totpRecovery` |
| Collection | `calm_mfa_challenges` (entries expire on their own) |
| Routes | `POST /api/auth/2fa/setup`, `/enable`, `/verify`, `/disable` |

Encrypt the secrets at rest by setting encryption keys before users turn 2FA on:

```bash
npx calm keygen --write
```

With `CALM_ENCRYPTION_KEYS` set, `totpSecret` and `totpPendingSecret` are [`.encrypted()`](/security#encryption-at-rest) fields. Without keys the block still works, but stores secrets in plain text, and `calm doctor` warns (`totp-unencrypted`). Set the same keys in production.

## Routes

| Route | Policy | Body | Success |
|---|---|---|---|
| `POST /api/auth/2fa/setup` | authenticated | | `200 { data: { secret, otpauthUrl } }` |
| `POST /api/auth/2fa/enable` | authenticated, rate limited | `{ code }` | `200 { data: { enabled, recoveryCodes, note } }` |
| `POST /api/auth/2fa/verify` | public, rate limited | `{ mfaToken, code }` or `{ mfaToken, recoveryCode }` | `200 { data: { user, token, expiresAt } }` |
| `POST /api/auth/2fa/disable` | authenticated, rate limited | `{ password }` | `204` |

## Turn it on

1. Start the setup as the signed-in user:

   ```bash
   curl -X POST http://localhost:5001/api/auth/2fa/setup -H "Authorization: Bearer $TOKEN"
   ```

   ```json
   {
     "data": {
       "secret": "U2M5Y6PWULASWCRACIXFLGOPMQZ2JL2G",
       "otpauthUrl": "otpauth://totp/My%20App:ada%40example.com?secret=U2M5Y6PWULASWCRACIXFLGOPMQZ2JL2G&issuer=My%20App&algorithm=SHA1&digits=6&period=30"
     }
   }
   ```

   Render `otpauthUrl` as a QR code in your frontend with any QR library, and show `secret` for people who type it in. The secret stays pending until the next step. Calling setup again replaces it. If 2FA is already on, setup answers `400` (`Two-factor authentication is already on`).

2. Confirm with the code the app shows:

   ```bash
   curl -X POST http://localhost:5001/api/auth/2fa/enable -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' -d '{"code":"492039"}'
   ```

   ```json
   {
     "data": {
       "enabled": true,
       "recoveryCodes": ["e72a3-29307", "15a14-8a64c", "b51ad-e5ae2", "c0aab-3b768", "a3802-32020", "c5b91-b2e82", "fdb66-edf87", "fa5f7-43ef4", "d0508-9084e", "63722-ce01d"],
       "note": "Store these codes safely. Each works once. They will not be shown again."
     }
   }
   ```

   Show the recovery codes once and ask the user to store them. A wrong code answers `422` with `details.code`. Every other session of the user ends, because those sessions were created without a second factor.

`GET /api/auth/me` now includes `twoFactorEnabledAt`, so your settings page can tell whether 2FA is on.

## Sign in

With 2FA on, a correct email and password no longer return a session. Login answers `200` with a challenge instead:

```bash
curl -X POST http://localhost:5001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
```

```json
{
  "data": {
    "mfaRequired": true,
    "mfaToken": "mfa_i3u6jcWUM-GBSlgHVkCEfN96-gP03Eol",
    "methods": ["totp", "recovery"],
    "expiresAt": "2026-10-11T09:39:03.125Z"
  }
}
```

Clients check `mfaRequired`, ask for a code, and finish the sign-in:

```bash
curl -X POST http://localhost:5001/api/auth/2fa/verify -H 'Content-Type: application/json' \
  -d '{"mfaToken":"mfa_i3u6jcWUM-GBSlgHVkCEfN96-gP03Eol","code":"318604"}'
```

The answer is the normal login response, `{ data: { user, token, expiresAt } }`. To use a recovery code, send `recoveryCode` instead of `code`:

```json
{ "mfaToken": "mfa_i3u6jcWUM-GBSlgHVkCEfN96-gP03Eol", "recoveryCode": "e72a3-29307" }
```

| Answer | When |
|---|---|
| `401 Invalid code` | The code or recovery code is wrong, or the code was already used |
| `401 This sign-in has expired, sign in again` | The `mfaToken` is unknown, older than 5 minutes, already used, or has had 5 attempts |
| `422` | Neither `code` nor `recoveryCode` was sent |

## Turn it off

Turning 2FA off needs the user's password:

```bash
curl -X POST http://localhost:5001/api/auth/2fa/disable -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"password":"correct-horse-battery"}'
```

`204` on success. The secret, recovery codes and `twoFactorEnabledAt` are removed. A wrong password answers `422` with `details.password`.

## How it is protected

- **No session before the second factor.** Login returns only a challenge. The `mfaToken` is random, stored as a SHA-256 hash, single use, valid for 5 minutes and allows 5 attempts.
- **No replay.** A code is accepted for its own 30 second step and the steps right before and after it (clock drift). The last used step is stored, so a code works only once.
- **Recovery codes.** 10 per user, stored as SHA-256 hashes and removed when used.
- **Secrets stay private.** They are hidden fields: never returned, not even to their owner, and encrypted at rest when keys are set.
- **Rate limits.** `enable`, `verify` and `disable` share the auth limiter (10 requests per 15 minutes per IP and route). Wrong passwords still count toward [account lockout](/authentication#account-lockout).
- **Constant time.** Codes are compared with `timingSafeEqual`.

## Security events

The block emits [security events](/security#security-events) that show up in the devtools **Security** panel:

| Event | Payload |
|---|---|
| `security.2fa_enabled` | `{ userId }` |
| `security.2fa_disabled` | `{ userId }` |
| `security.2fa_failed` | `{ userId, ip, attempt }` |
| `security.2fa_recovery_used` | `{ userId, remaining }` |

## How it hooks into login

The block uses the `loginChallenge` [plugin hook](/publishing-blocks#the-plugin-api). It runs after a correct password, before a session is created. A hook that returns an object answers the login with that object instead of a session. Once the second factor checks out, the block calls `calm.app.auth.service.finishLogin(user, req)`, which creates the session and returns the usual login response:

```js
// app/blocks/totp/index.js (simplified)
calm.loginChallenge(async (user) => {
  if (!user.twoFactorEnabledAt) return null; // no challenge: normal login
  const token = `mfa_${randomBytes(24).toString('base64url')}`;
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  await Challenge.create({ _id: sha(token), user: user._id, expiresAt });
  return { mfaRequired: true, mfaToken: token, methods: ['totp', 'recovery'], expiresAt };
});
```

The same hook works for other second factors, such as email codes or passkeys. The code is in your project, so you can change the challenge lifetime, the number of recovery codes or the issuer name there.
