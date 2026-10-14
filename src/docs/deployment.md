# Deployment

A CalmAPI app is a regular Node.js server: `npm start` runs `node server.js`. It needs Node.js 22.12 or newer (24 LTS recommended) and a MongoDB server.

```bash
NODE_ENV=production \
APP_URL=https://api.example.com \
MONGODB_URI='mongodb+srv://user:pass@cluster.example.mongodb.net/my_api' \
CORS_ORIGINS=https://app.example.com \
TRUST_PROXY=1 \
npm start
```

Before deploying, run the checks with production rules, and the authorization audit (it needs a MongoDB server for its throwaway database):

```bash
npx calm doctor --prod --audit --ci
npx calm audit --ci
```

## Production defaults

`npm start` runs in **production mode** unless `NODE_ENV` says otherwise, so a forgotten variable never exposes development behavior. In production:

- the app refuses to start without `MONGODB_URI` and `APP_URL`;
- devtools are off and cannot be enabled;
- CORS allows no browser origin until you set `CORS_ORIGINS`;
- logs are JSON, one object per line, each with the request id;
- `Strict-Transport-Security` is sent, along with the other security headers;
- `500` responses never contain error details.

Staging and preview environments are production too: anything other than `development` or `test` gets production rules (see [Configuration](/configuration#mode)).

## Environment

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | | Defaults to `production` |
| `MONGODB_URI` | yes | |
| `APP_URL` | yes | Public URL of the API; used in password reset links and OpenAPI |
| `PORT` | | Default `5001` |
| `HOST` | | Default: all interfaces |
| `CORS_ORIGINS` | for browsers | Comma separated frontend origins |
| `TRUST_PROXY` | behind a proxy | Usually `1`; see below |
| `LOG_LEVEL` | | Default `info` |
| `CALM_ENCRYPTION_KEYS` | with `.encrypted()` fields | The same keys as wherever else this database is read; see [Encryption at rest](/security#encryption-at-rest) |

Plus the variables of your blocks (`RESEND_API_KEY`, `S3_BUCKET`, `JOBS_WORKER`...). Install production dependencies only: the CLI and devtools are dev dependencies and are not needed to run the app.

```bash
npm ci --omit=dev
```

Do not deploy `.env`; set real environment variables. (If a `.env` file is present, it is loaded; variables already set in the environment win.)

## Health checks

| Endpoint | Answers |
|---|---|
| `GET /health/live` | `200 { "status": "ok" }` while the process runs. Use it for liveness. |
| `GET /health/ready` | `200 { "status": "ok", "database": "up" }` when MongoDB answers a ping, else `503 { "status": "unavailable", "database": "down" }`. Use it for readiness and load balancer checks. |

Both are outside `/api`, so they are not rate limited.

## Startup and shutdown

At startup the app connects to MongoDB (5 attempts with exponential backoff), builds the indexes your fields declare, runs block start hooks (for example the jobs worker), then listens.

On `SIGTERM` or `SIGINT` it shuts down gracefully:

1. Stop accepting connections and close idle keep-alive connections.
2. Run block shutdown hooks in reverse order: the jobs worker stops claiming and waits for running jobs, realtime streams are closed. In-flight requests keep running meanwhile.
3. Wait for in-flight requests. Connections still open after `shutdownTimeoutMs` (10 seconds) are closed.
4. Wait for background tasks and event listeners, disconnect from MongoDB and exit.

Give your platform's stop timeout a little more than `shutdownTimeoutMs`.

## Behind a proxy or load balancer

Set `TRUST_PROXY` so Express takes the client IP from `X-Forwarded-For`. Without it, every client appears to come from the proxy and shares one rate limit. Use the number of proxies in front of the app (`1` for a single load balancer), or `true` only if every request certainly passes through a proxy you trust. `calm doctor --prod` reminds you.

TLS terminates at the proxy; the app speaks plain HTTP behind it.

## Docker

New projects include this `Dockerfile` and a `.dockerignore` that leaves out `node_modules`, `.env`, `.git` and tests:

```dockerfile
# Production image. Build: docker build -t my-api .
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
USER node
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5001) + '/health/ready').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server.js"]
```

```bash
docker build -t my-api .
docker run -p 5001:5001 \
  -e APP_URL=https://api.example.com \
  -e MONGODB_URI='mongodb+srv://...' \
  -e CORS_ORIGINS=https://app.example.com \
  -e TRUST_PROXY=1 \
  my-api
```

The container runs as the unprivileged `node` user, so if you use [storage-local](/blocks/storage-local), mount a volume for `UPLOAD_DIR` that this user can write to.

For local testing with a database next to it:

```yaml
# compose.yaml
services:
  api:
    build: .
    ports: ['5001:5001']
    environment:
      APP_URL: http://localhost:5001
      MONGODB_URI: mongodb://mongo:27017/my_api
    depends_on: [mongo]
  mongo:
    image: mongo:8
    volumes: [mongo-data:/data/db]
volumes:
  mongo-data:
```

## Email

Password reset emails need a transport in production. Add [mail-resend](/blocks/mail-resend) or [mail-smtp](/blocks/mail-smtp). Without one, emails are not sent, an error is logged, and `calm doctor --prod` warns.

## Running several instances

Sessions live in MongoDB, so any instance can serve any user. A few things are per process by default:

| Concern | Default | With several instances |
|---|---|---|
| Rate limits | counted in memory, per process | **required:** add [rate-limit-mongo](/blocks/rate-limit-mongo), or each instance allows the full limit on its own |
| Background jobs | every instance runs a worker | fine (jobs are claimed atomically); or set `JOBS_WORKER=off` on web instances and run dedicated workers |
| Uploads | [storage-local](/blocks/storage-local) writes to local disk | use [storage-s3](/blocks/storage-s3) |
| Realtime events | in-process | subscribers only see changes from their instance; see [realtime-sse](/blocks/realtime-sse#several-instances) |
| Event listeners | in-process | they run on the instance that made the change, which is usually what you want |

## Checklist

- `NODE_ENV=production`, `APP_URL`, `MONGODB_URI` and `CORS_ORIGINS` are set.
- `TRUST_PROXY` matches your proxy setup.
- A mail block is configured.
- `npx calm doctor --prod --audit --ci`, `npx calm audit --ci` and `npm test` pass.
- `CALM_ENCRYPTION_KEYS` is set if you use `.encrypted()` fields, and the keys are backed up in your secret store.
- The readiness probe uses `/health/ready`, and the stop timeout is above 10 seconds.
- MongoDB has backups, and the app's database user only has access to its own database.
