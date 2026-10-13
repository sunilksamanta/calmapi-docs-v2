# Getting started

Create a project, run it, and talk to it with `curl`. This takes about five minutes.

## Requirements

- **Node.js 22.12 or newer** (24 LTS recommended). The CLI refuses to run on older versions.
- **MongoDB** 6 or newer, local or hosted (for example MongoDB Atlas). For a quick local server:

```bash
docker run -d --name mongo -p 27017:27017 mongo:8
```

## Create a project

```bash
npm create calmapi@latest my-api
```

The wizard asks for:

1. **Project folder** (default `my-api`).
2. **Template**: `api` or `minimal` (see below).
3. **MongoDB URI** (default `mongodb://127.0.0.1:27017/<project_name>`), written to `.env`.
4. Whether to **install dependencies** and **initialize git**.

To skip the questions, pass flags after `--` so npm forwards them:

```bash
npm create calmapi@latest my-api -- --yes --template api --db mongodb://127.0.0.1:27017/my_api
```

| Template | What you get |
|---|---|
| `api` (default) | A `user` resource with sign up, login, sessions and password reset under `/api/auth`, an example `post` resource with a service and custom routes, and a test. |
| `minimal` | Just the framework, an `app/routes.js` with `GET /api/hello`, and a test. No `user` resource, so no auth until you add one. |

Every template also contains `calm/` (the framework), `calm.config.js`, `calm.lock`, `.env`, `AGENTS.md`, a `Dockerfile` and an ESLint config. See [Project structure](/project-structure).

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
npx calm make resource product name:string+required+searchable price:number+required status:enum:draft,live=draft --service
```

```text
✔ Created resource product at /api/products
  + app/resources/product/product.resource.js
  + app/resources/product/product.service.js
  + test/products.test.js
```

The dev server restarts and `/api/products` is live with all five CRUD routes. Open the resource file to adjust fields and policies, then:

```bash
npx calm routes    # every route with its policy
npx calm doctor    # security and correctness checks
npx calm audit     # every route as every role, on a throwaway database
npm test           # node --test, needs MongoDB
```

## Next steps

- [Project structure](/project-structure): what each file and folder is for.
- [Resources and fields](/resources): every field type and modifier.
- [Policies](/policies): who may list, read, create, update and delete.
