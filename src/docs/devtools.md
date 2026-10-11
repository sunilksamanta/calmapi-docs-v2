# Devtools

In development, every CalmAPI app serves a dashboard at **`http://localhost:5001/_calm`**. It shows what your API is doing right now: requests with their MongoDB queries, logs, emails, routes, resources and data, plus a playground to call the API as any user. It also shows what an AI agent is changing in your project, and who can access what.

```bash
npm run dev
# open http://localhost:5001/_calm
```

The collector is part of your app (`calm/devtools/index.js`). The interface is the `@calmapi/devtools` package, a dev dependency of every new project. If it is missing, `/_calm` shows how to install it (`npm install -D @calmapi/devtools`) and the JSON API keeps working.

## Panels

### Requests

A live list of every request (over Server-Sent Events): method, path, status, duration, the user who made it, and how many MongoDB queries it ran. Quick filters show **Errors**, **Slow** requests (300 ms or more) and **N+1** suspects (more than 10 queries). A second view lists **background queries** that ran outside any request (jobs, startup).

Open a request to see:

- **Timeline**: the request and each query as a waterfall, with log lines placed in time.
- **Queries**: every MongoDB command with its filter, duration and document count. Repeated query shapes are flagged. **Explain** runs the query planner and tells you whether an index was used or the collection was scanned (`COLLSCAN`).
- **Request** and **Response**: headers and bodies. Passwords, tokens and other secret-looking keys are redacted, and the `Authorization` header is shortened.
- **Logs**: everything logged during the request, linked by request id.
- **Error**: the original error and stack trace, with links that open the file in VS Code.

From there you can copy the request as `curl`, edit it in the Playground, replay it, or replay it as the user who made it.

Requests that carry an `X-Calm-Agent` header (the [`calm_http`](/docs/ai-agents#calm-mcp-tools-for-coding-agents) tool sends it) are marked as sent by an AI agent, with its name, and the **Agent** filter shows only those.

### Activity

A live feed of what is happening to the project, read from `.calm/activity.jsonl` (see [Watching an agent work](/docs/ai-agents#watching-an-agent-work)): agent tool calls, file changes with their diffs, marked as made by an agent or by you, server restarts and crashes with their error output. Filter by agent, files or server events.

### Logs

A live tail of the app log with level filters, text search and a link from each line to the request that wrote it.

### Mail

In development, nothing is delivered: emails go to this inbox instead, password reset links included. The empty state shows a `curl` command (and a Playground shortcut) to trigger a reset email.

### Routes

Every endpoint grouped by resource, block or source, with its policy and the file that defines it. Filter by policy, and spot routes whose policy is **not explicit**.

### Resources

A diagram of how resources reference each other, then each resource with its policies (defaulted ones highlighted), owner field and fields. Each field shows its type and flags (`hidden`, `readOnly`, `filterable`...) and whether it is readable (R) and writable (W) through the API.

### Data

Browse the documents of each resource with the **privacy lens**: for each record, what MongoDB stores next to what the API returns, and why each missing field is missing (`hidden`, `password`, `visible to owner | admin`...). **View as** switches the viewer between anonymous and any user, so you can check exactly what Alice sees of Bob's records. Password hashes are masked.

### Playground

Send requests to your API with route suggestions and sample bodies built from the resource fields. **Act as** signs you in as any user: devtools creates a real session for them and keeps it in memory for the Playground and replays. It is the quickest way to test policies.

### Doctor

The runtime checks of `calm doctor` (configuration, policies, exposed secrets, personal data exposure, unknown references), grouped by level and updated live. Run `npx calm doctor` in a terminal to add the static checks on your source files. See [Security](/docs/security#what-calm-doctor-checks).

### Security

Who can access what, and what happened:

- **Access**: the [exposure matrix](/docs/security#exposure-matrix), per resource: which actions anonymous visitors, users, owners, custom roles and admins may perform, and which fields each can read and write.
- **Events**: the [security events](/docs/security#security-events) of the dev server, live: failed sign-ins, lockouts, bad tokens, rejected writes, `403`s.
- **Posture**: sessions, password rules, lockout, rate limits, CORS, encryption keys and encrypted fields, JSON limits and security headers.

**Run audit** runs [`calm audit`](/docs/audit) on a throwaway database on the dev server's MongoDB and shows the result in the matrix.

### Block panels

Blocks can add panels: [jobs](/docs/blocks/jobs) shows queue statistics and recent jobs, [realtime-sse](/docs/blocks/realtime-sse) the connected subscribers, the storage blocks their configuration.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Focus the filter |
| `j` / `k` | Next / previous item |
| `Enter` | Open the selected item |
| `Esc` | Close the detail view |
| `1` to `9` | Switch panel |
| `Ctrl + Enter` | Send (Playground) |
| `?` | Show the shortcuts |

The theme follows your system, or pick light or dark in the top bar.

## Safety model

Devtools can read your data and create sessions, so it is locked down:

- **Development only.** It is on when the mode is `development` (`calm dev`). In production it is forced off, even if `calm.config.js` turns it on. MongoDB command monitoring is only enabled while devtools is on.
- **This machine only.** Every `/_calm` request must arrive on a loopback socket (`127.0.0.1` or `::1`), with a `Host` header of `localhost`, `127.0.0.1` or `::1`, and without proxy headers (`X-Forwarded-For`, `Forwarded`). Anything else gets a plain `404`, which also defeats DNS rebinding.
- **No cross-site writes.** Requests that change something (act as, explain, clear, run audit) need an `X-Calm-Devtools: 1` header, which a page on another site cannot send. `/_calm` has no CORS headers, a strict Content-Security-Policy and refuses to be framed.
- **Secrets stay out.** Request bodies are stored with secret-looking keys redacted, the `Cookie` header is redacted, and the `Authorization` header is shortened.
- **Bounded memory.** It keeps the last 300 requests, 1,000 log lines, 100 emails, 200 background queries, 500 activity events and 300 security events.

"Act as" is logged (`Devtools: acting as ada@example.com`) and creates an ordinary session that expires like any other.

## For tools and agents

The panels use a small JSON API under `/_calm/api` that you can call from scripts on the same machine (writes need the `X-Calm-Devtools: 1` header):

| Endpoint | Returns |
|---|---|
| `GET /_calm/api/overview` | App, runtime, database, resources, routes, blocks |
| `GET /_calm/api/requests`, `GET /_calm/api/requests/:id` | Recent requests, one request in full |
| `GET /_calm/api/logs`, `GET /_calm/api/mails` | Recent logs and emails |
| `GET /_calm/api/doctor` | Runtime doctor findings |
| `GET /_calm/api/activity` | Project activity from `.calm/activity.jsonl`, newest first |
| `GET /_calm/api/security` | Exposure matrix, security events and posture |
| `POST /_calm/api/audit` | Runs the security audit on a throwaway database and returns the report |
| `GET /_calm/api/resources/:name/docs?as=<userId>` | Stored vs returned documents |
| `POST /_calm/api/act-as` `{ userId }` | A session token for that user |

The [`calm mcp`](/docs/ai-agents) server uses this API to give coding agents the recent requests, logs, emails and security events of your dev server, and to sign in as other users for `calm_http`.
