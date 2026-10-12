# Magic link sign-in (magic-link)

Passwordless sign-in by email. A user types their address, gets a link, opens it and is signed in, with the same session tokens as password sign-in. Links work once, expire after 15 minutes and are stored only as hashes. The request never reveals whether an account exists, each address has a cooldown, redirects are checked against an allowlist, and a link can be bound to the browser that asked for it. [Account lockout](/authentication#account-lockout), disabled accounts and two-factor authentication (the [totp](/blocks/totp) block) apply exactly as they do for passwords.

```bash
npx calm add magic-link
```

| Adds | |
|---|---|
| Files | `app/blocks/magic-link/index.js` |
| Environment | Nothing new. Links are built from `APP_URL`, which every project sets. |
| Routes | `POST /api/auth/magic-link`, `POST /api/auth/magic-link/verify` |
| Collections | `calm_magic_links`, `calm_magic_link_cooldowns` (both cleaned up by TTL indexes) |

Emails go through `app.mailer`, so in development they land in the devtools **Mail** panel. In production add [mail-resend](/blocks/mail-resend) or [mail-smtp](/blocks/mail-smtp).

## The flow

1. Your sign-in page asks for a link:

   ```bash
   curl -X POST http://localhost:5001/api/auth/magic-link -H 'Content-Type: application/json' \
     -d '{ "email": "ada@example.com", "redirect": "/billing" }'
   ```

   ```json
   { "data": { "message": "If that address can sign in, a link is on its way.", "requestId": "<random id>", "expiresIn": 900 } }
   ```

   The answer is `202` and the same for every address, registered or not. The account lookup and the email happen after the response, so the timing does not tell either. Keep `requestId` in `localStorage`.

2. The email links to `APP_URL/auth/magic?token=magic_...` (change the page with the `linkUrl` setting). That page reads the token and calls:

   ```bash
   curl -X POST http://localhost:5001/api/auth/magic-link/verify -H 'Content-Type: application/json' \
     -d '{ "token": "magic_...", "requestId": "<the stored requestId>" }'
   ```

   ```json
   { "data": { "user": { "id": "6650...", "name": "Ada Lovelace", "email": "ada@example.com" }, "token": "calm_...", "expiresAt": "...", "redirect": "http://localhost:5001/billing" } }
   ```

   Use `token` as a Bearer token, like the one from `/api/auth/login`, then send the user to `redirect` if there is one. Remove the stored `requestId` after a verify attempt.

3. When the user has two-factor authentication on, verify answers with the challenge instead of a session, exactly like password sign-in, and keeps `redirect` on it:

   ```json
   { "data": { "mfaRequired": true, "mfaToken": "mfa_...", "methods": ["totp", "recovery"], "expiresAt": "...", "redirect": "..." } }
   ```

   Finish with `POST /api/auth/2fa/verify { mfaToken, code }`.

A minimal page for step 2:

```js
const token = new URLSearchParams(location.search).get('token');
const requestId = localStorage.getItem('magicRequestId') ?? undefined;
const res = await fetch('/api/auth/magic-link/verify', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ token, requestId }),
});
localStorage.removeItem('magicRequestId');
const { data, error } = await res.json();
if (data?.mfaRequired) showTwoFactorForm(data.mfaToken);
else if (data?.token) signIn(data.token, data.redirect ?? '/');
else showError(error.code === 'OTHER_DEVICE' ? 'Open the link in the browser where you asked for it.' : 'This link is invalid or has expired.');
```

| Answer | When |
|---|---|
| `400 INVALID_TOKEN` | The link is unknown, already used or expired |
| `400 OTHER_DEVICE` | The `requestId` does not match the browser that asked (the link stays usable) |
| `403` | The account was disabled after the link was sent |
| `429` | The account is locked after too many wrong passwords (the link stays usable until it expires) |

## Settings

Set them in `calm.config.js`:

```js
export default defineConfig({
  blocks: {
    'magic-link': {
      createAccount: true,
      requireSameDevice: true,
      allowedRedirects: ['https://app.example.com', 'https://admin.example.com'],
    },
  },
});
```

| Option | Default | |
|---|---|---|
| `linkUrl` | `APP_URL + '/auth/magic'` | The frontend page the email links to. `?token=` (or `&token=`) is added. |
| `ttlMinutes` | `15` | How long a link works |
| `cooldownSeconds` | `60` | Minimum time between two links for the same address. `0` turns it off. |
| `createAccount` | `false` | Unknown addresses get a sign-up link that creates the account when it is opened. Only while `auth.register` is on. |
| `allowedRedirects` | the origin of `APP_URL` | Origins `redirect` may point to |
| `requireSameDevice` | `false` | Refuse links verified without the `requestId` of the browser that asked |

## Binding links to the browser

Every request returns a short `requestId`. Only its hash is stored with the link.

- Sent back on verify, it must match. A link opened in a browser holding a different `requestId` is refused with `400 OTHER_DEVICE`, and the link is not used up, so the right browser can still open it.
- Without `requestId`, the link works anywhere by default, so people can ask on a laptop and open the email on a phone.
- With `requireSameDevice: true` the `requestId` is required. This stops login CSRF (someone mailing you a link to *their* account so you end up signed in as them) and makes a leaked or forwarded link useless. The cost: the link must be opened in the browser that asked for it.

While a cooldown runs, the request answers `429` with `Retry-After` and no new `requestId`, so the browser keeps the one that matches the email already sent.

## Redirects

`redirect` is checked when the link is requested, never when it is used:

- Paths (`/billing?tab=2`) resolve against `APP_URL`.
- Absolute URLs must be `http` or `https`, and their origin must be in `allowedRedirects`.
- Anything else is a `422`: other origins, `//evil.example`, `/\evil.example`, `javascript:`, URLs with credentials such as `https://app.example.com@evil.example`.

The checked URL comes back from verify as `redirect`. It is never put in the email link, so nobody can change it on the way.

## Signing up with a link

With `createAccount: true`, an unknown address gets a "Finish signing up" email instead of nothing. The account is created when the link is verified, not before, so typing someone else's address creates nothing. Verify then also answers `created: true`. You can pass a `name` with the request:

```bash
curl -X POST http://localhost:5001/api/auth/magic-link -H 'Content-Type: application/json' \
  -d '{ "email": "new@example.com", "name": "Ada Lovelace" }'
```

The new account gets the email, the name (or the part of the address before `@`) and a random password nobody knows. The user keeps signing in with links, or sets a password with the reset flow. If your user resource has more required fields, add them in `newAccount()` in `app/blocks/magic-link/index.js`. `auth.registered` is emitted with `via: 'magic-link'`, so welcome emails and jobs listening to it still run.

## How it is protected

- Tokens are 256-bit random values, stored as SHA-256 hashes, single use (claimed with one atomic update) and short lived.
- Both routes use the auth rate limit (`config.rateLimit.auth`), and each address has a cooldown stored in MongoDB, so it holds across instances.
- Sign-in goes through the same [auth service helpers](/building-blocks#the-auth-service) as passwords: a locked account gets `429`, disabled accounts get no links, and login challenges (2FA) run before a session is created.
- Refused links emit `security.invalid_magic_link` with a `reason`: `unknown`, `used`, `expired`, `other_device` or `unknown_user`.
- Anyone who can request links for an address can make that address receive emails, within the rate limit and the cooldown. They cannot sign in: that needs the inbox.

## Events

| Event | Payload |
|---|---|
| `auth.magic_link_requested` | `{ user, email, signup }`, after the email is sent (`user` is `null` for sign-up links) |
| `auth.login` | `{ user }`, when a link signs someone in |
| `auth.registered` | `{ user, via: 'magic-link' }`, when a sign-up link creates an account |
| `security.invalid_magic_link` | `{ reason, ip, email? }` (masked email) |
| `security.locked_login_attempt` | `{ email, ip, via: 'magic-link' }` |

```js
calm.on('auth.magic_link_requested', ({ signup }) => metrics.increment('magic_link', { signup }));
```

## Testing

The email is captured in `t.mails`, and its `meta.token` holds the token:

```js
test('a magic link signs the user in once', async () => {
  const ada = await t.signup();
  const asked = await t.post('/auth/magic-link', { email: ada.email });
  assert.equal(asked.status, 202);
  await t.idle(); // the email is sent after the response

  const token = t.mails.at(-1).meta.token;
  const { requestId } = asked.body.data;
  const signedIn = await t.post('/auth/magic-link/verify', { token, requestId });
  assert.equal(signedIn.status, 200);
  assert.ok(signedIn.body.data.token);

  const again = await t.post('/auth/magic-link/verify', { token, requestId });
  assert.equal(again.body.error.code, 'INVALID_TOKEN');
});
```
