# AI agents

CalmAPI is designed to be worked on by coding agents as well as people: conventions are written down in the project, the CLI is scriptable, and an MCP server lets agents inspect and drive the project. While an agent works, `calm dev` records what it changes, so you can watch it in devtools. Separately, the [mcp-server block](/blocks/mcp-server) lets agents *use* your API.

## AGENTS.md

Every new project has an `AGENTS.md` at its root, the file Claude Code, Codex, Cursor, Copilot and other agents look for. It describes the layout, the import conventions (`#calm`, `#app/...`) and the golden rules:

1. Add resources with the CLI (`npx calm make resource product title:string+required price:number`), then edit them.
2. Declare fields once with `f.*()`; visibility and validation come from there.
3. Every route needs a policy.
4. Handlers return values; throw `notFound()`, `forbidden()`... instead of calling `res.json`.
5. Business logic goes in the service, with hooks before whole-method overrides, and queries scoped with `this.filterFor(ctx, filter)`.
6. Never return raw documents from non-resource routes; use `ctx.serialize(doc, 'resource')`.
7. Sensitive data: `.visibleTo('owner | admin')` for personal fields, `.encrypted()` for secrets at rest. Never log secrets.
8. Email and push go through `ctx.app.mailer.send()` and `ctx.push.send()`, with ids in push `data`, never secrets or personal details.
9. Blocks carry their own instructions: before changing anything in `app/blocks/<name>/`, read `app/blocks/<name>/AGENTS.md` and follow the official documentation it links to, not memory (see [Each block's own guide](#each-blocks-own-guide)).
10. Before finishing: `npm test`, `npx calm doctor` (fix every `error`) and, after changing policies or fields, `npx calm audit`.

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

It offers 29 tools.

**Understand the project**

| Tool | What it does |
|---|---|
| `calm_project` | Overview: app name, framework version, resources with paths and policies, installed blocks, whether the dev server is running. Agents should call it first. |
| `calm_routes` | Every route with method, path, policy and source file |
| `calm_resource` | One resource: the source of its resource, service and routes files, and its routes |
| `calm_openapi` | The OpenAPI 3.1 document |
| `calm_client` | The [typed client](/client) for a web or mobile frontend: returns the TypeScript source, or writes the file with `{ out }` (a `.js` path writes JavaScript plus a `.d.ts`) |
| `calm_blocks` | List the official blocks |

**Change it**

| Tool | What it does |
|---|---|
| `calm_make_resource` | Scaffold a resource from field specs (`title:string+required+searchable`, `status:enum:draft,live=draft`...), optionally with a service and routes file |
| `calm_add_block` | Add blocks (with a dry run option) |
| `calm_propose` | Describe a change as a reviewable diff instead of making it; you apply it from devtools (see [Proposals](#proposals-the-agent-describes-you-apply)) |
| `calm_declare` | Before changing behavior, say what is about to change (`"route POST /api/refunds"`, `{ kind: 'route', key, policy }`): the [review](/review#for-agents-calm_declare-and-calm_review) compares it with what the agent did |
| `calm_checkpoint`, `calm_restore` | Snapshot the development database and put it back (see [Checkpoints](/checkpoints)). One is taken automatically when the agent connects. |

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
| `calm_explain` | Why a request got its answer: the [path it took through the code](/request-path), with the policy decision token by token |
| `calm_about` | The [transparency report](/transparency): pipeline, headers, stored data, logging, hosts, files the CLI writes |

**Check it**

| Tool | What it does |
|---|---|
| `calm_test` | Run the project tests and get pass and fail counts, with each failing test and its error |
| `calm_doctor` | Run the security and correctness checks (optionally with production rules) |
| `calm_audit` | Run [`calm audit`](/audit) and get the failed checks, field leaks and failed probes |
| `calm_security` | The [exposure matrix](/security#exposure-matrix), the security related doctor findings, and recent [security events](/security#security-events) from the dev server |
| `calm_diff` | The [behavior diff](/behavior-diff) between a git ref (default `HEAD`) and the working tree: what the agent changed in routes, policies, fields, env vars, hosts, events and invariants, with the count of changes that widen access. `api: true` compares the [API contract](/behavior-diff#api-contract) instead: breaking, minor and patch changes. |
| `calm_replay` | [Replay](/replay) the requests recorded by the dev server, as the users who made them, against the code as it is now: which answers changed status or shape, and which fields are newly returned. `writes: true` replays writes between a checkpoint and its restore. |
| `calm_budgets` | What each route costs on the dev server (queries, p95 time, largest response) next to its [budget](/budgets) |
| `calm_review` | What the developer will [review](/review): behavior changes since their last signature, the agent files nobody signed, and the agent's declarations next to what it did. Agents cannot sign. |

A typical loop: the agent declares what it is about to change with `calm_declare`, edits a resource, calls `calm_activity` to see whether the dev server restarted or crashed, tries the endpoint with `calm_http` as different users, reads `calm_request` for the queries and errors it caused, then runs `calm_test`, `calm_doctor`, `calm_audit`, `calm_replay` and `calm_budgets`, and ends with `calm_review` to show you what you are about to sign. Nobody has to copy logs into the chat.

`calm_http` signs in as other users through the devtools "act as" endpoint, so `admin` and email callers need the dev server and existing users. Make your first admin with `npx calm admin <email>`.

## Watching an agent work

`calm dev` writes what happens in the project to `.calm/activity.jsonl`, and `calm mcp` adds every tool call to the same file. The devtools **Activity** panel streams it live, so you can follow an agent from your browser while it works.

| `type` | Written by | Records |
|---|---|---|
| `session` | `calm dev` | The dev server started |
| `file` | `calm dev` | A file in `app/`, `calm/` or `test/`, or a project file (`calm.config.js`, `server.js`, `.env`, `.env.example`, `package.json`, `calm.lock`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `Dockerfile`, `eslint.config.js`) was added, modified or deleted, with a line diff and who changed it |
| `restart`, `ready` | `calm dev` | The server restarted after a change, and came back up |
| `crash` | `calm dev` | The server crashed or failed to start, with the last lines of its error output |
| `agent` | `calm mcp`, `calm agent-hook` | A tool call (client name, tool, arguments, success, duration, a short summary), or a file an agent is about to edit |
| `proposal` | `calm mcp` | A change an agent proposed with `calm_propose` |
| `checkpoint` | checkpoints | A checkpoint was created, restored or deleted |
| `declaration` | `calm mcp` | An agent declared what it is about to change with `calm_declare` |
| `review` | `calm review --sign`, devtools | A person signed a [review](/review) |

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

- **Who changed it.** A file system event does not say who saved the file, so `calm dev` looks for signals, strongest first. It records which one it used as `"via"`. See [Telling your edits from an agent's](#telling-your-edits-from-an-agents).
- **Secrets stay out.** Changes to `.env` are recorded without their contents or a diff. Diffs are kept for text files up to 256 KB.
- **Bounded.** The file is trimmed to its last 2,000 events when it grows past 4 MB. New projects keep `.calm/` out of git (`.calm/*` in `.gitignore`), except the signed reviews in `.calm/reviews/`.

Agents read the same log back with `calm_activity`, which is how they find out that their last edit crashed the server.

Requests sent with `calm_http` carry an `X-Calm-Agent` header with the client name. Devtools marks them as agent requests, and the **Requests** panel can filter them. Your own scripts can send the header too.

## Scopes: what an agent may do

Not every session needs an agent that can scaffold and run anything. `calm mcp` takes a scope, and the scope decides which tools an agent can call:

```bash
claude mcp add calm -- npx calm mcp --scope scaffold
```

| Scope | Tools |
|---|---|
| `read` | Inspect only: `calm_project`, `calm_routes`, `calm_resource`, `calm_doctor`, `calm_blocks`, `calm_openapi`, `calm_recent_requests`, `calm_request`, `calm_logs`, `calm_test`, `calm_audit`, `calm_security`, `calm_activity`, `calm_mails`, `calm_pushes`, `calm_diff`, `calm_explain`, `calm_about`, `calm_propose`, `calm_review`, `calm_declare`, `calm_budgets`, `calm_client` without `out`, and `calm_http` with `GET` only |
| `scaffold` | Everything in `read`, plus `calm_make_resource`, `calm_add_block`, `calm_checkpoint`, `calm_replay`, `calm_client` with `out`, and `calm_http` with any method |
| `full` | Everything, including `calm_restore`. The default. |

A tool that is not in one of these lists (one added by a later release, for example) needs `full`.

The default scope comes from `agents.scope` in `calm.config.js`; `--scope` overrides it for one session. The same config lists the **protected paths**, the files an agent should not change without you:

```js
// calm.config.js
export default defineConfig({
  agents: {
    scope: 'scaffold',
    protected: ['calm/security/**', 'calm/auth/**', 'calm.config.js'], // the default
  },
});
```

Protected paths are not enforced by the MCP server, which only scaffolds: agents edit files with their own tools. Instead, `calm dev` watches for them. When a file change is attributed to an agent and matches a protected glob, the Activity event gets `"protected": true` and `"reason": "protected path"`. The same happens for a resource file when the diff adds or removes a line with `policy`, `visibleTo`, `writableBy`, `.owner()`, `.hidden()`, `.writeOnly()` or `.encrypted()`: that is `"reason": "access rules"`. Devtools shows these with an amber badge, so a policy quietly changed from `'owner | admin'` to `'public'` does not slip past you. `--allow <glob>` lifts a path for one session (`calm mcp --scope full --allow 'calm/auth/**'`), repeatable.

While an agent is connected, `calm mcp` keeps `.calm/agent-session.json` (`client`, `scope`, `allow`, `protected`, `startedAt`, `pid`). The Activity panel header shows it as "claude-code · scope scaffold", with the protected paths in its tooltip; the file goes away when the server stops.

### What a refused call looks like

Every tool stays in `tools/list`, so the agent knows what exists; the ones outside the scope say so in their description ("Not available in the current scope (read): ask the developer to run calm mcp --scope scaffold."). The `initialize` instructions name the scope and the protected paths. A call outside the scope does nothing and comes back as an error result the agent can read:

```
Refused: scope "read" cannot run calm_make_resource. Ask the developer to start the
server with `calm mcp --scope scaffold`, or describe the change with calm_propose so
they can apply it.
```

It is also recorded in Activity, in red in devtools:

```json
{ "type": "agent", "client": "claude-code", "tool": "calm_make_resource", "args": "{\"name\":\"ticket\"}", "ok": false, "refused": true, "scope": "read", "ms": 0, "summary": "Refused: scope \"read\" cannot run calm_make_resource. ..." }
```

### Proposals: the agent describes, you apply

`calm_propose { title, reason, files: [{ path, content }] }` is available in every scope. It writes nothing to the project: the proposal goes to `.calm/proposals/<id>.json` with a line diff of each file against the current one (an empty file for a new one), and an Activity event `{ "type": "proposal", "id", "title", "client", "files": [paths] }`. Paths outside the project, in `node_modules` or `.git` are refused. The agent gets the id back and a note that the developer can apply it from devtools.

In the **Activity** panel, a proposal row opens into the reason, the diff per file and an **Apply** button. Applying writes the files and records each one as a change by you (`"actor": { "kind": "human", "name": "devtools" }`, `"note": "applied proposal <id>"`), so the attribution stays honest: the agent proposed, you decided. The dev server restarts as for any edit. A proposal applies once. The same data is available as JSON: `GET /_calm/api/proposals`, `GET /_calm/api/proposals/:id`, `POST /_calm/api/proposals/:id/apply` (with the `X-Calm-Devtools: 1` header, like every devtools write).

AGENTS.md tells agents all this in one paragraph: a refusal is a choice you made, not an error to work around, and `calm_propose` is the way through.

### The doctor check

`calm doctor` adds `agent-protected-edit` (a warning): protected files that an agent changed after the last commit and that git still sees as modified. The title is the file and the agent, for example `calm/auth/index.js was changed by an agent (claude-code) and is not committed`; the detail says to review the diff in devtools Activity before committing. The check needs a git repository and the Activity log; without either it is skipped.

## Telling your edits from an agent's

Most agents edit files with their own tools, not through MCP. `calm dev` still tells their edits from yours, with three signals, strongest first:

| `via` | Signal | How it works |
|---|---|---|
| `hook` | The agent's hook names the file | Before it edits a file, the agent runs `npx calm agent-hook`, which writes `{ type: 'agent', tool: 'hook:Edit', path }` to Activity. The next change to that file is the agent's. |
| `mcp` | A `calm mcp` tool call | The agent called a tool in the last 20 seconds: changes in that window are the agent's. |
| `env` | `calm dev` runs in the agent's shell | Claude Code sets `CLAUDECODE=1` for the commands it runs. If the agent started `npm run dev`, changes nobody else claimed are attributed to it. This is the weakest signal: your own edits during that session count as the agent's too. |

Without any of them, the change is yours. Devtools shows the signal in the tooltip of the agent mark.

**Claude Code** needs no setup in new projects: they ship `.claude/settings.json` with the hook.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write|NotebookEdit",
        "hooks": [{ "type": "command", "command": "npx --no-install calm agent-hook --client claude-code" }]
      }
    ]
  }
}
```

For an existing project, copy that file. It runs before each edit (so the note is in Activity when the file changes), prints nothing, always exits 0 and only appends a line to `.calm/activity.jsonl`.

**Other agents** can do the same from whatever hook they offer: pipe `{ "tool": "edit", "path": "app/routes.js" }` into `npx calm agent-hook --client <name>` before changing a file. `calm agent-hook` also reads the Claude Code payload (`tool_name`, `tool_input.file_path`).

## A database the agent can break: calm dev --agent-db

Checkpoints let you undo what an agent did to your data. `calm dev --agent-db` keeps it from touching your data at all:

```bash
npx calm dev --agent-db
```

```text
  Copying the development database for the agent...
✔ Running on my_api_agent, a copy of my_api (7 collections, 1204 documents). It is dropped when calm dev stops.
```

Before the app starts, `calm dev` copies the development database (`MONGODB_URI` from the environment, else `.env`) to `<name>_agent` on the same server: every collection with its documents and indexes. The app then runs on the copy, so the agent can create, change and delete data freely (through the API, `calm_http`, devtools or code running in the app), and your database stays as it was. When `calm dev` stops, the copy is dropped (`Dropped my_api_agent.`). A copy left behind by a crash is replaced on the next `calm dev --agent-db`.

Devtools marks the database in the top bar as a **copy**, with a tooltip naming the database it was copied from, and Activity records when the copy was made and dropped.

- The copy is made on the server in one step on MongoDB 4.4 or newer, and document by document on older servers.
- It refuses to start when `MONGODB_URI` already points at a copy (a name ending in `_agent`), or when the copy's name would be longer than MongoDB allows.
- Commands that connect on their own, such as `calm seed`, `calm admin` or `calm checkpoint` in a terminal, read `MONGODB_URI` from `.env` and reach your database, not the copy.

## Reviewing what an agent did

Everything above helps you follow an agent while it works. When it is done, three tools let you decide whether to keep what it did:

- **[Review and sign](/review)**: `calm review` (or the devtools **Review** panel) shows what changed in behavior since you last signed, the files agents wrote that nobody signed, and what the agent declared with `calm_declare` next to what it did. You sign it; the agent cannot. In **Routes** and **Resources**, what an agent changed and nobody signed has an **unsigned** badge.
- **[Replay](/replay)**: `calm replay` sends the requests you made earlier again, as the same users, and shows which answers changed.
- **[Budgets](/budgets)**: the devtools **Budgets** panel shows what each route costs in queries, time and bytes, so an N+1 query an agent added shows up as a number going up.

`calm review --sign` and `calm audit --accept` (the [exposure budget](/exposure-budget)) refuse to run in an agent's shell: accepting wider access is for a person.

## Each block's own guide

Every block brings instructions for agents, next to its code: `app/blocks/<name>/AGENTS.md`. It holds the rules the block must keep (for the [teams](/blocks/teams) block: records never move between teams, never trust a team id without checking membership...), its options, common tasks, and links to the official documentation of what it integrates (Stripe, Twilio, OpenID Connect, OWASP...). The project's `AGENTS.md` tells agents to read it before changing a block and to follow the official documentation rather than memory.

The devtools **Blocks** panel shows the same two parts for each block: **Official documentation** (the links) and **For AI agents** (the instructions). See [Building your own block](/building-blocks#agents-and-links-the-blocks-own-guide) to write them for yours.

## The mcp-server block: your API as tools

To let agents act on your **data** (list posts, create an order), add the [mcp-server](/blocks/mcp-server) block. It serves MCP over Streamable HTTP at `/mcp` and turns each resource into tools (`post_list`, `post_get`, `post_create`, `post_update`, `post_delete`). Every tool call is executed as a real request against your API with the caller's session token, so policies, validation, scoping, rate limits and field visibility are exactly those of the REST API.

```bash
npx calm add mcp-server
claude mcp add --transport http my-api http://localhost:5001/mcp --header "Authorization: Bearer <session token>"
```

## llms.txt

These docs are available in a form that is easy to give to a model: [https://docs.calmapi.dev/llms.txt](/llms.txt) lists every page with a short description and a link to its markdown source, and [https://docs.calmapi.dev/llms-full.txt](/llms-full.txt) contains all CalmAPI 2 pages in one file. The markdown of any page is at its URL plus `.md`, for example [https://docs.calmapi.dev/policies.md](/policies.md).
