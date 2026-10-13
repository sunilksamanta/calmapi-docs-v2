# MCP server (mcp-server)

Expose your API to AI agents as [Model Context Protocol](https://modelcontextprotocol.io) tools, served over Streamable HTTP at `POST /mcp`. Tools are generated from your resources, and every tool call is executed as a real request against your own API with the caller's session, so policies, validation, scoping, rate limits and field visibility are exactly those of the REST API.

This block is for agents that *use* your API. For agents that *develop* your project, see [`calm mcp`](/ai-agents).

```bash
npx calm add mcp-server
```

| Adds | |
|---|---|
| Files | `app/blocks/mcp-server/index.js` |
| Environment | `MCP_RESOURCES` (empty: every resource except `user` and `file`) |
| Endpoint | `POST /mcp` (stateless Streamable HTTP, JSON responses) |

## Tools

For each exposed resource, one tool per CRUD action it has (actions with a `'none'` policy are left out):

| Tool | Calls | Arguments |
|---|---|---|
| `<name>_list` | `GET /api/<names>` | `q`, `filter` (e.g. `{ "status": "published", "price[gte]": "10" }`), `sort`, `page`, `limit`, `include` |
| `<name>_get` | `GET /api/<names>/:id` | `id`, `include` |
| `<name>_create` | `POST /api/<names>` | `data`, with the resource's create schema |
| `<name>_update` | `PATCH /api/<names>/:id` | `id`, `data` |
| `<name>_delete` | `DELETE /api/<names>/:id` | `id` |

Tool descriptions list the filterable fields, and the input schemas come from your fields, so agents know what they may send. The resource's `description` option is used in tool descriptions. A failed call (for example a `403`) returns the API's error body with `isError: true`.

Limit what is exposed with `MCP_RESOURCES=post,product`.

## Connect an agent

Agents authenticate with the same header as any API client: `Authorization: Bearer <session token>`. Without it, calls run as an anonymous visitor.

```bash
claude mcp add --transport http my-api http://localhost:5001/mcp --header "Authorization: Bearer <session token>"
```

To explore the tools, use the MCP Inspector: `npx @modelcontextprotocol/inspector`.

Create a dedicated user for each agent, with only the roles it needs, and sign it in to get its token. Revoke the session (`DELETE /api/auth/sessions/:sessionId`) to cut an agent off.

## Security

- Every call goes through your REST routes, so an agent can never do more than its user could with `curl`.
- Requests with an `Origin` header are only accepted from origins in `CORS_ORIGINS` or from `localhost`, as the MCP specification requires to prevent DNS rebinding. A wildcard CORS setting does not count.
- Only `POST` is accepted; bodies are limited to 1 MB.

<!-- block-guide:start (generated from block.json by scripts/sync-block-guides.mjs) -->

## Official documentation

Read these before changing the block; they are also in `app/blocks/mcp-server/AGENTS.md` and in the devtools Blocks panel.

- [Model Context Protocol specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP: Transports (Streamable HTTP)](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)
- [JSON-RPC 2.0 specification](https://www.jsonrpc.org/specification)

## For AI agents

Coding agents read these notes in `app/blocks/mcp-server/AGENTS.md`:

- Read first: `app/blocks/mcp-server/index.js` (`tools()`, `callTool()`, `handle()` and the `/mcp` middleware).
- Configuration: env `MCP_RESOURCES` (comma separated resource names; default every resource except `user` and `file`). No `calm.config.js` options. Allowed browser origins come from `config.cors.origins`.
- Tools are generated per resource from `def.crud` and its policies: `<name>_list`, `_get`, `_create`, `_update`, `_delete`; actions whose policy is only `'none'` are skipped. Input schemas come from `resourceJSONSchema(def, 'create' | 'update')`.
- Invariant: `callTool` makes a real HTTP request to the app itself (`127.0.0.1` on the same port) forwarding only the caller's `Authorization` header. Never call services or models directly from a tool: that would skip policies, validation, rate limits, API key scopes and field visibility.
- Invariant: keep the Origin check (DNS rebinding protection required by the MCP spec). Only entries of an explicit `config.cors.origins` array and localhost origins pass; CORS `'*'` is never an allowlist.
- Invariant: `user` and `file` stay out of the default exposure; list them in `MCP_RESOURCES` only on purpose.
- Protocol: stateless Streamable HTTP, `POST /mcp` only (other methods answer 405), JSON responses (no SSE stream), batches accepted, notifications answered 202. Supported versions: `PROTOCOLS` (`2025-11-25`, `2025-06-18`, `2025-03-26`).
- Task, add a custom tool: add its definition in `tools()` and a branch in `callTool()` that maps it to an existing REST route (method and path), so the same access rules apply.
- Task, better tool descriptions: set the resource `description` option and field `.describe()`, rather than editing strings here.
- Auth: `Authorization: Bearer <session token>` or a `calm_ak_` key from the api-keys block, whose scopes then limit which tools succeed.
- Pitfall: request bodies are limited to 1 MB; API errors come back as `isError: true` with the API's JSON as text.
- Check your work: `npx @modelcontextprotocol/inspector` against http://localhost:5001/mcp.

<!-- block-guide:end -->
