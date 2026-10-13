# Invariants

Policies say who may do what. Invariants say what must stay true whatever anyone, a person or an agent, changes next. You write them once in `calm.config.js`, in words the framework understands, and the framework holds you to them: `calm doctor` and devtools report a broken one as an error, and in production the app refuses to start instead of serving.

```js
// calm.config.js
import { defineConfig } from '#calm';

export default defineConfig({
  invariants: [
    'no public write routes',
    'personal data is never public',
    'auth routes are rate limited',
    'every route has an explicit policy',
    'resource order requires idempotency',
    'routes under /api/admin require admin',
    { rule: 'no public routes', except: ['GET /api/posts*', 'GET /api/pulse'] },
    (app) => app.routes.filter((r) => r.path.startsWith('/internal') && r.policyLabel !== 'admin'),
  ],
});
```

## Named rules

| Rule | Holds when |
|---|---|
| `no public write routes` | No `POST`, `PUT`, `PATCH` or `DELETE` route has a `public` policy. Sign up, sign in and password routes are excepted. |
| `no public routes` | No route at all is public (same exception). Useful for internal APIs. |
| `personal data is never public` | No field marked `.pii()` or that looks personal (email, phone, address...) is readable without signing in, judged from the resource's `read` and `list` policies and the field's `visibleTo`. |
| `auth routes are rate limited` | Rate limiting is on, and every auth route anyone can call without a session (register, login, password reset...) has a limit. |
| `every route has an explicit policy` | No route and no resource action falls back to the default policy. |
| `resource <name> requires idempotency` | The [idempotency block](/blocks/idempotency) is installed and its `required` list covers every write route of the resource. |
| `routes under <prefix> require <role>` | Every route whose full path starts with the prefix has exactly that role as its policy. |

`except` takes route labels (`POST /api/contact`), field names (`lead.email`) or resource names; `*` matches anything.

An unknown rule is a configuration error: the app does not start, and the message lists the rules it knows.

## Your own invariants

A function receives the booted app and returns what is wrong: an array of routes, strings or `{ what, file }` objects (empty means fine), `false`, or a message. It may be async and may query the database.

```js
invariants: [
  function adminRoutesStayAdmin(app) {
    return app.routes.filter((r) => r.path.startsWith('/admin') && r.policyLabel !== 'admin');
  },
  async function noOrphanOrders(app) {
    const n = await app.model('order').countDocuments({ buyer: null });
    return n ? `${n} orders have no buyer` : true;
  },
],
```

The function's name is the rule's name in reports.

## Where they are checked

- **`calm doctor`** and the devtools **Doctor** panel: one `error` per broken rule, listing each violation with its file.
- **At boot**: after the database connects and before the start hooks run. In production a broken invariant throws `CALM_INVARIANT` with the same list and the process exits; in development and test it is logged as a warning so you can keep working.
- **`calm diff`**: the invariants are part of the [behavior snapshot](/behavior-diff), so removing one shows up as a change that widens access (and adding one as tightening). A promise cannot disappear as a side effect of an edit.
- In code: `await app.invariants()` returns `[{ rule, kind, ok, violations }]`; devtools serves it at `GET /_calm/api/invariants`.

```text
  ✖ error  Invariant broken: no public write routes  app/routes.js
           POST /api/contact is public (app/routes.js)
           Fix the code, or change the promise in calm.config.js (invariants). In production the app refuses to start.
```

## What they are not

Invariants describe the declared behavior of the app (routes, policies, fields, configuration). They do not run requests; [`calm audit`](/audit) does that. A custom `scope()` or handler that hides or leaks records is outside what a named rule can see, which is why your own invariants can look at anything the app object offers, including the data.
