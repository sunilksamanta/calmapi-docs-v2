# MCP server (mcp-server)

Expose your API to AI agents as [Model Context Protocol](https://modelcontextprotocol.io) tools, served over Streamable HTTP at `POST /mcp`. Tools are generated from your resources, and every tool call is executed as a real request against your own API with the caller's session, so policies, validation, scoping, rate limits and field visibility are exactly those of the REST API.

This block is for agents that *use* your API. For agents that *develop* your project, see [`calm mcp`](/docs/ai-agents).

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
