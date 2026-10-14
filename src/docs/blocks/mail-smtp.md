# Email via SMTP (mail-smtp)

Delivers the emails your app sends through any SMTP server (Amazon SES, Postmark, Mailgun, your own) with [Nodemailer](https://nodemailer.com).

```bash
npx calm add mail-smtp
```

| Adds | |
|---|---|
| Files | `app/blocks/mail-smtp/index.js` |
| Dependency | `nodemailer` |
| Environment | `SMTP_URL=smtps://user:password@smtp.example.com:465`, `MAIL_FROM=My App <no-reply@example.com>` |

Set `SMTP_URL` to your server (`smtp://` or `smtps://`, credentials URL-encoded) and `MAIL_FROM` to the sender. `MAIL_FROM` takes precedence over `mail.from` in `calm.config.js`.

```ini
SMTP_URL=smtps://AKIA...:secret@email-smtp.eu-west-1.amazonaws.com:465
MAIL_FROM=My App <no-reply@example.com>
```

While `SMTP_URL` is empty or still the `smtp.example.com` placeholder, the block stays inactive: emails go to the devtools **Mail** panel in development, and `calm doctor` reports an error in production. The connection is closed on shutdown.

Send email with `app.mailer.send({ to, subject, text, html })`, exactly as with [mail-resend](/blocks/mail-resend).

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/mail-smtp/AGENTS.md` and in the devtools Blocks panel.

- [Nodemailer](https://nodemailer.com/)
- [Nodemailer: SMTP transport](https://nodemailer.com/smtp)
- [Nodemailer: Message configuration](https://nodemailer.com/message)
- [Amazon SES: Using the SMTP interface](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
- [RFC 5321: Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321.html)

## For AI agents

Coding agents read these notes in `app/blocks/mail-smtp/AGENTS.md`:

- Read first: `app/blocks/mail-smtp/index.js` (one Nodemailer transport registered with `calm.mailer.use`).
- Configuration: env `SMTP_URL` (secret; `smtp://` with STARTTLS, usually port 587, or `smtps://` for implicit TLS on 465) and `MAIL_FROM`. No `calm.config.js` options. Unset, or still the `smtp.example.com` placeholder, means no transport: development mail stays in devtools and `calm doctor` errors in production.
- Invariant: `SMTP_URL` contains credentials. Never log it, include it in errors or commit it; URL-encode special characters in the user name and password.
- Send through `app.mailer.send({ to, subject, text, html })`; do not create other Nodemailer transports in features, so tests and devtools keep capturing mail.
- Only `from`, `to`, `subject`, `text` and `html` reach `transport.sendMail`. Add `cc`, `bcc`, `replyTo`, `attachments` or `headers` there using Nodemailer message fields. `meta` is stripped by the core.
- Transport options beyond the URL (`pool`, timeouts, `tls`): pass an options object to `nodemailer.createTransport` instead of the URL string. Keep `transport.close()` in `calm.onShutdown`.
- Only one mail transport is active: `calm.mailer.use` replaces the previous one, so do not install mail-resend next to it.
- Pitfall: most providers (SES, Postmark, Gmail) only accept a verified sender in `MAIL_FROM`; SES SMTP credentials are not your IAM access keys.
- Pitfall: `sendMail` errors propagate to the caller; send from a job (jobs block) when you need retries. When delivery fails, `await transport.verify()` in a script checks the connection and credentials.

<!-- block-guide:end -->
