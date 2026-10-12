# Shared rate limits (rate-limit-mongo)

Stores rate limit counters in MongoDB, so limits hold across every instance of your API instead of per process.

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
