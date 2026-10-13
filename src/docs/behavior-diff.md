# The behavior diff

`calm diff` compares two versions of your app by what they do, not by the lines that changed: routes added or removed, policies loosened or tightened, fields that became visible to more people, environment variables the code now reads, hosts it can reach, events it emits, blocks and invariants. It is the unit a person can review in a minute, whatever an agent changed underneath.

```bash
npx calm diff            # the working tree against the last commit
npx calm diff main       # against the main branch
npx calm diff --ci       # exit 1 when access got wider (for pipelines)
npx calm diff main --api # the API contract: breaking changes for your clients
```

```text
  Behavior changes since main (5)
  +  POST   /api/refunds          policy: admin                                           app/resources/refund/refund.routes.js
  ~  GET    /api/orders/:id       policy: owner | admin -> authenticated        looser    app/resources/order/order.resource.js
  ~  user.phone                   visible to: the owner and admins -> everyone  looser, personal data
  +  env  STRIPE_SECRET_KEY       required in production, secret                          app/blocks/stripe-billing/index.js
  +  calls api.stripe.com         reachable from the code                                 app/blocks/stripe-billing/index.js

  2 of 5 widen access. `calm diff --json` for CI, `calm diff --ci` to fail the build on wider access.
```

## How it works

The diff is built from two **behavior snapshots**. A snapshot is plain data computed from the same definitions the app serves: every route with the access each persona has (anonymous, signed-in user, owner, each custom role, admin), every resource field with who may read and write it (the field rule combined with the resource's policies, so it says what the API actually returns), the environment variables blocks declare, the installed blocks and the [invariants](/invariants). On top of that the CLI scans your `app/` and `calm/` source for URL literals (hosts the code can reach), `emit('...')` calls (events) and environment variables read by `app/` code.

To compare with a git ref, `calm diff` checks the ref out into a temporary worktree, loads that version of the project the way `calm routes` does (a child process, no database connection, no server) and removes the worktree again. Nothing is sent anywhere.

You can also read a snapshot at runtime: `await app.snapshot()` in code, `GET /_calm/api/snapshot` in devtools.

## What counts as wider access

| Change | Reported as |
|---|---|
| A route's policy lets a persona do more (`owner` to `authenticated`, `admin` to `public`) | `looser` |
| A new route that anyone but admins can call | `looser` |
| A field readable or writable by more personas, or no longer `.encrypted()` | `looser` (plus `personal data` when the field is marked `.pii()` or looks personal) |
| A route lost its rate limit | `looser` |
| An invariant removed from `calm.config.js` | `looser` |
| A route or resource removed, a policy tightened, an invariant added | `tighter` |
| A new environment variable, host, event or block | listed, no direction |

A change that is looser for one persona and tighter for another is reported as `looser for some`. Custom policy functions cannot be read from a label, so a route whose policy becomes or stops being a function counts as wider too.

`--ci` fails the build when at least one change widens access. A widening that is intended still has to pass: run the diff locally, read it, and commit; the next CI run compares against the new base.

## Snapshot files

Without git, or to keep a record, write the snapshot to a file and compare against it later:

```bash
npx calm diff --save behavior.json      # write the current snapshot
npx calm diff behavior.json             # compare the working tree with it
```

The file is JSON you can read and commit. Its shape is stable within a major version (`version: 1`).

## API contract

The behavior diff asks "who may do what". Your web and mobile apps ask something else: "will my calls still work?" `calm diff --api` compares the OpenAPI contract your clients see (the same document as `/api/openapi.json`) and sorts every change into **breaking**, **minor** or **patch**, with the version bump it needs.

```bash
npx calm diff --api            # the working tree against HEAD
npx calm diff main --api       # against the main branch
npx calm diff v1.2.0 --api --ci  # exit 1 on a breaking change
```

Here a `name` field got `.max(80)` and a new optional `sku` field was added:

```text
  API contract changes since HEAD (7d630d3) (8)
    breaking  POST /api/products        body.name: maxLength none -> 80
    breaking  PATCH /api/products/{id}  body.name: maxLength none -> 80
    minor     GET /api/products         response.data[].sku: added to the response
    minor     POST /api/products        body.sku: new optional input
    minor     POST /api/products        response.data.sku: added to the response
    minor     GET /api/products/{id}    response.data.sku: added to the response
    minor     PATCH /api/products/{id}  body.sku: new optional input
    minor     PATCH /api/products/{id}  response.data.sku: added to the response

  2 breaking · 6 added · 0 other
  Suggested version 0.1.0 -> 0.2.0 (breaking: before 1.0 that is a minor bump)
```

A change is **breaking** when a client that worked before can fail now, **minor** when something was added, **patch** when nothing a client relies on changed:

| Breaking | Minor | Patch |
|---|---|---|
| A route removed | A route added | A route that needed a session is now public |
| A public route now needs a signed-in user | A new optional input field or optional parameter | An input field no longer used (when unknown fields are not rejected) |
| A different success status (`200` to `201`) | A field added to the response | A required input field became optional |
| A new required input field or parameter, a field or parameter that became required, a body that is now required | An enum that accepts a new value | A response enum that no longer returns a value |
| An input field removed when sending it is now a `422` | A response enum that may return a new value (clients that handle every value need it) | |
| A type changed (`string` to `number`), in the input or the response | | |
| A tighter limit on input: a lower `maxLength`, `maximum` or `maxItems`, a higher `minLength`, `minimum` or `minItems`, a new `pattern`, an enum value no longer accepted | | |
| A field or the whole body removed from the response, a query or path parameter removed | | |

Request bodies, parameters and the success response are compared field by field, nested objects and array items included.

**The version.** The suggestion starts from `version` in your `package.json`. A breaking change is a major bump, an addition a minor bump, anything else a patch. Before 1.0 everything moves down one level, as semver allows: a breaking change takes `0.1.0` to `0.2.0`, and additions take it to `0.1.1`.

`--ci` fails when at least one change is breaking. `--json` prints `{ since, changes, summary, bump, version, next }`, where each change is `{ level, where, what }`, `summary` counts `breaking`, `minor` and `patch`, and `bump` is `major`, `minor`, `patch` or `null`.

Snapshot files work here too: `calm diff --save` stores the OpenAPI document next to the behavior. A snapshot saved before `--api` existed has no contract to compare with; save a new one.

The [typed client](/client) is generated from the same contract: after a breaking change, generate it again and a TypeScript frontend shows removed routes and fields as type errors.

## Options

| Option | Meaning |
|---|---|
| `[ref]` | A git ref (branch, tag, commit) or a snapshot file. Default `HEAD` |
| `--api` | Compare the API contract (OpenAPI) instead: breaking, minor and patch changes and the version bump |
| `--ci` | Exit with code 1 when a change widens access (with `--api`: when a change is breaking) |
| `--json` | Machine readable: `{ since, changes, summary: { total, widen, tighten } }` |
| `--save <file>` | Write the current snapshot to a file |

Each change in the JSON has `kind` (`route`, `field`, `resource`, `env`, `host`, `event`, `block`, `invariant`), `change` (`added`, `removed`, `changed`), `key`, `detail`, `direction` (`looser`, `tighter`, `mixed` or `null`), `file`, `personal`, and the `before` and `after` entries.

## For agents

The MCP tool `calm_diff` runs the same comparison (`ref` optional, `api: true` for the [API contract](#api-contract)) and returns the JSON, so an agent can show you what it changed in behavior terms before it finishes. `AGENTS.md` asks agents to run it.

## Limits

- Access is judged from policies and field rules. A service `scope()` or custom code can hide records beyond what the policy says; the diff does not see that, [`calm audit`](/audit) does.
- Hosts and events come from string literals in your source. A URL built at runtime is not listed.
- The ref must contain a CalmAPI 2 project (a `calm.lock`). Projects whose `calm/` predates `calm diff` are loaded with less detail: route access comes from policy labels and field visibility from the exposure matrix.
