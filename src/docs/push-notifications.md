# Push notifications

`app.push` sends notifications to your users' phones and browsers. Apps register a device token once, and your code sends to a user, not to tokens.

In development nothing leaves your machine. Every notification lands in the devtools **Push** panel, drawn the way an iPhone, an Android phone and a desktop browser would show it, next to the exact payload Apple, Google, Expo and the browser receive. When you are ready, add a [transport block](#delivering-for-real) and the same code delivers for real.

## Send a notification

```js
// app/resources/order/order.routes.js
r.post('/:id/ship', { policy: 'admin' }, async (ctx) => {
  const order = await ctx.service.update(ctx.params.id, { status: 'shipped' }, ctx);
  await ctx.push.send({
    to: order.customer,                  // a user id: every device they registered
    title: 'Your order shipped',
    body: 'It arrives Thursday between 9 and 12.',
    url: `/orders/${order.id}`,          // opened on tap, also sent as data.url
    data: { orderId: String(order.id) },
  });
  return order;
});
```

`ctx.push` is available in routes and services, `app.push` everywhere else (jobs get `{ app }`, plugins get `calm.push`).

`send()` resolves to `{ id, status, devices, results }`:

| `status` | Meaning |
|---|---|
| `captured` | Shown in devtools (and `t.pushes` in tests), not delivered. Development without a transport, or only simulated devices. |
| `sent` | The transport accepted it for every device |
| `partial` | Some devices failed. The delivery log in devtools says which and why. |
| `failed` | No device received it, or there is no transport in production |
| `no-devices` | The user has no registered devices |

An invalid message throws a `422` with the field errors, like any other validation error. Delivery problems never throw: a push should not fail the request that triggered it. They are in the result, the log and devtools.

## Who receives it

| Option | Sends to |
|---|---|
| `to` | A user id (or an array of them): every device those users registered |
| `deviceIds` | Specific devices by id |
| `tokens` | Raw device tokens, with `platform` (`ios`, `android` or `web`, default `android`). Use this when you keep tokens yourself. |

## The message

| Field | Type | Notes |
|---|---|---|
| `title` | string, up to 250 | About 36 characters show on an iPhone, 40 on Android, 45 in a browser |
| `subtitle` | string | iPhone only, under the title |
| `body` | string, up to 2000 | About 4 lines on an iPhone, one line (46 characters) on a collapsed Android notification |
| `image` | https URL | A picture in the expanded notification. iOS needs a notification service extension in the app. |
| `icon` | https URL | Browser notifications |
| `url` | string | Where a tap should go (`/orders/42` or `myapp://orders/42`), added to `data.url` |
| `badge` | integer, 0 or more | The number on the iPhone app icon |
| `sound` | string or `false` | `default` unless the message is silent. `false` for none. |
| `channel` | string | Android notification channel id |
| `category`, `group` | string | iOS category for actions, thread or tag that groups notifications |
| `priority` | `high` or `normal` | `high` (default) is shown right away, `normal` may wait to save battery |
| `ttl` | seconds | How long the provider keeps trying an offline device |
| `silent` | boolean | No banner and no sound: the app wakes in the background with `data`, which is then required |
| `data` | object | Delivered to the app, never shown. FCM only carries strings, so other values are sent as JSON text. |

A message needs a `title` or a `body`, or `silent: true` with `data`.

Payloads are limited to 4 KB by every provider. Devtools shows the size of each one and warns before a provider would reject it.

## Registering devices

Apps register their push token after sign in, with the user's session:

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/auth/devices` | `{ token, platform, name?, appVersion?, locale? }` | `201 { data: device }` |
| `GET /api/auth/devices` | | `200 { data: [device...] }`, your devices |
| `DELETE /api/auth/devices/:deviceId` | | `204` |

`platform` is `ios`, `android` or `web`. Tokens are never returned in full (`a3f9c2…b7d3f8`). Registering a token that is already known moves it to the current user, which is what you want when someone signs out and another person signs in on the same phone. Call `DELETE` on sign out.

With Expo:

```js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
await fetch(`${API_URL}/api/auth/devices`, {
  method: 'POST',
  headers: { authorization: `Bearer ${session}`, 'content-type': 'application/json' },
  body: JSON.stringify({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
});
```

With Firebase (Android, iOS or the web), send the token from `getToken()` the same way.

Devices are stored in the `calm_devices` collection. They are not a resource, so there are no CRUD routes for them beyond the three above, and tokens never appear in other API responses. When a provider says a token stopped working (the app was uninstalled), the device is removed for you.

## In development: the Push panel

Open **Push** in [devtools](/devtools#push). For every notification:

![The devtools Push panel: a notification shown on an iPhone lock screen and in the Android notification shade, with a warning that the body is cut off on Android](/images/devtools-push.webp)

- **Preview**: the iPhone lock screen, the Android notification shade and a desktop browser notification, closed or expanded, at real device widths and type sizes, so text cuts off where a phone cuts it.
- **Payloads**: the exact JSON for APNs, FCM, Expo and Web Push, with its size against the 4 KB limit.
- **Warnings**: a title or body that will be cut off, data that looks sensitive (`password`, `token`, `secret`...), non-string data for FCM, payloads a provider would reject.
- **Delivery**: what happened on each device, and a link to the request that sent it.

**New notification** composes one with a live preview and sends it through the same `app.push.send()` your code uses. **Copy as code** gives you the `ctx.push.send()` call for it.

No phone yet? **Devices** adds a simulated iPhone, Android phone or browser to any user. Simulated devices behave like real ones in your code and in devtools, and are never sent to a real provider, even when a transport is installed.

Agents see the same notifications with the [`calm_pushes`](/ai-agents#calm-mcp-tools-for-coding-agents) tool.

## Delivering for real

Add the block that matches how your app receives notifications:

| Block | Use it for |
|---|---|
| [`push-expo`](/blocks/push-expo) | Expo and React Native apps using `expo-notifications` |
| [`push-fcm`](/blocks/push-fcm) | Native Android and iOS apps and web apps using the Firebase SDK (iOS goes through FCM's APNs integration) |

```bash
npx calm add push-expo
```

With a transport installed:

- **Development** delivers to real tokens, so you can test on your own phone. Simulated devices stay in devtools.
- **Tests** keep capturing notifications in `t.pushes` and never call the provider.
- **Production** delivers, removes tokens the provider reports as gone, and logs failures.

In production without a transport, nothing is sent: `send()` returns `failed` and an error is logged.

### Your own transport

A transport is an object with a `send(message, devices)` method that returns one result per device:

```js
import { definePlugin } from '#calm';
import { providerPayloads } from '#calm/push.js';

export default definePlugin({
  name: 'push-onesignal',
  setup(calm) {
    calm.push.use({
      name: 'onesignal',
      async send(message, devices) {
        return Promise.all(devices.map(async (device) => {
          const payload = providerPayloads(message, device.token).fcm.payload; // or apns, expo, web
          // deliver it ...
          return { ok: true, id: 'provider-message-id' };
          // or { ok: false, error: 'reason', unregistered: true } to remove the device
        }));
      },
    });
  },
});
```

`devices` holds `{ id, user, token, platform, name }` for real devices only. `providerPayloads()` builds the same payloads devtools shows.

## Testing

Notifications are captured in tests, with everything devtools shows:

```js
test('shipping an order notifies the customer', async () => {
  const customer = await t.signup();
  await t.post('/auth/devices', { token: 'test-token-1', platform: 'ios' }, customer);
  const order = await createOrder(customer);

  await t.post(`/orders/${order.id}/ship`, {}, admin);

  const push = t.pushes.at(-1);
  assert.equal(push.message.title, 'Your order shipped');
  assert.equal(push.devices[0].platform, 'ios');
  assert.deepEqual(push.warnings.filter((w) => w.level !== 'info'), []);
});
```

Each record has `message`, `devices` (tokens masked), `payloads`, `warnings`, `status` and `log`.

## Events

`push.sent` and `push.failed` are emitted with `{ id, status, devices }`, for metrics or an audit trail:

```js
calm.on('push.failed', ({ id, devices }) => calm.log.warn('Push failed', { id, devices }));
```

## Good practice

- **Send an id, not the content.** Payloads travel through Apple, Google or a browser vendor and are shown on a lock screen. Put `{ orderId }` in `data` and let the app fetch the details from your API. Devtools warns about keys that look sensitive.
- **Lead with the point.** A closed Android notification shows one line of the body.
- **Send to many users from a [job](/blocks/jobs)**, not from the request.
- **Let people turn notifications off** with a field on the user, and check it before `send()`.
