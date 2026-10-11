# Configuration

Configuration comes from three places, merged in this order:

1. The defaults in `calm/config.js` (listed below).
2. `calm.config.js` in your project.
3. Overrides passed to `createApp({ config })`, which is what tests use.

Before that, `.env` is loaded into `process.env` (with Node's built-in `process.loadEnvFile`). Keep secrets in `.env` and the environment; keep `calm.config.js` for behavior, and commit it.

## calm.config.js

```js
import { defineConfig } from '#calm';

export default defineConfig({
  pagination: { defaultLimit: 20, maxLimit: 100 },
  auth: { sessionTtlDays: 30, resetTokenTtlMinutes: 30 },
  mail: { from: 'My API <no-reply@example.com>' },
});
```

It can also export a function of the environment and mode:

```js
export default defineConfig(({ env, mode }) => ({
  bodyLimit: mode === 'production' ? '256kb' : '5mb',
  cors: { origins: env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'] },
}));
```

`defineConfig` returns its argument unchanged; it only helps editors autocomplete. Nested objects are merged key by key, so `auth: { register: false }` keeps the other auth defaults. Arrays are replaced.

## Mode

The mode is `NODE_ENV`, and **defaults to `production`** when `NODE_ENV` is not set. `calm dev` sets `development`, tests use `test`.

| | development | test | production |
|---|---|---|---|
| Devtools at `/_calm` | on | off | off, cannot be enabled |
| CORS without `CORS_ORIGINS` | any origin (`*`) | any origin | no origin |
| `APP_URL` | optional | optional | **required** |
| Log format | pretty | pretty, silent | JSON lines |
| `Strict-Transport-Security` header | | | sent |
| Rate limits | on | off | on |
| `500` responses include `debug` | yes | | |

Only `development` and `test` relax the rules. Any other value (`staging`, `preview`, unset) runs as production: CORS needs an explicit list, `APP_URL` is required and devtools stay off. The raw value is available as `config.nodeEnv`.

## Validation at boot

The app refuses to start, with a readable message, when:

- `MONGODB_URI` is not set (`db.uri`);
- the mode is `production` and `APP_URL` is not set.

```text
Invalid configuration:
  - APP_URL must be set in production (used in emails and links)
```

## Every key

| Key | Default | Notes |
|---|---|---|
| `app.name` | `name` in package.json | Banner, emails, OpenAPI title |
| `app.version` | `version` in package.json | |
| `app.url` | `APP_URL`, else `http://localhost:<port>` | Public URL of the API, used in reset links and OpenAPI `servers` |
| `port` | `PORT`, else `5001` | |
| `host` | `HOST`, else all interfaces | |
| `apiPrefix` | `'/api'` | Where every route is mounted |
| `trustProxy` | `TRUST_PROXY`, else `false` | Express `trust proxy`. `'true'`, `'false'`, a hop count (`1`) or a value like `'loopback'` |
| `bodyLimit` | `'1mb'` | Maximum JSON body |
| `jsonLimits` | `{ maxDepth: 20, maxKeys: 10000 }` | Deepest nesting and most values a JSON body may have; more is a `400` (see [Security](/docs/security#json-guard)) |
| `db.uri` | `MONGODB_URI` | Required |
| `db.autoIndex` | `true` | Build indexes declared on fields at startup |
| `db.connectRetries` | `5` | Attempts with exponential backoff (up to 10 s apart) |
| `cors.origins` | `CORS_ORIGINS` (comma separated), else `[]` in production and `'*'` otherwise | Allowed browser origins |
| `cors.credentials` | `false` | Send `Access-Control-Allow-Credentials` (not needed for bearer tokens) |
| `cors.maxAge` | `600` | Preflight cache, in seconds |
| `pagination.defaultLimit` | `20` | Page size when `?limit` is absent |
| `pagination.maxLimit` | `100` | Largest `?limit` allowed |
| `unknownFields` | `'reject'` | Unknown body fields are a `422`. Any other value (`'strip'`) drops them silently. |
| `rateLimit.enabled` | `true` (`false` in test mode) | |
| `rateLimit.global` | `{ windowMs: 60000, max: 300 }` | Every `/api` route, per IP |
| `rateLimit.auth` | `{ windowMs: 900000, max: 10 }` | Login, register, password routes, per IP and route |
| `auth.enabled` | `true` | Auth also needs a `user` resource |
| `auth.register` | `true` | `false` closes public sign-up |
| `auth.sessionTtlDays` | `30` | |
| `auth.resetTokenTtlMinutes` | `30` | |
| `auth.resetUrl` | `<app.url>/reset-password` | The page of your frontend that receives `?token=` |
| `auth.password` | `{ logN: 15, r: 8, p: 3 }` | scrypt cost; length rules live on `f.password()` (8 to 128 characters) |
| `auth.lockout` | `{ maxAttempts: 5, windowMinutes: 15, lockMinutes: 15 }` | Per account [lockout](/docs/authentication#account-lockout) after failed sign-ins; `maxAttempts: 0` turns it off |
| `encryption.keys` | `CALM_ENCRYPTION_KEYS` | Keys for `.encrypted()` fields. Keep them in the environment, not in this file. |
| `openapi.enabled` | `true` | Serve the OpenAPI document |
| `openapi.path` | `'/openapi.json'` | Relative to `apiPrefix` |
| `devtools.enabled` | `true` in development | Forced off in production |
| `log.level` | `LOG_LEVEL`, else `info` (`silent` in tests) | `debug`, `info`, `warn`, `error`, `silent` |
| `log.format` | `json` in production, else `pretty` | |
| `shutdownTimeoutMs` | `10000` | How long open connections may finish on shutdown |
| `mail.from` | `<app.name> <no-reply@localhost>` | Sender for app emails |
| `plugins` | none | Extra plugins (`definePlugin(...)` objects) besides `app/blocks` |

Read the effective configuration anywhere through `ctx.config` or `app.config`.

## Environment variables

| Variable | Used for |
|---|---|
| `NODE_ENV` | `development` or `test`; anything else (or unset) runs as production |
| `MONGODB_URI` | Database connection string (required) |
| `APP_URL` | Public URL (required in production) |
| `PORT`, `HOST` | Where to listen (default `5001`, all interfaces) |
| `CORS_ORIGINS` | Comma separated allowed origins, for example `https://app.example.com,https://admin.example.com` |
| `TRUST_PROXY` | Set behind a load balancer, usually `1` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error`, `silent` |
| `CALM_SKIP_ENV_FILE` | `1` to ignore `.env` |
| `CALM_MAIL_PRINT` | `1` to print email bodies to the console in development |
| `CALM_ENCRYPTION_KEYS` | Keys for `.encrypted()` fields: `k2:<base64>,k1:<base64>`, the first one encrypts. Create with `npx calm keygen --write` (see [Encryption at rest](/docs/security#encryption-at-rest)) |
| `MONGODB_TEST_URI` | Server used by `createTestApp` and `calm audit` (default `mongodb://127.0.0.1:27017`) |
| `CALM_TEST_LOG` | Log level inside tests, for example `info` |
| `CALM_DEBUG` | Print stack traces for CLI errors |

Blocks add their own variables (for example `JOBS_WORKER`, `RESEND_API_KEY`); `calm add` appends them to `.env.example` and `.env`.

```ini
# .env (never commit it)
MONGODB_URI=mongodb://127.0.0.1:27017/my_api
APP_URL=http://localhost:5001
PORT=5001
# CORS_ORIGINS=https://app.example.com
# TRUST_PROXY=1
# LOG_LEVEL=info
```
