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

`to` can be one address or an array. A failed delivery throws with Resend's status and message. For retries, send from a [job](/docs/blocks/jobs).

## Without a mail block

The built-in transport only works in development: it prints a short notice and hands the message to devtools. In production with no transport, emails are not sent and an error is logged, and `calm doctor --prod` warns about it. You can also register your own transport in a plugin:

```js
calm.mailer.use({
  name: 'my-provider',
  async send({ to, from, subject, text, html }) { /* deliver it */ },
});
```
