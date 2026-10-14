# SMS and phone verification via Twilio (sms-twilio)

Sends text messages through the [Twilio Messages API](https://www.twilio.com/docs/messaging/api/message-resource) and verifies your users' phone numbers with 6-digit codes. Codes are stored hashed, expire after 10 minutes, allow 5 tries and have a resend cooldown, with per number, per IP and per user limits kept in MongoDB (they hold across instances and stop SMS pumping). Delivery reports are accepted only with a valid `X-Twilio-Signature`. Without credentials, development and tests use a console transport, like the mail dev transport. No SDK, no dependencies.

```bash
npx calm add sms-twilio
```

| Adds | |
| --- | --- |
| Files | `app/blocks/sms-twilio/index.js` (transport, routes), `twilio.js` (E.164, signatures, Messages API) |
| User fields | `phone`, `phoneVerifiedAt` (read-only, visible to the owner and admins) |
| Collections | `calm_phone_verifications`, `calm_sms_limits`, `calm_sms_messages` (all with TTL indexes) |
| Environment | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER` |

## Setup in Twilio

1. Twilio Console, Account info: copy the Account SID (`AC...`) and the Auth Token.
2. Buy a number with SMS capability (Phone Numbers, Buy a number), or better, create a Messaging Service (Messaging, Services) and add the number to its sender pool. US numbers need A2P 10DLC registration before they can send.
3. `.env`:

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_SID=MG...   # or TWILIO_FROM_NUMBER=+14155550100
```

4. Optional, delivery reports: set the public URL of the callback route (below) in `calm.config.js`.
5. Recommended: Messaging, Settings, Geo permissions: allow only the countries you serve.

## Sending

```js
const { sid, status } = await ctx.app.ext.sms.send({ to: '+14155550100', body: 'Your order shipped', meta: { kind: 'order-shipped' } });
```

Numbers must be in [E.164](https://www.twilio.com/docs/glossary/what-e164) (`+` and the country code; spaces, dashes and parentheses are removed, a leading `00` becomes `+`). Errors throw an `SmsError` with `status` and `code` (Twilio's error code, for example 21211 for an invalid number). Only 429 is retried: after a timeout or a 5xx the message may already have been accepted, and a retry would text the person twice.

`app.ext.sms` also has `observe(fn)` (every message, for tests and devtools), `normalize(phone)`, `mask(phone)` and `transport` (`twilio`, `dev-console`, or `null` in production without credentials).

## Phone verification

```http
POST /api/auth/phone/start      Authorization: Bearer <session>
{ "phone": "+1 415 555 0100" }

202 { "data": { "message": "Code sent", "phone": "+14*****0100", "expiresIn": 600, "resendIn": 60 } }
```

```http
POST /api/auth/phone/verify     Authorization: Bearer <session>
{ "phone": "+14155550100", "code": "123456" }

200 { "data": { "phone": "+14155550100", "phoneVerifiedAt": "2026-10-13T10:00:00.000Z" } }
```

| Answer | When |
| --- | --- |
| `200 { verified: true }` on start | the number is already verified on this account (nothing sent) |
| `422 { details: { phone } }` | not an E.164 number, a country outside `allowedPrefixes`, or Twilio says it cannot receive SMS |
| `429` + `Retry-After` on start | resend cooldown, or a limit per number, IP or account |
| `400 INVALID_CODE` | wrong code (`Wrong code, 3 attempts left`), expired, or no code pending |
| `429 TOO_MANY_ATTEMPTS` | the last allowed wrong code: the code is thrown away, ask for a new one |
| `409` | the number is verified on another account (`uniquePhone`) |
| `502 SMS_FAILED` | Twilio did not accept the message |

`DELETE /api/auth/phone` removes the number. Events: `auth.phone_verified { user, phone (masked) }`, `auth.phone_removed`, and `security.phone_code_failed`, `security.phone_verification_locked`, `security.sms_limit_reached`, `security.phone_already_used`, `security.twilio_signature_invalid`.

## Delivery reports

```js
// calm.config.js
blocks: { 'sms-twilio': { statusCallbackUrl: 'https://api.acme.com/api/sms/twilio/status' } }
```

Each message then asks Twilio to POST its status (`queued`, `sent`, `delivered`, `undelivered`, `failed`) to `POST /api/sms/twilio/status`. The route checks `X-Twilio-Signature` (HMAC-SHA1 of the URL and the sorted POST parameters with your Auth Token, compared in constant time) against `statusCallbackUrl`, so it works behind proxies; invalid signatures get 403. Valid reports update `calm_sms_messages` (never going backwards from `delivered`) and emit `sms.status { sid, status, errorCode, to (masked), kind }`.

## Options

```js
blocks: {
  'sms-twilio': {
    statusCallbackUrl: null,
    allowedPrefixes: ['+1', '+44'], // refuse other countries
    keepMessagesDays: 30,
    verification: {
      enabled: true,
      ttlMinutes: 10,
      maxAttempts: 5,
      resendCooldownSeconds: 60,
      uniquePhone: true,
      limits: { perPhone: { max: 5, windowMinutes: 60 }, perIp: { max: 20, windowMinutes: 60 }, perUser: { max: 10, windowMinutes: 60 } },
      message: (code, { appName, minutes }) => `${code} is your ${appName} code (${minutes} min)`,
    },
    apiBase: 'https://api.twilio.com', // tests and proxies
  },
}
```

## Security notes

- Codes come from `crypto.randomInt`, are stored as a salted SHA-256 hash, are single use (claimed with one atomic delete) and the attempt counter is incremented atomically before the comparison, so parallel guesses cannot exceed `maxAttempts`.
- SMS pumping (toll fraud): bots trigger codes to premium numbers you pay for. The cooldown, the three limits, `allowedPrefixes` and Twilio Geo permissions are the defense; keep them.
- The Auth Token authenticates API calls and signs callbacks: `.env` only. Rotating it in Twilio invalidates both until `.env` is updated.
- Logs and the delivery log only hold masked numbers (`+14*****0100`); codes are never logged outside development (`CALM_SMS_PRINT=1`).

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/sms-twilio/AGENTS.md` and in the devtools Blocks panel.

- [Twilio Messages resource (send an SMS)](https://www.twilio.com/docs/messaging/api/message-resource)
- [Webhooks security (X-Twilio-Signature)](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Track the message status (status callbacks)](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status)
- [Messaging Services](https://www.twilio.com/docs/messaging/services)
- [E.164 phone number format](https://www.twilio.com/docs/glossary/what-e164)
- [Twilio error and warning dictionary](https://www.twilio.com/docs/api/errors)

## For AI agents

Coding agents read these notes in `app/blocks/sms-twilio/AGENTS.md`:

- Read `app/blocks/sms-twilio/index.js` (transport, status callback, verification routes) and `twilio.js` (E.164, signature, Messages API) first.
- Send SMS only through `ctx.app.ext.sms.send({ to, body, meta })`; it validates E.164, applies `allowedPrefixes` and falls back to the dev transport. Never call the Twilio API from routes.
- Credentials live in `.env` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, sender). Never log the auth token, full phone numbers or verification codes; use `maskPhone()`.
- Invariant: verification codes are stored as a salted SHA-256 hash only, are single use, expire (`ttlMinutes`) and are thrown away after `maxAttempts` wrong tries. Keep the attempt increment atomic and before the comparison.
- Invariant: the status callback is refused unless `X-Twilio-Signature` matches. Behind a proxy or load balancer set `statusCallbackUrl` to the exact public URL, otherwise every signature fails.
- The user fields `phone` and `phoneVerifiedAt` are readOnly and visible to owner and admin only: only `/api/auth/phone/verify` writes them.
- Abuse limits (SMS pumping): keep the resend cooldown and the per number, per IP and per user limits; restrict countries with `allowedPrefixes` if the product is local.
- Only 429 answers are retried: after a timeout or 5xx the message may already be accepted, a retry would text the person twice.
- Options go in calm.config.js under `blocks['sms-twilio']` (verification: ttlMinutes, maxAttempts, resendCooldownSeconds, limits, uniquePhone, message).
- Tests: set `apiBase` to a local node:http fake; in test mode without `apiBase` the block never calls Twilio. Read codes with `app.ext.sms.observe()`.

<!-- block-guide:end -->
