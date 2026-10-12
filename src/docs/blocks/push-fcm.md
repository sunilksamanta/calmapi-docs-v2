# Push notifications via Firebase Cloud Messaging (push-fcm)

Delivers [`app.push`](/push-notifications) notifications to Android, iOS and web apps through the [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/send-message). No SDK: the block signs a service account token with `node:crypto` and calls FCM with `fetch`. It works next to [push-expo](/blocks/push-expo): native tokens go through FCM, Expo push tokens through Expo, from the same `ctx.push.send()` call.

```bash
npx calm add push-fcm
```

| Adds | |
|---|---|
| Files | `app/blocks/push-fcm/index.js` |
| Environment | `FCM_SERVICE_ACCOUNT=` |

## Setup

1. In the Firebase console: **Project settings**, **Service accounts**, **Generate new private key**. Keep the JSON file out of git.
2. Set `FCM_SERVICE_ACCOUNT` to the path of that file, or to the JSON itself (handy on hosts that only take environment variables). `GOOGLE_APPLICATION_CREDENTIALS` works too.
3. For iOS, upload your APNs authentication key in **Project settings**, **Cloud Messaging**. FCM delivers to Apple for you.
4. In the app, get a token from the Firebase SDK (`getToken()`) and register it with `POST /api/auth/devices` (see [Registering devices](/push-notifications#registering-devices)).
5. Send from your code: `await ctx.push.send({ to: userId, title, body })`.

## What it does

- Takes every token except Expo push tokens (`ExponentPushToken[...]`), which belong to push-expo. With both blocks installed, each device goes to the right service.
- Exchanges a JWT signed with the service account key (RS256) for an access token, cached until a minute before it expires.
- Sends the FCM payload shown in the devtools **Push** panel, one request per device, ten at a time. The payload includes the Android, APNs (push type and priority) and Web Push settings for the message.
- Logs FCM's message name per device (**Delivery** tab in devtools).
- Removes devices FCM reports as `UNREGISTERED` (the app was uninstalled or the token expired).

In development it delivers to real tokens, so you can test on your phone. [Simulated devices](/push-notifications#simulated-devices) never leave your machine. In tests nothing is sent: notifications are captured in `t.pushes`.

`calm doctor` reports an error when the service account cannot be read or misses `project_id`, `client_email` or `private_key`, and in production when it is not set.

| Variable | |
|---|---|
| `FCM_SERVICE_ACCOUNT` | Path to the service account JSON, or the JSON itself |
| `GOOGLE_APPLICATION_CREDENTIALS` | Used when `FCM_SERVICE_ACCOUNT` is not set |
| `FCM_API_URL` | Override the FCM endpoint (a proxy, or a fake server in tests) |
