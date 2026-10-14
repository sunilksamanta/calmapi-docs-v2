# Email via Resend (mail-resend)

Delivers the emails your app sends (password resets, notifications) through the [Resend](https://resend.com) HTTP API. No SDK: one `fetch` call.

```bash
npx calm add mail-resend
```

| Adds | |
|---|---|
| Files | `app/blocks/mail-resend/index.js` |
| Environment | `RESEND_API_KEY=`, `MAIL_FROM=My App <no-reply@example.com>` |

Set `RESEND_API_KEY` and `MAIL_FROM`, a sender on a domain you verified in Resend. `MAIL_FROM` takes precedence over `mail.from` in `calm.config.js`.

In development without a key, the block stays inactive and emails keep going to the devtools **Mail** panel. In production without a key, `calm doctor` reports an error.

## Sending email

Everything goes through `app.mailer`, so your code does not depend on the provider:

```js
await ctx.app.mailer.send({
  to: 'ada@example.com',
  subject: 'Your invoice',
  text: 'Thanks for your order.',
  html: '<p>Thanks for your order.</p>',
});
```

`to` can be one address or an array. A failed delivery throws with Resend's status and message. For retries, send from a [job](/blocks/jobs).

## Without a mail block

The built-in transport only works in development: it prints a short notice and hands the message to devtools. In production with no transport, emails are not sent and an error is logged, and `calm doctor --prod` warns about it. You can also register your own transport in a plugin:

```js
calm.mailer.use({
  name: 'my-provider',
  async send({ to, from, subject, text, html }) { /* deliver it */ },
});
```

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/mail-resend/AGENTS.md` and in the devtools Blocks panel.

- [Resend: Introduction](https://resend.com/docs/introduction)
- [Resend API: Send email](https://resend.com/docs/api-reference/emails/send-email)
- [Resend API reference (authentication, rate limits)](https://resend.com/docs/api-reference/introduction)
- [Resend: Domains](https://resend.com/docs/dashboard/domains/introduction)

## For AI agents

Coding agents read these notes in `app/blocks/mail-resend/AGENTS.md`:

- Read first: `app/blocks/mail-resend/index.js` (one `calm.mailer.use` transport, about 30 lines).
- Configuration: env `RESEND_API_KEY` (secret) and `MAIL_FROM`. No `calm.config.js` options. Without the key the block registers nothing: development mail stays in the devtools Mail panel and `calm doctor` reports an error in production.
- Send mail with `app.mailer.send({ to, subject, text, html })` (`calm.mailer` inside blocks). Never call the Resend API directly from features, so tests and devtools keep seeing every message.
- Invariant: never log or echo `RESEND_API_KEY`. Errors contain only the HTTP status and the first 300 characters of Resend's answer.
- `MAIL_FROM` overrides the per message `from` and must be an address on a domain verified in Resend, otherwise Resend refuses the request.
- The transport forwards only `from`, `to`, `subject`, `text` and `html`. To support `reply_to`, `cc`, `bcc`, `attachments`, `headers` or `tags`, map them in `send()` using Resend's field names. `meta` is stripped by the core before the transport sees it.
- Only one mail transport is active: `calm.mailer.use` replaces the previous one, so do not install mail-smtp next to it.
- Pitfall: Resend rate limits API requests (429). Send bulk mail from a job (jobs block) with retries, not in a loop inside a request.
- Pitfall: `send()` throws on any non 2xx answer. The notifications block catches it; your own callers should too, or send from a job.

<!-- block-guide:end -->
