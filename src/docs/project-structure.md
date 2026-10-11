# Project structure

A CalmAPI project is a plain Node.js (ESM) app. The framework is in `calm/`, your code is in `app/`.

```text
my-api/
├── calm/                     the framework (yours, tracked by calm.lock)
├── app/
│   ├── resources/
│   │   ├── post/
│   │   │   ├── post.resource.js    fields + access policy (required)
│   │   │   ├── post.service.js     business logic (optional)
│   │   │   └── post.routes.js      custom endpoints (optional)
│   │   └── user/
│   │       └── user.resource.js
│   ├── blocks/               blocks added with `calm add` (and your own plugins)
│   └── routes.js             app-wide custom routes (optional)
├── test/
│   └── posts.test.js         node:test, uses createTestApp
├── server.js                 starts the app
├── calm.config.js            config overrides (no secrets)
├── calm.lock                 framework and block file hashes, used by `calm upgrade`
├── .env / .env.example       secrets and environment
├── AGENTS.md / CLAUDE.md     instructions for AI coding agents
├── Dockerfile / .dockerignore
├── eslint.config.js
└── package.json
```

## calm/

The framework itself, copied from the `calmapi` package when the project was created. It is your code: read it, debug it, change it. `calm upgrade` merges upstream fixes into it without discarding your edits (see [Upgrading](/docs/upgrading)).

| File | What it does |
|---|---|
| `index.js` | Everything `#calm` exports |
| `app.js` | `createApp()`: loads config, resources and blocks, builds the Express app, starts and stops it |
| `config.js` | Defaults, `.env` and `calm.config.js` loading, validation at boot |
| `loader.js` | Finds `app/resources/*`, `app/blocks/*` and `app/routes.js`; `definePlugin()` |
| `resource/resource.js` | `resource()`, Mongoose compilation, input validation, output serialization |
| `resource/fields.js` | The `f.*()` field builders and value validation |
| `resource/policy.js` | Policy parsing and evaluation, `hasRole()`, `isOwner()` |
| `resource/query.js` | The list query language (filters, search, sort, pagination, include, fields) |
| `resource/routes.js` | The five CRUD routes |
| `resource/service.js` | `ResourceService` |
| `http/router.js` | The route builder, request context (`ctx`), item authorization, responses |
| `http/middleware.js` | Request ids, security headers, CORS, rate limiting, access log |
| `auth/` | Register, login, sessions, password change and reset; scrypt hashing; tokens |
| `errors.js` | `CalmError`, helpers and the mapping of every error to a safe response |
| `events.js`, `mail.js`, `logger.js`, `context.js` | Event bus, mailer, structured logger, per-request context |
| `openapi.js`, `doctor.js`, `testing.js` | OpenAPI 3.1 generator, runtime checks, test helpers |
| `devtools/index.js` | The devtools collector and API behind `/_calm` (development only) |

## app/resources

One folder per resource. The folder name is the resource name, and files are named after the folder:

- `<name>.resource.js` (required) default-exports `resource('<name>', { fields, policy })`. See [Resources and fields](/docs/resources).
- `<name>.service.js` (optional) default-exports a class that extends `ResourceService`. See [Services and hooks](/docs/services).
- `<name>.routes.js` (optional) default-exports `(r) => { ... }`. Its routes are mounted under the resource path, before the CRUD routes. See [Custom routes](/docs/routes).

A folder without a `.resource.js` file is ignored. Create resources with `npx calm make resource`, which also writes a test.

## app/blocks

Blocks added with `calm add` land here as `app/blocks/<name>/index.js` (some also add resources or `app/jobs/`). Every folder with an `index.js` that default-exports `definePlugin({ name, setup })` is loaded at boot, so this is also the place for your own plugins, for example an event listener. See [Publishing your own block](/docs/publishing-blocks) for the plugin API.

## app/routes.js

Routes that do not belong to a resource, mounted under `/api`:

```js
// app/routes.js
export default (r) => {
  r.get('/hello', { policy: 'public', summary: 'Say hello' }, (ctx) => ({
    message: `Hello from ${ctx.config.app.name}`,
  }));
};
```

## server.js

```js
import { createApp } from '#calm';

try {
  const app = await createApp({ root: import.meta.dirname });
  await app.listen();
} catch (err) {
  console.error(err.code === 'CALM_CONFIG' ? `\n${err.message}\n` : err);
  process.exit(1);
}
```

`npm start` runs it (production mode unless `NODE_ENV` says otherwise), `npm run dev` runs it through `calm dev`.

## calm.config.js and .env

`calm.config.js` overrides the defaults in `calm/config.js`. Secrets (database URI, API keys) belong in `.env`, which is git-ignored. See [Configuration](/docs/configuration).

```js
import { defineConfig } from '#calm';

export default defineConfig({
  pagination: { defaultLimit: 20, maxLimit: 100 },
  auth: { sessionTtlDays: 30, resetTokenTtlMinutes: 30 },
  mail: { from: 'My API <no-reply@example.com>' },
});
```

## calm.lock

Written by `calm create` and updated by `calm add` and `calm upgrade`. Commit it.

```json
{
  "lockfileVersion": 1,
  "calmapi": "2.0.0-alpha.0",
  "template": "api",
  "core": {
    "calm/app.js": "sha256:585bd812cfc3d1343684effb382612d0074b82c7da27ede3673bb4f76df5e4a2",
    "calm/auth/index.js": "sha256:b4633aa522492d2f0065ba052660ca6f12fd813d7c90a824c7f0375ba2b130d1"
  },
  "blocks": {
    "@calmapi/jobs": {
      "version": "1.0.0",
      "source": "@calmapi (bundled)",
      "files": { "app/blocks/jobs/index.js": "sha256:..." }
    }
  }
}
```

`core` holds the hash of each framework file as it was shipped, which is how `calm upgrade` knows whether you edited a file and `calm doctor` reports local changes. `blocks` records what `calm add` installed.

## AGENTS.md and CLAUDE.md

`AGENTS.md` tells AI coding agents (Claude Code, Codex, Cursor, Copilot) how this project is laid out and which rules to follow. `CLAUDE.md` points Claude Code to it. See [AI agents](/docs/ai-agents).

## #calm and #app imports

`package.json` declares [subpath imports](https://nodejs.org/api/packages.html#subpath-imports), so you never write `../../../calm`:

```json
{
  "imports": {
    "#calm": "./calm/index.js",
    "#calm/*": "./calm/*",
    "#app/*": "./app/*"
  }
}
```

```js
import { resource, f, ResourceService, notFound } from '#calm';     // the public API
import { createTestApp } from '#calm/testing.js';                    // any framework file
import { evaluatePolicy } from '#calm/resource/policy.js';
import { defineJob } from '#app/blocks/jobs/index.js';               // your own code
```

Subpath imports need the `.js` extension. Inside services and routes, reach other resources through `this.service('name')` or `ctx.services.name` instead of importing their models.

### What #calm exports

| Export | Use |
|---|---|
| `resource`, `f`, `Field` | Declare resources and fields |
| `ResourceService` | Base class for services |
| `definePlugin` | Declare a plugin (what blocks export) |
| `createApp`, `defineConfig` | Build the app, type-friendly config |
| `CalmError`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validationError`, `tooManyRequests` | Errors (see [Errors](/docs/errors)) |
| `hasRole`, `isOwner` | Policy helpers |
| `serialize`, `validateInput`, `standardSchema` | Apply a resource's output and input rules yourself |
| `Reply` | What `ctx.reply()` returns |
| `hashPassword`, `verifyPassword` | scrypt helpers |
| `currentRequest` | The current request's context from anywhere (AsyncLocalStorage) |

## How the app boots

`createApp()` does the following, in order:

1. Load `.env`, `calm.config.js` and the defaults; fail fast on invalid config.
2. Load `app/resources/*` and `app/blocks/*`, then run each block's `setup()`.
3. Compile every resource into a Mongoose model and create its service.
4. Register routes: auth, block routes, `app/routes.js`, then for each resource its custom routes followed by its CRUD routes.
5. Build the Express app. `listen()` then connects to MongoDB, builds indexes, runs start hooks and prints the banner.
