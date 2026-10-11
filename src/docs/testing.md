# Testing

CalmAPI tests are plain [`node:test`](https://nodejs.org/api/test.html) files that call your API over HTTP. `createTestApp()` boots your app against a throwaway database on a random port, and helpers sign users up and send requests.

```js
// test/posts.test.js (from the api template)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createTestApp } from '#calm/testing.js';

let t;
before(async () => {
  t = await createTestApp({ root: join(import.meta.dirname, '..') });
});
after(() => t.close());

test('signed-in users write posts, visitors only see published ones', async () => {
  const alice = await t.signup();

  const draft = await t.post('/posts', { title: 'Hello world', body: 'First!' }, alice);
  assert.equal(draft.status, 201);
  assert.equal(draft.body.data.slug, 'hello-world');

  const anonymous = await t.get('/posts');
  assert.equal(anonymous.body.meta.total, 0, 'drafts are not public');
});

test('only the author (or an admin) can edit a post', async () => {
  const alice = await t.signup();
  const bob = await t.signup();
  const post = await t.post('/posts', { title: 'Mine', body: '...', status: 'published' }, alice);

  const edit = await t.patch(`/posts/${post.body.data.id}`, { title: 'Hacked' }, bob);
  assert.equal(edit.status, 403);
});
```

```bash
npm test
```

`npm test` runs `node --test`, which finds `test/**/*.test.js`. It needs a MongoDB server.

## createTestApp(options)

```js
const t = await createTestApp({ root, config, baseUri });
```

| Option | Meaning |
|---|---|
| `root` | The project folder (default `process.cwd()`) |
| `config` | Config overrides, merged over everything else (see below) |
| `baseUri` | MongoDB server to create the test database on (default `MONGODB_TEST_URI`) |

It creates a database named `calm_test_<time>_<random>` on `MONGODB_TEST_URI` (default `mongodb://127.0.0.1:27017`), starts the app with `mode: 'test'` and listens on a random port. In test mode rate limits are off, logs are silent, devtools is off and password hashing uses cheap parameters so tests stay fast. `.encrypted()` fields work without setup: tests use `CALM_ENCRYPTION_KEYS` when it is set, and a random key otherwise.

```bash
MONGODB_TEST_URI=mongodb://localhost:27018 npm test   # another server
CALM_TEST_LOG=info npm test                           # see the app logs
```

## The test client

| Member | Does |
|---|---|
| `t.get(path, auth?)` | `GET` |
| `t.post(path, body?, auth?)` | `POST` with a JSON body |
| `t.patch(path, body?, auth?)`, `t.put(path, body?, auth?)` | `PATCH`, `PUT` |
| `t.delete(path, auth?)` | `DELETE` |
| `t.request(method, path, body?, auth?)` | Any method |
| `t.signup({ name?, email?, password?, roles? })` | Registers a user through `/api/auth/register` and returns `{ token, user, id, email, password }`. `roles` are written straight to the database. |
| `t.idle()` | Waits for background work: event listeners, emails, `app.background()` tasks |
| `t.app` | The app: `t.app.model('post')`, `t.app.service('post')`, `t.app.events`, `t.app.mailer`... |
| `t.origin` | `http://127.0.0.1:<port>`, for raw `fetch` calls |
| `t.close()` | Stops the server, drops the database and disconnects |

Paths are relative to the API prefix: `t.get('/posts')` calls `/api/posts`. Paths that already start with `/api`, `/health` or `/_calm` are used as they are.

`auth` is either the object returned by `t.signup()` or a token string. Every helper resolves to `{ status, body, headers }`, with `body` parsed as JSON (or `null` for `204`).

## Recipes

### Admins and roles

```js
const admin = await t.signup({ name: 'Root', roles: ['user', 'admin'] });
assert.equal((await t.get('/users', admin)).status, 200);
```

### Emails and password resets

```js
const mails = [];
t.app.mailer.observe((m) => mails.push(m));

await t.post('/auth/password/forgot', { email: alice.email });
await t.idle(); // the email is sent in the background
const token = mails.at(-1).meta.token;
assert.equal((await t.post('/auth/password/reset', { token, password: 'new-password-1' })).status, 204);
```

### Events

```js
const seen = [];
const off = t.app.events.on('post.*', (payload, name) => seen.push(name));
await t.post('/posts', { title: 'Evented', body: 'x' }, alice);
await t.idle();
off();
assert.deepEqual(seen, ['post.created']);
```

### Rate limits on

```js
const limited = await createTestApp({ root, config: { rateLimit: { enabled: true, auth: { windowMs: 60_000, max: 3 } } } });
```

### Reading the database directly

```js
const stored = await t.app.model('product').findById(id).select('+cost').lean();
assert.equal(stored.cost, 10); // a hidden field, set by the service
```

## Generated tests

`calm make resource` writes `test/<plural>.test.js` with two tests: create, read and list as a signed-in user, and a `401` for signed-out requests. It is skipped when the project has no `user` resource, and when required references would need fixtures it cannot guess. Use it as a starting point.

## In CI

Run MongoDB as a service and point `MONGODB_TEST_URI` at it. With GitHub Actions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:8
        ports: ['27017:27017']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm ci
      - run: npx calm doctor --ci
      - run: npm test
        env: { MONGODB_TEST_URI: 'mongodb://127.0.0.1:27017' }
      - run: npx calm audit --ci
        env: { MONGODB_TEST_URI: 'mongodb://127.0.0.1:27017' }
```

`calm audit` uses the same throwaway database setup to call every route as every kind of user. See [Security audit](/docs/audit).
