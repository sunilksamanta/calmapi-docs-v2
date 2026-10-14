# Realtime (realtime-sse)

Live resource changes over [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events). Every event is checked for every subscriber with the same rules as `GET /api/<resources>/:id`: the read policy, owner scoping, the service's `scope()` and field visibility. The stream never shows anything the REST API would not.

```bash
npx calm add realtime-sse
```

| Adds | |
|---|---|
| Files | `app/blocks/realtime-sse/index.js` |
| Routes | `POST /api/realtime/ticket` (authenticated), `GET /api/realtime/stream` (public) |

## Subscribe

Browsers' `EventSource` cannot send an `Authorization` header, and session tokens must not travel in URLs, so signed-in clients first exchange their session for a **single-use ticket** valid for 60 seconds:

```js
const res = await fetch('/api/realtime/ticket', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
const { data } = await res.json(); // { ticket, expiresIn: 60 }

const events = new EventSource(`/api/realtime/stream?resources=post,comment&ticket=${data.ticket}`);

events.addEventListener('post.created', (e) => addPost(JSON.parse(e.data)));
events.addEventListener('post.updated', (e) => updatePost(JSON.parse(e.data)));
events.addEventListener('post.deleted', (e) => removePost(JSON.parse(e.data).id));
```

Anonymous visitors can subscribe without a ticket and receive only what `public` read policies allow:

```js
const events = new EventSource('/api/realtime/stream?resources=post');
```

## Events

| Event | Data |
|---|---|
| `ready` | `{ resources, user }`, sent once when the stream opens |
| `<resource>.created` | The record, serialized for this subscriber |
| `<resource>.updated` | The record, serialized for this subscriber |
| `<resource>.deleted` | `{ id }` |
| `<resource>.restored` | The record (with the [soft-delete](/blocks/soft-delete) block) |

With the `api` template's posts, a visitor's stream only carries published posts, while the author's stream also carries their own drafts, and neither ever contains the author's email.

Every event goes through [`app.canRead()`](/building-blocks#reading-records-outside-a-request), the rules of `GET /api/<resource>/:id` (read policy, owner scoping and the service `scope()`). That includes `deleted` events: a subscriber only learns that a record was deleted if they could read it.

## Errors

| Status | When |
|---|---|
| `400` | `resources` is missing or names an unknown resource |
| `401` | The ticket is unknown, expired or already used |

The connection sends a comment every 25 seconds to stay open through proxies, and tells clients to reconnect after 3 seconds. Behind nginx, `X-Accel-Buffering: no` is set so events are not buffered. Get a new ticket before reconnecting a signed-in stream.

## Several instances

Events are in-process: a subscriber only receives changes made by the instance it is connected to. With several instances, either pin realtime clients to one instance, or forward events between instances, for example by publishing them from a MongoDB change stream in each instance. The block's code in `app/blocks/realtime-sse/index.js` is the place to add that.

The devtools **Realtime** panel lists connected subscribers and pending tickets.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/realtime-sse/AGENTS.md` and in the devtools Blocks panel.

- [WHATWG HTML Standard: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN: EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [MongoDB change streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [NGINX proxy module (proxy_buffering, X-Accel-Buffering)](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

## For AI agents

Coding agents read these notes in `app/blocks/realtime-sse/AGENTS.md`:

- Read first: `app/blocks/realtime-sse/index.js` (ticket route, stream route, the `calm.on('*')` fan-out).
- Routes: `POST /api/realtime/ticket` (authenticated) returns `{ ticket, expiresIn: 60 }`; `GET /api/realtime/stream?resources=post,product&ticket=...` (public policy; without a ticket the subscriber is anonymous).
- Configuration: none (no options, no env vars). `TICKET_TTL_MS` (60 s) and the 25 s ping are constants in the file.
- Invariant: session tokens never go in URLs. EventSource cannot send headers, so clients trade their session for a ticket: 24 random bytes, 60 seconds, deleted on first use. Keep tickets single use and short lived.
- Invariant: every event is checked per subscriber with `calm.app.canRead(entry, doc, user, { deleted })` and serialized with `serialize(def, doc, { user })`, so policies, owner scoping, `scope()` and `visibleTo()` match the REST API. Never write `payload.doc` to the stream.
- Invariant: `<resource>.deleted` events carry only `{ id }`.
- Streamed events: `<resource>.created|updated|deleted|restored` emitted by resource services. Writes made directly on models emit nothing and are not streamed.
- Task, stream another event: write `event: <name>\ndata: <json>\n\n` only to subscribers that pass the same `canRead` check, and keep the `<resource>.<action>` naming so client `addEventListener` calls keep working.
- Pitfall: tickets and subscribers live in process memory. With several instances a ticket only works on the instance that issued it (sticky sessions, or move tickets to MongoDB), and each instance streams only the changes it handled. Cross instance fan-out (MongoDB change streams, needs a replica set) is not built in.
- Pitfall: EventSource reconnects with the same URL, and the ticket in it is already used (401). Clients must fetch a new ticket and open a new EventSource on error.
- Pitfall: the user on a ticket is a snapshot; role changes and revoked sessions apply only when the stream reconnects.
- Proxies: responses send `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform`. Make sure proxies do not buffer and their idle timeout is longer than the 25 s ping.

<!-- block-guide:end -->
