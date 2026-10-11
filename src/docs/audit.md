# Security audit

`calm audit` tests the authorization of your API from the outside. It calls every route as every kind of user and checks each answer against your policies and field rules. It runs on a throwaway database, so your data is never touched.

```bash
npx calm audit
```

Policies and field rules say what should happen. The audit shows what actually happens, including bugs in services, hooks and custom code that a static check cannot see.

## What it does

1. Boots your app (your own `calm/` and `app/` code) with `createTestApp` on a throwaway database on `MONGODB_TEST_URI` (default `mongodb://127.0.0.1:27017`). Rate limits and login lockout are off for the run, and the database is dropped at the end.
2. Signs up one user per persona: the owner, another user, an admin, and one user for each custom role your policies use. Anonymous calls carry no token.
3. Seeds a valid record for every resource from its field definitions, referenced resources first. Records the owner cannot create through the API are created through the service. A resource whose required fields it cannot fill (a `.pattern()`, a `.check()` or a Standard Schema without a default) gets fewer checks.
4. Calls `list`, `read`, `create`, `update` and `delete` on every resource as every persona, and compares each answer with the [exposure matrix](/docs/security#exposure-matrix).
5. Runs probes against each resource and against the auth routes.

Without a `user` resource (the `minimal` template), only anonymous calls are made.

## What it checks

| Check | Passes when |
|---|---|
| Status codes | Allowed actions answer `200`, `201` or `204`; denied ones answer `401`, `403` or `404` |
| Owner-only lists | With `'owner'` on `list`, every returned record belongs to the caller |
| Field leaks | No response contains a field the persona may not read, or a key that is not a declared field |
| Mass assignment | A create that sets a hidden, read-only or owner field is rejected with `422` |
| Operator injection | `?x[$ne]=1` answers `400` |
| Page size cap | `?limit=100000` answers `400` |
| Unknown filters | `?definitelyNotAField=1` answers `400` |
| Error hygiene | A malformed id answers `404`, without stack traces or database errors |
| Forged token | A made-up bearer token answers `401` |
| Token in the query string | `/api/auth/me?token=<valid token>` answers `401` (only the header counts) |
| Account enumeration | A wrong password and an unknown email get the same status and message |

Some cells are skipped, not failed: an allowed action that answers `404` on a resource whose service has its own `scope()` (the scope may hide the record on purpose), and actions decided by a policy function.

## Reading the output

On a new project from the `api` template:

```text
  Auditing on a throwaway database...

  CalmAPI audit

  post /posts  (custom scope)
    action  Anonymous  Signed-in user  Owner    Admin
    list    ✔ allow    ✔ allow         ✔ allow  ✔ allow
    read    ~ allow    ~ allow         ✔ allow  ✔ allow
    create  ✔ deny     ✔ allow         ✔ allow  ✔ allow
    update  ✔ deny     ✔ deny          ✔ allow  ✔ allow
    delete  ✔ deny     ✔ deny          ✔ allow  ✔ allow

  user /users
    action  Anonymous  Signed-in user  Owner    Admin
    list    ✔ deny     ✔ deny          ✔ deny   ✔ allow
    read    ✔ deny     ✔ deny          ✔ allow  ✔ allow
    create  ✔ deny     ✔ deny          ✔ deny   ✔ allow
    update  ✔ deny     ✔ deny          ✔ allow  ✔ allow
    delete  ✔ deny     ✔ deny          ✔ deny   ✔ allow

  Probes
  ✔ mass assignment: post.slug rejected with 422
  ✔ mass assignment: post.author rejected with 422
  ✔ mass assignment: post.publishedAt rejected with 422
  ✔ operator injection: post x[$ne]=1 -> 400
  ✔ limit cap: post limit=100000 -> 400
  ✔ unknown filter: post definitelyNotAField=1 -> 400
  ✔ error hygiene: post bad id -> 404
  ✔ operator injection: user x[$ne]=1 -> 400
  ✔ limit cap: user limit=100000 -> 400
  ✔ unknown filter: user definitelyNotAField=1 -> 400
  ✔ error hygiene: user bad id -> 404
  ✔ forged session token -> 401
  ✔ token in query string ignored -> 401
  ✔ login does not reveal accounts 401 / 401

  All checks passed · 52 passed · 2 skipped (custom scope or policy) · 54 checks
```

Each table shows the expected answer from your policies, and a mark for what the API did:

| Cell | Meaning |
|---|---|
| `✔ allow`, `✔ deny`, `✔ own` | The API did what the policy says (`own`: an owner-only list) |
| `✖ allow (403)` | The policy allows it but the API refused, with the status it returned |
| `✖ deny (200)` | The policy denies it but the API allowed it |
| `✖ own (200)` | An owner-only list returned records of other users |
| `~ allow` | Skipped: a `404` from a resource with its own `scope()` |
| `? custom` | A policy function decides, so the cell is not checked |
| `off` | The route is turned off with the resource's `crud` option |

The `post` reads are skipped because `post.service.js` hides drafts from everyone but their author and admins.

### When a check fails

Here notes are private to their author:

```js
// app/resources/note/note.resource.js
import { resource, f } from '#calm';

export default resource('note', {
  fields: { text: f.string().required(), author: f.ref('user').owner() },
  policy: { list: 'owner', read: 'owner', create: 'authenticated', update: 'owner', delete: 'owner' },
});
```

But the service overrides `list()` and forgets the owner scope:

```js
// app/resources/note/note.service.js (a bug)
import { ResourceService } from '#calm';

export default class NoteService extends ResourceService {
  async list() {
    const items = await this.model.find({}).lean();
    return { items, total: items.length };
  }
}
```

The audit reports it under the resource, with one line per failed cell:

```text
  note /notes
    action  Anonymous  Signed-in user  Owner        Admin
    list    ✔ deny     ✖ own (200)     ✖ own (200)  ✖ own (200)
    read    ✔ deny     ✔ deny          ✔ allow      ✔ deny
    create  ✔ deny     ✔ allow         ✔ allow      ✔ allow
    update  ✔ deny     ✔ deny          ✔ allow      ✔ deny
    delete  ✔ deny     ✔ deny          ✔ allow      ✔ deny
    ✖ list as Signed-in user: returned 2 record(s) owned by someone else
    ✖ list as Owner: returned 1 record(s) owned by someone else
    ✖ list as Admin: returned 5 record(s) owned by someone else
```

For the whole project (the `api` template plus `note`), the summary line reads `3 failed · 74 passed · 2 skipped (custom scope or policy) · 79 checks`. Field leaks are listed under **Field leaks**, one line each (for example `✖ customer.phone returned to anonymous (read /customers)`), and failed probes get a `✖` under **Probes**.

The fix is to keep the request context, so owner scoping still applies: call `super.list(query, ctx)`, or build the filter with `this.filterFor(ctx, filter)` (see [Services and hooks](/docs/services)).

## Options

```text
calm audit [--json] [--ci]
```

| Option | Meaning |
|---|---|
| `--ci` | Exit with code 1 when a check fails |
| `--json` | The report as JSON: `ok`, `summary` (`checks`, `passed`, `failed`, `skipped`, `leaks`), `results`, `leaks`, `probes`, `notes` |

Each entry in `results` looks like this:

```json
{ "resource": "note", "action": "list", "persona": "owner", "expected": "own", "status": 200, "ok": false, "note": "returned 1 record(s) owned by someone else" }
```

`ok` is `true`, `false`, or `null` for a skipped cell.

## In CI and devtools

The audit needs a MongoDB server, like `npm test`. Add it to the pipeline next to your tests (see [Testing](/docs/testing#in-ci)):

```bash
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npx calm audit --ci
```

The same audit runs from the devtools **Security** panel (**Run audit**, on a throwaway database on your dev server's MongoDB), and coding agents can run it with the `calm_audit` [MCP tool](/docs/ai-agents#calm-mcp-tools-for-coding-agents). Run it after changing policies, fields or services.
