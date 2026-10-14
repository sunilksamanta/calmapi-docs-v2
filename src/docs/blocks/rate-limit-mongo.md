# Shared rate limits (rate-limit-mongo)

Stores rate limit counters in MongoDB, so limits hold across every instance of your API instead of per process.

**When you need it:** not for one server, where the built-in in-memory store is right. You need it as soon as more than one process serves the API: several containers or VMs, a load balancer, PM2 cluster mode, or autoscaling.

```bash
npx calm add rate-limit-mongo
```

| Adds | |
|---|---|
| Files | `app/blocks/rate-limit-mongo/index.js` |
| Collection | `calm_rate_limits` (cleaned up by a TTL index) |

Nothing to configure: once added, the global limit, the auth limit and per-route `rateLimit` options all count in MongoDB. The limits themselves stay in `config.rateLimit` (see [Configuration](/configuration)).

## Why

The default store keeps counters in memory. With three instances behind a load balancer, a client effectively gets three times the limit, and the login limit (10 attempts per 15 minutes) becomes 30. With this block every instance shares one counter per client and window.

## How it works

Fixed windows: one document per key and window (`<limit>:<ip>:<window start>`), incremented atomically with an upsert, with an expiry date at the end of the window. MongoDB's TTL monitor removes old documents (it runs about once a minute, so the collection holds slightly more than the current windows).

Each limited request costs one small write. Behind a proxy, set `TRUST_PROXY` so the key is the client's IP and not the proxy's.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/rate-limit-mongo/AGENTS.md` and in the devtools Blocks panel.

- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MongoDB findOneAndUpdate](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/)
- [MongoDB $inc](https://www.mongodb.com/docs/manual/reference/operator/update/inc/)
- [IETF draft: RateLimit header fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
- [RFC 6585: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html)
- [OWASP Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

## For AI agents

Coding agents read these notes in `app/blocks/rate-limit-mongo/AGENTS.md`:

- Read first: `app/blocks/rate-limit-mongo/index.js` (about 25 lines; it sets `calm.app.rateStore`).
- What it does: replaces the in-memory store used by the core rate limiter (`core/http/middleware.js`) with fixed window counters in `calm_rate_limits`: `_id` = `<key>:<windowStart>`, `$inc: { count: 1 }`, TTL index on `expiresAt` (the end of the window).
- Configuration: none here. The limits stay in `config.rateLimit` (`enabled`, `global`, `auth`) and in route options such as `rateLimit: { windowMs, max, key }` or `rateLimit: 'auth'`.
- Interface to keep: `rateStore.hit(key, windowMs)` resolves `{ count, resetAt }` (ms timestamp); the core compares `count` with `max` and sets the `RateLimit-*` and `Retry-After` headers.
- Invariant: one atomic `findOneAndUpdate` with `upsert` per hit. Never read then write: concurrent requests on several instances would undercount.
- Invariant: keys contain IPs and user ids; store nothing but the counter and do not log keys in bulk.
- Fixed windows allow up to twice `max` around a window boundary. If you need smoother limits, implement a sliding window but keep the `hit()` return shape.
- Every rate limited request now costs one MongoDB round trip by `_id`; do not add indexes or extra queries to it.
- Pitfall: when MongoDB is unreachable `hit()` rejects and the request fails in the error handler (fail closed). Wrapping it to fail open is a security decision: discuss it before changing.
- Pitfall: the TTL monitor runs about once a minute, so finished windows linger briefly; they are never read again because the window start changes.
- Use it when the API runs on more than one instance; a single instance is fine with the default memory store.

<!-- block-guide:end -->
