# AI agents

CalmAPI is designed to be worked on by coding agents as well as people: conventions are written down in the project, the CLI is scriptable, and an MCP server lets agents inspect and drive the project. While an agent works, `calm dev` records what it changes, so you can watch it in devtools. Separately, the [mcp-server block](/blocks/mcp-server) lets agents *use* your API.

## AGENTS.md

Every new project has an `AGENTS.md` at its root, the file Claude Code, Codex, Cursor, Copilot and other agents look for. It describes the layout, the import conventions (`#calm`, `#app/...`) and the golden rules:

1. Add resources with the CLI (`npx calm make resource ...`), then edit them.
2. Declare fields once with `f.*()`; visibility and validation come from there.
3. Every route needs a policy.
4. Handlers return values; throw `notFound()`, `forbidden()`... instead of calling `res.json`.
5. Business logic goes in the service, with hooks before whole-method overrides, and queries scoped with `this.filterFor(ctx, filter)`.
6. Never return raw documents from non-resource routes; use `ctx.serialize(doc, 'resource')`.
7. Sensitive data: `.visibleTo('owner | admin')` for personal fields, `.encrypted()` for secrets at rest. Never log secrets.
8. Before finishing: `npm test`, `npx calm doctor` (fix every `error`) and, after changing policies or fields, `npx calm audit`.

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

It must run inside the project (the agent's working directory). Static tools run the CLI in a child process, so they always see the current code; runtime tools talk to the dev server, so start `npm run dev` for those.

It offers 18 tools.

**Understand the project**

| Tool | What it does |
|---|---|
| `calm_project` | Overview: app name, framework version, resources with paths and policies, installed blocks, whether the dev server is running. Agents should call it first. |
| `calm_routes` | Every route with method, path, policy and source file |
| `calm_resource` | One resource: the source of its resource, service and routes files, and its routes |
| `calm_openapi` | The OpenAPI 3.1 document |
| `calm_blocks` | List the official blocks |

**Change it**

| Tool | What it does |
|---|---|
| `calm_make_resource` | Scaffold a resource from field specs (`title:string!+searchable`, `status:enum:draft,live=draft`...), optionally with a service and routes file |
| `calm_add_block` | Add blocks (with a dry run option) |

**Try it** (dev server)

| Tool | What it does |
|---|---|
| `calm_http` | Call the dev API like a real client and get the status and body. `as` picks the caller: `anonymous` (default), `admin` (an admin user) or a user's email. The request is tagged as the agent's in devtools. |
| `calm_recent_requests` | Recent requests on the dev server (filter by errors or path) |
| `calm_request` | One request in full: headers, bodies, every MongoDB query with timing, logs, the error with stack trace |
| `calm_logs` | Recent log lines, optionally by level |
| `calm_mails` | Emails the dev server would have sent, such as password reset links |
| `calm_pushes` | [Push notifications](/push-notifications) the dev server sent: message, devices, status, warnings, delivery log and payload sizes |
| `calm_activity` | Recent project activity: file changes with diffs and who made them, restarts and crashes with their error output |

**Check it**

| Tool | What it does |
|---|---|
| `calm_test` | Run the project tests and get pass and fail counts, with each failing test and its error |
| `calm_doctor` | Run the security and correctness checks (optionally with production rules) |
| `calm_audit` | Run [`calm audit`](/audit) and get the failed checks, field leaks and failed probes |
| `calm_security` | The [exposure matrix](/security#exposure-matrix), the security related doctor findings, and recent [security events](/security#security-events) from the dev server |

A typical loop: the agent edits a resource, calls `calm_activity` to see whether the dev server restarted or crashed, tries the endpoint with `calm_http` as different users, reads `calm_request` for the queries and errors it caused, then runs `calm_test`, `calm_doctor` and `calm_audit`. Nobody has to copy logs into the chat.

`calm_http` signs in as other users through the devtools "act as" endpoint, so `admin` and email callers need the dev server and existing users. Make your first admin with `npx calm admin <email>`.

## Watching an agent work

`calm dev` writes what happens in the project to `.calm/activity.jsonl`, and `calm mcp` adds every tool call to the same file. The devtools **Activity** panel streams it live, so you can follow an agent from your browser while it works.

| `type` | Written by | Records |
|---|---|---|
| `session` | `calm dev` | The dev server started |
| `file` | `calm dev` | A file in `app/`, `calm/`, `calm.config.js`, `server.js` or `.env` was added, modified or deleted, with a line diff and who changed it |
| `restart`, `ready` | `calm dev` | The server restarted after a change, and came back up |
| `crash` | `calm dev` | The server crashed or failed to start, with the last lines of its error output |
| `agent` | `calm mcp` | A tool call: client name, tool, arguments, success, duration and a short summary |

A file change looks like this (one JSON object per line, shown here formatted):

```json
{
  "time": "2026-10-11T09:33:19.507Z",
  "type": "file",
  "path": "app/resources/post/post.resource.js",
  "change": "modified",
  "actor": { "kind": "agent", "name": "claude-code" },
  "diff": {
    "added": 1,
    "removed": 1,
    "hunks": [
      {
        "oldStart": 3,
        "newStart": 3,
        "lines": [
          " export default resource('post', {",
          "   fields: {",
          "-    title: f.string().required().max(200).searchable().sortable(),",
          "+    title: f.string().required().max(180).searchable().sortable(),",
          "     slug: f.string().readOnly().unique().filterable(),",
          "     body: f.text().required().max(50_000),"
        ]
      }
    ],
    "truncated": false
  }
}
```

- **Who changed it.** A file system event does not say who saved the file. `calm dev` attributes a change to an agent when that agent made a tool call in the last 20 seconds, and to you otherwise. The agent's name is the client name it sent when connecting over MCP.
- **Secrets stay out.** Changes to `.env` are recorded without their contents or a diff. Diffs are kept for text files up to 256 KB.
- **Bounded.** The file is trimmed to its last 2,000 events when it grows past 4 MB. New projects list `.calm/` in `.gitignore`.

Agents read the same log back with `calm_activity`, which is how they find out that their last edit crashed the server.

Requests sent with `calm_http` carry an `X-Calm-Agent` header with the client name. Devtools marks them as agent requests, and the **Requests** panel can filter them. Your own scripts can send the header too.

## The mcp-server block: your API as tools

To let agents act on your **data** (list posts, create an order), add the [mcp-server](/blocks/mcp-server) block. It serves MCP over Streamable HTTP at `/mcp` and turns each resource into tools (`post_list`, `post_get`, `post_create`, `post_update`, `post_delete`). Every tool call is executed as a real request against your API with the caller's session token, so policies, validation, scoping, rate limits and field visibility are exactly those of the REST API.

```bash
npx calm add mcp-server
claude mcp add --transport http my-api http://localhost:5001/mcp --header "Authorization: Bearer <session token>"
```

## llms.txt

These docs are available in a form that is easy to give to a model: [https://docs.calmapi.dev/llms.txt](/llms.txt) lists every page with a short description and a link to its markdown source, and [https://docs.calmapi.dev/llms-full.txt](/llms-full.txt) contains all CalmAPI 2 pages in one file. The markdown of any page is at its URL plus `.md`, for example [https://docs.calmapi.dev/policies.md](/policies.md).
