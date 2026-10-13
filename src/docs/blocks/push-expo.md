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

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/push-expo/AGENTS.md` and in the devtools Blocks panel.

- [Expo: Send notifications with the Expo push service](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Expo: Push notifications overview](https://docs.expo.dev/push-notifications/overview/)
- [Expo: Push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo SDK: Notifications (expo-notifications)](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo: FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [expo-server-sdk-node (GitHub)](https://github.com/expo/expo-server-sdk-node)

## For AI agents

Coding agents read these notes in `app/blocks/push-expo/AGENTS.md`:

- Read first: `app/blocks/push-expo/index.js` (`calm.push.use` transport, `request` with retries, `sendBatch`, `throttle`, `checkReceipts`).
- Configuration: env `EXPO_ACCESS_TOKEN` (secret; required when enhanced push security is on for the Expo project, recommended) and `EXPO_API_URL` (tests and proxies). No `calm.config.js` options.
- Send from features with `ctx.push.send` or `app.push.send({ to: userId, title, body, url, data, badge, collapseId, channel })`; never call the Expo API directly. The payload is built by the core: `providerPayloads(message, token).expo.payload`.
- Devices register through the core: `POST /api/auth/devices { token, platform }` with the `ExponentPushToken[...]` from `getExpoPushTokenAsync({ projectId })`.
- Invariant: keep Expo's limits: at most 100 messages per request (`SEND_BATCH`), 6 requests in flight (`CONCURRENCY`), 600 notifications a second (`throttle`), gzip above 1 KB, retries with backoff only on network errors, 429 and 5xx.
- Invariant: never log `EXPO_ACCESS_TOKEN` or full device tokens.
- `accepts()` only takes Expo tokens, so push-fcm handles native FCM tokens from the same `push.send`. Keep `isExpoPushToken` in line with the Expo SDK check.
- Receipts: tickets go to `calm_expo_tickets` and are checked every 5 minutes once 15 minutes old in production (30 s and 1 min in development). `DeviceNotRegistered` is reported through `calm.push.receipt(..., { unregistered: true })`, which deletes the device; tickets older than 24 hours are dropped.
- Task, check receipts now: `await app.ext.pushExpo.checkReceipts({ olderThan: 0 })`.
- Tests: in test mode without `EXPO_API_URL` the transport is not registered and the core captures pushes; point `EXPO_API_URL` at a fake server to exercise this code.
- Pitfall: `PUSH_TOO_MANY_EXPERIENCE_IDS` (tokens of several Expo projects in one batch) is handled by splitting per project; keep that branch when refactoring.
- Pitfall: `InvalidCredentials` or `MismatchSenderId` receipts mean the FCM V1 key or APNs credentials in EAS are wrong: fix them with `eas credentials`, not in code.
- Pitfall: payloads are limited to 4096 bytes (`MessageTooBig`): send ids in `data`, not documents.

<!-- block-guide:end -->
