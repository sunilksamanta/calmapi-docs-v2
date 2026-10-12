# Push notifications via Expo (push-expo)

Delivers [`app.push`](/push-notifications) notifications to Expo and React Native apps through the [Expo push service](https://docs.expo.dev/push-notifications/sending-notifications/). No SDK: one `fetch` call per 100 devices.

```bash
npx calm add push-expo
```

| Adds | |
|---|---|
| Files | `app/blocks/push-expo/index.js` |
| Environment | `EXPO_ACCESS_TOKEN=` |
| Conflicts with | [`push-fcm`](/blocks/push-fcm) |

## Setup

1. In the app, get a token with `getExpoPushTokenAsync()` from `expo-notifications` and register it with `POST /api/auth/devices` (see [Registering devices](/push-notifications#registering-devices)).
2. Optional, recommended: turn on **enhanced push security** in your Expo project settings, create an access token and set `EXPO_ACCESS_TOKEN`. Without it, anyone who learns a device token can send it notifications. `calm doctor` warns about this in production.
3. Send from your code: `await ctx.push.send({ to: userId, title, body })`.

## What it does

- Sends the Expo payload shown in the devtools **Push** panel, up to 100 devices per request.
- Logs Expo's ticket id per device (**Delivery** tab in devtools).
- Removes devices Expo reports as `DeviceNotRegistered` (the app was uninstalled or the token expired).
- Rejects tokens that are not Expo push tokens (`ExponentPushToken[...]`) without calling Expo, and says so in the delivery log.

In development it delivers to real Expo tokens, so you can test on your phone with Expo Go or a development build. [Simulated devices](/devtools#push) never leave your machine. In tests nothing is sent: notifications are captured in `t.pushes`.

Expo returns a ticket when it accepts a notification. The final delivery receipt from Apple or Google comes later from Expo's receipts endpoint; check it from a [job](/blocks/jobs) if you need it.

| Variable | |
|---|---|
| `EXPO_ACCESS_TOKEN` | Access token for enhanced push security |
| `EXPO_PUSH_URL` | Override the endpoint (a proxy, or a fake server in tests) |
