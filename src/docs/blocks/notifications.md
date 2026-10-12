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

When someone taps a push, your app gets `data.notificationId`. Call `POST /api/notifications/:id/read` with it, so the unread count stays right on every device. In devtools, tapping a notification on a simulated phone emits `push.opened`, and the block marks the entry read for you.

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
