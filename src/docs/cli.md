# CLI reference

The `calmapi` package installs a `calm` command (also available as `calmapi`). It is a dev dependency of every project, so use it with `npx calm <command>` or through the npm scripts. It has no dependencies of its own.

```text
calm create [dir]                       new project (npm create calmapi@latest)
calm dev                                watch mode + devtools
calm make resource <name> [fields...]   scaffold a resource
calm add <block...>                     copy blocks into your project (calm add --list)
calm routes                             every route with its policy and source file
calm openapi                            write openapi.json
calm doctor [--prod] [--ci]             security and correctness checks
calm upgrade                            merge framework updates into calm/
calm mcp                                MCP server for coding agents
```

`calm <command> --help` prints the options of a command, `calm --version` the version. Aliases: `new` and `init` for `create`; `generate`, `g` and `m` for `make`. Running `calmapi` with no arguments outside a project starts the `create` wizard. Commands other than `create` must run inside a project (a folder with `calm.lock`, or below one). Set `CALM_DEBUG=1` to see stack traces.

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

```bash
npx calm make resource invoice number:string!+unique amount:number! status:enum:draft,sent,paid=draft customer:ref:user notes:text --service
```

Without a `user` resource (the `minimal` template), the generated policies are `public` with a comment reminding you to add auth before deploying anything writable.

## calm add

```text
calm add <block...>
```

Copies a block's files into your project, adds its dependencies to `package.json`, appends its environment variables to `.env.example` and `.env`, installs, and records it in `calm.lock`. The code is yours from then on. See [Blocks](/docs/blocks).

```bash
npx calm add jobs api-docs                # official blocks (same as @calmapi/jobs)
npx calm add @acme/billing                # a registry from package.json "calm.registries"
npx calm add https://x.dev/r/y.json       # any URL
npx calm add ./blocks/my-block.json       # a local file
npx calm add --list                       # list official blocks
```

| Option | Meaning |
|---|---|
| `--dry-run` | Show what would change, write nothing |
| `--overwrite` | Replace files that already exist with different content |
| `--no-install` | Do not run the package manager |
| `--remote` | Fetch official blocks from `https://calmapi.dev/r` instead of the copy bundled with the CLI |
| `-y`, `--yes` | Do not ask for confirmation |
| `--list` | List official blocks |

Existing files with different content are kept and reported as conflicts unless you pass `--overwrite`. Blocks that provide the same resource (`storage-local` and `storage-s3`) refuse to be installed together.

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
calm doctor [--prod] [--ci] [--strict] [--json]
```

Security and correctness checks: config, policies, private fields, risky code patterns, framework drift and published advisories. Also works inside CalmAPI 1.x projects (`npx calmapi@next doctor`), where it reports the advisories published for 1.x. See [Security](/docs/security#what-calm-doctor-checks).

| Option | Meaning |
|---|---|
| `--prod` | Evaluate with production rules (`NODE_ENV=production`) |
| `--ci` | Exit with code 1 when there are errors |
| `--strict` | With `--ci`: also fail on warnings |
| `--json` | Machine readable output |

```text
  CalmAPI doctor · my-api · production rules

  ! warn   No mail transport in production
           Password reset emails cannot be delivered. Run `calm add @calmapi/mail-resend` or register a transport.
  • info   TRUST_PROXY is not set
           Behind a load balancer every client shares one IP for rate limiting. Set TRUST_PROXY (e.g. 1).

  0 errors · 1 warning · 1 info
```

Doctor boots your app in a child process to inspect it, without connecting to MongoDB.

## calm upgrade

```text
calm upgrade [--dry-run] [--base <dir>] [-y]
```

Brings framework fixes into `calm/` without losing your edits. See [Upgrading](/docs/upgrading).

| Option | Meaning |
|---|---|
| `--dry-run` | Show the plan, write nothing |
| `--base <dir>` | Use this calmapi checkout as the original files instead of downloading the version in `calm.lock` |
| `-y`, `--yes` | Do not ask for confirmation |

## calm mcp

```text
calm mcp
```

Starts a Model Context Protocol server on stdio for AI coding agents. Register it once:

```bash
claude mcp add calm -- npx calm mcp
```

or add `{ "command": "npx", "args": ["calm", "mcp"] }` to your agent's MCP configuration. See [AI agents](/docs/ai-agents) for the tools it offers.
