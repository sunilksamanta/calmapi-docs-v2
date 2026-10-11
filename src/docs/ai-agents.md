# AI agents

CalmAPI is designed to be worked on by coding agents as well as people: conventions are written down in the project, the CLI is scriptable, and an MCP server lets agents inspect and drive the project. Separately, the [mcp-server block](/docs/blocks/mcp-server) lets agents *use* your API.

## AGENTS.md

Every new project has an `AGENTS.md` at its root, the file Claude Code, Codex, Cursor, Copilot and other agents look for. It describes the layout, the import conventions (`#calm`, `#app/...`) and the golden rules:

1. Add resources with the CLI (`npx calm make resource ...`), then edit them.
2. Declare fields once with `f.*()`; visibility and validation come from there.
3. Every route needs a policy.
4. Handlers return values; throw `notFound()`, `forbidden()`... instead of calling `res.json`.
5. Business logic goes in the service, with hooks before whole-method overrides, and queries scoped with `this.filterFor(ctx, filter)`.
6. Never return raw documents from non-resource routes; use `ctx.serialize(doc, 'resource')`.
7. Run `npx calm doctor` after changes and `npm test` before finishing.

`CLAUDE.md` contains one line pointing Claude Code to `AGENTS.md`. Edit `AGENTS.md` with your own project's rules; it is yours.

For GitHub Copilot, the same guidance is available as [copilot-instructions.md](/copilot-instructions.md): save it as `.github/copilot-instructions.md` in your project.

## calm mcp: tools for coding agents

`calm mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio. Register it once per project with Claude Code:

```bash
claude mcp add calm -- npx calm mcp
```

For other agents, add it to their MCP configuration:

```json
{
  "mcpServers": {
    "calm": { "command": "npx", "args": ["calm", "mcp"] }
  }
}
```

It must run inside the project (the agent's working directory). Static tools run the CLI in a child process, so they always see the current code; runtime tools read the devtools API of the dev server, so start `npm run dev` for those.

| Tool | What it does |
|---|---|
| `calm_project` | Overview: app name, framework version, resources with paths and policies, installed blocks, whether the dev server is running. Agents should call it first. |
| `calm_routes` | Every route with method, path, policy and source file |
| `calm_resource` | One resource: the source of its resource, service and routes files, and its routes |
| `calm_make_resource` | Scaffold a resource from field specs (`title:string!+searchable`, `status:enum:draft,live=draft`...), optionally with a service and routes file |
| `calm_doctor` | Run the security and correctness checks (optionally with production rules) |
| `calm_blocks` | List the official blocks |
| `calm_add_block` | Add blocks (with a dry run option) |
| `calm_openapi` | The OpenAPI 3.1 document |
| `calm_recent_requests` | Recent requests on the dev server (filter by errors or path) |
| `calm_request` | One request in full: headers, bodies, every MongoDB query with timing, logs, the error with stack trace |
| `calm_logs` | Recent log lines, optionally by level |
| `calm_mails` | Emails the dev server would have sent, such as password reset links |

A typical loop: the agent edits a resource, calls `calm_doctor`, makes a request, then reads `calm_recent_requests` and `calm_request` to see the queries and errors it caused, without anyone copying logs into the chat.

## The mcp-server block: your API as tools

To let agents act on your **data** (list posts, create an order), add the [mcp-server](/docs/blocks/mcp-server) block. It serves MCP over Streamable HTTP at `/mcp` and turns each resource into tools (`post_list`, `post_get`, `post_create`, `post_update`, `post_delete`). Every tool call is executed as a real request against your API with the caller's session token, so policies, validation, scoping, rate limits and field visibility are exactly those of the REST API.

```bash
npx calm add mcp-server
claude mcp add --transport http my-api http://localhost:5001/mcp --header "Authorization: Bearer <session token>"
```

## llms.txt

These docs are available in a form that is easy to give to a model: [/llms.txt](/llms.txt) lists every page with a short description and a link to its markdown source, and [/llms-full.txt](/llms-full.txt) contains all CalmAPI 2 pages in one file.
