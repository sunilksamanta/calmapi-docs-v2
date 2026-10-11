# API docs (api-docs)

An interactive API reference at `/docs`, rendered by [Scalar](https://scalar.com) from the OpenAPI document your app already generates. Every resource, custom route, field rule and policy shows up without annotations.

```bash
npx calm add api-docs
```

| Adds | |
|---|---|
| Files | `app/blocks/api-docs/index.js` |
| Environment | `API_DOCS=on` |
| Routes | `GET /docs` (HTML page), `GET /docs/init.js` |

Open `http://localhost:5001/docs`. The page loads `/api/openapi.json` and lets you browse and try every endpoint, with a session token as bearer authentication.

## When it is served

- In **development** and **test** mode: always.
- In **production**: only when the environment has `API_DOCS=on`.
- Never when `openapi.enabled` is `false` in the config.

`calm add` writes `API_DOCS=on` to `.env` and `.env.example`. If your production environment is built from `.env.example`, remove that line there (or set `API_DOCS=off`) unless you want a public reference in production.

## Notes

- The Scalar script is pinned to an exact version and loaded from jsDelivr (`@scalar/api-reference@1.72.1`). Change the `SCALAR` constant in the block to upgrade it, or self-host the file.
- The page has its own Content-Security-Policy, which allows that script and Scalar's fonts and nothing else.
- What the reference shows is what OpenAPI shows: hidden and write-only fields are not in output schemas, PUT aliases are not listed, and routes with `hidden: true` are left out. Each operation's description says who may call it (`Access: owner | admin`).
