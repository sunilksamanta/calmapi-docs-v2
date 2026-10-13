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

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/push-fcm/AGENTS.md` and in the devtools Blocks panel.

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [FCM: Send a message (HTTP v1)](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [FCM HTTP v1 REST reference: projects.messages](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
- [FCM HTTP v1 error codes](https://firebase.google.com/docs/reference/fcm/rest/v1/ErrorCode)
- [FCM: Manage registration tokens](https://firebase.google.com/docs/cloud-messaging/manage-tokens)
- [Google OAuth 2.0 for server to server applications](https://developers.google.com/identity/protocols/oauth2/service-account)

## For AI agents

Coding agents read these notes in `app/blocks/push-fcm/AGENTS.md`:

- Read first: `app/blocks/push-fcm/index.js` (`loadServiceAccount`, `accessToken`, `sendOne`, the `calm.push.use` transport).
- Configuration: env `FCM_SERVICE_ACCOUNT` (secret: the service account JSON or a path to it), `GOOGLE_APPLICATION_CREDENTIALS` (fallback path) and `FCM_API_URL` (tests and proxies). No `calm.config.js` options.
- Invariant: the service account private key never leaves the process. Never log the JSON, the signed JWT or the access token, and keep the file out of git.
- Auth: an RS256 JWT (`iss` = `client_email`, scope `firebase.messaging`, `aud` = `token_uri`) is exchanged for an OAuth access token, cached until 60 s before it expires and dropped on a 401.
- Sending: one `POST /v1/projects/<project_id>/messages:send` per device, 10 at a time. HTTP v1 has no multicast, so send large audiences from a job.
- `UNREGISTERED` results are returned with `unregistered: true` and the core deletes the device; other errors are returned per device, never thrown.
- Send from features with `ctx.push.send` or `app.push.send({ to, title, body, url, data, badge, collapseId, channel })`. The FCM payload comes from the core (`providerPayloads(message, token).fcm.payload`, the same one the devtools Push panel shows), not from this file.
- `accepts()` skips Expo push tokens so push-expo can be installed next to it.
- iOS delivery goes through FCM only after an APNs auth key is uploaded in the Firebase console (Project settings, Cloud Messaging). Web tokens need the Firebase web SDK with a VAPID key on the client.
- Tests: in test mode without `FCM_API_URL` the transport is not registered and the core captures pushes. `calm doctor` errors when the service account is invalid, or missing in production.
- Pitfall: FCM `data` values must be strings; keep `data` flat and small (ids, not documents).

<!-- block-guide:end -->
