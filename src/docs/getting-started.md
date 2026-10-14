# Getting started

Create a project, run it, and talk to it with `curl`. This takes about five minutes.

## Requirements

- **Node.js 22.12 or newer** (24 LTS recommended). The CLI refuses to run on older versions.
- **MongoDB 6 or newer**, on your machine or hosted. Pick one of the options below.

### Option A: MongoDB with Docker

```bash
docker run -d --name mongo -p 27017:27017 mongo:8
```

That gives you `mongodb://127.0.0.1:27017`, the default CalmAPI uses. `docker start mongo` brings it back after a reboot.

### Option B: MongoDB Atlas (hosted, free tier)

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register) and create a free **M0** cluster.
2. **Database Access**: add a database user with a password (role: *Read and write to any database*).
3. **Network Access**: add your current IP address. `0.0.0.0/0` (anywhere) also works for a quick try, but do not keep it for production.
4. **Connect** > **Drivers**: copy the connection string, put your password in it, and add a database name after the host:

```text
mongodb+srv://ada:<password>@cluster0.abc12.mongodb.net/my_api?retryWrites=true&w=majority
```

Give that string to the wizard below (or put it in `.env` later). If the password has characters like `@`, `:` or `/`, URL-encode them (`@` becomes `%40`).

### Option C: MongoDB installed locally

Follow the [official install guide](https://www.mongodb.com/docs/manual/administration/install-community/) for your system (on macOS: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`). It listens on `127.0.0.1:27017`, like Docker.

## Create a project

```bash
npm create calmapi@latest my-api
```

The wizard asks for:

1. **Project folder** (default `my-api`).
2. **Template**: `api` or `minimal` (see below).
3. **MongoDB URI** (default `mongodb://127.0.0.1:27017/<project_name>`), written to `.env`. Paste your Atlas string here if you use Atlas.
4. Whether to **install dependencies** and **initialize git**.

The default database is named after the folder with `-` turned into `_`: `my-api` gives `my_api`. Dashes are allowed in MongoDB names, but underscores avoid quoting in the shell and in tools like `mongosh`. Any name works: edit `MONGODB_URI` in `.env`.

To skip the questions, pass flags after `--` so npm forwards them:

```bash
npm create calmapi@latest my-api -- --yes --template api --db mongodb://127.0.0.1:27017/my_api
```

| Template | What you get |
|---|---|
| `api` (default) | A `user` resource with sign up, login, sessions and password reset under `/api/auth`, an example `post` resource with a service and custom routes, and a test. |
| `minimal` | Just the framework, an `app/routes.js` with `GET /api/hello`, and a test. No `user` resource, so no auth until you add one. |

Every template also contains:

| File | What it is for |
|---|---|
| `calm/` | The framework itself, copied into your project. It is your code: read it, change it. |
| `calm.config.js` | Settings in code: CORS, rate limits, auth, invariants. See [Configuration](/configuration). |
| `calm.lock` | The framework version and a hash of every file in `calm/` and in installed blocks. `calm upgrade` uses it to tell your edits apart from upstream changes, and `calm doctor` to report changed files. Commit it; do not edit it by hand. |
| `.env` | Settings for this machine (`MONGODB_URI`, `PORT`, `APP_URL`). Git ignores it. |
| `.env.example` | The same settings without secrets, committed. On a new machine: `cp .env.example .env`. |
| `Dockerfile` | A production image: `node:24-alpine`, production dependencies only, runs as the `node` user, exposes 5001, with a health check on `/health/ready`. Build it with `docker build -t my-api .`, see [Deployment](/deployment). |
| `AGENTS.md`, `CLAUDE.md` | Instructions for AI coding agents. |
| `eslint.config.js` | Lint rules (`npm run lint`). |

See [Project structure](/project-structure) for everything else.

## Run it

```bash
cd my-api
npm run dev
```

```text
  CalmAPI my-api v0.1.0 (development)

  ➜  API       http://localhost:5001/api
  ➜  OpenAPI   http://localhost:5001/api/openapi.json
  ➜  Devtools  http://localhost:5001/_calm

  2 resources · 30 routes · 0 blocks · MongoDB connected
```

The API listens on **port 5001**. Ports 3000 and 5000 are left free on purpose: 3000 is where most frontend dev servers (Next.js, Vite, React Native tools) start, and 5000 is taken by AirPlay on macOS. Change it with `PORT` (and `APP_URL`) in `.env`.

`npm run dev` runs `calm dev`: development mode, a restart whenever something in `app/`, `calm/`, `calm.config.js`, `server.js` or `.env` changes, and [devtools](/devtools) at `/_calm`. If MongoDB is not reachable, the app retries a few times and then exits with a clear message.

## First requests

The examples below use the `api` template.

### 1. Register

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"correct-horse-battery"}'
```

```json
{
  "data": {
    "user": {
      "id": "6acb46a57e4a738ebdd998b1",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "roles": ["user"],
      "status": "active",
      "createdAt": "2026-10-11T08:19:49.069Z",
      "updatedAt": "2026-10-11T08:19:49.069Z"
    },
    "token": "calm_M_vAh-pIohIgNEe8gapu1LMoYxlH6oYvepNVGWtYPWk",
    "expiresAt": "2026-11-10T08:19:49.085Z"
  }
}
```

Registering signs you in. The password is never returned, and `roles` cannot be set by the client.

### 2. Log in

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
```

The response has the same shape. Keep the token for the next requests:

```bash
TOKEN=calm_GZWY3MMqzg4aRbB80iRCKScHbbnjrLSDu2-sfYER27E
```

### 3. Create a post

```bash
curl -X POST http://localhost:5001/api/posts \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Hello CalmAPI","body":"My first post","tags":["intro","news"],"status":"published"}'
```

```json
{
  "data": {
    "id": "6acb46a57e4a738ebdd998b4",
    "title": "Hello CalmAPI",
    "slug": "hello-calmapi",
    "body": "My first post",
    "status": "published",
    "tags": ["intro", "news"],
    "author": "6acb46a57e4a738ebdd998b1",
    "publishedAt": "2026-10-11T08:19:49.447Z",
    "createdAt": "2026-10-11T08:19:49.448Z",
    "updatedAt": "2026-10-11T08:19:49.448Z"
  }
}
```

The status is `201`. `author` was set from your session, and `slug` and `publishedAt` were filled in by `post.service.js`. Sending `slug` yourself is refused, because it is read-only:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "requestId": "5c397446-0c18-4cfe-99be-d08c78419bec",
    "details": { "slug": "Is read-only", "likes": "Unknown field" }
  }
}
```

### 4. List with filters

```bash
curl -g "http://localhost:5001/api/posts?status=published&tags[in]=intro,news&sort=-createdAt&include=author&fields=title,author" \
  -H "Authorization: Bearer $TOKEN"
```

`-g` stops curl from reading `[in]` as a glob pattern.

```json
{
  "data": [
    {
      "id": "6acb46a57e4a738ebdd998b4",
      "title": "Hello CalmAPI",
      "author": {
        "id": "6acb46a57e4a738ebdd998b1",
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "roles": ["user"],
        "status": "active",
        "createdAt": "2026-10-11T08:19:49.069Z",
        "updatedAt": "2026-10-11T08:19:49.069Z"
      },
      "createdAt": "2026-10-11T08:19:49.448Z",
      "updatedAt": "2026-10-11T08:19:49.448Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
}
```

You see the author's `email` and `roles` because the author is you. Anyone else gets the author without them: the `user` resource marks them `.visibleTo('owner | admin')`. Without a token, the list only contains published posts, because `post.service.js` scopes every query.

Ask for something that is not allowed and you get a `400` that explains why:

```bash
curl -g "http://localhost:5001/api/posts?body=x&sort=body&limit=500"
```

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid query",
    "requestId": "86f489d3-d343-4d90-a614-86bdca30b700",
    "details": {
      "body": "Not filterable. Filterable fields: slug, status, tags",
      "sort": "Cannot sort by \"body\". Sortable: id, title, publishedAt, createdAt, updatedAt",
      "limit": "Must be an integer between 1 and 100"
    }
  }
}
```

The full query language is in [Querying](/querying).

## Open the devtools

Visit `http://localhost:5001/_calm`. Every request you just made is there with its MongoDB queries, timings and logs. Ask for a password reset (`POST /api/auth/password/forgot`) and the email shows up in the **Mail** panel, link included.

## Add your own resource

```bash
npx calm make resource product name:string+required+searchable price:number+required+sortable status:enum:draft,live=draft+filterable --service
```

```text
✔ Created resource product at /api/products
  + app/resources/product/product.resource.js
  + app/resources/product/product.service.js
  + test/products.test.js
```

The dev server restarts and `/api/products` is live with all five CRUD routes. Each field gets exactly the modifiers you typed: here clients may search by name, sort by price and filter by status, and nothing else. Leave out `+sortable` and `?sort=price` is a `400`. Open the resource file to adjust fields and policies, then:

```bash
npx calm routes    # every route with its policy
npx calm doctor    # security and correctness checks
npx calm audit     # every route as every role, on a throwaway database
npm test           # node --test, on throwaway databases
```

## Which database does what

| Command | Database |
|---|---|
| `npm run dev`, `npm start` | `MONGODB_URI` from the environment, else `.env` (`my_api`) |
| `npm test` | A new `calm_test_<random>` database per test app, on `MONGODB_TEST_URI` (default `mongodb://127.0.0.1:27017`), dropped when the test closes it |
| `npx calm audit` | The same kind of throwaway database on `MONGODB_TEST_URI`, dropped at the end |
| `npx calm dev --agent-db` | A copy of your dev database (`my_api_agent`), dropped when `calm dev` stops |

Tests and the audit never touch your development data. With Atlas, or any server that is not on `127.0.0.1:27017`, set `MONGODB_TEST_URI` too, in `.env` or the environment, without a database name (for example `MONGODB_TEST_URI=mongodb+srv://ada:<password>@cluster0.abc12.mongodb.net`). The database user needs permission to create and drop databases. See [Testing](/testing).

## Next steps

- [Project structure](/project-structure): what each file and folder is for.
- [Resources and fields](/resources): every field type and modifier.
- [Policies](/policies): who may list, read, create, update and delete.
