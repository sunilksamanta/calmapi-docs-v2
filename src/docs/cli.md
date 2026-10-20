# CLI reference

The `calmapi` package installs a `calm` command (also available as `calmapi`). It is a dev dependency of every project, so use it with `npx calm <command>` or through the npm scripts. It has no dependencies of its own.

```text
calm create [dir]                       new project (npm create calmapi@latest)
calm dev [--agent-db]                   watch mode + devtools (--agent-db: on a disposable copy of the database)
calm make resource <name> [fields...]   scaffold a resource (--team for team-scoped records)
calm make block <name>                  start your own block
calm add <block...>                     copy blocks into your project (calm add --list, gh:user/repo/name)
calm block list|check|pack              your blocks: what changed, a safety review, a file to share
calm seed [resource...]                 sample records that look real
calm routes                             every route with its policy and source file
calm openapi                            write openapi.json
calm client [--out <file>] [--js]       typed client for your web or mobile app
calm doctor [--prod] [--audit] [--ci]   security and correctness checks
calm diff [ref] [--api] [--ci]          what changed in behavior (or in the API contract) since a git ref
calm review [--sign] [--ci]             read and sign what changed since the last signature
calm replay [--writes] [--ci]           replay recorded requests against the code as it is now
calm budgets [--ci]                     what each route costs in your tests, against its budget
calm about                              what the framework does that you did not write
calm checkpoint [name]                  snapshot the dev database (list, delete <id>)
calm restore [id] [--yes]               put the dev database back
calm audit [--ci]                       test every route as every role on a throwaway database
calm audit --accept --reason "..."      accept who may do what (security.snapshot.json)
calm admin <email> [--revoke]           grant (or remove) the admin role
calm keygen [--write]                   encryption key for .encrypted() fields (rotates)
calm upgrade                            merge framework updates into calm/
calm mcp [--scope read|scaffold|full]   MCP server for coding agents
calm agent-hook [--client <name>]       mark a file an agent is about to edit (for agent hooks)
```

`calm <command> --help` prints the options of a command, `calm --version` the version. Aliases: `new` and `init` for `create`; `generate`, `g` and `m` for `make`; `blocks` for `block`. Running `calmapi` with no arguments outside a project starts the `create` wizard. Commands other than `create` must run inside a project (a folder with `calm.lock`, or below one). Set `CALM_DEBUG=1` to see stack traces.

## calm create

```text
calm create [directory]     also: npm create calmapi@latest [directory]
```

| Option | Meaning |
|---|---|
| `--template <api\|minimal>` | `api`: users, auth and an example resource (default). `minimal`: an empty `app/` to start from scratch |
| `--db <uri>` | MongoDB connection string (default: local server) |
| `--pm <npm\|pnpm\|yarn\|bun>` | Package manager to install with |
| `--no-install` | Skip installing dependencies |
| `--no-git` | Skip `git init` |
| `-y`, `--yes` | Accept every default, no prompts |

With `npm create`, put the options after `--`: `npm create calmapi@latest my-api -- --template minimal --yes`. The target folder must be empty or not exist.

## calm dev

```text
calm dev [--agent-db]
```

Starts the app in development mode: `NODE_ENV=development`, file watching (`node --watch` on `app/`, `calm/`, `calm.config.js`, `server.js` and `.env`, so new resource folders restart the server too) and devtools at `http://localhost:<port>/_calm`. Extra arguments are passed to `node`, for example `calm dev --inspect`.

It also records every file change (with a line diff, marked as made by an AI agent or by you), restart and crash in `.calm/activity.jsonl`: files in `app/`, `calm/` and `test/`, and project files such as `calm.config.js`, `package.json`, `README.md` and `AGENTS.md`. The contents of `.env` are never recorded. Devtools shows this log live in the **Activity** panel; see [Watching an agent work](/ai-agents#watching-an-agent-work).

| Option | Meaning |
|---|---|
| `--agent-db` | Run on a copy of the development database, `<name>_agent` on the same server (documents and indexes), dropped when `calm dev` stops. An AI agent can create, change and delete data freely; yours stays as it was. |

```text
$ npx calm dev --agent-db
  Copying the development database for the agent...
✔ Running on my_api_agent, a copy of my_api (7 collections, 1204 documents). It is dropped when calm dev stops.
```

Devtools marks the database as a **copy**. See [A database the agent can break](/ai-agents#a-database-the-agent-can-break-calm-dev---agent-db).

## calm make resource

```text
calm make resource <name> [fields...]
```

Creates `app/resources/<name>/<name>.resource.js` and, when the project has users, `test/<names>.test.js`.

| Option | Meaning |
|---|---|
| `--service` | Also create `<name>.service.js` |
| `--routes` | Also create `<name>.routes.js` (with an example `GET /stats`) |
| `--no-owner` | Do not add an owner field (by default `owner: f.ref('user').owner()` is added when the project has users) |
| `--team` | Records belong to a team: only its members see them. Needs the [teams](/blocks/teams) block. |
| `--no-test` | Do not create the test file |
| `--force` | Overwrite existing files |

Field syntax: `name:type[:arg][=default][+modifier...]`

| Spec | Generated |
|---|---|
| `title:string+required` | `f.string().required()` |
| `price:number=0` | `f.number().default(0).sortable().filterable()` |
| `code:string=A-1+unique` | `f.string().default('A-1').unique()` (modifiers may follow a default) |
| `status:enum:draft,live=draft` | `f.enum(['draft', 'live']).default('draft').filterable()` |
| `category:ref:category` | `f.ref('category').filterable()` |
| `author:ref` | `f.ref('author').filterable()` (the field name is the resource) |
| `tags:string+array` | `f.array(f.string()).default([])` |
| `name:string+required+searchable+sortable` | `f.string().required().searchable().sortable()` |
| `publishedAt:date=now` | `f.date().default(() => new Date()).sortable().filterable()` |

Types: `string text email url password number integer boolean date enum ref id json` (also `str`, `num`, `float`, `int`, `bool`, `datetime`, `object`). Modifiers: `required` (also `req`), `array` (also `list`, `many`), and `searchable sortable filterable unique index hidden writeOnly readOnly immutable populate owner`. Enums, booleans and refs are made filterable, numbers and dates filterable and sortable. A default may contain `+` (`phone:string=+44`); only known modifiers after it are read as modifiers.

Every form above is safe to type unquoted in bash, zsh (the macOS default shell) and fish. The short forms of earlier releases still work: `title:string!` for `+required` and `tags:string[]` for `+array`. In zsh they need quotes, because `!` starts history expansion (`zsh: event not found`) and `[]` is a filename pattern:

```bash
npx calm make resource post 'title:string!' 'tags:string[]'   # zsh: quote the short forms
npx calm make resource post title:string+required tags:string+array   # no quotes needed
```

A mistake names the part that is wrong, for example `Unknown modifier "+requird" in "title:string+requird". Modifiers: required, array, searchable, ...`, `Empty modifier in "title:string++required" (two + in a row?)` or `enum needs values: status:enum:a,b,c`.

A field spec `owner:ref:user` becomes the owner field (`f.ref('user').filterable().owner()`), and no second owner field is added.

```bash
npx calm make resource invoice number:string+required+unique amount:number+required status:enum:draft,sent,paid=draft customer:ref:user notes:text --service
```

With `--team` (after `npx calm add teams`), the resource is team-scoped: every query only sees the caller's teams, and the generated test checks that members of the team create, read and list records, and that people outside the team see nothing. Without the block it stops with `--team needs the teams block: npx calm add teams`.

```bash
npx calm make resource task title:string+required done:boolean=false --team
```

```js
export default resource('task', {
  team: true, // records belong to a team: body "team" or the X-Team header on create
  fields: {
    title: f.string().required(),
    done: f.boolean().default(false).filterable(),
    owner: f.ref('user').owner(), // set from the session, powers 'owner' policies
  },
  // Team-scoped (the teams block): every query only sees the caller's teams, whatever the policy says.
  policy: {
    list: 'member',
    read: 'member',
    create: 'member',
    update: 'team:admin | owner',
    delete: 'team:admin',
  },
});
```

Without a `user` resource (the `minimal` template), the generated policies are `public` with a comment reminding you to add auth before deploying anything writable.

## calm make block

```text
calm make block <name>
```

Starts your own block: `app/blocks/<name>/index.js` (a working route, with every extension point listed in comments), `block.json` (what sharing it needs, with `links` and `agents`), `AGENTS.md` (instructions for AI agents and official links, built from `block.json`), `README.md`, and `test/blocks/<name>.test.js`. The block is live in your app right away. The name is turned into kebab case and must start with a letter.

| Option | Meaning |
|---|---|
| `--no-test` | Do not create the test file |
| `--force` | Overwrite existing files |

See [Building your own block](/building-blocks).

## calm add

```text
calm add <block...>
```

Copies a block's files into your project, adds its dependencies to `package.json`, appends its environment variables to `.env.example` and `.env`, installs, and records it in `calm.lock`. The code is yours from then on. See [Blocks](/blocks).

```bash
npx calm add jobs api-docs                # official blocks (same as @calmapi/jobs)
npx calm add @acme/billing                # a registry from package.json "calm.registries"
npx calm add gh:acme/blocks/billing       # r/billing.json in a GitHub repository (@ref to pin)
npx calm add https://x.dev/r/y.json       # any URL
npx calm add ./blocks/my-block.json       # a local file
npx calm add --list                       # list official blocks
```

| Option | Meaning |
|---|---|
| `--dry-run` | Show what would change, write nothing |
| `--overwrite` | Replace files that already exist with different content |
| `--no-install` | Do not run the package manager |
| `--remote` | Fetch official blocks from `https://docs.calmapi.dev/r` instead of the copy bundled with the CLI |
| `-y`, `--yes` | Do not ask for confirmation |
| `--trust` | With `--yes`: also add third-party blocks whose review found risky code |
| `--list` | List official blocks |

Existing files with different content are kept and reported as conflicts unless you pass `--overwrite`. Blocks that provide the same resource (`storage-local` and `storage-s3`) refuse to be installed together. A block whose `minVersion` is newer than the CalmAPI version in `calm.lock` is refused until you run `calm upgrade`.

Blocks that are not official are reviewed before anything is written: the plan lists what their code does, in plain language (network requests, file writes, child processes, `eval`, computed imports, native or minified code, request hooks, the environment variables it reads and the hosts it mentions). Risky findings are marked `!` and must be confirmed; with `--yes`, they need `--trust` too. `--dry-run` shows the review without writing anything. See [What people see before installing](/building-blocks#what-people-see-before-installing).

## calm block

```text
calm block list
calm block check [name|address]
calm block pack [name...] [--out r]
```

Tools for the blocks in your project and the ones you share. See [Building your own block](/building-blocks#share-it).

| Command | Does |
|---|---|
| `list` (or `ls`) | Every block in the project: version, where it came from (from `calm.lock`, or "written here"), and the files you changed since adding it |
| `check` | Checks your blocks before you share them, or someone else's before you add it: name, versions, file targets (never `calm/`, `.env` or `package.json`), dependency ranges, env var declarations, committed secrets, imports of `calm/` internals, and the plain-language review of what the code does. Without a name it checks every block with a `block.json`. With an address (`gh:...`, a URL, `@scope/name` or a `.json` file) it fetches the block first. Exits with code 1 on errors. |
| `pack` | Writes a registry item for each block to `r/<name>.json` and an `r/index.json`. Without names, every block with a `block.json`. Blocks with errors are not packed. `--out <dir>` writes elsewhere. |

```text
$ npx calm block pack
✔ Packed slack-notify into r/

  Share it
  Commit r/ and push to GitHub, then anyone can run:
    npx calm add gh:<you>/<repo>/slack-notify
  Or host r/ anywhere: npx calm add https://<host>/r/<name>.json
```

## calm seed

```text
calm seed [resource...] [--count 10] [--users 3] [--seed 42]
```

Fills the database (`MONGODB_URI` from `.env`) with sample records that look real, built from your field definitions: names, emails, prices, ratings, phone numbers, cities, values from enums, dates in the past or the future depending on the field name, unique values kept unique, references to records that exist, and owners. Records are validated like API input and created through your services, so hooks run. Resources that the seeded ones reference get a few records first (up to 5), when they are empty.

```bash
npx calm seed                      # every resource, 10 records each
npx calm seed product --count 50   # one resource
npx calm seed --seed 42            # the same choices on every run
```

| Option | Meaning |
|---|---|
| `--count <n>` | Records per resource (default 10, at most 10,000) |
| `--users <n>` | Demo users to create when there are none yet (default 3) |
| `--seed <n>` | A fixed random seed, so names, numbers and choices repeat. Emails and unique values still differ between runs, so they never collide. |

When the database has no users, demo users are created to own the records, and their emails and password are printed so you can sign in as them:

```text
✔ Seeded 3 user, 10 product

  Demo users (sign in with these)
  demo.grace.mgnx8k2a0@example.test  calm-demo-password-1
  demo.alan.mgnx8k2b1@example.test  calm-demo-password-1
  demo.radia.mgnx8k2b2@example.test  calm-demo-password-1
```

It refuses to run with `NODE_ENV=production`. In devtools, **Sample data** in the Data panel does the same for one resource.

## calm routes

```text
calm routes [path] [--resource <name>] [--json]
```

Every route the app serves with its method, path, policy and the file it comes from. Defaulted policies are marked `(default)`. `--json` prints machine readable output.

A path filter narrows the list to routes whose path contains it (`calm routes products`, any case), and `--resource <name>` to one resource's routes (`calm routes --resource product`); both work together and with `--json`. When nothing matches, the command says so and exits 0 (`[]` with `--json`).

## calm openapi

```text
calm openapi [--out openapi.json] [--stdout]
```

Writes the OpenAPI 3.1 document generated from your resources and routes (default `openapi.json`), or prints it with `--stdout`. The running app also serves it at `/api/openapi.json`.

## calm client

```text
calm client [--out <file>] [--js] [--stdout]
```

Writes a typed client for your web or mobile app, generated from the API's OpenAPI document: one file, no dependencies (it uses `fetch`), every route a function with its input and output types, and typed `CalmApiError`s. See [Typed client](/client).

```bash
npx calm client --out ../web/src/api/calm-client.ts          # TypeScript
npx calm client --out ../app/api/calm-client.js --js         # JavaScript plus calm-client.d.ts
```

| Option | Meaning |
|---|---|
| `--out <file>` | Where to write it. Default: `client.out` in `calm.config.js`, else `calm-client.ts` (`calm-client.js` with `--js`) |
| `--js` | JavaScript plus a `.d.ts` for editors, instead of TypeScript (an `--out` path ending in `.js` or `.mjs` does the same) |
| `--stdout` | Print it instead of writing a file |

With `client: { out }` in `calm.config.js`, `calm dev` writes it again whenever the API changes.

## calm doctor

```text
calm doctor [--prod] [--audit] [--ci] [--strict] [--json]
```

Security and correctness checks: config, policies, private fields, personal data exposure, hardcoded secrets, `.env` in git, risky code patterns, framework drift and published advisories. Also works inside CalmAPI 1.x projects (`npx calmapi@next doctor`), where it reports the advisories published for 1.x. See [Security](/security#what-calm-doctor-checks) for every check.

| Option | Meaning |
|---|---|
| `--prod` | Evaluate with production rules (`NODE_ENV=production`) |
| `--audit` | Also run `npm audit` on production dependencies |
| `--ci` | Exit with code 1 when there are errors |
| `--strict` | With `--ci`: also fail on warnings |
| `--json` | Machine readable output: `{ findings, errors, warnings }` |

```text
  CalmAPI doctor · my-api · production rules

  ! warn   No mail transport in production
           Password reset emails cannot be delivered. Run `calm add @calmapi/mail-resend` or register a transport.
  • info   TRUST_PROXY is not set
           Behind a load balancer every client shares one IP for rate limiting. Set TRUST_PROXY (e.g. 1).

  0 errors · 1 warning · 1 info
```

Doctor boots your app in a child process to inspect it, without connecting to MongoDB. With a committed `security.snapshot.json`, access wider than it is an error, so `--ci` fails; see [Exposure budget](/exposure-budget).

## calm diff

```text
calm diff [ref] [--api] [--json] [--ci] [--save <file>]
```

What changed in behavior since a git ref (default `HEAD`) or a saved snapshot file: routes added or removed, policies loosened or tightened, fields visible to more people, environment variables, hosts the code can reach, events, blocks and invariants. `--ci` exits with code 1 when a change widens access. See [The behavior diff](/behavior-diff).

With `--api` it compares the API contract your clients see instead (the OpenAPI document): every change sorted into breaking, minor or patch, and the version it suggests from `version` in `package.json` (before 1.0, a breaking change is a minor bump). `--ci` then fails on a breaking change. See [API contract](/behavior-diff#api-contract).

```text
$ npx calm diff --api
  API contract changes since HEAD (7d630d3) (8)
    breaking  POST /api/products        body.name: maxLength none -> 80
    breaking  PATCH /api/products/{id}  body.name: maxLength none -> 80
    minor     GET /api/products         response.data[].sku: added to the response
    ...

  2 breaking · 6 added · 0 other
  Suggested version 0.1.0 -> 0.2.0 (breaking: before 1.0 that is a minor bump)
```

| Option | Meaning |
|---|---|
| `[ref]` | Branch, tag, commit, or a snapshot file written with `--save` |
| `--api` | Compare the API contract: breaking, minor and patch changes and the version bump |
| `--ci` | Fail when access got wider (with `--api`: on a breaking change) |
| `--json` | `{ since, changes, summary }` (with `--api`: also `bump`, `version` and `next`) |
| `--save <file>` | Write the current snapshot |

## calm review

```text
calm review [--sign] [--note <text>] [--as "Name <email>"] [--yes] [--list] [--ci] [--json]
```

What changed since the last signature, for a person to read and sign: the behavior diff, the files AI agents changed that nobody signed, what agents declared with `calm_declare` next to what they did, and the last test run. See [Review and sign](/review).

| Option | Meaning |
|---|---|
| `--sign` | Accept it: writes `.calm/reviews/` (commit it with your change) |
| `--note <text>` | Why the changes are fine, stored with the signature |
| `--as "Name <email>"` | The signer, instead of `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL` or your git config |
| `-y`, `--yes` | Sign without asking (required without a terminal) |
| `--list` | Only the files agents changed that are not signed yet |
| `--ci` | Exit with code 1 when access widened since the last signature (passes when nothing was ever signed) |
| `--json` | The whole review as JSON |

Signing refuses to run in an AI agent's shell: sign in your own terminal, or in the devtools **Review** panel.

## calm replay

```text
calm replay [--limit <n>] [--writes] [--json] [--ci]
```

Sends the requests the dev server recorded in `.calm/traffic.jsonl` again, as the users who made them, against the code as it is now, and reports the answers whose status or shape changed: fields newly returned (a possible leak), fields gone, types changed, lists that grew or shrank. It needs the dev server (`npm run dev`) and refuses to run in production. See [Replay and recorded tests](/replay).

| Option | Meaning |
|---|---|
| `--limit <n>` | How many of the newest recorded requests (default 200, at most 1000) |
| `--writes` | Writes too: a checkpoint is taken first and restored after, so your data ends as it began |
| `--ci` | Exit with code 1 when an answer changed or a request failed |
| `--json` | The full report |

```text
  Replayed 8 recorded requests against the code as it is now (0.1 s)
       4 identical
       4 changed

  ~ GET /api/products as user 6acea3e1dbe9e2d47e219400 [user] (4 times)
      body.data[].tags: no longer returned
```

## calm budgets

```text
calm budgets [test files...] [--ci] [--json]
```

Runs your tests (`node --test`) with the meter on, then shows what each route cost: MongoDB queries per request, the p95 time and the largest response, next to its budget in `calm.config.js` (`budgets: { 'GET /api/feed': { queries: 4, p95: '150ms', response: '200kb' }, '*': { queries: 12 } }`). See [Budgets](/budgets).

| Option | Meaning |
|---|---|
| `[test files...]` | Run only these test files |
| `--ci` | Exit with code 1 when a route is over budget or a test fails |
| `--json` | `{ tests, configured, routes, over }` |

The dev server measures the same numbers live, in the devtools **Budgets** panel.

## calm about

```text
calm about [--json]
```

The [transparency report](/transparency): the request pipeline in order, headers, stored data with lifetimes, logging, the hosts the code can reach and every file the CLI writes.

## calm checkpoint and calm restore

```text
calm checkpoint [name] [--note <text>] [--json]
calm checkpoint list [--json]
calm checkpoint delete <id>
calm restore [id] [--yes] [--json]
```

Snapshot the development database to `.calm/checkpoints/<id>/` and put it back. `calm restore` restores the latest checkpoint without an id, shows what it will replace and asks first; `--yes` skips the question and is required without a terminal. Both refuse to run in production. See [Checkpoints](/checkpoints).

## calm audit

```text
calm audit [--json] [--ci]
calm audit --accept [--reason <why>] [--as "Name <email>"]
```

Authorization testing for your API. Boots the app on a throwaway database (`MONGODB_TEST_URI`, default `mongodb://127.0.0.1:27017`), creates a user per persona (anonymous, owner, another user, admin, custom roles), seeds records and calls every CRUD route as every persona. It checks status codes against your policies, owner-only lists, field leaks, mass assignment, query injection, the page size cap, error hygiene and token handling. Your real database is never touched. See [Security audit](/audit).

| Option | Meaning |
|---|---|
| `--ci` | Exit with code 1 when a check fails, or when access is wider than `security.snapshot.json` |
| `--json` | Machine readable report |
| `--accept` | Write who may do what to `security.snapshot.json` (the [exposure budget](/exposure-budget)). Needs no database. |
| `--reason <why>` | With `--accept`: why access changed. Required when it widened since the last snapshot; recorded next to your name. |
| `--as "Name <email>"` | With `--accept`: who accepts, instead of your git user |

`--accept` refuses to run in an AI agent's shell, and accepting a matrix that did not change writes nothing.

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

That is one resource of a failing run: its service ignores the owner scope on `list`.

## calm admin

```text
calm admin <email> [--revoke]
```

Gives an existing user the `admin` role, or removes it with `--revoke`. It connects to `MONGODB_URI` from `.env`, and the change applies to the user's next request. To make your first admin, sign up through `POST /api/auth/register`, then:

```bash
npx calm admin ada@example.com
```

```text
✔ Ada Lovelace <ada@example.com> roles: user, admin
```

## calm keygen

```text
calm keygen [--write]
```

Generates a 32-byte key for [`.encrypted()` fields](/security#encryption-at-rest) and prints it as a `CALM_ENCRYPTION_KEYS=k1:<key>` line. With `--write`, it adds the line to `.env`. If `CALM_ENCRYPTION_KEYS` already exists, the new key goes first (it encrypts from now on) and the old keys stay (they still decrypt existing data): that is key rotation.

```text
$ npx calm keygen --write
✔ Added CALM_ENCRYPTION_KEYS to .env (key k1).

$ npx calm keygen --write
✔ Rotated: k2 encrypts new data; k1 still decrypts existing data.
```

Put the same keys in your production secrets. Never commit them.

## calm upgrade

```text
calm upgrade [--dry-run] [--base <dir>] [-y]
```

Brings framework fixes into `calm/` without losing your edits. See [Upgrading](/upgrading).

| Option | Meaning |
|---|---|
| `--dry-run` | Show the plan, write nothing |
| `--base <dir>` | Use this calmapi checkout as the original files instead of downloading the version in `calm.lock` |
| `-y`, `--yes` | Do not ask for confirmation |

## calm mcp

```text
calm mcp [--scope read|scaffold|full] [--allow <glob>]...
```

Starts a Model Context Protocol server on stdio for AI coding agents. Register it once:

```bash
claude mcp add calm -- npx calm mcp
```

or add `{ "command": "npx", "args": ["calm", "mcp"] }` to your agent's MCP configuration. It offers 29 tools: inspect the project, scaffold, generate the typed client (`calm_client`), compare behavior and the API contract (`calm_diff`), explain a request (`calm_explain`), declare a change and read the review (`calm_declare`, `calm_review`), replay recorded traffic (`calm_replay`), read route budgets (`calm_budgets`), take and restore checkpoints, propose changes, call the dev API as any user (`calm_http`), run tests, doctor and the audit, and read requests, logs, emails, push notifications, security events and project activity. Every tool call is logged to `.calm/activity.jsonl` with the client's name, so you can follow it in devtools. `--scope` limits what the agent may do and `--allow` opens a protected path for one session; see [Scopes](/ai-agents#scopes-what-an-agent-may-do). When the dev server runs, a [checkpoint](/checkpoints) is taken as the agent connects. See [AI agents](/ai-agents) for the list.

## calm agent-hook

```text
calm agent-hook [--client <name>]
```

Reads one JSON object on stdin (the Claude Code hook payload, or `{ tool, path }`) and records that an agent is about to edit that file, so `calm dev` shows the change as the agent's. Prints nothing and always exits 0. New projects run it from `.claude/settings.json`; see [Telling your edits from an agent's](/ai-agents#telling-your-edits-from-an-agents).
