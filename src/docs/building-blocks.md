# Building your own block

A block is a folder in `app/blocks/<name>/` with an `index.js` that default-exports `definePlugin({ name, setup })`. Every official block is built this way, and so is anything you write for your own app: an event listener, a payment integration, a maintenance switch. Start inside a real project, where the block is live right away. Share it later with one command.

## A block in 15 lines

```js
// app/blocks/hello/index.js
import { definePlugin } from '#calm';

export default definePlugin({
  name: 'hello',
  options: { greeting: 'Hello' },
  setup(calm, options) {
    calm.routes((r) => {
      r.get('/hello', { policy: 'public', summary: 'Say hello' }, () => ({ message: `${options.greeting} from a block` }));
    });

    calm.on('post.created', ({ doc }) => calm.log.info(`New post: ${doc.title}`));
  },
});
```

Save it and `npm run dev` restarts: `GET /api/hello` answers `{ "data": { "message": "Hello from a block" } }`, and every new post is logged. Every folder in `app/blocks/` with an `index.js` is loaded at boot, in alphabetical order.

Change the settings of any block in `calm.config.js`, without touching its code:

```js
// calm.config.js
export default defineConfig({
  blocks: { hello: { greeting: 'Hi' } },
});
```

To start with every file in place, let the CLI write them:

```bash
npx calm make block hello
```

```text
✔ Created block hello
  + app/blocks/hello/index.js
  + app/blocks/hello/block.json
  + app/blocks/hello/README.md
  + test/blocks/hello.test.js
```

`index.js` lists every extension point in comments, `block.json` describes the block for sharing, and the test runs with `npm test`. Add `--no-test` to skip the test, `--force` to overwrite.

## definePlugin

| Key | |
|---|---|
| `name` | Required. Letters, digits, `-` and `_`, starting with a letter. Use the folder name: it is also the key in `calm.config.js` `blocks`. |
| `setup(calm, options)` | Required. Runs once at boot and may be async. |
| `options` | Settings with their defaults |
| `env` | The environment variables the block reads |

### Settings

`options` holds the defaults. At boot they are merged with `blocks.<name>` from `calm.config.js` and passed to `setup(calm, options)`; `calm.options` is the same object. Plain objects are merged key by key, and anything else (arrays, strings, functions) replaces the default.

```js
export default definePlugin({
  name: 'reports',
  options: { schedule: 'every 1h', recipients: [], format: { csv: true, pdf: false } },
  setup(calm, options) {
    // with blocks: { reports: { recipients: ['ops@example.com'], format: { pdf: true } } }
    // options = { schedule: 'every 1h', recipients: ['ops@example.com'], format: { csv: true, pdf: true } }
  },
});
```

Tests can pass other settings: `createTestApp({ config: { blocks: { reports: { schedule: 'every 1m' } } } })`.

Settings are for things that are the same on every machine. Secrets and per-environment values belong in environment variables.

### Environment variables

Declare what the block reads, then read it with `calm.env()`:

```js
// app/blocks/slack-notify/index.js
import { definePlugin } from '#calm';

export default definePlugin({
  name: 'slack-notify',
  env: {
    SLACK_WEBHOOK_URL: { required: 'production', secret: true, description: 'Incoming webhook URL from Slack' },
    SLACK_CHANNEL: 'Channel to post in (default: the webhook channel)',
  },
  setup(calm) {
    const url = calm.env('SLACK_WEBHOOK_URL');
    if (!url) return; // in development without the variable, the block stays quiet

    calm.on('post.updated', async ({ doc, previous }) => {
      if (doc.status !== 'published' || previous.status === 'published') return;
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: `New post: ${doc.title}`, channel: calm.env('SLACK_CHANNEL') }),
      });
    });
  },
});
```

| Spec | Meaning |
|---|---|
| `'Description'` | Optional, not secret |
| `required: true` | Needed everywhere |
| `required: 'production'` | Needed in production only |
| `secret: true` | The value is never shown in devtools |
| `description` | What it is and where to find it |

Names are `UPPER_SNAKE_CASE`. `calm.env(key, fallback)` returns the value, or `fallback` when it is unset or empty. Reading a variable the block did not declare throws, so the list stays complete.

What you get for declaring them:

- `calm doctor` and the devtools **Doctor** panel report missing ones: `env-SLACK_WEBHOOK_URL` is an error when the block needs it now (`required: true`, or `'production'` under production rules) and an info in development ("Needed in production").
- The devtools **Blocks** panel shows each variable as set or missing, with its description, and never the value of a secret one.

List them in `block.json` `envVars` too, so `calm add` appends them to `.env.example` and `.env` (see [Share it](#share-it)).

## When setup runs

`createApp()` loads `app/resources/*` and `app/blocks/*`, then runs each block's `setup()`, then compiles the resources, then sets up auth and builds the routes. So inside `setup()`:

- You can still change resource definitions (`calm.onResource`), which is why blocks can add fields.
- `calm.app.registry` is still empty and `calm.app.auth` is still `null`. Read them later: in route handlers, in the `calm.routes()` callback, in `calm.onService()`, `calm.onStart()` and event listeners.

```js
setup(calm) {
  const inbox = () => calm.app.registry.get('notification'); // read when needed, not now
  calm.routes((r) => {
    if (!calm.app.auth) return calm.log.warn('my-block needs auth'); // auth is ready here
    r.get('/inbox/count', { policy: 'authenticated' }, (ctx) => inbox().model.countDocuments({ user: ctx.user._id }));
  });
}
```

## Extension points

`setup(calm)` receives the plugin API:

| Member | Use |
|---|---|
| `calm.app`, `calm.config`, `calm.log`, `calm.events`, `calm.mongoose`, `calm.mailer`, `calm.push` | The app and its parts |
| `calm.name`, `calm.options`, `calm.env(key, fallback)` | The block's name, its [settings](#settings) and its [environment variables](#environment-variables) |
| `calm.on(pattern, fn)` | Listen to events: `'post.created'`, `'post.*'`, `'*'`. `fn(payload, name)`. Resource events carry `{ doc, previous?, resource, user }`. |
| `calm.onResource((def) => def)` | Change resource definitions before they compile: add fields, read your own resource options |
| `calm.onService(({ def, model, service }) => {})` | Runs for every resource once services exist: wrap or add methods |
| `calm.routes((r) => {...}, { prefix })` | Add routes under `/api` with the [route builder](/routes) |
| `calm.use(middleware)` | Express middleware in front of the whole app, for paths outside `/api` (like `/docs` or `/mcp`) |
| `calm.authenticate(fn)` | Accept your own credentials in `Authorization: Bearer` ([below](#credentials)) |
| `calm.guard(fn, { order })` | Run before every route's policy and stop or answer the request ([below](#guards)) |
| `calm.policy(name, fn)` | A named policy, usable in policy strings like `'member \| admin'` ([below](#named-policies)) |
| `calm.loginChallenge(fn)` | Take part in sign-in, for a second factor ([below](#the-auth-service)) |
| `calm.provide(key, value)` | Expose an API to the rest of the app as `app.ext[key]` |
| `calm.doctor(fn)` | Add checks to `calm doctor` and the devtools Doctor panel ([below](#doctor-checks)) |
| `calm.devtools.panel(name, fn)` | A devtools panel that renders the JSON `fn(app)` returns |
| `calm.onStart(fn)`, `calm.onShutdown(fn)` | Start and stop workers and timers. Shutdown hooks run in reverse order. |
| `calm.push.use(transport)`, `calm.mailer.use(transport)` | Deliver [push notifications](/push-notifications#your-own-transport) or email |

The devtools **Blocks** panel shows, for every block, which of these it uses: guards, authenticators, policies, events it listens to, transports, what it provides, its panels and its routes.

### Routes

Block routes use the same [route builder](/routes) as your app, with a policy on every route (`calm doctor` warns when one is missing). They are not resource routes, so there is no `ctx.service`, no `ctx.doc` and no automatic serialization: use `ctx.services.<name>` and `ctx.serialize(doc, '<name>')`.

Two route options exist mostly for blocks:

```js
r.post('/reports/export', { policy: 'admin', scope: 'reports:export', meta: { audit: true } }, exportReports);
```

- `scope` names a permission for credentials that carry scopes. The [api-keys](/blocks/api-keys) block only lets keys with `reports:export` (or `*`, or `reports:*`) call this route.
- `meta` is anything you want to read in a guard: `route.meta.audit`.

Resource options are open too: a block reads its own option from `def.options` (`softDelete: true`, `webhooks: false`, `onOwnerDelete: 'anonymize'`):

```js
// import { definePlugin, f } from '#calm';
calm.onResource((def) => {
  if (!def.options.searchIndex) return def;
  def.fields.searchText = f.text().hidden();
  return def;
});
```

### Credentials

`calm.authenticate(fn)` accepts another kind of token in `Authorization: Bearer <token>`: API keys, service tokens, tokens from another identity provider. `fn(token, req)` runs for every bearer token, before sessions are looked up:

```js
import { definePlugin, hashToken, unauthorized } from '#calm';

calm.authenticate(async (token, req) => {
  if (!token.startsWith('svc_')) return null; // not ours: the next authenticator, or a session
  const entry = await ServiceToken.findOne({ hash: hashToken(token) }).lean();
  if (!entry) throw unauthorized('Unknown service token');
  const user = await calm.app.model('user').findById(entry.user).lean();
  return { user, via: 'service-token', scopes: entry.scopes, id: String(entry._id) };
});
```

- Return `null` quickly for tokens that are not yours. The first authenticator that returns an object wins.
- Throw to refuse: the error is the response.
- Return `{ user, via, scopes, id }`. `user` is a user record. Users that are disabled or being deleted are refused with `401`.

Every route then sees how the request signed in, in `ctx.auth`:

| Request | `ctx.auth` |
|---|---|
| Your authenticator | `{ via: 'service-token', scopes: [...], id }` (`via` defaults to `'token'`, `scopes` to `['*']`) |
| A session | `{ via: 'session', scopes: ['*'], id: '<session id>' }` |
| No credential | `null` |

Scopes are only data. Enforce them in a [guard](#guards), for example against `route.scope`, the way the api-keys block does.

### Guards

`calm.guard(fn, { order })` runs `fn(ctx, route)` before every route: auth routes, block routes, your routes and every CRUD route. It runs after authentication and JSON parsing, before route middleware (such as an upload parser) and before the policy check. (On routes with middleware, a quick check that turns away signed-out callers when the policy needs a user comes first.)

```js
// app/blocks/maintenance/index.js
import { definePlugin, CalmError } from '#calm';

export default definePlugin({
  name: 'maintenance',
  env: { MAINTENANCE: 'Set to "on" to answer 503 on every write' },
  setup(calm) {
    calm.guard((ctx, route) => {
      if (calm.env('MAINTENANCE') !== 'on' || route.method === 'GET') return;
      if (ctx.user?.roles?.includes('admin')) return;
      throw new CalmError(503, 'MAINTENANCE', 'We are updating the app. Try again in a few minutes.');
    });
  },
});
```

A guard lets the request through by returning nothing. It stops it in one of three ways:

| Stop with | Response |
|---|---|
| `throw` an error (`forbidden()`, `tooManyRequests()`, `new CalmError(...)`) | The usual [error response](/errors) |
| `return ctx.reply(data, { status, headers })` | `{ data }` with that status (default `200`) |
| Send the response yourself (`ctx.res...end()`) | Whatever you sent. The [idempotency](/blocks/idempotency) block replays a stored response this way. |

What a guard puts on `ctx` stays there for the handler: the [feature-flags](/blocks/feature-flags) block adds `ctx.flags`, the [notifications](/blocks/notifications) block adds `ctx.notify`.

`route` describes the matched route: `method`, `path` (without `/api`), `policy` (the parsed tokens), `scope`, `meta`, `resource`, `action` and `source` (`'crud'`, `'auth'`, `'block:<name>'`...). `ctx` is the route context: `user`, `auth`, `req`, `res`, `params`, `query`, `body` (not validated yet), `services`, `app`.

Guards run in `order`, lowest first (default `0`). The idempotency block uses `order: 100` so it runs after the others, and a request another guard refuses is never stored. Guards do not run for `calm.use()` middleware, health checks or devtools.

### Named policies

`calm.policy(name, fn)` adds a policy that reads like a built-in one:

```js
// app/blocks/orgs/index.js
export const member = async ({ user, req }) =>
  Boolean(user && (await Membership.exists({ user: user._id, org: req?.params.orgId })));

export default definePlugin({
  name: 'orgs',
  setup(calm) {
    calm.policy('member', member);
    calm.routes((r) => {
      r.get('/orgs/:orgId/report', { policy: 'member | admin' }, orgReport);
    });
  },
});
```

The function receives `{ user, action, doc, req }` (`doc` on routes with `:id`) and returns `true` or `false`, or a promise of it. Names are letters, digits, `-` and `_`, and cannot replace a built-in (`public`, `authenticated`, `owner`, `none` and their aliases). `calm routes` and devtools show the name.

Named policies work everywhere a policy does: routes, field rules (`visibleTo`, `writableBy`) and resource files. Resource files load before blocks run `setup()`, so calm resolves the names once every block is set up:

```js
export default resource('project', {
  fields: { ... },
  policy: { list: 'member | admin', read: 'member | admin', create: 'member | admin', update: 'admin', delete: 'admin' },
});
```

Importing the function (`policy: { list: [member, 'admin'] }`) works too, and also on older cores.

### Sharing an API

`calm.provide(key, value)` puts anything on `app.ext`, for routes, services, jobs and other blocks:

```js
calm.provide('slack', { post: (text) => postToSlack(text) });

// anywhere else
await ctx.app.ext.slack.post('Deploy finished');
```

Official blocks share this way: `app.ext.notify`, `app.ext.flags`, `app.ext.webhooks`, `app.ext.apiKeys`, `app.ext.jobs`.

### Doctor checks

`calm.doctor(fn)` adds findings to `calm doctor` and the devtools Doctor panel. `fn(app)` returns an array of `{ level, id, title, detail?, file? }`, with `level` `error`, `warn` or `info`:

```js
calm.doctor((app) =>
  app.config.mode === 'production' && calm.options.recipients.length === 0
    ? [{ level: 'warn', id: 'reports-no-recipients', title: 'Reports have no recipients', detail: 'Set blocks.reports.recipients in calm.config.js.' }]
    : [],
);
```

Checks return an array or a promise of one. `calm doctor` boots the app without connecting to MongoDB, so a check that queries the database should skip when `calm.mongoose.connection.readyState !== 1` (devtools runs checks against the connected app). Refreshing numbers in the background and reporting the last value also works, as the [webhooks](/blocks/webhooks) and [api-keys](/blocks/api-keys) blocks do. A check that throws is reported as `doctor-hook` ("A block doctor check crashed").

Missing environment variables need no check of their own: [declare them](#environment-variables).

### Reading records outside a request

Work that runs outside a request (webhooks, realtime streams, notifications, exports) still has to respect who may see what. `app.canRead()` applies the rules of `GET /api/<resource>/:id`: the read policy, owner scoping and the service `scope()`.

```js
const viewer = { ...userRecord, id: String(userRecord._id) }; // shaped like ctx.user

await calm.app.canRead('post', doc, viewer);                    // may this user read this post?
await calm.app.canRead('post', doc, viewer, { deleted: true }); // a deleted record, judged on your copy
await calm.app.inScope('post', doc, viewer);                    // only the service scope(), not the read policy
```

`doc` is the stored record (for example the `doc` of a `post.updated` event). For a deleted record, pass `{ deleted: true }`: it is judged on the copy you hold, and a `scope()` too complex to check without the database refuses it. Then serialize it for that user with `serialize(def, doc, { user, registry })` from `#calm` (or `ctx.serialize()` inside a request), so hidden and `visibleTo()` fields stay out. The [realtime-sse](/blocks/realtime-sse) and [webhooks](/blocks/webhooks) blocks work this way.

### The auth service

Sign-in blocks (magic links, passkeys, one-time codes) use the same helpers as password sign-in, so lockout, disabled accounts and second factors behave the same way everywhere. They live on `calm.app.auth.service`, which is ready once the routes are built (and `null` when auth is off).

| Helper | Does |
|---|---|
| `completeLogin(user, ctx)` | After the user proved who they are: runs the login challenges (a second factor), then creates the session. Resolves to `{ user, token, expiresAt }`, or to the challenge. |
| `finishLogin(user, req)` | Creates the session without challenges, once a second factor checked out |
| `lockedUntil(email)` | The date until which sign-in for this email is locked, or `null` |
| `recordFailure(email, req, reason)` | Counts a failed attempt (`security.login_failed`) and locks the email after `auth.lockout.maxAttempts` |
| `clearFailures(email)` | Resets the count after a success |
| `inactive(user)` | `true` for accounts that are `disabled` or being deleted: they cannot sign in or use a session |

```js
// A sign-in route for one-time codes
r.post('/auth/code/verify', { policy: 'public', rateLimit: 'auth', input: { email: f.email().required(), code: f.string().required() } }, async (ctx) => {
  const auth = calm.app.auth.service;
  const { email, code } = ctx.body;
  if (await auth.lockedUntil(email)) throw tooManyRequests('Too many failed sign-in attempts. Try again later.');

  const user = await calm.app.model('user').findOne({ email }).lean();
  if (!user || !(await codeMatches(user, code))) {
    await auth.recordFailure(email, ctx.req, 'wrong_code');
    throw unauthorized('Invalid code');
  }
  await auth.clearFailures(email);
  if (auth.inactive(user)) throw forbidden('This account is disabled');
  return auth.completeLogin(user, ctx);
});
```

To add a second factor instead, use `calm.loginChallenge(async (user, ctx) => answer)`. It runs inside `completeLogin`, after the user proved who they are and before a session exists. Return an object (such as `{ mfaRequired: true, mfaToken }`) to answer the sign-in with it, or `null` to continue. Once the second factor checks out, call `finishLogin(user, req)`. The [totp](/blocks/totp#how-it-hooks-into-login) block works this way, and so every sign-in block gets two-factor authentication for free.

### What to import

Blocks import only from `#calm`, the public surface of the framework. Files under `#calm/...` are internals that can change between versions, and `calm block check` points such imports out.

| Export | Use |
|---|---|
| `definePlugin` | Declare the block |
| `resource`, `f`, `Field`, `ResourceService` | Resources, fields and services |
| `serialize`, `validateInput`, `standardSchema`, `resourceJSONSchema` | Apply a resource's output and input rules, or describe it as JSON Schema |
| `evaluatePolicy`, `parsePolicy`, `hasRole`, `isOwner`, `matchesFilter` | Policies, and checking a record against a MongoDB filter in memory |
| `createToken`, `hashToken` | Random tokens with a prefix, and their SHA-256 for storage |
| `hashPassword`, `verifyPassword` | scrypt helpers |
| `isEncrypted` | Whether a stored value is ciphertext from `.encrypted()` |
| `maskToken`, `providerPayloads` | Push helpers: a masked token for logs, the payload each provider receives |
| `Reply`, `currentRequest` | What `ctx.reply()` returns; the current request from anywhere |
| `createApp`, `defineConfig` | Build an app in a script |
| `CalmError`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validationError`, `tooManyRequests` | [Errors](/errors) |

Tests are the exception: they import `createTestApp` from `#calm/testing.js`.

## Test it

`calm make block` writes a test next to your others:

```js
// test/blocks/hello.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createTestApp } from '#calm/testing.js';

let t;
before(async () => {
  t = await createTestApp({ root: join(import.meta.dirname, '..', '..'), config: { blocks: { hello: { greeting: 'Hi' } } } });
});
after(() => t.close());

test('hello says hi', async () => {
  const res = await t.get('/hello');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.message, 'Hi from a block');
});
```

Events, emails and push notifications are captured too: `await t.idle()` waits for event listeners, then check `t.mails` and `t.pushes`. See [Testing](/testing).

## Share it

### block.json

`block.json` sits next to `index.js` and describes the block for other people. `calm make block` writes one:

```json
{
  "name": "slack-notify",
  "title": "Slack notifications",
  "description": "Post to a Slack channel when a post is published.",
  "version": "1.0.0",
  "minVersion": "2.0.0-alpha.1",
  "author": "Acme",
  "license": "MIT",
  "categories": ["notifications"],
  "envVars": { "SLACK_WEBHOOK_URL": "" },
  "dependencies": [],
  "files": [],
  "docs": "Set SLACK_WEBHOOK_URL to an incoming webhook URL (Slack, Apps, Incoming Webhooks)."
}
```

| Field | |
|---|---|
| `name`, `title`, `description`, `version` | Who it is. `version` is semver; raise it when you change the block. |
| `minVersion` | The oldest CalmAPI (`calm/` in the project) the block works with |
| `author`, `license`, `homepage`, `categories` | Shown to people choosing a block |
| `envVars` | Appended to `.env.example` and `.env` on install. Use empty values or harmless placeholders, never real secrets. |
| `dependencies`, `devDependencies` | npm packages with a range: `"stripe@^18.0.0"` |
| `registryDependencies` | Other blocks installed first: `"jobs"`, `"gh:acme/blocks/base"` |
| `conflicts` | Blocks that cannot be installed together with this one |
| `files` | Extra files or folders outside `app/blocks/<name>/` to ship: `"app/jobs/digest.js"`, `"app/resources/invoice"` |
| `docs` | Printed right after installing: what to set, what to call |

Everything in `app/blocks/<name>/` is shipped, except `block.json` itself and a `docs.md`.

### calm block check

```bash
npx calm block check slack-notify
```

```text
  slack-notify v1.0.0 · 2 file(s)
  ok    nothing to fix

  What the code does
  - makes network requests app/blocks/slack-notify/index.js:15
  - reads SLACK_WEBHOOK_URL app/blocks/slack-notify/index.js
```

It checks what makes a block safe and pleasant to install, as errors, warnings and notes:

- a valid name and semver `version` and `minVersion`, a description and docs, and an `index.js` that exports `definePlugin()`;
- file targets that stay in the project and never touch `calm/`, `calm.lock`, `.env` or `package.json`;
- dependencies with a version range, and every `envVars` entry used and declared in `definePlugin({ env })`;
- what looks like a committed secret key (an error), imports of `#calm/...` internals, very large files;
- the same review of what the code does that people see before installing it (below).

With no name it checks every block that has a `block.json`. It also takes an address (`calm block check gh:acme/blocks/slack-notify`, a URL or a `.json` file), to look at someone else's block before adding it. The exit code is `1` when there are errors, so it fits in CI.

### calm block pack

```bash
npx calm block pack
```

```text
✔ Packed slack-notify into r/

  Share it
  Commit r/ and push to GitHub, then anyone can run:
    npx calm add gh:<you>/<repo>/slack-notify
  Or host r/ anywhere: npx calm add https://<host>/r/<name>.json
```

`pack` writes one [registry item](/publishing-blocks#the-registry-item) per block to `r/<name>.json`, plus `r/index.json` listing every item in the folder. A block with errors is not packed. Give names to pack only some, and `--out <dir>` to write elsewhere.

### Installing from GitHub

Commit `r/` and push. Anyone can then install the block straight from the repository:

```bash
npx calm add gh:acme/blocks/slack-notify          # the default branch
npx calm add gh:acme/blocks/slack-notify@v1.2.0   # a tag, a branch or a commit
```

`gh:<user>/<repo>/<name>[@ref]` reads `r/<name>.json` from that repository on GitHub. Any static host works too (`npx calm add https://blocks.acme.dev/r/slack-notify.json`), and so does a [registry of your own](/publishing-blocks#your-own-registry) with short names like `@acme/slack-notify`.

### What people see before installing

A block runs inside the app with full access, like any code you paste. So before a block that is not an official one is installed, `calm add` says in plain language what its code does:

```text
  Review gh:acme/blocks/slack-notify is not an official block: read it before you trust it
  - makes network requests app/blocks/slack-notify/index.js:15
  - reads SLACK_WEBHOOK_URL app/blocks/slack-notify/index.js

? Apply these changes? [Y/n]
```

| Marked | Finding |
|---|---|
| `!` | Runs other programs (`child_process`), evaluates code built at runtime (`eval`, `new Function`), uses `node:vm`, imports from a computed path, loads native code, or has minified lines that cannot be reviewed |
| `-` | Makes network requests, writes or deletes files, opens a port, sees every request (`calm.use`, `calm.guard`, `calm.authenticate`), takes part in sign-in, the environment variables it reads, the hosts it mentions |

When something is marked `!`, the question becomes "This block has code worth reading (marked !). Add it anyway?". With `--yes` (no question asked, for scripts and CI), such a block is refused unless you also pass `--trust`, after reading it:

```bash
npx calm add gh:acme/blocks/slack-notify --dry-run      # the plan and the review, nothing written
npx calm add gh:acme/blocks/slack-notify --yes --trust  # non-interactive, risky code accepted
```

### minVersion

`minVersion` protects people whose `calm/` is older than what your block needs. `calm add` compares it with the CalmAPI version recorded in `calm.lock` and stops with "needs CalmAPI 2.0.0-alpha.2 or newer in calm/ (yours is 2.0.0-alpha.1). Run `calm upgrade` first." Set it to the version you built and tested against; `calm make block` fills in your current one.

### calm block list

```bash
npx calm block list
```

```text
  hello                0.1.0    written here
  jobs                 1.0.1    @calmapi (bundled)
  slack-notify         1.0.0    gh:acme/blocks/slack-notify
                       1 file(s) changed since added: app/blocks/slack-notify/index.js
```

Every block in the project with its version, where it came from, and the files you changed since adding it. The devtools **Blocks** panel shows the same, plus what each block hooks into, its environment variables, its settings and its routes.

## Good blocks

- Keep them small and readable: the people who add your block own its code.
- Put secrets in declared environment variables, and everything else in `options`.
- Go through services (`ctx.services`, `calm.app.service(name)`) and `serialize()`, or `app.canRead()` outside requests, so policies and visibility rules keep applying.
- Give every route an explicit policy, and use the auth service helpers for anything that signs people in.
- Fail loudly at boot for invalid settings, and add doctor checks for what is missing in production.
- Write a test, run `calm block check`, and raise `version` when you change something.
- Pin versions of anything you load from a CDN, and of npm dependencies.

The official blocks are built the same way, from `registry/blocks/<name>/` in the [calmapi repository](https://github.com/sunilksamanta/calmapi). Read them for examples of every extension point.
