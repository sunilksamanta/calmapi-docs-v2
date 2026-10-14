# Notifications: inbox, push and email (notifications)

One call reaches people wherever they want to be reached. `ctx.notify()` writes an entry in the user's in-app inbox, sends a [push notification](/push-notifications) to every device they registered and an email, following each user's preferences and quiet hours. Notification types are small files you read in one glance, and your app's settings screen can be built from what the API returns.

```bash
npx calm add notifications
```

| Adds | |
|---|---|
| Files | `app/blocks/notifications/index.js`; the `notification` resource in `app/resources/notification/` (resource and routes); an example type in `app/notifications/welcome.js` |
| Environment | none |
| Collections | `notifications` (the inbox, entries expire after 180 days), `calm_notification_prefs` |
| Routes | `/api/notifications` (the inbox), `GET` and `PATCH /api/notifications/preferences` |

Push goes through [`app.push`](/push-notifications) and email through `app.mailer`, so in development everything lands in [devtools](/devtools): inbox entries in **Data**, pushes in **Push** (on a [simulated phone](/push-notifications#simulated-devices) if you add one), emails in **Mail**.

## Send one

```js
// app/resources/order/order.routes.js
r.post('/:id/ship', { policy: 'admin' }, async (ctx) => {
  const order = await ctx.service.update(ctx.params.id, { status: 'shipped' }, ctx);
  await ctx.notify(order.customer, 'order-shipped', { number: order.number });
  return order;
});
```

`ctx.notify(to, type, data)` takes a user id, a user record, or an array of them. It is on every route context, and services get it with the `ctx` you pass them. Outside a request (jobs, event listeners, scripts), use `app.ext.notify(...)`.

For a one-off message without a type file, pass the message itself. Its type is `message`:

```js
await ctx.notify(userId, { title: 'Your export is ready', url: '/exports/42', channels: ['inbox'] });
```

It resolves to what happened (an array when `to` is an array):

```json
{ "user": "6650c0ffee0000000000abcd", "type": "order-shipped", "channels": { "inbox": true, "push": "sent", "email": "sent" }, "quietHours": false, "id": "6650c0ffee0000000000beef" }
```

`id` is the inbox entry. `channels.push` is the [status of the push](/push-notifications#send-a-notification) (`captured` in development without a transport, `no-devices` when the user has no phone registered). A channel that preferences turned off is missing. Users that do not exist or are disabled are skipped: `{ "user": "...", "skipped": "no such user" }`.

## Types

A type is a file in `app/notifications/`, named after the type:

```js
// app/notifications/order-shipped.js
export default {
  title: ({ number }) => `Order #${number} shipped`,
  body: 'It arrives Thursday.',
  url: ({ number }) => `/orders/${number}`,
  category: 'orders',
  channels: ['inbox', 'push', 'email'],
  collapseId: ({ number }) => `order-${number}`,
};
```

Every field can be a value or a function of the data you pass to `ctx.notify()`.

| Field | |
|---|---|
| `title`, `body` | What people read. One of them is required. |
| `url` | Where a tap goes. Also sent as the link in the email (relative URLs resolve against `APP_URL`). |
| `data` | Extra data for the app. The push also carries `type` and `notificationId` (the inbox entry). |
| `category` | Lets people turn a whole group of types on or off |
| `channels` | Where it goes by default: `inbox`, `push`, `email`. Default: the `defaultChannels` setting (`['inbox', 'push']`). |
| `required` | `true` for security notices: preferences and quiet hours cannot turn it off |
| `email` | `{ subject, text, html }` when the email should say more than the push. Default subject: the title. Default text: the body and the link. |
| `collapseId` | A newer notification with the same id replaces the older one on the phone |
| `androidChannel` | Android notification channel id |
| `description` | Shown in the preferences list, for your settings screen |

`calm doctor` warns about types without a title or body, and about unknown channels.

## The inbox

Inbox entries are a regular resource, so they follow the same rules as everything else: each user lists, reads, marks and deletes only their own, and nobody creates them through the API. They expire after 180 days (change the TTL index in `notification.resource.js`).

| Endpoint | |
|---|---|
| `GET /api/notifications` | Newest first. `?readAt[exists]=false` for unread only, `?type=order-shipped` to filter |
| `GET /api/notifications/unread-count` | `{ count }` for the bell icon |
| `POST /api/notifications/:id/read` | Mark one read |
| `POST /api/notifications/read-all` | `{ marked }` |
| `DELETE /api/notifications/:id` | Remove one |

```bash
curl 'http://localhost:5001/api/notifications?readAt[exists]=false' -H "Authorization: Bearer $TOKEN"
```

With the [realtime-sse](/blocks/realtime-sse) block, new entries reach open browser tabs right away. With the `badge` setting on, the iPhone badge shows the unread count.

When someone taps a push, your app gets `data.notificationId`. Report the tap with `POST /api/auth/devices/opened { pushId, data }` (or call `POST /api/notifications/:id/read`), so the unread count stays right on every device. Either way the block only marks entries of the signed-in user. In devtools, tapping a notification on a simulated phone emits the same `push.opened` event.

## Preferences

```bash
curl http://localhost:5001/api/notifications/preferences -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": {
    "channels": {},
    "quietHours": null,
    "types": [
      { "type": "order-shipped", "category": "orders", "description": null, "channels": ["inbox", "push", "email"], "required": false },
      { "type": "welcome", "category": "account", "description": null, "channels": ["inbox", "push"], "required": false }
    ]
  }
}
```

`types` lists everything a user can receive, so your settings screen needs no list of its own. Turn channels off per type or per category, and set quiet hours in the user's own time zone. During quiet hours there is no push; the inbox and the email still get it.

```bash
curl -X PATCH http://localhost:5001/api/notifications/preferences \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "channels": { "orders": { "email": false } }, "quietHours": { "start": "22:00", "end": "07:00", "timeZone": "Europe/Berlin" } }'
```

- Keys in `channels` are type names, categories or `message` (one-off messages). A setting for a type wins over its category.
- `quietHours` takes `HH:MM` times and an IANA time zone (default `UTC`). `"quietHours": null` turns them off.
- Unknown types, channels or time zones answer `422` with the field that is wrong.
- Types marked `required: true` ignore preferences and quiet hours.

## Settings

```js
// calm.config.js
export default defineConfig({
  blocks: { notifications: { defaultChannels: ['inbox'], badge: true } },
});
```

| Option | Default | |
|---|---|---|
| `defaultChannels` | `['inbox', 'push']` | Channels for one-off messages and types that do not list theirs |
| `badge` | `true` | Send the unread count as the iPhone badge |

## Events and devtools

`notification.sent` is emitted for every user notified, with the result shown above:

```js
calm.on('notification.sent', ({ user, type, channels }) => metrics.increment('notification', { type }));
```

The devtools **Notifications** panel lists every type with its channels and the 20 latest inbox entries. `calm doctor` reports an error when the `notification` resource is missing.

## Testing

Notifications are captured in tests like everything else: pushes in `t.pushes`, emails in `t.mails`.

```js
test('the welcome notification reaches the inbox and the phone', async () => {
  const ada = await t.signup({ name: 'Ada' });
  await t.post('/auth/devices', { token: 'test-token-1', platform: 'ios' }, ada);

  const result = await t.app.ext.notify(ada.id, 'welcome', { name: 'Ada' });
  assert.equal(result.channels.inbox, true);
  assert.equal(t.pushes.at(-1).message.title, 'Welcome, Ada!');

  const unread = await t.get('/notifications/unread-count', ada);
  assert.equal(unread.body.data.count, 1);
});
```

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/notifications/AGENTS.md` and in the devtools Blocks panel.

- [Expo: Push notifications overview](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [MDN: Intl.DateTimeFormat (timeZone)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)

## For AI agents

Coding agents read these notes in `app/blocks/notifications/AGENTS.md`:

- Read first: `app/blocks/notifications/index.js` (`notify`, `channelsFor`, quiet hours, preferences routes), `app/resources/notification/` (the inbox resource and its routes) and `app/notifications/welcome.js` (a type).
- Configuration: `calm.config.js` `blocks.notifications`: `defaultChannels` (`['inbox', 'push']`) and `badge` (true). No env vars. Push goes through `app.push` (push-expo or push-fcm deliver it), email through `app.mailer`.
- Task, add a type: create `app/notifications/<type>.js` exporting `{ title, body, url, category, channels, required, email: { subject, text, html }, collapseId, androidChannel, data, description }`; any field can be a function of the data passed. The file name is the type; restart to load it.
- Task, send: `await ctx.notify(userOrIdOrArray, '<type>', data)` in requests, `await app.ext.notify(...)` in jobs and listeners. Ad hoc: `ctx.notify(id, { title, body, url, channels })`.
- Invariant: respect preferences. `channelsFor` applies per type, then per category settings; only `required: true` types (security notices) ignore preferences and quiet hours. Never mark marketing types required.
- Invariant: quiet hours only remove push; inbox and email still go out.
- Invariant: the notification resource stays owner only for list, read, update and delete, with `create: 'none'`. `notify()` creates entries with `{ system: true }`, and `push.opened` only marks the user's own entries read.
- Disabled or missing users are skipped. Push and email failures are caught and reported as `'failed'` in the result, never thrown.
- Preferences: `GET` and `PATCH /api/notifications/preferences`. Keys must be a known type, a category or `message`; quiet hours need `HH:MM` and an IANA `timeZone`.
- Inbox entries expire after 180 days (TTL index in `notification.resource.js`); unread means `readAt: null`.
- Pitfall: never put secrets or tokens in `title`, `body`, `url` or `data`: they are stored in the inbox, sent to push providers and emailed.
- Pitfall: `notify()` handles users one after another; for large audiences enqueue jobs in batches (jobs block).
- `notification.sent` is emitted per user with the channel results; `calm doctor` flags types without title or body and unknown channels.

<!-- block-guide:end -->
