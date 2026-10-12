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
