# Publishing your own block

A shared block is one JSON file in the [shadcn registry-item format](https://ui.shadcn.com/docs/registry): the block's files plus a little metadata. Anyone can host one, and `calm add` installs it like an official block. This page is the reference for that file and for hosting it. To write a block, start with [Building your own block](/building-blocks).

The short version:

```bash
npx calm make block slack-notify      # app/blocks/slack-notify/ with block.json
npx calm block check slack-notify     # fix what it reports
npx calm block pack                   # writes r/slack-notify.json and r/index.json
git add r && git commit -m "Share slack-notify" && git push
# anyone can now run: npx calm add gh:<you>/<repo>/slack-notify
```

## The registry item

`calm block pack` writes this file from your block folder and its `block.json`. You rarely write it by hand, but it is plain JSON, so you can:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "slack-notify",
  "type": "registry:item",
  "title": "Slack notifications",
  "description": "Post to a Slack channel when a post is published.",
  "version": "1.0.0",
  "author": "Acme",
  "license": "MIT",
  "categories": ["notifications"],
  "dependencies": [],
  "devDependencies": [],
  "registryDependencies": [],
  "envVars": { "SLACK_WEBHOOK_URL": "" },
  "docs": "Set SLACK_WEBHOOK_URL to an incoming webhook URL (Slack, Apps, Incoming Webhooks).",
  "meta": { "calmapi": { "minVersion": "2.0.0-alpha.1", "conflicts": [] } },
  "files": [
    {
      "path": "app/blocks/slack-notify/index.js",
      "type": "registry:file",
      "target": "app/blocks/slack-notify/index.js",
      "content": "import { definePlugin } from '#calm';\n..."
    }
  ]
}
```

| Field | Used by `calm add` for |
|---|---|
| `name`, `files` | Required. Each file needs `content` and a `target` (or `path`): where it goes in the project. |
| `version`, `description` | Shown in the plan and recorded in `calm.lock` |
| `dependencies`, `devDependencies` | npm packages as `"name@range"` (`"stripe@^18.0.0"`), added to `package.json` when missing, then installed |
| `envVars` | Appended to `.env.example` and `.env` when missing; values already there are kept |
| `registryDependencies` | Other blocks installed first (`"jobs"`, `"@acme/base"`, `"gh:acme/blocks/base"`, a URL) |
| `docs` | Printed after installing |
| `meta.calmapi.minVersion` | `calm add` refuses the block when the project's `calm/` is older (see [minVersion](/building-blocks#minversion)) |
| `meta.calmapi.conflicts` | Names of blocks that cannot be installed together with this one |

Targets must stay inside the project: absolute paths, `..` segments, `calm/` and `calm.lock` are refused at install time, and `calm block check` also refuses `.env`, `package.json` and `package-lock.json` (use `envVars` and `dependencies` instead).

`calm block pack` also writes `r/index.json`, which lists every item in the folder with its title, description, version and categories, in the shadcn registry format.

## Where blocks can live

| Address | Reads |
|---|---|
| `gh:acme/blocks/slack-notify` | `r/slack-notify.json` on the default branch of `github.com/acme/blocks` |
| `gh:acme/blocks/slack-notify@v1.2.0` | The same file at a tag, a branch or a commit |
| `https://blocks.acme.dev/r/slack-notify.json` | Any URL |
| `./blocks/slack-notify.json` | A local file |
| `@acme/slack-notify` | A registry of your own (below) |

Serve the JSON from any static host, one file per block: GitHub, a CDN, an S3 bucket, your docs site.

## Your own registry

A registry is a URL template. Users declare yours once in their `package.json`, with `{name}` as the placeholder:

```json
{
  "calm": {
    "registries": { "@acme": "https://blocks.acme.dev/r/{name}.json" }
  }
}
```

```bash
npx calm add @acme/slack-notify --dry-run
npx calm add @acme/slack-notify
```

This also works for private blocks inside a company: host `r/` behind your VPN, and every project that declares the registry can add blocks by name.

## What installers see

Blocks that do not come from the official registry get a plain-language review before anything is written: network requests, file writes, child processes, `eval`, computed imports, request hooks, the environment variables the code reads and the hosts it mentions. Risky findings must be confirmed, and with `--yes` they need `--trust`. See [What people see before installing](/building-blocks#what-people-see-before-installing). Run `calm block check` on your own block to see the same review first.

## The official registry

The official blocks are built the same way, from `registry/blocks/<name>/` in the [calmapi repository](https://github.com/sunilksamanta/calmapi) (a `block.json`, a `files/` folder mirrored into the project, and a `docs.md`). They are bundled with the CLI, so `calm add jobs` works offline, and served at `https://docs.calmapi.dev/r/<name>.json` for `calm add --remote` and other tools. The list is at [/r/index.json](/r/index.json).
