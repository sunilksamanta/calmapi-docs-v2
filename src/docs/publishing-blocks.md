# Publishing your own block

A block is a set of files plus a little metadata, published as one JSON file in the [shadcn registry-item format](https://ui.shadcn.com/docs/registry). Anyone can host one, and `calm add` installs it like an official block. Most blocks contain a plugin: a module that hooks into the app at boot.

## Write the plugin

A plugin is a folder in `app/blocks/<name>/` whose `index.js` default-exports `definePlugin({ name, setup })`. Develop it inside a real project first.

```js
// app/blocks/slack-notify/index.js
import { definePlugin } from '#calm';

// Posts to Slack when a post is published.
export default definePlugin({
  name: 'slack-notify',
  setup(calm) {
    const webhook = process.env.SLACK_WEBHOOK_URL;

    calm.doctor(() =>
      !webhook && calm.config.mode === 'production'
        ? [{ level: 'warn', id: 'slack-webhook', title: 'SLACK_WEBHOOK_URL is not set', detail: 'Publish notifications are disabled.' }]
        : [],
    );
    if (!webhook) return;

    calm.on('post.updated', async ({ doc, previous }) => {
      if (doc.status !== 'published' || previous.status === 'published') return;
      await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: `New post: ${doc.title}` }),
      });
    });
  },
});
```

### The plugin API

`setup(calm)` runs once at boot, before resources are compiled. It may be async.

| Member | Use |
|---|---|
| `calm.app`, `calm.config`, `calm.log`, `calm.events`, `calm.mongoose`, `calm.mailer` | The app and its parts |
| `calm.on(pattern, fn)` | Listen to events (`'post.created'`, `'post.*'`, `'*'`); `fn(payload, name)` |
| `calm.onResource((def) => def)` | Change resource definitions before they are compiled: add fields, read custom options |
| `calm.onService(({ def, model, service }) => {})` | Runs for every resource once services exist: wrap or add methods |
| `calm.routes((r) => {...}, { prefix: '/billing' })` | Add routes under `/api` with the [route builder](/docs/routes) |
| `calm.use(middleware)` | Express middleware in front of the whole app (for paths outside `/api`, like `/docs` or `/mcp`) |
| `calm.onStart(fn)`, `calm.onShutdown(fn)` | Start and stop background work; shutdown hooks run in reverse order |
| `calm.provide(key, value)` | Expose an API to the rest of the app as `app.ext[key]` |
| `calm.doctor(() => findings)` | Add checks to `calm doctor` and the devtools Doctor panel: `[{ level, id, title, detail }]` |
| `calm.devtools.panel(name, (app) => data)` | Add a devtools panel that renders the returned JSON |

Routes added by plugins are not resource routes: there is no `ctx.service`, no `ctx.doc` and no automatic serialization. Use `ctx.services.<name>` and `ctx.serialize(doc, '<name>')`.

Resource options are open: a block can read its own option from `def.options`, which is how `softDelete: true` and `audit: false` work:

```js
// import { definePlugin, f } from '#calm';
calm.onResource((def) => {
  if (!def.options.searchIndex) return def;
  def.fields.searchText = f.text().hidden();
  return def;
});
```

You can also register plugins without a folder through `plugins: [myPlugin]` in `calm.config.js`.

## Describe the block

A registry item is a JSON file. `files[].content` holds each file's source, and `target` is where it goes in the project:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "slack-notify",
  "type": "registry:item",
  "title": "Slack notifications",
  "description": "Post to a Slack channel when a post is published.",
  "version": "1.0.0",
  "author": "Acme",
  "dependencies": [],
  "devDependencies": [],
  "registryDependencies": [],
  "envVars": { "SLACK_WEBHOOK_URL": "" },
  "docs": "Set SLACK_WEBHOOK_URL to an incoming webhook URL.",
  "meta": { "calmapi": { "minVersion": "2.0.0-alpha.0", "conflicts": [] } },
  "files": [
    {
      "path": "blocks/slack-notify/index.js",
      "type": "registry:file",
      "target": "app/blocks/slack-notify/index.js",
      "content": "import { definePlugin } from '#calm';\n..."
    }
  ]
}
```

| Field | Used by `calm add` for |
|---|---|
| `name`, `files` | Required. Each file needs `content` and a `target` (or `path`). |
| `version`, `description` | Shown in the plan and recorded in `calm.lock` |
| `dependencies`, `devDependencies` | npm packages, as `"name@range"` (`"stripe@^18.0.0"`); added to `package.json` when missing |
| `envVars` | Appended to `.env.example` and `.env` when missing |
| `registryDependencies` | Other blocks installed first (`"jobs"`, `"@acme/base"`, a URL) |
| `docs` | Printed after installation |
| `meta.calmapi.conflicts` | Names of blocks that cannot be installed together with this one |

Targets must stay inside the project: absolute paths, `..` segments, `calm/` and `calm.lock` are refused.

A short script can build the JSON from your files:

```js
// build.js: node build.js > public/r/slack-notify.json
import { readFileSync } from 'node:fs';

const files = ['app/blocks/slack-notify/index.js'];
console.log(JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'slack-notify',
  type: 'registry:item',
  title: 'Slack notifications',
  description: 'Post to a Slack channel when a post is published.',
  version: '1.0.0',
  envVars: { SLACK_WEBHOOK_URL: '' },
  files: files.map((target) => ({ path: target, type: 'registry:file', target, content: readFileSync(target, 'utf8') })),
}, null, 2));
```

## Host and install it

Serve the JSON from any static host, one file per block. Users declare your registry once in their `package.json`, with `{name}` as a placeholder:

```json
{
  "calm": {
    "registries": { "@acme": "https://acme.dev/r/{name}.json" }
  }
}
```

```bash
npx calm add @acme/slack-notify --dry-run
npx calm add @acme/slack-notify
```

Without a registry entry, a full URL or a local file works too: `npx calm add https://acme.dev/r/slack-notify.json`.

The official blocks are built the same way from `registry/blocks/<name>/` in the [calmapi repository](https://github.com/sunilksamanta/calmapi) and served at `https://calmapi.dev/r/<name>.json`.

## Good blocks

- Keep them small and readable: users will own and edit the code.
- Read configuration from environment variables, and declare them in `envVars` with safe placeholder values.
- Add `doctor` checks for missing configuration, especially in production.
- Go through services (`ctx.services`, `calm.app.service(name)`) and `ctx.serialize`, so policies and visibility rules keep applying.
- Pin versions of anything you load from a CDN.
