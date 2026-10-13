# Email via Postmark (mail-postmark)

Sends every `app.mailer.send()` (password resets, magic links, notifications, your own emails) through the [Postmark Email API](https://postmarkapp.com/developer/api/email-api). No SDK: one `fetch` per email. Message streams, tags, metadata, attachments, and errors you can act on. In development without a token, emails keep going to the devtools Mail panel.

```bash
npx calm add mail-postmark
```

| Adds | |
| --- | --- |
| Files | `app/blocks/mail-postmark/index.js` (the transport) |
| Environment | `POSTMARK_SERVER_TOKEN`, `POSTMARK_MESSAGE_STREAM` (default `outbound`), `MAIL_FROM` |
| Conflicts | `mail-resend`, `mail-smtp` (one mail transport at a time) |

## Setup in Postmark

1. Create a server (Servers, Create server). Each server has its own token, streams and statistics: use one per environment.
2. Verify your sending domain (Sender signatures, Add domain, then the DKIM and Return-Path DNS records), or a single sender signature.
3. Copy the token from the server's API Tokens tab into `.env`:

```bash
POSTMARK_SERVER_TOKEN=...
MAIL_FROM="Acme <hello@acme.com>"
```

`calm doctor` reports a missing token in production.

## Sending

Nothing changes in your code:

```js
await ctx.app.mailer.send({ to: user.email, subject: 'Your invoice', text: 'See attached', html: '<p>See attached</p>' });
```

Extra fields the transport understands:

| Field | Postmark | Notes |
| --- | --- | --- |
| `to`, `cc`, `bcc`, `replyTo` | `To`, `Cc`, `Bcc`, `ReplyTo` | a string or an array |
| `tag` | `Tag` | defaults to `meta.tag`, then `meta.kind` (`password-reset`, `magic-link`, `notification`) |
| `metadata` | `Metadata` | `{ orderId: 42 }`, values become strings, visible in Postmark activity |
| `headers` | `Headers` | `{ 'X-Entity-Ref-ID': '42' }` |
| `attachments` | `Attachments` | `[{ filename, content: Buffer or base64 string, contentType, cid }]`; `cid` makes an inline image |
| `messageStream` | `MessageStream` | per message, overrides the default stream |

The send resolves to `{ id, to, submittedAt }` (`id` is Postmark's MessageID).

## Options

```js
// calm.config.js
export default defineConfig({
  blocks: {
    'mail-postmark': {
      messageStream: 'outbound', // default: POSTMARK_MESSAGE_STREAM, then 'outbound'
      trackOpens: true, // null: the server's setting
      trackLinks: 'HtmlOnly', // 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly'
      timeoutMs: 15000,
      apiBase: 'https://api.postmarkapp.com', // tests and proxies
    },
  },
});
```

## Errors

A refused email throws a `PostmarkError` with `status` (HTTP), `errorCode` (Postmark's code) and a readable message, for example `Postmark refused the email (HTTP 422, ErrorCode 406): You tried to send to recipient(s) that have been marked as inactive.` `err.inactiveRecipient` is true for ErrorCode 406: the address hard bounced, complained or unsubscribed, so retrying is pointless. Network failures throw `Postmark could not be reached: ...`.

## Security notes

- The server token can send email as your domain: keep it in `.env`, never in git or logs.
- `meta` on a message is for devtools and tests and can contain tokens (the reset token, for example). The core gives it to transports as a second argument; this block reads only `meta.tag` and `meta.kind`, never forwards the rest.
- Postmark separates transactional and broadcast mail. Newsletters must go through a broadcast stream (`messageStream: 'broadcast'`), or your transactional reputation suffers.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/mail-postmark/AGENTS.md` and in the devtools Blocks panel.

- [Postmark Email API](https://postmarkapp.com/developer/api/email-api)
- [Postmark API overview and error codes](https://postmarkapp.com/developer/api/overview)
- [Sending email with the API](https://postmarkapp.com/developer/user-guide/send-email-with-api)
- [Message Streams API](https://postmarkapp.com/developer/api/message-streams-api)

## For AI agents

Coding agents read these notes in `app/blocks/mail-postmark/AGENTS.md`:

- Read `app/blocks/mail-postmark/index.js` first: it is one `calm.mailer.use()` transport, about 100 lines.
- Send mail through `ctx.app.mailer.send({ to, subject, text, html })` (or `app.mailer` outside requests). Never call Postmark directly from routes.
- The token lives in `.env` as `POSTMARK_SERVER_TOKEN`; never hardcode it, log it or put it in calm.config.js.
- `MAIL_FROM` must be on a domain or sender signature verified in Postmark, otherwise Postmark answers ErrorCode 400.
- `meta` on a message is for devtools and tests and can hold tokens: the transport only reads `meta.tag` and `meta.kind` for the Postmark tag. Never forward `meta` wholesale to Postmark.
- Put provider metadata in `message.metadata` (string values, shown in Postmark activity), not in `meta`.
- Options (`messageStream`, `trackOpens`, `trackLinks`, `apiBase`) go in calm.config.js under `blocks['mail-postmark']`. `apiBase` exists for tests and proxies.
- Errors throw a `PostmarkError` with `status`, `errorCode` and `inactiveRecipient` (ErrorCode 406: the address bounced or unsubscribed). Do not retry those.
- Broadcast (marketing) mail must use a broadcast message stream, never the default transactional `outbound` stream.
- Only one mail transport can be active: this block conflicts with mail-resend and mail-smtp.
- Tests: point `apiBase` at a local node:http server, see `test/blocks/mail-postmark.test.js` in the CalmAPI repo.

<!-- block-guide:end -->
