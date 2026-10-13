# Replay and recorded tests

Tests check what you thought of. Replay checks what actually happened: while you click through your app, the dev server records the requests it serves, and after a change `calm replay` sends them again, as the same users, against the code as it is now. It tells you which answers changed: a status, a field that is newly returned (a possible leak), a field that is gone, a type, the size of a list.

```bash
npm run dev               # use your app or API as usual: requests are recorded
npx calm replay           # after a change: the last 200 reads, replayed
npx calm replay --writes  # writes too, and the data is put back afterwards
```

## What is recorded

With devtools on (in development), every request that matched an API route is appended to `.calm/traffic.jsonl`, one JSON object per line:

```json
{
  "id": "4e7b215b-4ec1-403f-b1a5-0a39c1a7705b",
  "time": "2026-10-13T21:34:25.259Z",
  "method": "GET",
  "path": "/api/products",
  "route": "/api/products",
  "user": { "id": "6acea3e1dbe9e2d47e219400", "roles": ["user"] },
  "body": null,
  "status": 200,
  "shape": {
    "object": {
      "data": {
        "array": {
          "object": {
            "createdAt": "string", "id": "string", "name": "string", "owner": "string",
            "price": "number", "status": "string", "tags": { "array": null, "length": 0 }, "updatedAt": "string"
          }
        },
        "length": 1
      },
      "meta": { "object": { "limit": "number", "page": "number", "pages": "number", "total": "number" } }
    }
  }
}
```

- **Shapes, never values.** The answer is kept as its shape: the keys of each object, the type of each value, and the length of each list (with the keys seen in its first 20 items). No name, price or token from a response ends up in the file.
- **The request** is kept so it can be sent again: method, path with its query string, the route it matched, and who made it (user id and roles, no session token). The request body is kept with secret-looking values redacted: keys that contain `pass`, `secret`, `token`, `otp` or `apikey` (also `apiKey`, `api_key`, `api-key`) become `"[redacted]"`. Bodies over 64 KB are cut.
- **Bounded.** When the file grows past 2 MB it is trimmed to its last 1,000 requests. It is in `.calm/`, which stays out of git.

Requests that match no route, devtools' own requests and replays are not recorded. Production never records anything: devtools cannot be turned on there.

## calm replay

```bash
npx calm replay --writes
```

```text
  Replayed 9 recorded requests against the code as it is now (0.1 s, writes restored from a checkpoint)
       3 identical
       5 changed
       1 skipped

  ✖ POST /api/products as user 6acea3e1dbe9e2d47e219400 [user]
      body.data.tags: no longer returned
      body.data.cost: newly returned

  ~ GET /api/products as user 6acea3e1dbe9e2d47e219400 [user] (4 times)
      status 200 -> 403

  Skipped 1: the body had secret values, which are never recorded (POST /api/auth/register)
```

That run followed two edits to the product resource: `tags` was replaced by a new `cost` field, and `list` went from `authenticated` to `admin`. A request whose answer has a newly returned field is marked `✖`: check that the field is meant to be seen by that user. The same request by the same user with the same differences is printed once, with a count.

How it works:

1. The dev server reads the newest recorded requests (reads only, unless `--writes`) and sends them in the order they were made, to the app as it is running now.
2. Each one goes as the user who made it: a session is created for that user id and deleted at the end. Anonymous requests stay anonymous.
3. It compares the status, and when the status is the same, the shape of the answer with the recorded one.

Some requests are skipped, with the reason: writes whose recorded body had a redacted secret (it cannot be sent again), writes under `/api/auth/` (sign-up, sign-in and password routes), and requests by a user who no longer exists.

| Option | Meaning |
|---|---|
| `--limit <n>` | How many recorded requests, the newest (default 200, from 1 to 1000) |
| `--writes` | Replay `POST`, `PUT`, `PATCH` and `DELETE` too, between a checkpoint and its restore |
| `--ci` | Exit with code 1 when an answer changed or a request failed |
| `--json` | `{ total, identical, changed, skipped, failed, writes, checkpoint, durationMs }`; each changed entry has `request`, `user`, `differences` (`kind`: `status`, `added`, `removed`, `type`, `null` or `length`, and `text`) and `newFields` |

`calm replay` needs the dev server (`npm run dev`): the replay runs inside it, and the command finds it on `PORT` from the environment or `.env` (default `5001`). Only one replay runs at a time. It refuses to run in production.

### Writes, and your data

Reads change nothing. With `--writes`, the dev server first takes a [checkpoint](/checkpoints) of the development database, replays, then restores the checkpoint and deletes it, so your data ends exactly as it began. This checkpoint is internal: it does not show in Activity or in your checkpoint list.

## In devtools

In the **Requests** panel:

- **Replay all** replays the last 200 recorded reads and opens a summary: how many answers are identical, and each changed request with its differences, newly returned fields in red.
- Requests sent by a replay carry a **replay** tag. They are not recorded as traffic and not measured for [budgets](/budgets), so a replay does not skew either.
- **Save as test** on an open request writes it as a test (below).

## Save as test

Any request in devtools that matched a route can become a test. **Save as test** writes `test/recorded/<method>-<path>-<roles>-<status>.test.js` (a number is added when the name is taken), for example `test/recorded/get-products-user-200.test.js`:

```js
// Recorded in devtools on 2026-10-13 from a real request: GET /api/products
// (200, a user with roles [user]). It runs on a throwaway database, so the data is made up.
// It is a normal test: edit it as you like.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp } from '#calm/testing.js';
import { shapeOf, compareShapes } from '#calm/replay.js';

let t;
before(async () => {
  t = await createTestApp();
});
after(() => t.close());

test("GET /products as a user with roles [user] answers 200", async () => {
  const user = await t.signup({ roles: ["user"] });
  const res = await t.get("/products", user);
  assert.equal(res.status, 200);
  // No field may be returned that was not returned when this was recorded (fields that are
  // simply empty in the made-up data are fine).
  const recorded = {"object":{"data":{"array":{"object":{ ... }},"length":1},"meta":{ ... }}};
  const leaks = compareShapes(recorded, shapeOf(res.body)).filter((d) => d.kind === 'added');
  assert.deepEqual(leaks, []);
});
```

It is a plain `node --test` file that `npm test` runs with the others, on a throwaway database (see [Testing](/testing)). It makes the same request (same method, path, query string and body) as a new user with the same roles, checks the status, and checks that no field is returned that was not returned when it was recorded. For a route with `:id`, it first creates a record with the [sample data](/cli#calm-seed) generator, owned by that user when the recorded request succeeded. When the recorded body had secret values, a comment asks you to put real ones in.

Replayed requests have no **Save as test** button.

## For agents

The `calm_replay` [MCP tool](/ai-agents#calm-mcp-tools-for-coding-agents) runs the same replay on the dev server and returns the JSON report. `limit` defaults to 200, and `writes: true` replays writes between a checkpoint and its restore. Its description asks agents to run it after a change, before they say they are done. It needs the `scaffold` [scope](/ai-agents#scopes-what-an-agent-may-do).
