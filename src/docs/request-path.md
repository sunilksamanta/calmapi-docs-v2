# Explain a request

Open any recorded request in devtools and the **Path** tab shows the way it took through your code, in order: the rate limits it passed, how it was authenticated, the guards blocks run, the policy decision clause by clause with the file and line of the policy, the record lookup, validation, the handler, the service hooks your code overrides, the events it emitted and the error, if any. For a `403` or `404` it names the exact reason.

Agents get the same answer as text with the `calm_explain` MCP tool, so they stop guessing why something was denied:

```text
PATCH /api/orders/66f1…c2 -> 404 NOT FOUND   as Grace Hopper (user)
  rateLimit "global"        calm/http/middleware.js                30 of 300 this minute
  auth session              calm/auth/index.js                     Grace Hopper (user)
  service load order 66f1…c2  calm/http/router.js                  found (within OrderService.scope)
✖ policy "owner | admin"    app/resources/order/order.resource.js:5
    owner: doc.buyer 66e0…9a is not user 66f3…11
    admin: user has roles [user]
    the user may not even read this order, so the id is not confirmed: 404
  service and hooks did not run
```

## The steps

| Kind | Recorded when | Says |
|---|---|---|
| `rateLimit` | A limiter counted the request | The count and the window (`14 of 300 this minute`) |
| `auth` | Authentication ran | `anonymous`, `session`, or the block whose credential matched (an API key, for example), and who |
| `guard` | A block's `calm.guard()` ran | The block, and whether it passed, answered the request itself, or failed |
| `policy` | The route's policy was decided | Each token with its result and why, the file and line of the policy, and the status it led to |
| `service` | A record was loaded for `/:id` routes | Whether it was found within the service `scope()` |
| `input` | A route's `input` was validated | How many fields, or which ones failed |
| `handler` | Your handler or the CRUD method ran | The function, its file and line, how long it took |
| `hook` | A service hook you override ran | `OrderService.beforeCreate`, in your service file |
| `event` | An event was emitted | The name and how many listeners it has |
| `error` | The request failed | The error code, message and status |

Each step has the time since the request started, in milliseconds.

## How a denial is explained

Policies are evaluated token by token. In a traced request every token says what it decided: `public` allows everyone, `authenticated` needs a user, a role is checked against the user's roles, a function or named policy reports what it returned, and `owner` is settled once the record is loaded (`doc.buyer 66e0…9a is not user 66f3…11`). The last line says which status the decision led to, and why: `401` without a user, `403` when the user may read the record but not change it, `404` when the user may not even read it, so its id is not confirmed.

## Your own steps

`trace()` from `#calm` adds a step from your code or your block:

```js
import { trace } from '#calm';

trace({ kind: 'guard', name: 'tenant', detail: `org ${org.slug}`, outcome: 'passed' });
```

A step is `{ kind, name, file?, line?, detail?, outcome? }`, with `outcome` one of `passed`, `denied`, `answered`, `failed`, `skipped`. Outside a request, or with devtools off, `trace()` does nothing.

## Cost

Steps are only collected when devtools is enabled, which is never in production. The policy explanations are only built inside a traced request. Line numbers are read once at startup.
