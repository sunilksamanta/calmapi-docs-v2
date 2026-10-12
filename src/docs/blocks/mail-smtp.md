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
