# Push notifications via Expo (push-expo)

Delivers [`app.push`](/push-notifications) notifications to Expo push tokens (Expo and React Native apps) through the [Expo push service](https://docs.expo.dev/push-notifications/sending-notifications/), the way Expo documents it: batches, throttling, retries and push receipts. No SDK, just `fetch`. It works next to [push-fcm](/blocks/push-fcm): Expo tokens go through Expo, native FCM tokens through FCM, from the same `ctx.push.send()` call.

```bash
npx calm add push-expo
```

| Adds | |
|---|---|
| Files | `app/blocks/push-expo/index.js` |
| Environment | `EXPO_ACCESS_TOKEN=` |
| Collection | `calm_expo_tickets` (tickets waiting for their receipt) |

## Setup

1. In the app, get a token with `Notifications.getExpoPushTokenAsync({ projectId })` from `expo-notifications` and register it with `POST /api/auth/devices` (see [Registering devices](/push-notifications#registering-devices)).
2. Optional, recommended: turn on **enhanced push security** in your Expo project settings, create an access token and set `EXPO_ACCESS_TOKEN`. Without it, anyone who learns a device token can send it notifications. `calm doctor` warns about this in production.
3. Send from your code: `await ctx.push.send({ to: userId, title, body })`.

## What it does

- Takes Expo push tokens only (`ExponentPushToken[...]`, `ExpoPushToken[...]`). Other tokens go to another transport, such as push-fcm, or are reported in the delivery log.
- Sends the Expo payload shown in the devtools **Push** panel: up to 100 notifications per request, at most 6 requests at a time and 600 notifications a second, gzip above 1 KB.
- Retries network errors, `429` and `5xx` answers with backoff. Tokens of several Expo projects in one batch are split and sent per project.
- Logs Expo's ticket id per device in the **Delivery** tab, with a hint for common errors (missing access token, invalid credentials, payload too big).
- Removes devices Expo reports as `DeviceNotRegistered` (the app was uninstalled or the token expired).

## Receipts

Expo first answers with a ticket: it accepted the notification. Whether Apple or Google took it comes later, as a receipt. The block stores the tickets and checks the receipts for you: 15 minutes after sending in production (every 5 minutes), 1 minute in development (every 30 seconds), so you see the result in devtools while you are still looking.

- A receipt lands in the same delivery log as the notification, and `push.receipt` is emitted with `{ id, device, ok, error, unregistered }`.
- `DeviceNotRegistered` removes the device. Credential errors are logged as errors, with what to fix.
- Tickets without a receipt after 24 hours are dropped with a warning (Expo keeps receipts for 24 hours).

Run a check yourself with `app.ext.pushExpo.checkReceipts({ olderThan: 0 })`, for example from a [job](/blocks/jobs) or a test.

## Development and tests

In development the block delivers to real Expo tokens, so you can test on your phone with Expo Go or a development build: paste your token in devtools (**Push**, **Devices**, **Add device**) or let the app register it. [Simulated devices](/push-notifications#simulated-devices) never leave your machine. In tests nothing is sent: notifications are captured in `t.pushes`, unless `EXPO_API_URL` points at a fake server.

| Variable | |
|---|---|
| `EXPO_ACCESS_TOKEN` | Access token for enhanced push security |
| `EXPO_API_URL` | Expo push API base URL (default `https://exp.host/--/api/v2`): a proxy, or a fake server in tests |
