# Devtools

In development, every CalmAPI app serves a dashboard at **`http://localhost:5001/_calm`**. It shows what your API is doing right now: requests with their MongoDB queries, logs, emails, push notifications on simulated phones, routes, resources, data and the blocks you installed, plus a playground to call the API as any user. It also shows what an AI agent is changing in your project, lets you review and sign it, shows what each route costs, and who can access what.

```bash
npm run dev
# open http://localhost:5001/_calm
```

The collector is part of your app (`calm/devtools/index.js`). The interface is the `@calmapi/devtools` package, a dev dependency of every new project. If it is missing, `/_calm` shows how to install it (`npm install -D @calmapi/devtools`) and the JSON API keeps working.

## Panels

### Requests

A live list of every request (over Server-Sent Events): method, path, status, duration, the user who made it, and how many MongoDB queries it ran. Quick filters show **Errors**, **Slow** requests (300 ms or more) and **N+1** suspects (more than 10 queries). A second view lists **background queries** that ran outside any request (jobs, startup).

Open a request to see:

- **Timeline**: the request and each query as a waterfall, with log lines placed in time.
- **Path**: the way the request took through the code, step by step: rate limits, authentication, guards, the policy decision token by token (with the file and line of the policy), validation, the handler, your service hooks, events and the error. A `403` or `404` names its exact reason. See [Explain a request](/request-path).
- **Queries**: every MongoDB command with its filter, duration and document count. Repeated query shapes are flagged. **Explain** runs the query planner and tells you whether an index was used or the collection was scanned (`COLLSCAN`).
- **Request** and **Response**: headers and bodies. Passwords, tokens, keys and other secret-looking values are redacted in both (in responses the first characters of a long value stay, so you can tell them apart), and the `Authorization` header is shortened.
- **Logs**: everything logged during the request, linked by request id.
- **Error**: the original error and stack trace, with links that open the file in VS Code.

From there you can copy the request as `curl` or as a call of the [typed client](/client) (**Copy as client call**), edit it in the Playground, replay it, replay it as the user who made it, or **Save as test**: write it as `test/recorded/<name>.test.js`, a plain `node --test` file that makes the same request as the same kind of user on a throwaway database (see [Replay and recorded tests](/replay#save-as-test)).

**Replay all** sends the last 200 recorded reads again, as the users who made them, against the code as it is now, and shows which answers changed status or shape (see [Replay](/replay)). Requests a replay sends carry a **replay** tag; they are not recorded as traffic and not counted for budgets.

A request that went over its route's [budget](/budgets) (more MongoDB queries or a larger response than allowed, or slower than the p95 limit) has an **over budget** tag that opens the Budgets panel.

Requests that carry an `X-Calm-Agent` header (the [`calm_http`](/ai-agents#calm-mcp-tools-for-coding-agents) tool sends it) are marked as sent by an AI agent, with its name, and the **Agent** filter shows only those.

### Activity

A live feed of what is happening to the project, read from `.calm/activity.jsonl` (see [Watching an agent work](/ai-agents#watching-an-agent-work)): agent tool calls, file changes with their diffs, marked as made by an agent or by you, server restarts and crashes with their error output. Filter by agent, files or server events.

It also shows the current agent session and its [scope](/ai-agents#scopes-what-an-agent-may-do), refused tool calls in red, agent edits to protected paths or access rules with a warning badge, changes an agent [proposed](/ai-agents#proposals-the-agent-describes-you-apply) with an **Apply** button, and [checkpoints](/checkpoints) with a **Restore** button.

### Logs

A live tail of the app log with level filters, text search and a link from each line to the request that wrote it.

### Mail

In development, nothing is delivered: emails go to this inbox instead, password reset links included. The empty state shows a `curl` command (and a Playground shortcut) to trigger a reset email.

### Push

Every [push notification](/push-notifications) the app sent, live, as it would appear on an iPhone lock screen, in the Android notification shade and as a desktop browser notification. Switch between closed and expanded; previews use real device widths and type sizes, so text is cut off where a phone cuts it. Each notification also shows:

- **Payloads**: the exact JSON for APNs, FCM, Expo and Web Push, with its size against the 4 KB limit.
- **Warnings**: titles and bodies that will be cut off, data keys that look sensitive, non-string data for FCM, payloads a provider would reject.
- **Delivery**: what happened on each device, step by step: the transport that took it (or the simulator), the provider's answer, receipts that came later, whether the phone showed it, and the request that sent it.

**New notification** composes one with a live preview and sends it through `app.push.send()`; **Send again** reopens a sent one in the composer and **Copy as code** gives you the `ctx.push.send()` call.

**Devices** lists every registered device with its user, masked token, the transport it goes through and when it was last seen. **Add device** gives any user as many devices as you like:

- **Simulated** iPhones, Android phones and browsers, each with a behavior: delivers, offline, notifications off, app uninstalled, invalid token or rate limited. They answer like real phones and never reach a real provider. See [Simulated devices](/push-notifications#simulated-devices).
- **Real tokens** pasted from your phone (an Expo or FCM token), delivered through the installed transport.

From a device's row you can change its behavior, send it a test, **Rotate** its token (the old one fails once and is removed, as in production) or **Remove** it. Click a simulated device to open it as a **phone**: its own lock screen with the notifications it received, the ones waiting while it is offline and the ones hidden because notifications are off. **Bring online**, **Uninstall app**, **Clear** and tapping a notification (which emits `push.opened`) are there too, and the lock screen updates live.

Without a transport block, notifications to real devices are only captured here. With [push-expo](/blocks/push-expo) or [push-fcm](/blocks/push-fcm) installed (or both), real devices receive them in development too.

### Routes

Every endpoint grouped by resource, block or source, with its policy and the file that defines it. Filter by policy, and spot routes whose policy is **not explicit**. A route whose file an AI agent changed and nobody signed yet has an **unsigned** badge that opens [Review](#review).

### Resources

A diagram of how resources reference each other, then each resource with its policies (defaulted ones highlighted), owner field and fields. Each field shows its type and flags (`hidden`, `readOnly`, `filterable`...) and whether it is readable (R) and writable (W) through the API. Resources with an agent change nobody signed have an **unsigned** badge, as in Routes.

### Data

Browse the documents of each resource with the **privacy lens**: for each record, what MongoDB stores next to what the API returns, and why each missing field is missing (`hidden`, `password`, `visible to owner | admin`...). **View as** switches the viewer between anonymous and any user, so you can check exactly what Alice sees of Bob's records. Password hashes are masked.

**Sample data** adds 10 records that look real to the resource you are looking at: names that look like names, prices like prices, values from enums, dates in the past or the future depending on the field name, and references to records that exist (referenced resources get a few records first). Records are created through the service, so validation and hooks run. When there are no users yet, demo users are created to own the records, and their email and password are shown. From a terminal: [`calm seed`](/cli#calm-seed).

**Checkpoints** snapshots the development database and restores or deletes the snapshots you have, each with a confirmation that says what will be replaced. See [Checkpoints](/checkpoints).

### Blocks

Every block in the app, from [`calm add`](/blocks) or [written here](/building-blocks):

- **Origin**: the address and version it was installed from (`calm.lock`), or "your own block", and the files you changed since installing it.
- **Hooks**: the extension points it uses, such as a guard, an authenticator, named policies, the events it listens to, a push or mail transport, what it provides on `app.ext`, doctor checks and devtools panels.
- **Environment**: each variable it declares, set or missing (missing required ones are flagged, and the panel's badge counts blocks with missing variables). The values of secret variables never leave the server.
- **Options**: its settings after `calm.config.js` overrides, with secret-looking keys redacted.
- **Routes**: every route it adds, with its policy.
- **Official documentation**: links to the documentation of what the block integrates (Stripe, Twilio, OpenID Connect, OWASP...), from its `AGENTS.md`.
- **For AI agents**: the block's instructions for coding agents (the rules it must keep, its options, common tasks), with a link to `app/blocks/<name>/AGENTS.md`. See [Agents and links](/building-blocks#agents-and-links-the-blocks-own-guide).

### Review

What changed since a person last signed, and a form to sign it: the behavior changes (routes, who may call them, fields more people can see, env vars, hosts, events, invariants) with links to their files, the files AI agents wrote that nobody signed, what agents declared with `calm_declare` next to what they did, and the last test run. **Sign** takes your name and email (filled in from your git settings) and an optional note, and writes `.calm/reviews/` for you to commit. Once something has been signed, the badge counts the changes and agent files left to sign, in red when access widens or an agent's changes do not match what it declared. See [Review and sign](/review).

### Budgets

What each route costs, measured on every request while the dev server runs: requests, the most MongoDB queries one request ran, the p95 time and the largest response, each next to its budget from `calm.config.js`, and the budget key that applies. Routes over budget come first, in red, and the badge counts them. **Reset** forgets the measurements so far. Without budgets the numbers are shown anyway, with an example to copy. See [Budgets](/budgets).

### Playground

Send requests to your API with route suggestions and sample bodies built from the resource fields. **Act as** signs you in as any user: devtools creates a real session for them and keeps it in memory for the Playground and replays. It is the quickest way to test policies.

### Doctor

The runtime checks of `calm doctor` (configuration, policies, exposed secrets, personal data exposure, unknown references, broken [invariants](/invariants), access wider than the [exposure budget](/exposure-budget)), grouped by level and updated live. Run `npx calm doctor` in a terminal to add the static checks on your source files. See [Security](/security#what-calm-doctor-checks).

### Security

Who can access what, and what happened:

- **Access**: the [exposure matrix](/security#exposure-matrix), per resource: which actions anonymous visitors, users, owners, custom roles and admins may perform, and which fields each can read and write.
- **Events**: the [security events](/security#security-events) of the dev server, live: failed sign-ins, lockouts, bad tokens, rejected writes, `403`s.
- **Posture**: sessions, password rules, lockout, rate limits, CORS, encryption keys and encrypted fields, JSON limits and security headers.

**Run audit** runs [`calm audit`](/audit) on a throwaway database on the dev server's MongoDB and shows the result in the matrix.

### About

The [transparency report](/transparency): the request pipeline in the order it runs, the headers the framework sets, every collection with its owner and lifetime, what it logs and redacts, the hosts the code can reach (with the check that `calm/` reaches none), and every file the CLI writes.

### Block panels

Blocks can add panels, listed under **Blocks** in the sidebar:

| Block | Panel |
|---|---|
| [webhooks](/blocks/webhooks) | Endpoints with their status, the latest deliveries with status codes, errors and next retries, and how many are pending |
| [notifications](/blocks/notifications) | Every notification type with its channels, and the latest inbox entries |
| [api-keys](/blocks/api-keys) | Keys with owner, prefix, scopes, status and last use |
| [feature-flags](/blocks/feature-flags) | Every flag with its rollout, targeting, variants and last change |
| [jobs](/blocks/jobs) | Queue statistics and recent jobs |
| [realtime-sse](/blocks/realtime-sse) | Connected subscribers and pending tickets |
| storage blocks | Their configuration |

Your own block adds one with [`calm.devtools.panel()`](/building-blocks#extension-points).

### Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Focus the filter |
| `j` / `k` | Next / previous item |
| `Enter` | Open the selected item |
| `Esc` | Close the detail view |
| `1` to `9` | Switch panel |
| `Ctrl + Enter` | Send (Playground, Push) |
| `n` | New notification (Push) |
| `?` | Show the shortcuts |

The theme follows your system, or pick light or dark in the top bar.

The top bar also shows the database the app is connected to. With [`calm dev --agent-db`](/ai-agents#a-database-the-agent-can-break-calm-dev---agent-db) it is marked **copy**, and its tooltip names the database it was copied from.

## Safety model

Devtools can read your data and create sessions, so it is locked down:

- **Development only.** It is on when the mode is `development` (`calm dev`). In production it is forced off, even if `calm.config.js` turns it on. MongoDB command monitoring is only enabled while devtools is on.
- **This machine only.** Every `/_calm` request must arrive on a loopback socket (`127.0.0.1` or `::1`), with a `Host` header of `localhost`, `127.0.0.1` or `::1`, and without proxy headers (`X-Forwarded-For`, `Forwarded`). Anything else gets a plain `404`, which also defeats DNS rebinding.
- **No cross-site writes.** Requests that change something (act as, explain, clear, run audit, sample data, send a test notification, add or change a device, replay, save as test, sign a review) need an `X-Calm-Devtools: 1` header, which a page on another site cannot send. `/_calm` has no CORS headers, a strict Content-Security-Policy and refuses to be framed.
- **Secrets stay out.** Request and response bodies are stored with secret-looking values redacted, the `Cookie` header is redacted, and the `Authorization` header is shortened. Block environment variables marked secret are never sent to the page.
- **Bounded memory.** It keeps the last 300 requests, 1,000 log lines, 100 emails, 100 push notifications, 200 background queries, 500 activity events and 300 security events. Push records never hold a full device token.

"Act as" is logged (`Devtools: acting as ada@example.com`) and creates an ordinary session that expires like any other.

## For tools and agents

The panels use a small JSON API under `/_calm/api` that you can call from scripts on the same machine (writes need the `X-Calm-Devtools: 1` header):

| Endpoint | Returns |
|---|---|
| `GET /_calm/api/overview` | App, runtime, database, resources, routes, and blocks (origin, changed files, hooks, env vars without secret values, options, routes) |
| `GET /_calm/api/requests`, `GET /_calm/api/requests/:id` | Recent requests, one request in full |
| `GET /_calm/api/logs`, `GET /_calm/api/mails` | Recent logs and emails |
| `GET /_calm/api/pushes` | Recent push notifications: message, devices, payloads, warnings and delivery log |
| `GET /_calm/api/devices?user=<userId>` | Registered and simulated devices (tokens masked), with the transport each goes through |
| `POST /_calm/api/devices` `{ userId, platform, behavior?, name?, token? }` | Adds a simulated device, or a real one when `token` is given |
| `GET /_calm/api/devices/behaviors` | The simulated behaviors and what each does |
| `PATCH /_calm/api/devices/:id` `{ behavior?, name? }` | Changes a device (behavior: simulated devices only) |
| `POST /_calm/api/devices/:id/rotate` | Rotates a simulated device's token: returns the new device, the old one fails on the next send |
| `GET /_calm/api/devices/:id/inbox` | A simulated device's lock screen |
| `POST /_calm/api/devices/:id/online` | Brings an offline device back and shows what was waiting |
| `POST /_calm/api/devices/:id/inbox/:pushId/open` | Taps a notification on the lock screen (emits `push.opened`) |
| `DELETE /_calm/api/devices/:id/inbox`, `DELETE /_calm/api/devices/:id` | Clears a lock screen, removes a device |
| `POST /_calm/api/push/test` `{ userId \| deviceIds, ...message }` | Sends a notification through `app.push.send()` |
| `POST /_calm/api/seed` `{ resource, count }` | Creates sample records (up to 200) through the services |
| `GET /_calm/api/doctor` | Runtime doctor findings |
| `GET /_calm/api/activity` | Project activity from `.calm/activity.jsonl`, newest first |
| `GET /_calm/api/security` | Exposure matrix, security events and posture |
| `POST /_calm/api/audit` | Runs the security audit on a throwaway database and returns the report |
| `GET /_calm/api/resources/:name/docs?as=<userId>` | Stored vs returned documents |
| `POST /_calm/api/act-as` `{ userId }` | A session token for that user |
| `GET /_calm/api/review` | The [review](/review): changes since the last signature, unsigned agent files, declarations, tests |
| `GET /_calm/api/review/signer` | The name and email the Sign form starts with (`GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`, else git config) |
| `POST /_calm/api/review/sign` `{ name, email?, note? }` | Signs the review and writes `.calm/reviews/` |
| `GET /_calm/api/budgets`, `DELETE /_calm/api/budgets` | What each route costs against its [budget](/budgets); forget the measurements |
| `GET /_calm/api/traffic` | How many requests are recorded in `.calm/traffic.jsonl`, how many are reads, and the newest |
| `POST /_calm/api/replay` `{ limit?, writes? }` | [Replays](/replay) recorded traffic and returns the report |
| `POST /_calm/api/requests/:id/test` | Writes the request as `test/recorded/<name>.test.js` and returns `{ file, content }` |

The [`calm mcp`](/ai-agents) server uses this API to give coding agents the recent requests, logs, emails, push notifications and security events of your dev server, to replay traffic (`calm_replay`), to read budgets (`calm_budgets`), and to sign in as other users for `calm_http`. It never signs a review.
