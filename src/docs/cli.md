# CLI reference

The `calmapi` package installs a `calm` command (also available as `calmapi`). It is a dev dependency of every project, so use it with `npx calm <command>` or through the npm scripts. It has no dependencies of its own.

```text
calm create [dir]                       new project (npm create calmapi@latest)
calm dev                                watch mode + devtools
calm make resource <name> [fields...]   scaffold a resource
calm make block <name>                  start your own block
calm add <block...>                     copy blocks into your project (calm add --list, gh:user/repo/name)
calm block list|check|pack              your blocks: what changed, a safety review, a file to share
calm seed [resource...]                 sample records that look real
calm routes                             every route with its policy and source file
calm openapi                            write openapi.json
calm doctor [--prod] [--audit] [--ci]   security and correctness checks
calm diff [ref] [--ci]                  what changed in behavior since a git ref
calm about                              what the framework does that you did not write
calm checkpoint [name]                  snapshot the dev database (list, delete <id>)
calm restore [id] [--yes]               put the dev database back
calm audit [--ci]                       test every route as every role on a throwaway database
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
calm dev
```

Starts the app in development mode: `NODE_ENV=development`, file watching (`node --watch` on `app/`, `calm/`, `calm.config.js`, `server.js` and `.env`, so new resource folders restart the server too) and devtools at `http://localhost:<port>/_calm`. Extra arguments are passed to `node`, for example `calm dev --inspect`.

It also records every file change (with a line diff, marked as made by an AI agent or by you), restart and crash in `.calm/activity.jsonl`. The contents of `.env` are never recorded. Devtools shows this log live in the **Activity** panel; see [Watching an agent work](/ai-agents#watching-an-agent-work).

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
| `--no-test` | Do not create the test file |
| `--force` | Overwrite existing files |

Field syntax: `name:type[!][=default][+modifier...]`

| Spec | Generated |
|---|---|
| `title:string!` | `f.string().required()` |
| `price:number=0` | `f.number().default(0).sortable().filterable()` |
| `status:enum:draft,live=draft` | `f.enum(['draft', 'live']).default('draft').filterable()` |
| `category:ref:category` | `f.ref('category').filterable()` |
| `author:ref` | `f.ref('author').filterable()` (the field name is the resource) |
| `tags:string[]` | `f.array(f.string()).default([])` |
| `name:string!+searchable+sortable` | `f.string().required().searchable().sortable()` |
| `publishedAt:date=now` | `f.date().default(() => new Date()).sortable().filterable()` |

Types: `string text email url password number integer boolean date enum ref id json` (also `str`, `num`, `float`, `int`, `bool`, `datetime`, `object`). Modifiers: `searchable sortable filterable unique index hidden writeOnly readOnly immutable populate owner`. Enums, booleans and refs are made filterable, numbers and dates filterable and sortable.

A field spec `owner:ref:user` becomes the owner field (`f.ref('user').filterable().owner()`), and no second owner field is added.

```bash
npx calm make resource invoice number:string!+unique amount:number! status:enum:draft,sent,paid=draft customer:ref:user notes:text --service
```

Without a `user` resource (the `minimal` template), the generated policies are `public` with a comment reminding you to add auth before deploying anything writable.

## calm make block

```text
calm make block <name>
```

Starts your own block: `app/blocks/<name>/index.js` (a working route, with every extension point listed in comments), `block.json` (what sharing it needs), `README.md`, and `test/blocks/<name>.test.js`. The block is live in your app right away. The name is turned into kebab case and must start with a letter.

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
calm routes [--json]
```

Every route the app serves with its method, path, policy and the file it comes from. Defaulted policies are marked `(default)`. `--json` prints machine readable output.

## calm openapi

```text
calm openapi [--out openapi.json] [--stdout]
```

Writes the OpenAPI 3.1 document generated from your resources and routes (default `openapi.json`), or prints it with `--stdout`. The running app also serves it at `/api/openapi.json`.

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

Doctor boots your app in a child process to inspect it, without connecting to MongoDB.

## calm diff

```text
calm diff [ref] [--json] [--ci] [--save <file>]
```

What changed in behavior since a git ref (default `HEAD`) or a saved snapshot file: routes added or removed, policies loosened or tightened, fields visible to more people, environment variables, hosts the code can reach, events, blocks and invariants. `--ci` exits with code 1 when a change widens access. See [The behavior diff](/behavior-diff).

| Option | Meaning |
|---|---|
| `[ref]` | Branch, tag, commit, or a snapshot file written with `--save` |
| `--ci` | Fail when access got wider |
| `--json` | `{ since, changes, summary }` |
| `--save <file>` | Write the current snapshot |

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
```

Authorization testing for your API. Boots the app on a throwaway database (`MONGODB_TEST_URI`, default `mongodb://127.0.0.1:27017`), creates a user per persona (anonymous, owner, another user, admin, custom roles), seeds records and calls every CRUD route as every persona. It checks status codes against your policies, owner-only lists, field leaks, mass assignment, query injection, the page size cap, error hygiene and token handling. Your real database is never touched. See [Security audit](/audit).

| Option | Meaning |
|---|---|
| `--ci` | Exit with code 1 when a check fails |
| `--json` | Machine readable report |

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

or add `{ "command": "npx", "args": ["calm", "mcp"] }` to your agent's MCP configuration. It offers 24 tools: inspect the project, scaffold, compare behavior (`calm_diff`), explain a request (`calm_explain`), take and restore checkpoints, propose changes, call the dev API as any user (`calm_http`), run tests, doctor and the audit, and read requests, logs, emails, security events and project activity. Every tool call is logged to `.calm/activity.jsonl` with the client's name, so you can follow it in devtools. `--scope` limits what the agent may do and `--allow` opens a protected path for one session; see [Scopes](/ai-agents#scopes-what-an-agent-may-do). When the dev server runs, a [checkpoint](/checkpoints) is taken as the agent connects. See [AI agents](/ai-agents) for the list.

## calm agent-hook

```text
calm agent-hook [--client <name>]
```

Reads one JSON object on stdin (the Claude Code hook payload, or `{ tool, path }`) and records that an agent is about to edit that file, so `calm dev` shows the change as the agent's. Prints nothing and always exits 0. New projects run it from `.claude/settings.json`; see [Telling your edits from an agent's](/ai-agents#telling-your-edits-from-an-agents).
