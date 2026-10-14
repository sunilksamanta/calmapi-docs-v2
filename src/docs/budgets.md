# Budgets

A route that ran 3 queries last week and runs 40 today still passes its tests. Budgets make cost part of the contract: in `calm.config.js` you say how many MongoDB queries a route may run, how fast it must answer and how big its response may be. The dev server measures every request against that, devtools shows it, and `calm budgets --ci` fails the build when a route goes over.

```js
// calm.config.js
export default defineConfig({
  budgets: {
    'GET /api/posts': { queries: 1, p95: '150ms', response: '200kb' },
    'GET /api/posts/*': { queries: 6 },
    '*': { queries: 12, p95: '400ms' },
  },
});
```

```bash
npx calm budgets       # run the tests with the meter on and show what each route cost
npx calm budgets --ci  # exit 1 when a route is over budget (or a test fails)
```

## Limits

| Limit | Measures | Written as |
|---|---|---|
| `queries` | MongoDB commands the request ran: finds, counts, aggregations, inserts, updates, deletes. The driver's own handshake and index commands are not counted. This is the N+1 catcher. | A whole number: `4` |
| `p95` | The 95th percentile of the time to answer, over the measured requests of the route (the dev server keeps the last 200) | `'150ms'`, `'1.5s'`, or a number of milliseconds |
| `response` | The size of the response body (its `Content-Length`) | `'200kb'`, `'1mb'`, `'512b'`, or a number of bytes |

Give a route any of the three. `queries` and `response` are judged on every single request (the largest one counts); time is judged on the p95, so one slow request does not break the budget.

## Which budget applies

The key is a method and a route path, as the route is declared (with the `/api` prefix and `:id` placeholders, not a real id):

| Key | Matches |
|---|---|
| `'GET /api/posts'` | Exactly that route |
| `'GET /api/posts/:id'` | Exactly the route with that pattern |
| `'GET /api/posts/*'` | `*` is one path segment: `GET /api/posts/:id`, not `GET /api/posts/:id/comments` |
| `'GET /api/admin/**'` | `**` is the rest of the path: every `GET` route under `/api/admin/` |
| `'* /api/orders'` | Any method on that path |
| `'*'` | Every route no other key matches |

The most specific key wins: an exact key before a key with a wildcard, and a wildcard key before `'*'`. Among keys of the same kind, the first one in the object wins. A route that no key matches has no budget; it is still measured and shown.

A mistake is a configuration error at boot, like any other in `calm.config.js`:

```text
Invalid configuration:
  - budgets["GET /api/feed"].p95: "fast" is not a duration like "150ms" or "1s"
```

Unknown limits (`budgets["GET /api/feed"]: unknown limit time (queries, p95, response)`) and keys that are not `"METHOD /path"` or `"*"` are refused the same way.

## In devtools

The dev server measures every API request while devtools is on, whether or not you set budgets.

- The **Budgets** panel lists every route that was called: how many requests, the most queries one request ran, the p95 time and the largest response, each next to its limit, and the budget key that applies (or `none`). Routes over budget come first, in red, with what they broke in the tooltip. **Reset** forgets the measurements so far. Without budgets, the panel shows the numbers anyway, with an example to copy into `calm.config.js`.
- In **Requests**, a request that went over its route's budget (more queries or a larger response than allowed, or slower than the p95 limit) has an **over budget** tag that opens the Budgets panel.
- The sidebar badge of Budgets counts the routes over budget.

Requests sent by [replay](/replay) are not measured, so replaying traffic does not skew the numbers.

## calm budgets

```bash
npx calm budgets
```

```text
  Running the tests with the meter on...
  Tests: 4 passed

  ROUTE                        REQUESTS  MAX QUERIES  P95           MAX SIZE          BUDGET
  GET /api/posts               2         3 / 1        10ms / 150ms  457 B / 200.0 KB  GET /api/posts
  POST /api/auth/register      4         3 / 12       38ms / 400ms  312 B             *
  POST /api/posts              2         5 / 12       11ms / 400ms  270 B             *
  PATCH /api/posts/:id         1         3 / 12       6ms / 400ms   131 B             *
  POST /api/posts/:id/publish  1         5 / 12       18ms / 400ms  287 B             *
  GET /api/products            2         4 / 12       13ms / 400ms  264 B             *
  POST /api/products           1         4 / 12       11ms / 400ms  213 B             *
  GET /api/products/:id        1         3 / 12       7ms / 400ms   213 B             *

  1 route over budget
    GET /api/posts: queries 3 > 1
```

It runs your tests (`node --test`, one file at a time) with the meter on, collects what every request cost across all test files and prints the table, routes over budget first. Pass test files to run only those: `npx calm budgets test/posts.test.js`.

| Option | Meaning |
|---|---|
| `[test files...]` | Run these test files instead of all of them |
| `--ci` | Exit with code 1 when a route is over budget or a test fails |
| `--json` | `{ tests: { pass, fail, code }, configured, routes, over }`; each route has `method`, `route`, `budget`, `limits`, `count`, `p95Ms`, `maxQueries`, `maxBytes`, `over` and `ok` |

The numbers come from your tests, so a budget holds for what your tests exercise. A list route tested with two records will not show what it costs with two thousand; seed more in the test (see [Sample data](/testing#sample-data)) when that matters.

## In CI

```bash
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npx calm budgets --ci
```

It needs MongoDB, like `npm test`, and can replace `npm test` in the pipeline: it runs the same tests and fails when one fails.

## For agents

The `calm_budgets` [MCP tool](/ai-agents#calm-mcp-tools-for-coding-agents) returns what the Budgets panel shows, from the running dev server: each route with its requests, max queries, p95 and largest response next to its budget. Its description asks agents to check it after changing a route, since an N+1 query shows up as max queries going up. It is available in every [scope](/ai-agents#scopes-what-an-agent-may-do).

## Where it runs

Measuring needs MongoDB command monitoring and a timer per request. It is on in development while devtools is on, and in `calm budgets` runs. In production nothing is measured, whatever `budgets` says.
