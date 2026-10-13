# What the framework does

"Nothing hidden" should be a document you can hand to a reviewer. `calm about` prints everything CalmAPI does that you did not write, generated from your project's own `calm/` and `app/` code, so it cannot drift from it:

```bash
npx calm about           # readable
npx calm about --json    # for scripts
```

Devtools shows the same report under **About**, and agents read it with the `calm_about` MCP tool.

## What it lists

| Section | What it says | Generated from |
|---|---|---|
| Request pipeline | Every middleware in the order it runs, what it does, its file, and the block it comes from | `app.pipeline`, filled by the code that wires the app, so the list is the wiring |
| Headers | Every header the framework sets on responses, with its value; the rate limit headers; `X-Powered-By` removed; the CORS configuration | The same list the security headers middleware uses |
| Stored data | Every collection: the resource, auth, push or block it belongs to, how long documents live (TTL indexes), encrypted fields, and what it holds | The Mongoose models of the running app |
| In memory | Rate limit counters, and in development what devtools keeps | Configuration |
| Logging | Level, format, what the access log line contains, what is never logged, what devtools records and redacts | Configuration and the devtools collector |
| Hosts | Every host named in a file that makes network calls, by file; calls with a computed URL; packages that connect somewhere | A scan of `app/` and `calm/` |
| Files | Every file the CLI ever writes, by command | A list kept next to the code |
| Blocks | Installed blocks with their environment variables (names only) and models | The blocks |

## The network promise

CalmAPI never calls an AI model, never sends telemetry and never fetches anything at runtime on its own. The report checks it: the **Hosts** section ends with `✔ calm/ makes no network requests of its own` when no file under `calm/` names a host it calls. If you or a block change that, the line turns into a cross and names the files. Hosts your own code and blocks call are listed with the files that call them, so a new one is visible in review (and in [`calm diff`](/behavior-diff)).

## Limits

The host scan reads source text: a URL assembled at runtime appears as "a computed URL" with its file, not as a host. Collections the app does not know a model for (created by a script, for example) are not listed.
